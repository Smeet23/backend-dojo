import { and, eq, lte, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { appState, lessonProgress, questionMisses, quizAttempts } from "@/db/schema";
import { emptyProgress, mergeProgress, type Progress, type ProgressEvent } from "@/lib/progress-model";

const LAST_LECTURE = "last_lecture";

/** Reads the whole progress snapshot (small: one row per lecture and per missed question). */
export async function getProgress(db: Db): Promise<Progress> {
  const [lessons, misses, last] = await Promise.all([
    db.select().from(lessonProgress),
    db.select().from(questionMisses),
    db.select().from(appState).where(eq(appState.key, LAST_LECTURE)),
  ]);
  const p = emptyProgress();
  for (const l of lessons) p.lessons[l.lectureId] = { visited: l.visited, done: l.done, quizBest: l.quizBest };
  for (const m of misses) p.misses[m.questionId] = m.misses;
  p.lastLecture = last[0] ? Number(last[0].value) : null;
  return p;
}

function setLastLecture(db: Db, lectureId: number) {
  return db
    .insert(appState)
    .values({ key: LAST_LECTURE, value: String(lectureId) })
    .onConflictDoUpdate({ target: appState.key, set: { value: String(lectureId) } });
}

/** Applies events with the same rules as `applyEvents` in progress-model. */
export async function recordEvents(db: Db, events: ProgressEvent[]): Promise<void> {
  // Applied in order: a miss followed by a correct answer must net out.
  for (const e of events) {
    if (e.type === "visit") {
      const id = String(e.lectureId);
      await db
        .insert(lessonProgress)
        .values({ lectureId: id, visited: true })
        .onConflictDoUpdate({ target: lessonProgress.lectureId, set: { visited: true, updatedAt: sql`now()` } });
      await setLastLecture(db, e.lectureId);
    } else if (e.type === "quiz") {
      await db.insert(quizAttempts).values({
        lectureId: e.lectureId === null ? null : String(e.lectureId),
        scorePct: e.scorePct,
        questionCount: e.questionCount,
      });
      if (e.lectureId !== null) {
        await db
          .insert(lessonProgress)
          .values({ lectureId: String(e.lectureId), visited: true, done: true, quizBest: e.scorePct })
          .onConflictDoUpdate({
            target: lessonProgress.lectureId,
            set: {
              visited: true,
              done: true,
              quizBest: sql`greatest(coalesce(${lessonProgress.quizBest}, 0), excluded.quiz_best)`,
              updatedAt: sql`now()`,
            },
          });
      }
    } else if (e.score < 1) {
      await db
        .insert(questionMisses)
        .values({ questionId: e.questionId, misses: 1 })
        .onConflictDoUpdate({
          target: questionMisses.questionId,
          set: { misses: sql`${questionMisses.misses} + 1`, updatedAt: sql`now()` },
        });
    } else {
      // A fully correct answer pays one miss back. Delete at 1 instead of updating to 0,
      // so the row never violates the misses > 0 check.
      const byId = eq(questionMisses.questionId, e.questionId);
      await db.delete(questionMisses).where(and(byId, lte(questionMisses.misses, 1)));
      await db
        .update(questionMisses)
        .set({ misses: sql`${questionMisses.misses} - 1`, updatedAt: sql`now()` })
        .where(byId);
    }
  }
}

/** Merges a browser snapshot into the database without losing anything on either side. */
export async function importProgress(db: Db, local: Progress): Promise<Progress> {
  const merged = mergeProgress(await getProgress(db), local);
  for (const [lectureId, l] of Object.entries(merged.lessons)) {
    await db
      .insert(lessonProgress)
      .values({ lectureId, ...l })
      .onConflictDoUpdate({ target: lessonProgress.lectureId, set: { ...l, updatedAt: sql`now()` } });
  }
  for (const [questionId, misses] of Object.entries(merged.misses)) {
    await db
      .insert(questionMisses)
      .values({ questionId, misses })
      .onConflictDoUpdate({ target: questionMisses.questionId, set: { misses, updatedAt: sql`now()` } });
  }
  if (merged.lastLecture !== null) await setLastLecture(db, merged.lastLecture);
  return merged;
}

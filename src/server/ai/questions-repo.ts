import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { Db } from "@/db";
import { aiQuestions, questionMisses } from "@/db/schema";
import type { Question } from "@/lib/types";
import { findQuestion } from "./lessons";

export const isAiQuestionId = (id: string) => id.startsWith("ai-");

/** A question by id: built into a lesson, or written earlier by the AI. */
export async function loadQuestion(db: Db, id: string): Promise<{ courseId: string; question: Question } | undefined> {
  if (!isAiQuestionId(id)) return findQuestion(id);
  const [row] = await db.select().from(aiQuestions).where(eq(aiQuestions.id, id));
  return row ? { courseId: row.course, question: row.question as Question } : undefined;
}

export async function listAiQuestions(db: Db, courseId: string, limit = 60): Promise<Question[]> {
  const rows = await db
    .select({ question: aiQuestions.question })
    .from(aiQuestions)
    .where(eq(aiQuestions.course, courseId))
    .orderBy(desc(aiQuestions.createdAt))
    .limit(limit);
  return rows.map((r) => r.question as Question);
}

export async function saveAiQuestions(db: Db, courseId: string, questions: Question[]): Promise<void> {
  if (questions.length === 0) return;
  await db.insert(aiQuestions).values(
    questions.map((q) => ({ id: q.id, course: courseId, lectureId: `${courseId}:${q.lectures[0]}`, question: q })),
  );
}

/**
 * Lectures to focus on, weakest first: the lectures of this course's most-missed questions
 * (built-in or AI-written). Empty when nothing has been missed yet.
 */
export async function weakLectures(db: Db, courseId: string): Promise<{ lectureId: number; misses: number }[]> {
  const misses = await db.select().from(questionMisses);
  const byLecture = new Map<number, number>();
  const aiIds = misses.filter((m) => isAiQuestionId(m.questionId)).map((m) => m.questionId);
  const aiRows = aiIds.length
    ? await db.select().from(aiQuestions).where(and(eq(aiQuestions.course, courseId), inArray(aiQuestions.id, aiIds)))
    : [];
  const aiById = new Map(aiRows.map((r) => [r.id, r.question as Question]));
  for (const m of misses) {
    const found = isAiQuestionId(m.questionId) ? { courseId, question: aiById.get(m.questionId) } : findQuestion(m.questionId);
    if (!found?.question || found.courseId !== courseId) continue;
    for (const l of found.question.lectures) byLecture.set(l, (byLecture.get(l) ?? 0) + m.misses);
  }
  return [...byLecture.entries()].map(([lectureId, n]) => ({ lectureId, misses: n })).sort((a, b) => b.misses - a.misses);
}

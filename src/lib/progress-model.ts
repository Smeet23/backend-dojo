/**
 * Progress data shared by the browser and the server.
 * Pure functions only, so both sides (and tests) can use them.
 */

export type LessonProgress = {
  visited: boolean;
  /** Quiz finished at least once. */
  done: boolean;
  /** Best quiz score as a percentage. */
  quizBest: number | null;
};

export type Progress = {
  version: number;
  lessons: Record<string, LessonProgress>;
  /** Question id -> net miss count; drives weak-topic weighting. */
  misses: Record<string, number>;
  lastLecture: number | null;
};

export const PROGRESS_VERSION = 1;

export const emptyProgress = (): Progress => ({ version: PROGRESS_VERSION, lessons: {}, misses: {}, lastLecture: null });

/** Something the learner did; sent to the server as it happens. */
export type ProgressEvent =
  | { type: "visit"; lectureId: number }
  | { type: "answer"; questionId: string; score: number }
  | { type: "quiz"; lectureId: number | null; scorePct: number; questionCount: number };

const MAX_EVENTS = 50;

const isLectureId = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v > 0 && v < 1000;
const isPct = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 100;
const isQuestionId = (v: unknown): v is string => typeof v === "string" && /^[a-z0-9-]{1,100}$/.test(v);

/** Validates an untrusted request body. Returns the events or a list of problems. */
export function parseEvents(body: unknown): { ok: true; events: ProgressEvent[] } | { ok: false; errors: string[] } {
  const raw = (body as { events?: unknown })?.events;
  if (!Array.isArray(raw)) return { ok: false, errors: ["events must be an array"] };
  if (raw.length === 0 || raw.length > MAX_EVENTS) return { ok: false, errors: [`events must have 1-${MAX_EVENTS} items`] };

  const errors: string[] = [];
  const events: ProgressEvent[] = [];
  raw.forEach((e, i) => {
    const ev = e as Record<string, unknown>;
    if (ev?.type === "visit" && isLectureId(ev.lectureId)) events.push({ type: "visit", lectureId: ev.lectureId });
    else if (ev?.type === "answer" && isQuestionId(ev.questionId) && typeof ev.score === "number" && ev.score >= 0 && ev.score <= 1)
      events.push({ type: "answer", questionId: ev.questionId, score: ev.score });
    else if (
      ev?.type === "quiz" &&
      (ev.lectureId === null || isLectureId(ev.lectureId)) &&
      isPct(ev.scorePct) &&
      Number.isInteger(ev.questionCount) &&
      (ev.questionCount as number) > 0
    )
      events.push({ type: "quiz", lectureId: ev.lectureId as number | null, scorePct: ev.scorePct, questionCount: ev.questionCount as number });
    else errors.push(`events[${i}] is invalid`);
  });
  return errors.length ? { ok: false, errors } : { ok: true, events };
}

/** Validates a full progress object (used for the one-time import of browser progress). */
export function parseProgress(body: unknown): Progress | null {
  const p = body as Progress;
  if (!p || typeof p !== "object" || typeof p.lessons !== "object" || typeof p.misses !== "object" || !p.lessons || !p.misses) return null;
  const lessons: Progress["lessons"] = {};
  for (const [id, l] of Object.entries(p.lessons)) {
    if (!isLectureId(Number(id)) || typeof l !== "object" || !l) return null;
    lessons[String(Number(id))] = {
      visited: Boolean(l.visited),
      done: Boolean(l.done),
      quizBest: l.quizBest === null || l.quizBest === undefined ? null : isPct(l.quizBest) ? l.quizBest : null,
    };
  }
  const misses: Progress["misses"] = {};
  for (const [id, n] of Object.entries(p.misses)) {
    if (isQuestionId(id) && Number.isInteger(n) && n > 0) misses[id] = Math.min(n, 1000);
  }
  return { version: PROGRESS_VERSION, lessons, misses, lastLecture: isLectureId(p.lastLecture) ? p.lastLecture : null };
}

/**
 * Combines two progress snapshots without losing anything: a lesson is done if
 * either side finished it, the best score wins, and misses keep the higher count.
 */
export function mergeProgress(a: Progress, b: Progress): Progress {
  const lessons: Progress["lessons"] = { ...a.lessons };
  for (const [id, l] of Object.entries(b.lessons)) {
    const prev = lessons[id];
    lessons[id] = prev
      ? {
          visited: prev.visited || l.visited,
          done: prev.done || l.done,
          quizBest: prev.quizBest === null ? l.quizBest : l.quizBest === null ? prev.quizBest : Math.max(prev.quizBest, l.quizBest),
        }
      : l;
  }
  const misses: Progress["misses"] = { ...a.misses };
  for (const [id, n] of Object.entries(b.misses)) misses[id] = Math.max(misses[id] ?? 0, n);
  return { version: PROGRESS_VERSION, lessons, misses, lastLecture: a.lastLecture ?? b.lastLecture };
}

/** Applies events to a snapshot: the same rules the server's SQL follows. */
export function applyEvents(p: Progress, events: ProgressEvent[]): Progress {
  let next = p;
  for (const e of events) {
    const lesson = (id: number) => next.lessons[String(id)] ?? { visited: false, done: false, quizBest: null };
    if (e.type === "visit") {
      next = { ...next, lastLecture: e.lectureId, lessons: { ...next.lessons, [String(e.lectureId)]: { ...lesson(e.lectureId), visited: true } } };
    } else if (e.type === "quiz" && e.lectureId !== null) {
      const prev = lesson(e.lectureId);
      next = {
        ...next,
        lessons: {
          ...next.lessons,
          [String(e.lectureId)]: { visited: true, done: true, quizBest: Math.max(prev.quizBest ?? 0, e.scorePct) },
        },
      };
    } else if (e.type === "answer") {
      const current = next.misses[e.questionId] ?? 0;
      const count = e.score < 1 ? current + 1 : Math.max(0, current - 1);
      const misses = { ...next.misses };
      if (count === 0) delete misses[e.questionId];
      else misses[e.questionId] = count;
      next = { ...next, misses };
    }
  }
  return next;
}

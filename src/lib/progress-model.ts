/**
 * Progress data shared by the browser and the server.
 * Pure functions only, so both sides (and tests) can use them.
 *
 * Lessons are keyed by lecture key "<course>:<lectureId>" (e.g. "backend:21.1"),
 * because lecture numbers repeat across courses.
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
  /** Question id -> net miss count; drives weak-topic weighting. Question ids are unique across courses. */
  misses: Record<string, number>;
  /** Lecture key of the last lesson opened. */
  lastLecture: string | null;
};

export const PROGRESS_VERSION = 2;

/** Progress saved before courses existed belonged to the backend course. */
const LEGACY_COURSE = "backend";

export const emptyProgress = (): Progress => ({ version: PROGRESS_VERSION, lessons: {}, misses: {}, lastLecture: null });

/** Something the learner did; sent to the server as it happens. */
export type ProgressEvent =
  | { type: "visit"; lectureKey: string }
  | { type: "answer"; questionId: string; score: number }
  | { type: "quiz"; course: string; lectureKey: string | null; scorePct: number; questionCount: number };

const MAX_EVENTS = 50;

const isCourseId = (v: unknown): v is string => typeof v === "string" && /^[a-z0-9-]{1,40}$/.test(v);
export const isLectureKey = (v: unknown): v is string => typeof v === "string" && /^[a-z0-9-]{1,40}:\d{1,3}(\.\d{1,2})?$/.test(v);
const isLegacyId = (v: unknown) => /^\d{1,3}(\.\d{1,2})?$/.test(String(v));
const isPct = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 100;
const isQuestionId = (v: unknown): v is string => typeof v === "string" && /^[a-z0-9-]{1,100}$/.test(v);

/** Accepts "course:id" keys, and upgrades bare legacy ids ("5") to the backend course. */
function toLectureKey(v: unknown): string | null {
  if (isLectureKey(v)) return v;
  if ((typeof v === "number" || typeof v === "string") && isLegacyId(v)) return `${LEGACY_COURSE}:${Number(v)}`;
  return null;
}

/** Validates an untrusted request body. Returns the events or a list of problems. */
export function parseEvents(body: unknown): { ok: true; events: ProgressEvent[] } | { ok: false; errors: string[] } {
  const raw = (body as { events?: unknown })?.events;
  if (!Array.isArray(raw)) return { ok: false, errors: ["events must be an array"] };
  if (raw.length === 0 || raw.length > MAX_EVENTS) return { ok: false, errors: [`events must have 1-${MAX_EVENTS} items`] };

  const errors: string[] = [];
  const events: ProgressEvent[] = [];
  raw.forEach((e, i) => {
    const ev = e as Record<string, unknown>;
    if (ev?.type === "visit" && isLectureKey(ev.lectureKey)) events.push({ type: "visit", lectureKey: ev.lectureKey });
    else if (ev?.type === "answer" && isQuestionId(ev.questionId) && typeof ev.score === "number" && ev.score >= 0 && ev.score <= 1)
      events.push({ type: "answer", questionId: ev.questionId, score: ev.score });
    else if (
      ev?.type === "quiz" &&
      isCourseId(ev.course) &&
      (ev.lectureKey === null || (isLectureKey(ev.lectureKey) && ev.lectureKey.startsWith(`${ev.course}:`))) &&
      isPct(ev.scorePct) &&
      Number.isInteger(ev.questionCount) &&
      (ev.questionCount as number) > 0
    )
      events.push({
        type: "quiz",
        course: ev.course,
        lectureKey: ev.lectureKey as string | null,
        scorePct: ev.scorePct,
        questionCount: ev.questionCount as number,
      });
    else errors.push(`events[${i}] is invalid`);
  });
  return errors.length ? { ok: false, errors } : { ok: true, events };
}

/**
 * Validates a full progress object (browser import or local cache). Snapshots saved
 * before courses existed (version 1, bare lecture ids) are upgraded to backend keys.
 */
export function parseProgress(body: unknown): Progress | null {
  const p = body as { lessons?: unknown; misses?: unknown; lastLecture?: unknown };
  if (!p || typeof p !== "object" || typeof p.lessons !== "object" || typeof p.misses !== "object" || !p.lessons || !p.misses) return null;
  const lessons: Progress["lessons"] = {};
  for (const [id, raw] of Object.entries(p.lessons as Record<string, unknown>)) {
    const key = toLectureKey(id);
    const l = raw as Partial<LessonProgress> | null;
    if (!key || typeof l !== "object" || !l) return null;
    lessons[key] = {
      visited: Boolean(l.visited),
      done: Boolean(l.done),
      quizBest: l.quizBest === null || l.quizBest === undefined ? null : isPct(l.quizBest) ? l.quizBest : null,
    };
  }
  const misses: Progress["misses"] = {};
  for (const [id, n] of Object.entries(p.misses as Record<string, unknown>)) {
    if (isQuestionId(id) && Number.isInteger(n) && (n as number) > 0) misses[id] = Math.min(n as number, 1000);
  }
  return { version: PROGRESS_VERSION, lessons, misses, lastLecture: toLectureKey(p.lastLecture) };
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
    const lesson = (key: string) => next.lessons[key] ?? { visited: false, done: false, quizBest: null };
    if (e.type === "visit") {
      next = { ...next, lastLecture: e.lectureKey, lessons: { ...next.lessons, [e.lectureKey]: { ...lesson(e.lectureKey), visited: true } } };
    } else if (e.type === "quiz" && e.lectureKey !== null) {
      const prev = lesson(e.lectureKey);
      next = {
        ...next,
        lessons: { ...next.lessons, [e.lectureKey]: { visited: true, done: true, quizBest: Math.max(prev.quizBest ?? 0, e.scorePct) } },
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

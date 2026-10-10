"use client";

import { useSyncExternalStore } from "react";

/**
 * All progress reads and writes go through this file.
 * Swapping localStorage for a database later only changes this module.
 */

const KEY = "backend-dojo:progress";
const VERSION = 1;

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

const empty = (): Progress => ({ version: VERSION, lessons: {}, misses: {}, lastLecture: null });

let state: Progress = empty();
let storageOk = true;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Progress;
    // Unknown versions or malformed data: start fresh rather than crash.
    if (parsed?.version === VERSION && parsed.lessons && parsed.misses) state = parsed;
  } catch {
    storageOk = false;
  }
}

function save() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    storageOk = false;
  }
  listeners.forEach((l) => l());
}

function update(fn: (draft: Progress) => Progress) {
  load();
  state = fn(state);
  save();
}

function lesson(p: Progress, id: number): LessonProgress {
  return p.lessons[id] ?? { visited: false, done: false, quizBest: null };
}

export function markVisited(lectureId: number) {
  update((p) => ({
    ...p,
    lastLecture: lectureId,
    lessons: { ...p.lessons, [lectureId]: { ...lesson(p, lectureId), visited: true } },
  }));
}

/** Records a finished lecture quiz (score in percent). */
export function recordLectureQuiz(lectureId: number, scorePct: number) {
  update((p) => {
    const prev = lesson(p, lectureId);
    return {
      ...p,
      lessons: {
        ...p.lessons,
        [lectureId]: {
          ...prev,
          visited: true,
          done: true,
          quizBest: Math.max(prev.quizBest ?? 0, scorePct),
        },
      },
    };
  });
}

/** A miss adds one; a fully correct answer pays one back. */
export function recordAnswer(questionId: string, score: number) {
  update((p) => {
    const current = p.misses[questionId] ?? 0;
    const next = score < 1 ? current + 1 : Math.max(0, current - 1);
    const misses = { ...p.misses };
    if (next === 0) delete misses[questionId];
    else misses[questionId] = next;
    return { ...p, misses };
  });
}

export function resetProgress() {
  update(() => empty());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    loaded = false;
    load();
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const serverSnapshot = empty();

export function useProgress(): Progress {
  return useSyncExternalStore(
    subscribe,
    () => {
      load();
      return state;
    },
    () => serverSnapshot,
  );
}

export function useStorageAvailable(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => {
      load();
      return storageOk;
    },
    () => true,
  );
}

export function getLessonProgress(p: Progress, id: number): LessonProgress {
  return lesson(p, id);
}

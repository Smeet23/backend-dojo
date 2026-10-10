"use client";

import { useSyncExternalStore } from "react";
import {
  applyEvents,
  emptyProgress,
  PROGRESS_VERSION,
  type LessonProgress,
  type Progress,
  type ProgressEvent,
} from "./progress-model";

export type { LessonProgress, Progress } from "./progress-model";

/**
 * Progress lives in Postgres once this device is unlocked with the passcode.
 * The browser keeps a cached copy so pages render instantly and work offline;
 * anything done while locked or offline is merged into the database later.
 */

export type SyncStatus = "loading" | "synced" | "locked" | "offline";

const KEY = "backend-dojo:progress";
const DIRTY_KEY = "backend-dojo:dirty";

type State = { progress: Progress; sync: SyncStatus; storageOk: boolean };

let state: State = { progress: emptyProgress(), sync: "loading", storageOk: true };
let started = false;
let dirty = false; // local changes the server hasn't seen
let queue: ProgressEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function readCache() {
  try {
    const raw = window.localStorage.getItem(KEY);
    dirty = window.localStorage.getItem(DIRTY_KEY) === "1";
    if (!raw) return;
    const parsed = JSON.parse(raw) as Progress;
    if (parsed?.version === PROGRESS_VERSION && parsed.lessons && parsed.misses) state = { ...state, progress: parsed };
  } catch {
    state = { ...state, storageOk: false };
  }
}

function writeCache() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state.progress));
    window.localStorage.setItem(DIRTY_KEY, dirty ? "1" : "0");
  } catch {
    if (state.storageOk) set({ storageOk: false });
  }
}

function hasLocalData(p: Progress) {
  return Object.keys(p.lessons).length > 0 || Object.keys(p.misses).length > 0;
}

/** Loads progress from the server, first merging in anything done locally. */
async function sync() {
  try {
    let res: Response;
    if (dirty && hasLocalData(state.progress)) {
      res = await fetch("/api/progress/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state.progress),
      });
    } else {
      res = await fetch("/api/progress", { cache: "no-store" });
    }
    if (res.status === 401) return set({ sync: "locked" });
    if (!res.ok) return set({ sync: "offline" });
    dirty = false;
    queue = [];
    set({ progress: (await res.json()) as Progress, sync: "synced" });
    writeCache();
  } catch {
    set({ sync: "offline" });
  }
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  readCache();
  void sync();
  // Retry when the tab regains focus or the network comes back.
  window.addEventListener("online", () => state.sync !== "locked" && void sync());
  window.addEventListener("focus", () => state.sync === "offline" && void sync());
}

async function flush() {
  flushTimer = null;
  if (queue.length === 0 || state.sync !== "synced") return;
  const events = queue.splice(0, 50);
  try {
    const res = await fetch("/api/progress/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events }),
    });
    if (res.status === 401) throw Object.assign(new Error("locked"), { locked: true });
    if (!res.ok) throw new Error(`events failed: ${res.status}`);
    if (queue.length) void flush();
  } catch (err) {
    // The local copy already has these changes; mark it for a merge on next sync.
    dirty = true;
    queue = [];
    writeCache();
    set({ sync: (err as { locked?: boolean }).locked ? "locked" : "offline" });
  }
}

function record(...events: ProgressEvent[]) {
  start();
  set({ progress: applyEvents(state.progress, events) });
  if (state.sync === "synced") {
    queue.push(...events);
    flushTimer ??= setTimeout(flush, 300);
  } else {
    dirty = true;
  }
  writeCache();
}

export function markVisited(lectureId: number) {
  record({ type: "visit", lectureId });
}

/** One answered question: misses add up, fully correct answers pay one back. */
export function recordAnswer(questionId: string, score: number) {
  record({ type: "answer", questionId, score });
}

/** A finished quiz; `lectureId` is null for mixed practice. */
export function recordQuizFinished(lectureId: number | null, scorePct: number, questionCount: number) {
  record({ type: "quiz", lectureId, scorePct, questionCount });
}

export type UnlockResult = { ok: true } | { ok: false; reason: "wrong" } | { ok: false; reason: "locked"; retryAfter: number };

/** Unlocks this device. Wrong passcodes are rate limited by the server (429 + Retry-After). */
export async function unlock(passcode: string): Promise<UnlockResult> {
  const res = await fetch("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ passcode }),
  });
  if (res.status === 401) return { ok: false, reason: "wrong" };
  if (res.status === 429) return { ok: false, reason: "locked", retryAfter: Number(res.headers.get("Retry-After")) || 900 };
  if (!res.ok) throw new Error(`Unlock failed (${res.status})`);
  set({ sync: "loading" });
  await sync();
  return { ok: true };
}

export async function lock() {
  await fetch("/api/session", { method: "DELETE" });
  set({ sync: "locked" });
}

function subscribe(listener: () => void) {
  start();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const serverState: State = { progress: emptyProgress(), sync: "loading", storageOk: true };

function useStore(): State {
  return useSyncExternalStore(subscribe, () => state, () => serverState);
}

export function useProgress(): Progress {
  return useStore().progress;
}

export function useSyncStatus(): SyncStatus {
  return useStore().sync;
}

export function useStorageAvailable(): boolean {
  return useStore().storageOk;
}

export function getLessonProgress(p: Progress, id: number): LessonProgress {
  return p.lessons[String(id)] ?? { visited: false, done: false, quizBest: null };
}

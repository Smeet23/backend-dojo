import { describe, expect, it } from "vitest";
import { applyEvents, emptyProgress, mergeProgress, parseEvents, parseProgress, type Progress } from "./progress-model";

const progress = (p: Partial<Progress>): Progress => ({ ...emptyProgress(), ...p });

describe("parseEvents", () => {
  it("accepts well-formed events", () => {
    const r = parseEvents({
      events: [
        { type: "visit", lectureKey: "backend:21.1" },
        { type: "answer", questionId: "http-409-duplicate-folder", score: 0.5 },
        { type: "quiz", course: "system-design", lectureKey: null, scorePct: 80, questionCount: 10 },
        { type: "quiz", course: "backend", lectureKey: "backend:5", scorePct: 90, questionCount: 12 },
      ],
    });
    expect(r.ok).toBe(true);
  });

  it("reports every invalid event", () => {
    const r = parseEvents({
      events: [
        { type: "visit", lectureKey: 5 },
        { type: "answer", questionId: "DROP TABLE", score: 1 },
        { type: "quiz", course: "backend", lectureKey: "backend:5", scorePct: 120, questionCount: 3 },
        { type: "quiz", course: "backend", lectureKey: "hld:5", scorePct: 50, questionCount: 3 },
        { type: "nope" },
      ],
    });
    expect(r).toEqual({
      ok: false,
      errors: ["events[0] is invalid", "events[1] is invalid", "events[2] is invalid", "events[3] is invalid", "events[4] is invalid"],
    });
  });

  it("rejects missing, empty and oversized batches", () => {
    expect(parseEvents({}).ok).toBe(false);
    expect(parseEvents({ events: [] }).ok).toBe(false);
    expect(parseEvents({ events: Array(51).fill({ type: "visit", lectureKey: "backend:1" }) }).ok).toBe(false);
  });
});

describe("parseProgress", () => {
  it("keeps valid fields and drops junk", () => {
    const p = parseProgress({
      lessons: { "backend:5": { visited: true, done: true, quizBest: 85 }, "hld:3": { visited: true, done: false, quizBest: 999 } },
      misses: { "http-a": 2, "bad id!": 3, "http-b": -1 },
      lastLecture: "backend:5",
    });
    expect(p).toEqual({
      version: 2,
      lessons: { "backend:5": { visited: true, done: true, quizBest: 85 }, "hld:3": { visited: true, done: false, quizBest: null } },
      misses: { "http-a": 2 },
      lastLecture: "backend:5",
    });
  });

  it("upgrades pre-course progress to the backend course", () => {
    const p = parseProgress({
      version: 1,
      lessons: { "5": { visited: true, done: true, quizBest: 70 }, "21.1": { visited: true, done: false, quizBest: null } },
      misses: {},
      lastLecture: 21.1,
    });
    expect(Object.keys(p!.lessons)).toEqual(["backend:5", "backend:21.1"]);
    expect(p!.lastLecture).toBe("backend:21.1");
  });

  it("rejects non-objects", () => {
    expect(parseProgress(null)).toBeNull();
    expect(parseProgress({ lessons: "x", misses: {} })).toBeNull();
  });
});

describe("mergeProgress", () => {
  it("never loses progress from either side", () => {
    const server = progress({
      lessons: { "backend:5": { visited: true, done: true, quizBest: 70 } },
      misses: { a: 1, b: 4 },
      lastLecture: "backend:5",
    });
    const local = progress({
      lessons: { "backend:5": { visited: true, done: false, quizBest: 90 }, "backend:6": { visited: true, done: false, quizBest: null } },
      misses: { a: 3 },
      lastLecture: "backend:6",
    });
    expect(mergeProgress(server, local)).toEqual({
      version: 2,
      lessons: { "backend:5": { visited: true, done: true, quizBest: 90 }, "backend:6": { visited: true, done: false, quizBest: null } },
      misses: { a: 3, b: 4 },
      lastLecture: "backend:5",
    });
  });

  it("is idempotent", () => {
    const p = progress({ lessons: { "backend:1": { visited: true, done: true, quizBest: 50 } }, misses: { x: 2 } });
    expect(mergeProgress(p, p)).toEqual(p);
  });
});

describe("applyEvents", () => {
  it("tracks visits, best score and net misses", () => {
    const p = applyEvents(emptyProgress(), [
      { type: "visit", lectureKey: "backend:5" },
      { type: "quiz", course: "backend", lectureKey: "backend:5", scorePct: 60, questionCount: 10 },
      { type: "quiz", course: "backend", lectureKey: "backend:5", scorePct: 40, questionCount: 10 },
      { type: "answer", questionId: "q", score: 0 },
      { type: "answer", questionId: "q", score: 0.5 },
      { type: "answer", questionId: "q", score: 1 },
      { type: "answer", questionId: "r", score: 1 },
    ]);
    expect(p.lessons["backend:5"]).toEqual({ visited: true, done: true, quizBest: 60 });
    expect(p.misses).toEqual({ q: 1 });
    expect(p.lastLecture).toBe("backend:5");
  });

  it("keeps courses separate", () => {
    const p = applyEvents(emptyProgress(), [
      { type: "visit", lectureKey: "backend:3" },
      { type: "visit", lectureKey: "hld:3" },
    ]);
    expect(Object.keys(p.lessons)).toEqual(["backend:3", "hld:3"]);
  });

  it("ignores mixed-practice quizzes for lesson progress", () => {
    expect(applyEvents(emptyProgress(), [{ type: "quiz", course: "backend", lectureKey: null, scorePct: 90, questionCount: 10 }]).lessons).toEqual({});
  });
});

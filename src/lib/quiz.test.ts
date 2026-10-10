import { describe, expect, it } from "vitest";
import { eligibleQuestions, grade, pickWeighted, shuffle } from "./quiz";
import type { Question } from "./types";

const scenario: Question = {
  id: "s",
  lectures: [5],
  tags: [],
  type: "scenario",
  prompt: "",
  explanation: "",
  lessonAnchor: "x",
  fields: [
    { label: "Method", options: ["GET", "POST"], answer: "POST" },
    { label: "Status", options: ["200", "201"], answer: "201" },
  ],
};

const mcq: Question = { id: "m", lectures: [5], tags: [], type: "mcq", prompt: "", explanation: "", lessonAnchor: "x", options: ["a", "b"], answer: "b" };

const order: Question = { id: "o", lectures: [5, 8], tags: [], type: "order", prompt: "", explanation: "", lessonAnchor: "x", steps: ["1", "2", "3", "4"] };

describe("grade", () => {
  it("gives partial credit per scenario field", () => {
    expect(grade(scenario, { type: "scenario", values: ["POST", "201"] })).toBe(1);
    expect(grade(scenario, { type: "scenario", values: ["POST", "200"] })).toBe(0.5);
    expect(grade(scenario, { type: "scenario", values: ["", ""] })).toBe(0);
  });

  it("grades mcq all-or-nothing", () => {
    expect(grade(mcq, { type: "mcq", value: "b" })).toBe(1);
    expect(grade(mcq, { type: "mcq", value: "a" })).toBe(0);
  });

  it("gives order credit per correctly placed step", () => {
    expect(grade(order, { type: "order", sequence: ["1", "2", "3", "4"] })).toBe(1);
    expect(grade(order, { type: "order", sequence: ["1", "2", "4", "3"] })).toBe(0.5);
  });

  it("scores a mismatched response type as zero", () => {
    expect(grade(mcq, { type: "scenario", values: ["b"] })).toBe(0);
  });
});

describe("shuffle", () => {
  it("keeps every item", () => {
    expect(shuffle([1, 2, 3, 4, 5]).sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("eligibleQuestions", () => {
  it("only includes questions whose lectures are all completed", () => {
    const pool = [scenario, order];
    expect(eligibleQuestions(pool, new Set([5])).map((q) => q.id)).toEqual(["s"]);
    expect(eligibleQuestions(pool, new Set([5, 8])).map((q) => q.id)).toEqual(["s", "o"]);
  });
});

describe("pickWeighted", () => {
  it("returns unique questions, capped at the pool size", () => {
    const picked = pickWeighted([scenario, mcq, order], {}, 10);
    expect(picked).toHaveLength(3);
    expect(new Set(picked.map((q) => q.id)).size).toBe(3);
  });

  it("favours frequently missed questions", () => {
    let mFirst = 0;
    for (let i = 0; i < 2000; i++) {
      if (pickWeighted([scenario, mcq], { m: 5 }, 1)[0].id === "m") mFirst++;
    }
    // weight 11 vs 1 → about 92%
    expect(mFirst / 2000).toBeGreaterThan(0.85);
  });

  it("is deterministic with an injected random source", () => {
    const zero = () => 0;
    expect(pickWeighted([scenario, mcq, order], {}, 3, zero).map((q) => q.id)).toEqual(["s", "m", "o"]);
  });
});

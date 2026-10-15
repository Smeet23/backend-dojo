import { describe, expect, it } from "vitest";
import { buildLessonText, lessonSections } from "../../../scripts/gen-lesson-text.mjs";
import type { GeneratedQuestion } from "@/lib/ai-schemas";
import type { Course, Lecture, Question } from "@/lib/types";
import { answerKey, responseText } from "@/lib/quiz";
import { toQuestion } from "./validate";
import { fallbackModel } from "./models";
import type { LanguageModelV4 } from "@ai-sdk/provider";

// The catalog imports MDX, which vitest can't load, so read lectures and quizzes directly (as content.test.ts does).
const courseModules = import.meta.glob<{ course: Course; lectures: Lecture[] }>("../../content/courses/*/lectures.ts", { eager: true });
const quizModules = import.meta.glob<{ quiz: Question[] }>("../../content/courses/*/*/quiz.ts", { eager: true });
const backendLectures = Object.values(courseModules).find((m) => m.course.id === "backend")!.lectures;

describe("lesson text", () => {
  it("drops imports and JSX, keeps code, and ids match rehype-slug", () => {
    const sections = lessonSections(`import { X } from "@/x";

## What it is

Plain **text**.

<X />

<Callout kind="tip">
Inside a callout.
</Callout>

## What it is

\`\`\`ts
<NotJsx />
\`\`\`
`);
    expect(sections.map((s: { id: string }) => s.id)).toEqual(["what-it-is", "what-it-is-1"]);
    expect(sections[0].text).toContain("Plain **text**.");
    expect(sections[0].text).toContain("Inside a callout.");
    expect(sections[0].text).not.toMatch(/<X|<Callout|import/);
    expect(sections[1].text).toContain("<NotJsx />");
  });

  it("covers every available lecture, and every quiz anchor is a section", () => {
    const text = buildLessonText();
    for (const { course, lectures } of Object.values(courseModules)) {
      for (const l of lectures.filter((x) => x.available)) expect(text[`${course.id}/${l.slug}`], `${course.id}/${l.slug}`).toBeDefined();
    }
    for (const [file, { quiz }] of Object.entries(quizModules)) {
      const [course, folder] = file.split("/").slice(-3, -1);
      const ids = (text[`${course}/${folder.replace(/^[\d.]+-/, "")}`] as { id: string }[]).map((s) => s.id);
      for (const q of quiz) expect(ids, q.id).toContain(q.lessonAnchor);
    }
  });
});

describe("toQuestion", () => {
  const base: GeneratedQuestion = {
    type: "mcq",
    lectureId: 13,
    lessonAnchor: "what-caching-is",
    prompt: "Your product page is slow because every view runs the same heavy query. What helps most?",
    tags: ["caching"],
    options: ["Cache the result", "Add an index on a random column", "Buy a bigger load balancer", "Log more"],
    answer: "Cache the result",
    fields: [],
    explanation: "The same result is computed over and over, so caching it removes the repeated work.",
  };

  it("accepts a valid mcq and gives it an ai- id", () => {
    const r = toQuestion("backend", backendLectures, base);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.question.id).toMatch(/^ai-backend-[a-z0-9]{8}$/);
      expect(r.question.lectures).toEqual([13]);
    }
  });

  it("rejects unknown lectures and anchors, and answers outside the options", () => {
    expect(toQuestion("backend", backendLectures, { ...base, lectureId: 999 }).ok).toBe(false);
    expect(toQuestion("backend", backendLectures, { ...base, lessonAnchor: "nope" }).ok).toBe(false);
    expect(toQuestion("backend", backendLectures, { ...base, answer: "Something else" }).ok).toBe(false);
    expect(toQuestion("backend", backendLectures, { ...base, options: ["A", "A", "B", "Cache the result"] }).ok).toBe(false);
  });

  it("validates scenario fields", () => {
    const scenario: GeneratedQuestion = { ...base, type: "scenario", options: [], answer: "", fields: [{ label: "Fix", options: ["Cache", "Index"], answer: "Cache" }] };
    expect(toQuestion("backend", backendLectures, scenario).ok).toBe(true);
    expect(toQuestion("backend", backendLectures, { ...scenario, fields: [{ label: "Fix", options: ["Cache", "Index"], answer: "Shard" }] }).ok).toBe(false);
    expect(toQuestion("backend", backendLectures, { ...scenario, fields: [] }).ok).toBe(false);
  });
});

describe("answer formatting", () => {
  it("writes out the key and the learner's response", () => {
    const q = Object.values(quizModules).flatMap((m) => m.quiz).find((x) => x.type === "scenario");
    if (!q || q.type !== "scenario") throw new Error("no scenario question found");
    expect(answerKey(q)).toContain(q.fields[0].answer);
    expect(responseText(q, { type: "scenario", values: q.fields.map(() => "") })).toContain("(blank)");
  });
});

describe("fallbackModel", () => {
  const model = (id: string, fail: boolean): LanguageModelV4 =>
    ({
      specificationVersion: "v4",
      provider: "test",
      modelId: id,
      supportedUrls: {},
      doGenerate: async () => {
        if (fail) throw new Error(`${id} overloaded`);
        return { id } as never;
      },
      doStream: async () => {
        if (fail) throw new Error(`${id} overloaded`);
        return { id } as never;
      },
    }) as LanguageModelV4;

  it("uses the first model that works", async () => {
    const m = fallbackModel([model("a", true), model("b", false), model("c", false)]);
    expect(await m.doGenerate({} as never)).toEqual({ id: "b" });
    expect(await m.doStream({} as never)).toEqual({ id: "b" });
  });

  it("throws the last error when every model fails", async () => {
    const m = fallbackModel([model("a", true), model("b", true)]);
    await expect(m.doGenerate({} as never)).rejects.toThrow("b overloaded");
  });
});

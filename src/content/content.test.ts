import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import GithubSlugger from "github-slugger";
import { compile } from "@mdx-js/mdx";
import remarkGfm from "remark-gfm";
import { lectures } from "./lectures";
import type { Question } from "@/lib/types";

/** Every lecture folder's quiz, discovered automatically (e.g. "05-http"). */
const modules = import.meta.glob<{ quiz: Question[] }>("./*/quiz.ts", { eager: true });
const quizzes: Record<string, Question[]> = Object.fromEntries(
  Object.entries(modules).map(([file, mod]) => [file.split("/")[1], mod.quiz]),
);

/** Heading ids exactly as rehype-slug generates them (code blocks skipped). */
function headingIds(mdx: string): Set<string> {
  const slugger = new GithubSlugger();
  const ids = new Set<string>();
  let inFence = false;
  for (const line of mdx.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    if (inFence) continue;
    const match = /^#{1,6}\s+(.+?)\s*$/.exec(line);
    if (match) ids.add(slugger.slug(match[1].replace(/`/g, "")));
  }
  return ids;
}

const contentDir = path.join(__dirname);
const folders = readdirSync(contentDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

describe("course content", () => {
  it("every lecture folder has a quiz exporting `quiz`", () => {
    for (const folder of folders) expect(quizzes[folder], folder).toBeDefined();
  });

  it("question ids are unique across the whole course", () => {
    const ids = Object.values(quizzes).flat().map((q) => q.id);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dupes).toEqual([]);
  });

  for (const folder of folders) {
    describe(folder, () => {
      const source = readFileSync(path.join(contentDir, folder, "lesson.mdx"), "utf8");
      const ids = headingIds(source);
      const quiz = quizzes[folder] ?? [];

      it("lesson.mdx compiles", async () => {
        await compile(source, { remarkPlugins: [remarkGfm] });
      });

      it("has at least 3 questions", () => {
        expect(quiz.length).toBeGreaterThanOrEqual(3);
      });

      for (const q of quiz) {
        it(`${q.id} is well-formed`, () => {
          expect(ids, `anchor "${q.lessonAnchor}" missing from lesson`).toContain(q.lessonAnchor);
          for (const l of q.lectures) expect(lectures.some((x) => x.id === l), `unknown lecture ${l}`).toBe(true);
          if (q.type === "scenario") {
            expect(q.fields.length).toBeGreaterThan(0);
            for (const f of q.fields) {
              expect(f.options, f.label).toContain(f.answer);
              expect(new Set(f.options).size, `${f.label} has duplicate options`).toBe(f.options.length);
            }
          }
          if (q.type === "mcq") {
            expect(q.options).toContain(q.answer);
            expect(new Set(q.options).size).toBe(q.options.length);
          }
          if (q.type === "order") {
            expect(q.steps.length).toBeGreaterThanOrEqual(3);
            expect(new Set(q.steps).size).toBe(q.steps.length);
          }
        });
      }
    });
  }
});

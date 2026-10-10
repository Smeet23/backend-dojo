import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import GithubSlugger from "github-slugger";
import { roadmapQuiz } from "./01-roadmap/quiz";
import { pathQuiz } from "./02-path-of-a-backend-engineer/quiz";
import { backendQuiz } from "./03-what-is-a-backend/quiz";
import { principlesQuiz } from "./04-first-principles/quiz";
import { httpQuiz } from "./05-http/quiz";
import { lectures } from "./lectures";
import type { Question } from "@/lib/types";

/** Every lecture folder's quiz, keyed by folder name (e.g. "05-http"). */
const quizzes: Record<string, Question[]> = {
  "01-roadmap": roadmapQuiz,
  "02-path-of-a-backend-engineer": pathQuiz,
  "03-what-is-a-backend": backendQuiz,
  "04-first-principles": principlesQuiz,
  "05-http": httpQuiz,
};

/** Heading ids exactly as rehype-slug generates them. */
function headingIds(mdx: string): Set<string> {
  const slugger = new GithubSlugger();
  const ids = new Set<string>();
  for (const line of mdx.split("\n")) {
    const match = /^#{1,6}\s+(.+?)\s*$/.exec(line);
    if (match) ids.add(slugger.slug(match[1]));
  }
  return ids;
}

const contentDir = path.join(__dirname);

describe("course content", () => {
  it("registers a quiz for every lecture folder", () => {
    const folders = readdirSync(contentDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
    expect(folders.sort()).toEqual(Object.keys(quizzes).sort());
  });

  for (const [folder, quiz] of Object.entries(quizzes)) {
    describe(folder, () => {
      const ids = headingIds(readFileSync(path.join(contentDir, folder, "lesson.mdx"), "utf8"));

      it("has unique question ids", () => {
        expect(new Set(quiz.map((q) => q.id)).size).toBe(quiz.length);
      });

      for (const q of quiz) {
        it(`${q.id} is well-formed`, () => {
          expect(ids, `anchor "${q.lessonAnchor}" missing from lesson`).toContain(q.lessonAnchor);
          expect(q.lectures.every((l) => lectures.some((x) => x.id === l))).toBe(true);
          if (q.type === "scenario") {
            for (const f of q.fields) expect(f.options, f.label).toContain(f.answer);
          }
          if (q.type === "mcq") expect(q.options).toContain(q.answer);
          if (q.type === "order") {
            expect(q.steps.length).toBeGreaterThanOrEqual(3);
            expect(new Set(q.steps).size).toBe(q.steps.length);
          }
        });
      }
    });
  }
});

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import GithubSlugger from "github-slugger";
import { compile } from "@mdx-js/mdx";
import remarkGfm from "remark-gfm";
import type { Course, Lecture, Question } from "@/lib/types";

/** Every lecture quiz in every course, discovered automatically: "<course>/<folder>". */
const quizModules = import.meta.glob<{ quiz: Question[] }>("./courses/*/*/quiz.ts", { eager: true });
const courseModules = import.meta.glob<{ course: Course; lectures: Lecture[] }>("./courses/*/lectures.ts", { eager: true });

const quizzes: Record<string, Question[]> = Object.fromEntries(
  Object.entries(quizModules).map(([file, mod]) => [file.split("/").slice(2, 4).join("/"), mod.quiz]),
);
const courseMeta: Record<string, { course: Course; lectures: Lecture[] }> = Object.fromEntries(
  Object.entries(courseModules).map(([file, mod]) => [file.split("/")[2], mod]),
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

const coursesDir = path.join(__dirname, "courses");
const courseIds = readdirSync(coursesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

it("question ids are unique across every course", () => {
  const ids = Object.values(quizzes).flat().map((q) => q.id);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  expect(dupes).toEqual([]);
});

for (const courseId of courseIds) {
  describe(`course ${courseId}`, () => {
    const meta = courseMeta[courseId];
    const folders = readdirSync(path.join(coursesDir, courseId), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();

    it("has lectures.ts with matching course id", () => {
      expect(meta, "lectures.ts missing").toBeDefined();
      expect(meta.course.id).toBe(courseId);
    });

    it("every available lecture has a lesson folder, and every folder a lecture", () => {
      const slugs = new Set(folders.map((f) => f.replace(/^[\d.]+-/, "")));
      for (const l of meta.lectures.filter((x) => x.available)) expect(slugs, `no folder for ${l.slug}`).toContain(l.slug);
      for (const s of slugs) expect(meta.lectures.some((l) => l.slug === s), `no lecture entry for folder ${s}`).toBe(true);
    });

    it("lecture ids and slugs are unique", () => {
      expect(new Set(meta.lectures.map((l) => l.id)).size).toBe(meta.lectures.length);
      expect(new Set(meta.lectures.map((l) => l.slug)).size).toBe(meta.lectures.length);
    });

    for (const folder of folders) {
      describe(folder, () => {
        const lessonPath = path.join(coursesDir, courseId, folder, "lesson.mdx");
        const source = existsSync(lessonPath) ? readFileSync(lessonPath, "utf8") : "";
        const ids = headingIds(source);
        const quiz = quizzes[`${courseId}/${folder}`] ?? [];

        it("has lesson.mdx and quiz.ts", () => {
          expect(source.length, "lesson.mdx missing or empty").toBeGreaterThan(0);
          expect(quizzes[`${courseId}/${folder}`], "quiz.ts must export `quiz`").toBeDefined();
        });

        it("lesson.mdx compiles", async () => {
          await compile(source, { remarkPlugins: [remarkGfm] });
        });

        it("has at least 3 questions", () => {
          expect(quiz.length).toBeGreaterThanOrEqual(3);
        });

        for (const q of quiz) {
          it(`${q.id} is well-formed`, () => {
            expect(ids, `anchor "${q.lessonAnchor}" missing from lesson`).toContain(q.lessonAnchor);
            for (const l of q.lectures) expect(meta.lectures.some((x) => x.id === l), `unknown lecture ${l}`).toBe(true);
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
}

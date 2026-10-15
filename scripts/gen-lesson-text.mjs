// Generates src/content/generated/lesson-text.json: every lesson as plain text, split into
// sections keyed by heading id, so the AI features can ground answers in the lesson itself.
// Run `pnpm content:text` after editing lessons (the build runs it too).
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import GithubSlugger from "github-slugger";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const coursesDir = path.join(root, "src", "content", "courses");
const outFile = path.join(root, "src", "content", "generated", "lesson-text.json");

/** Splits one lesson's MDX into sections, dropping imports and JSX (widgets, callout tags). */
export function lessonSections(mdx) {
  const slugger = new GithubSlugger();
  const sections = [{ id: "", heading: "", text: [] }];
  let inFence = false;
  for (const line of mdx.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    if (!inFence) {
      if (/^import\s/.test(line)) continue;
      // Self-closing or opening/closing JSX tags on their own line (widgets, <Callout>).
      if (/^\s*<\/?[A-Z][\w.]*[^>]*>\s*$/.test(line)) continue;
      const h = /^(#{2,6})\s+(.+?)\s*$/.exec(line);
      if (h) {
        const heading = h[2].replace(/`/g, "");
        sections.push({ id: slugger.slug(heading), heading, text: [] });
        continue;
      }
    }
    sections.at(-1).text.push(line);
  }
  return sections
    .map((s) => ({ id: s.id, heading: s.heading, text: s.text.join("\n").replace(/\n{3,}/g, "\n\n").trim() }))
    .filter((s) => s.heading || s.text);
}

/** { "<course>/<slug>": Section[] } for every lesson folder. */
export function buildLessonText() {
  const out = {};
  for (const course of readdirSync(coursesDir, { withFileTypes: true })) {
    if (!course.isDirectory()) continue;
    for (const folder of readdirSync(path.join(coursesDir, course.name), { withFileTypes: true })) {
      const file = path.join(coursesDir, course.name, folder.name, "lesson.mdx");
      if (!folder.isDirectory() || !existsSync(file)) continue;
      out[`${course.name}/${folder.name.replace(/^[\d.]+-/, "")}`] = lessonSections(readFileSync(file, "utf8"));
    }
  }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

export const serialize = (data) => JSON.stringify(data) + "\n";

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  mkdirSync(path.dirname(outFile), { recursive: true });
  const data = buildLessonText();
  writeFileSync(outFile, serialize(data));
  console.log(`lesson-text.json: ${Object.keys(data).length} lessons`);
}

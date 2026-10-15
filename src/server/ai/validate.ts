import "server-only";
import type { Lecture, Question } from "@/lib/types";
import type { GeneratedQuestion } from "@/lib/ai-schemas";
import { lessonSectionsFor } from "./lesson-text";

function randomId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => (b % 36).toString(36)).join("");
}

/**
 * Turns a generated question into a real Question, or explains why it's unusable.
 * Same rules as the content tests: known lecture and anchor, answers among the options,
 * no duplicate options.
 */
export function toQuestion(courseId: string, lectures: Lecture[], g: GeneratedQuestion): { ok: true; question: Question } | { ok: false; reason: string } {
  const lecture = lectures.find((l) => l.available && l.id === g.lectureId);
  if (!lecture) return { ok: false, reason: `unknown lecture ${g.lectureId}` };
  if (!lessonSectionsFor(courseId, lecture.slug).some((s) => s.id === g.lessonAnchor)) return { ok: false, reason: `unknown anchor ${g.lessonAnchor}` };
  const prompt = g.prompt.trim();
  const explanation = g.explanation.trim();
  if (prompt.length < 20 || !explanation) return { ok: false, reason: "prompt or explanation too short" };
  const unique = (xs: string[]) => new Set(xs).size === xs.length;
  const base = {
    id: `ai-${courseId}-${randomId()}`,
    lectures: [lecture.id],
    tags: g.tags.slice(0, 5),
    prompt,
    explanation,
    lessonAnchor: g.lessonAnchor,
  };
  if (g.type === "mcq") {
    const options = g.options.map((o) => o.trim()).filter(Boolean);
    if (options.length < 3 || !unique(options) || !options.includes(g.answer.trim())) return { ok: false, reason: "bad mcq options" };
    return { ok: true, question: { ...base, type: "mcq", options, answer: g.answer.trim() } };
  }
  const fields = g.fields.map((f) => ({ label: f.label.trim(), options: f.options.map((o) => o.trim()).filter(Boolean), answer: f.answer.trim() }));
  if (fields.length < 1 || fields.length > 4) return { ok: false, reason: "bad field count" };
  for (const f of fields) {
    if (!f.label || f.options.length < 2 || !unique(f.options) || !f.options.includes(f.answer)) return { ok: false, reason: `bad field ${f.label}` };
  }
  return { ok: true, question: { ...base, type: "scenario", fields } };
}

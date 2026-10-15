import "server-only";
import { z } from "zod";
import { getCourse } from "@/content/catalog";
import { lessonSectionsFor, lessonText } from "./lessons";

export const interviewSetup = z.object({
  courseId: z.string().max(40),
  /** Lectures to draw on; empty means the whole course. */
  lectureIds: z.array(z.number()).max(12),
  mode: z.enum(["concepts", "design"]),
});
export type InterviewSetup = z.infer<typeof interviewSetup>;

/** What the interviewer knows about the chosen material: full text for 1-2 lectures, outlines otherwise. */
export function interviewMaterial({ courseId, lectureIds }: InterviewSetup): string | null {
  const course = getCourse(courseId);
  if (!course) return null;
  const lectures = course.lectures.filter((l) => l.available && (lectureIds.length === 0 || lectureIds.includes(l.id)));
  if (lectures.length === 0) return null;
  if (lectures.length <= 2) {
    return lectures.map((l) => `# Lecture ${l.id}: ${l.title} [slug ${l.slug}]\n\n${lessonText(courseId, l.slug, 12_000)}`).join("\n\n");
  }
  return lectures
    .map((l) => {
      const headings = lessonSectionsFor(courseId, l.slug).filter((s) => s.heading && s.heading !== "Cheat sheet").map((s) => s.heading);
      return `- Lecture ${l.id}: ${l.title} [slug ${l.slug}] — ${l.summary}\n  Sections: ${headings.join("; ")}`;
    })
    .join("\n");
}

export function interviewerInstructions(setup: InterviewSetup, material: string): string {
  const course = getCourse(setup.courseId)!.course;
  const style =
    setup.mode === "design"
      ? `Run a system design interview. Open with one realistic design prompt that fits the material (e.g. "design a URL shortener").
Guide it like a real interviewer: requirements and scale first, then APIs and data model, high-level architecture, then deep dives
into bottlenecks, failure modes and trade-offs. Push back on hand-waving with "what happens when…" follow-ups.`
      : `Run a technical concepts interview. Ask scenario-style questions ("your API starts returning 502s after a deploy — walk me through it"),
not definitions. After each answer, either ask a sharp follow-up that probes the weakest part of it or move to a new topic.`;
  return `You are an experienced, fair interviewer at a strong product company. The candidate is practising for backend / system design interviews
using the course "${course.title}".

${style}

Rules:
- Ask exactly ONE question per turn, then stop and wait. Keep each turn under ~120 words.
- Don't lecture or reveal full answers during the interview; a short hint is fine if they're stuck or ask for one.
- Briefly acknowledge what was good in an answer before probing further, as a real interviewer would.
- Cover several different topics from the material over roughly 6-8 questions.
- When the candidate says they're done, thank them in one line (the scorecard is produced separately).
- Use Markdown sparingly.

MATERIAL THIS INTERVIEW COVERS
${material}`;
}

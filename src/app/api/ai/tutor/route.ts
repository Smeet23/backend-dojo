import { z } from "zod";
import { getCourse, getLecture } from "@/content/catalog";
import { readJson } from "@/server/auth";
import { aiRoute, badRequest } from "@/server/ai/guard";
import { chatMessages, streamChat } from "@/server/ai/chat";
import { catalogOutline, lessonText } from "@/server/ai/lessons";

const body = z.object({ courseId: z.string().max(40), slug: z.string().max(80), messages: chatMessages });

/** "Ask about this lesson": a tutor grounded in the lesson the learner is reading. */
export const POST = aiRoute(async (req) => {
  const parsed = body.safeParse(await readJson(req));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
  const { courseId, slug, messages } = parsed.data;
  const course = getCourse(courseId);
  const lecture = getLecture(courseId, slug);
  if (!course || !lecture) return badRequest("Unknown lesson");

  return streamChat(
    `You are a friendly, sharp senior engineer tutoring one learner through the lesson below
("${course.course.title}", lecture ${lecture.id}: ${lecture.title}).

- Ground answers in the lesson. If you go beyond it, say so briefly, and stay accurate.
- Prefer concrete examples: real systems, numbers, requests, code or SQL snippets.
- Keep answers tight: short paragraphs or bullets, under ~250 words unless asked for more.
- Use Markdown (bold, lists, fenced code). No top-level headings.
- For flashcards, use "**Q:** … / **A:** …" pairs.
- For links to other lessons, refer to them by course and lecture title; the full catalogue is listed below.
- If asked something unrelated to software engineering, steer back to the lesson.

THE LESSON
${lessonText(courseId, slug)}

ALL COURSES IN THE APP
${catalogOutline()}`,
    messages,
  );
});

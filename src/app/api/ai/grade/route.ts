import { generateText, Output } from "ai";
import { z } from "zod";
import { getDb } from "@/db";
import { readJson } from "@/server/auth";
import { aiRoute, badRequest } from "@/server/ai/guard";
import { quickModel } from "@/server/ai/models";
import { lectureById, sectionText } from "@/server/ai/lessons";
import { answerKey } from "@/lib/quiz";
import { loadQuestion } from "@/server/ai/questions-repo";
import { gradeSchema } from "@/lib/ai-schemas";

const body = z.object({ questionId: z.string().max(100), answer: z.string().trim().min(1).max(4000) });

/** Grades an answer written in the learner's own words against the question's answer key. */
export const POST = aiRoute(async (req) => {
  const parsed = body.safeParse(await readJson(req));
  if (!parsed.success) return badRequest("Send a questionId and an answer (up to 4,000 characters)");
  const found = await loadQuestion(getDb(), parsed.data.questionId);
  if (!found) return badRequest("Unknown question");
  const { courseId, question } = found;
  const lecture = lectureById(courseId, question.lectures[0]);

  const { output } = await generateText({
    model: quickModel(),
    maxRetries: 0,
    output: Output.object({ schema: gradeSchema }),
    instructions: `You are a senior engineer grading a learner's free-text answer to a scenario question.
Grade against the answer key and the lesson excerpt; they are the source of truth.
Reward correct reasoning even if worded differently or if it doesn't name the exact option. Penalise wrong claims.
Score guide: 90-100 fully right with reasoning; 70-89 right decision, thin reasoning; 40-69 partly right; 0-39 wrong or off-topic.
Be specific and kind. Write in plain English for a learner; use Markdown sparingly (inline code is fine).`,
    prompt: `QUESTION
${question.prompt}

ANSWER KEY
${answerKey(question)}

WHY
${question.explanation}

LESSON EXCERPT (${lecture?.title ?? "lesson"})
${lecture ? sectionText(courseId, lecture.slug, question.lessonAnchor, 4000) : "(none)"}

LEARNER'S ANSWER
${parsed.data.answer}`,
  });
  return Response.json(output);
});

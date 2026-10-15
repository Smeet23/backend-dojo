import { generateText, Output } from "ai";
import { z } from "zod";
import { getDb } from "@/db";
import { readJson } from "@/server/auth";
import { aiRoute, badRequest } from "@/server/ai/guard";
import { quickModel } from "@/server/ai/models";
import { sectionText } from "@/server/ai/lesson-text";
import { getWritten } from "@/server/ai/written";
import { gradeSchema } from "@/lib/ai-schemas";

const body = z.object({
  courseId: z.string().max(40),
  slug: z.string().max(80),
  questionId: z.string().max(140),
  answer: z.string().trim().min(1).max(4000),
});

/** Grades an "Explain it" answer against that question's key points. */
export const POST = aiRoute(async (req) => {
  const parsed = body.safeParse(await readJson(req));
  if (!parsed.success) return badRequest("Send the lesson, questionId and an answer (up to 4,000 characters)");
  const { courseId, slug, questionId, answer } = parsed.data;
  const question = (await getWritten(getDb(), courseId, slug))?.find((q) => q.id === questionId);
  if (!question) return badRequest("Unknown question");

  const { output } = await generateText({
    model: quickModel(),
    maxRetries: 0,
    output: Output.object({ schema: gradeSchema }),
    instructions: `You are a senior engineer grading a learner's written answer to an open question.
Judge it against the KEY POINTS (use them, in order, as the "points" you return) and the lesson excerpt.
Reward correct reasoning in the learner's own words; penalise wrong claims. A point is "partial" if it's gestured at but vague.
Score guide: 90-100 all points with sound reasoning; 70-89 most points; 40-69 some; 0-39 off-track.
Feedback: specific and kind, 2-4 sentences. modelAnswer: return the reference answer given, lightly tightened.`,
    prompt: `QUESTION
${question.prompt}

KEY POINTS
${question.keyPoints.map((p) => `- ${p}`).join("\n")}

REFERENCE ANSWER
${question.modelAnswer}

LESSON EXCERPT
${sectionText(courseId, slug, question.lessonAnchor, 3500)}

LEARNER'S ANSWER
${answer}`,
  });
  return Response.json(output);
});

import { createTextStreamResponse, streamText, toTextStream } from "ai";
import { z } from "zod";
import { getDb } from "@/db";
import { readJson } from "@/server/auth";
import { aiRoute, badRequest } from "@/server/ai/guard";
import { quickModel } from "@/server/ai/models";
import { lectureById, sectionText } from "@/server/ai/lessons";
import { answerKey, questionText } from "@/lib/quiz";
import { loadQuestion } from "@/server/ai/questions-repo";

const body = z.object({
  questionId: z.string().max(100),
  /** What the learner picked, already formatted for reading. */
  given: z.string().max(4000),
});

/** "Why was I wrong?": explains this learner's specific mistake, streamed as plain text. */
export const POST = aiRoute(async (req) => {
  const parsed = body.safeParse(await readJson(req));
  if (!parsed.success) return badRequest("Send a questionId and the answer given");
  const found = await loadQuestion(getDb(), parsed.data.questionId);
  if (!found) return badRequest("Unknown question");
  const { courseId, question } = found;
  const lecture = lectureById(courseId, question.lectures[0]);

  const result = streamText({
    model: quickModel(),
    maxRetries: 0,
    instructions: `You are a patient senior engineer tutoring a learner who just answered a question wrongly.
Explain why THEIR choice is tempting but wrong in this situation, then why the correct answer fits, using a concrete detail from the scenario.
Finish with a one-line rule of thumb to remember. Under 180 words. Markdown is fine (short paragraphs, **bold**, inline code). No headings.`,
    prompt: `QUESTION
${questionText(question)}

LEARNER ANSWERED
${parsed.data.given}

CORRECT ANSWER
${answerKey(question)}

STANDARD EXPLANATION
${question.explanation}

LESSON EXCERPT
${lecture ? sectionText(courseId, lecture.slug, question.lessonAnchor, 3500) : "(none)"}`,
  });
  return createTextStreamResponse({ stream: toTextStream({ stream: result.stream }) });
});

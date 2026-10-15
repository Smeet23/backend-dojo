import { z } from "zod";

// Shapes the AI must return. Every field is required (empty string/array when unused)
// because strict structured-output modes reject optional fields.

const pct = z.number().int().min(0).max(100);

export const gradeSchema = z.object({
  score: pct.describe("0-100: how completely and correctly the answer covers the key points"),
  verdict: z.string().describe("One short sentence summing up the answer"),
  points: z
    .array(
      z.object({
        point: z.string().describe("A key point a strong answer must make"),
        status: z.enum(["hit", "partial", "miss"]),
        note: z.string().describe("What the learner said about it, or what was missing"),
      }),
    )
    .describe("2-5 key points"),
  feedback: z.string().describe("2-4 sentences of specific, encouraging coaching"),
  modelAnswer: z.string().describe("A concise answer an experienced engineer would give, 3-6 sentences"),
});
export type GradeResult = z.infer<typeof gradeSchema>;

/** Flat question shape for generation; converted to a real Question after validation. */
export const generatedQuestionSchema = z.object({
  type: z.enum(["scenario", "mcq"]),
  lectureId: z.number().describe("Numeric id of the lecture this question is about"),
  lessonAnchor: z.string().describe("Exactly one of the section ids listed for that lecture"),
  prompt: z.string().describe("A realistic situation and what the learner must decide"),
  tags: z.array(z.string()),
  options: z.array(z.string()).describe("mcq only: 4 options; empty for scenario"),
  answer: z.string().describe("mcq only: must equal one option exactly; empty for scenario"),
  fields: z
    .array(z.object({ label: z.string(), options: z.array(z.string()), answer: z.string() }))
    .describe("scenario only: 1-3 dropdowns, each with 3-5 options and the answer equal to one of them; empty for mcq"),
  explanation: z.string().describe("Why the answer is right and why the tempting wrong answer is wrong, 1-3 sentences"),
});
export const generatedQuestionsSchema = z.object({ questions: z.array(generatedQuestionSchema) });
export type GeneratedQuestion = z.infer<typeof generatedQuestionSchema>;

export const scorecardSchema = z.object({
  overall: pct,
  summary: z.string().describe("2-3 sentences on how the interview went"),
  strengths: z.array(z.string()),
  gaps: z.array(
    z.object({
      topic: z.string(),
      advice: z.string().describe("What to study or practise, concretely"),
      lectureSlug: z.string().describe("Slug of the lecture in this course that covers it, or empty"),
    }),
  ),
  nextSteps: z.array(z.string()),
});
export type Scorecard = z.infer<typeof scorecardSchema>;

export const reviewSchema = z.object({
  score: pct,
  summary: z.string().describe("2-3 sentence overall assessment"),
  strengths: z.array(z.string()),
  issues: z.array(
    z.object({
      severity: z.enum(["high", "medium", "low"]),
      title: z.string(),
      detail: z.string().describe("What is wrong or missing, why it matters, and how to fix it"),
      lectureSlug: z.string().describe("Slug of the lecture in this course that covers it, or empty"),
    }),
  ),
  questions: z.array(z.string()).describe("Follow-up questions a reviewer would ask"),
});
export type Review = z.infer<typeof reviewSchema>;

export type AiReport =
  | { id: number; kind: "interview"; title: string; createdAt: string; data: Scorecard }
  | { id: number; kind: "review"; title: string; createdAt: string; data: Review };

import "server-only";
import { generateText, Output } from "ai";
import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import { writtenQuestions } from "@/db/schema";
import type { Lecture } from "@/lib/types";
import { writtenSetSchema, type WrittenQuestion } from "@/lib/ai-schemas";
import { deepModel } from "./models";
import { lessonSectionsFor, lessonText } from "./lesson-text";

const COUNT = 3;

export async function getWritten(db: Db, courseId: string, slug: string): Promise<WrittenQuestion[] | null> {
  const [row] = await db.select().from(writtenQuestions).where(eq(writtenQuestions.lesson, `${courseId}/${slug}`));
  return row ? (row.questions as WrittenQuestion[]) : null;
}

/**
 * Writes the lesson's open questions once and saves them. If two requests race, the first
 * insert wins and both return the saved set.
 */
export async function createWritten(db: Db, courseId: string, lecture: Lecture, existingPrompts: string[]): Promise<WrittenQuestion[]> {
  const anchors = lessonSectionsFor(courseId, lecture.slug).filter((s) => s.id).map((s) => s.id);
  const { output } = await generateText({
    model: deepModel(),
    maxRetries: 0,
    output: Output.object({ schema: writtenSetSchema }),
    instructions: `You write the "Explain it" round for a lesson: exactly ${COUNT} open questions answered in a few sentences of prose.
They follow a multiple-choice quiz, so don't ask which option/status code/method to pick. Instead ask the learner to:
- explain WHY something works or fails in a concrete production situation,
- weigh a trade-off between two reasonable approaches and justify a choice, or
- debug a symptom: likely causes, how to confirm, and the fix.
Each question must be answerable from the lesson in 4-8 sentences. Cover different parts of the lesson.
keyPoints are what the grader checks (3-5, each one specific). lessonAnchor must be one of: ${anchors.join(", ")}`,
    prompt: `LESSON: Lecture ${lecture.id}, ${lecture.title}

The quiz already asks (don't repeat these):
${existingPrompts.map((p) => `- ${p.slice(0, 140)}`).join("\n")}

${lessonText(courseId, lecture.slug)}`,
  });

  const questions = output.questions
    .filter((q) => q.prompt.trim().length > 30 && q.keyPoints.length >= 2 && q.modelAnswer.trim())
    .slice(0, COUNT)
    .map((q, i) => ({
      ...q,
      lessonAnchor: anchors.includes(q.lessonAnchor) ? q.lessonAnchor : (anchors[0] ?? ""),
      keyPoints: q.keyPoints.slice(0, 5),
      id: `w-${courseId}-${lecture.slug}-${i + 1}`,
    }));
  if (questions.length === 0) throw new Error(`No usable written questions for ${courseId}/${lecture.slug}`);

  await db.insert(writtenQuestions).values({ lesson: `${courseId}/${lecture.slug}`, questions }).onConflictDoNothing();
  return (await getWritten(db, courseId, lecture.slug)) ?? questions;
}

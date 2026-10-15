import { generateText, Output } from "ai";
import { eq, like, and } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { lessonProgress } from "@/db/schema";
import { getCourse } from "@/content/catalog";
import { handle, isAuthenticated, readJson, unauthorized } from "@/server/auth";
import { aiRoute, badRequest } from "@/server/ai/guard";
import { deepModel } from "@/server/ai/models";
import { lessonSectionsFor, lessonText } from "@/server/ai/lessons";
import { listAiQuestions, saveAiQuestions, weakLectures } from "@/server/ai/questions-repo";
import { toQuestion } from "@/server/ai/validate";
import { generatedQuestionsSchema } from "@/lib/ai-schemas";
import type { Lecture, Question } from "@/lib/types";

/** AI-written questions saved for a course, newest first. */
export async function GET(req: Request) {
  return handle(async () => {
    if (!(await isAuthenticated())) return unauthorized();
    const course = new URL(req.url).searchParams.get("course") ?? "";
    return Response.json(await listAiQuestions(getDb(), course));
  });
}

const body = z.object({
  courseId: z.string().max(40),
  /** A specific lecture, or null for "my weak spots". */
  lectureId: z.number().nullable(),
  count: z.number().int().min(3).max(8).default(5),
});

/** Writes fresh scenario questions aimed at weak spots (or one lecture), validates and saves them. */
export const POST = aiRoute(async (req) => {
  const parsed = body.safeParse(await readJson(req));
  if (!parsed.success) return badRequest("Send a courseId and a lectureId (or null)");
  const { courseId, lectureId, count } = parsed.data;
  const course = getCourse(courseId);
  if (!course) return badRequest("Unknown course");
  const db = getDb();

  const targets = await pickLectures(courseId, course.lectures, lectureId);
  if (targets.length === 0) return badRequest("Unknown lecture");

  const material = targets
    .map((l) => {
      const sections = lessonSectionsFor(courseId, l.slug).filter((s) => s.id);
      const existing = course.lessons[l.slug]?.quiz.map((q) => `  - ${q.prompt.slice(0, 140)}`).join("\n") ?? "";
      return `# Lecture ${l.id}: ${l.title}
Section ids you may use as lessonAnchor: ${sections.map((s) => s.id).join(", ")}
Existing questions (write different ones):
${existing}

${lessonText(courseId, l.slug, Math.floor(24_000 / targets.length))}`;
    })
    .join("\n\n");

  const { output } = await generateText({
    model: deepModel(),
    maxRetries: 0,
    output: Output.object({ schema: generatedQuestionsSchema }),
    instructions: `You write practice questions for a backend / system design course. Write exactly ${count} NEW questions from the lectures given.
- Mostly "scenario": a realistic production situation (a bug, an outage, a design decision, a code review) with 1-3 dropdown fields
  such as which component, status code, algorithm, consistency level, root cause or fix. Mix in one or two "mcq".
- Test applying the concepts, not recalling definitions. Distractors must be plausible to someone who half-understands.
- Every answer must exactly equal one of its options; no duplicate options; 3-5 options per field, 4 for mcq.
- lectureId must be one of the lecture ids given, and lessonAnchor must be one of that lecture's section ids, copied exactly.
- Spread the questions across the lectures and sections given. Don't repeat the existing questions.`,
    prompt: material,
  });

  const valid: Question[] = [];
  for (const g of output.questions) {
    const r = toQuestion(courseId, course.lectures, g);
    if (r.ok) valid.push(r.question);
    else console.warn("Dropped a generated question:", r.reason);
  }
  if (valid.length === 0) return Response.json({ error: "The AI's questions didn't pass validation. Try again." }, { status: 502 });
  await saveAiQuestions(db, courseId, valid);
  return Response.json({ questions: valid, focus: targets.map((l) => ({ id: l.id, title: l.title })) });
});

/**
 * The lecture asked for; otherwise up to 3 weak-spot lectures, then lectures finished most
 * recently, then the first lectures of the course.
 */
async function pickLectures(courseId: string, lectures: Lecture[], lectureId: number | null): Promise<Lecture[]> {
  const available = lectures.filter((l) => l.available);
  if (lectureId !== null) return available.filter((l) => l.id === lectureId);
  const db = getDb();
  const weak = (await weakLectures(db, courseId)).map((w) => w.lectureId);
  const done = await db
    .select({ key: lessonProgress.lectureId })
    .from(lessonProgress)
    .where(and(like(lessonProgress.lectureId, `${courseId}:%`), eq(lessonProgress.done, true)))
    .orderBy(lessonProgress.updatedAt);
  const doneIds = done.map((d) => Number(d.key.slice(courseId.length + 1))).reverse();
  const order = [...weak, ...doneIds, ...available.map((l) => l.id)];
  const picked: Lecture[] = [];
  for (const id of order) {
    const l = available.find((x) => x.id === id);
    if (l && !picked.includes(l)) picked.push(l);
    if (picked.length === 3) break;
  }
  return picked;
}

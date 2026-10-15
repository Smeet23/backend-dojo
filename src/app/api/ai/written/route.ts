import { z } from "zod";
import { getDb } from "@/db";
import { getCourse, getLecture } from "@/content/catalog";
import { handle, isAuthenticated, readJson, unauthorized } from "@/server/auth";
import { aiRoute, badRequest } from "@/server/ai/guard";
import { createWritten, getWritten } from "@/server/ai/written";

/** The lesson's saved "Explain it" questions, or null if they haven't been written yet (no AI call). */
export async function GET(req: Request) {
  return handle(async () => {
    if (!(await isAuthenticated())) return unauthorized();
    const url = new URL(req.url);
    const course = url.searchParams.get("course") ?? "";
    const slug = url.searchParams.get("slug") ?? "";
    if (!getLecture(course, slug)) return Response.json({ error: "Unknown lesson" }, { status: 400 });
    return Response.json({ questions: await getWritten(getDb(), course, slug) });
  });
}

const body = z.object({ courseId: z.string().max(40), slug: z.string().max(80) });

/** Writes (once) and returns the lesson's "Explain it" questions. */
export const POST = aiRoute(async (req) => {
  const parsed = body.safeParse(await readJson(req));
  if (!parsed.success) return badRequest("Send a courseId and slug");
  const { courseId, slug } = parsed.data;
  const lecture = getLecture(courseId, slug);
  if (!lecture) return badRequest("Unknown lesson");
  const db = getDb();
  const existing = await getWritten(db, courseId, slug);
  if (existing) return Response.json({ questions: existing });
  const quizPrompts = getCourse(courseId)!.lessons[slug]?.quiz.map((q) => q.prompt) ?? [];
  return Response.json({ questions: await createWritten(db, courseId, lecture, quizPrompts) });
});

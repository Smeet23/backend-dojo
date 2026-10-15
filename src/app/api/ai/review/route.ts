import { generateText, Output } from "ai";
import { z } from "zod";
import { getDb } from "@/db";
import { getCourse } from "@/content/catalog";
import { readJson } from "@/server/auth";
import { aiRoute, badRequest } from "@/server/ai/guard";
import { deepModel } from "@/server/ai/models";
import { interviewMaterial } from "@/server/ai/interview";
import { saveReport } from "@/server/ai/reports-repo";
import { reviewSchema } from "@/lib/ai-schemas";

const body = z.object({
  courseId: z.string().max(40),
  lectureIds: z.array(z.number()).max(12),
  title: z.string().trim().min(1).max(120),
  design: z.string().trim().min(80, "Describe your design in a bit more detail (at least a few sentences)").max(20_000),
});

/** Reviews a design or code the learner wrote, against the concepts of the chosen lectures. */
export const POST = aiRoute(async (req) => {
  const parsed = body.safeParse(await readJson(req));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
  const { courseId, lectureIds, title, design } = parsed.data;
  const material = interviewMaterial({ courseId, lectureIds, mode: "design" });
  if (!material) return badRequest("Pick lectures from this course");
  const lectureSlugs = getCourse(courseId)!.lectures.map((l) => l.slug).join(", ");

  const { output } = await generateText({
    model: deepModel(),
    maxRetries: 0,
    output: Output.object({ schema: reviewSchema }),
    instructions: `You are a staff engineer reviewing a learner's design document or code. Review it the way a thoughtful senior colleague would:
correctness first, then failure modes (retries, idempotency, timeouts, data loss, consistency), security, scalability, operability and simplicity.
Ground the review in the course material where it applies, but flag any real problem you see.
Only raise issues that apply to what was written; don't pad. Order issues by severity.
score: 85+ production-ready, 70-84 solid with gaps, 50-69 needs work, below 50 major problems.
For each issue, set lectureSlug to the most relevant slug from this list, or "" if none fits: ${lectureSlugs}`,
    prompt: `COURSE MATERIAL IN SCOPE\n${material}\n\nTHE DESIGN / CODE TO REVIEW ("${title}")\n${design}`,
  });
  return Response.json(await saveReport(getDb(), courseId, title, { kind: "review", data: output }));
});

import { generateText, Output } from "ai";
import { z } from "zod";
import { getDb } from "@/db";
import { getCourse } from "@/content/catalog";
import { readJson } from "@/server/auth";
import { aiRoute, badRequest } from "@/server/ai/guard";
import { deepModel } from "@/server/ai/models";
import { chatMessages, messageText } from "@/server/ai/chat";
import { interviewMaterial, interviewSetup } from "@/server/ai/interview";
import { saveReport } from "@/server/ai/reports-repo";
import { scorecardSchema } from "@/lib/ai-schemas";

const body = interviewSetup.extend({ title: z.string().trim().min(1).max(120), messages: chatMessages });

/** Ends a mock interview: scores the transcript and saves the scorecard. */
export const POST = aiRoute(async (req) => {
  const parsed = body.safeParse(await readJson(req));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
  const material = interviewMaterial(parsed.data);
  if (!material) return badRequest("Pick lectures from this course");
  const { courseId, title, messages } = parsed.data;
  // The first user message is the automatic "start the interview" kickoff, not an answer.
  const answered = messages.filter((m) => m.role === "user").length - 1;
  if (answered < 1) return badRequest("Answer at least one question first");

  const transcript = messages.map((m) => `${m.role === "user" ? "CANDIDATE" : "INTERVIEWER"}: ${messageText(m)}`).join("\n\n");
  const lectureSlugs = getCourse(courseId)!.lectures.map((l) => l.slug).join(", ");
  const { output } = await generateText({
    model: deepModel(),
    maxRetries: 0,
    output: Output.object({ schema: scorecardSchema }),
    instructions: `You are a hiring panel debriefing a practice interview. Score only what the candidate actually said in the transcript.
Be honest and specific: quote or paraphrase their answers when naming strengths and gaps. A short interview can't earn a high score.
overall: 85+ strong hire, 70-84 hire, 50-69 borderline, below 50 not yet.
The candidate answered ${answered} question(s). With fewer than 4 answers there isn't enough evidence for a hire: cap overall at 60 and say so in the summary.
For each gap, set lectureSlug to the most relevant slug from this list, or "" if none fits: ${lectureSlugs}`,
    prompt: `MATERIAL THE INTERVIEW COVERED\n${material}\n\nTRANSCRIPT\n${transcript}`,
  });
  return Response.json(await saveReport(getDb(), courseId, title, { kind: "interview", data: output }));
});

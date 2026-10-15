import { readJson } from "@/server/auth";
import { aiRoute, badRequest } from "@/server/ai/guard";
import { chatMessages, streamChat } from "@/server/ai/chat";
import { interviewerInstructions, interviewMaterial, interviewSetup } from "@/server/ai/interview";

const body = interviewSetup.extend({ messages: chatMessages });

/** Mock interview: the AI interviewer's next turn. */
export const POST = aiRoute(async (req) => {
  const parsed = body.safeParse(await readJson(req));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
  const material = interviewMaterial(parsed.data);
  if (!material) return badRequest("Pick lectures from this course");
  return streamChat(interviewerInstructions(parsed.data, material), parsed.data.messages);
});

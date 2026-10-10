import { getDb } from "@/db";
import { handle, isAuthenticated, readJson, unauthorized } from "@/server/auth";
import { recordEvents } from "@/server/progress-repo";
import { parseEvents } from "@/lib/progress-model";

/** Records a batch of learner events (visits, answers, finished quizzes). */
export async function POST(req: Request) {
  return handle(async () => {
    if (!(await isAuthenticated())) return unauthorized();
    const parsed = parseEvents(await readJson(req));
    if (!parsed.ok) return Response.json({ error: "Invalid events", details: parsed.errors }, { status: 400 });
    await recordEvents(getDb(), parsed.events);
    return new Response(null, { status: 204 });
  });
}

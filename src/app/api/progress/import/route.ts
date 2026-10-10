import { getDb } from "@/db";
import { handle, isAuthenticated, readJson, unauthorized } from "@/server/auth";
import { importProgress } from "@/server/progress-repo";
import { parseProgress } from "@/lib/progress-model";

/** Merges progress made in this browser (while offline or locked) into the database. */
export async function POST(req: Request) {
  return handle(async () => {
    if (!(await isAuthenticated())) return unauthorized();
    const local = parseProgress(await readJson(req));
    if (!local) return Response.json({ error: "Invalid progress" }, { status: 400 });
    return Response.json(await importProgress(getDb(), local), { headers: { "Cache-Control": "no-store" } });
  });
}

import { getDb } from "@/db";
import { handle, isAuthenticated, unauthorized } from "@/server/auth";
import { getProgress } from "@/server/progress-repo";

export async function GET() {
  return handle(async () => {
    if (!(await isAuthenticated())) return unauthorized();
    return Response.json(await getProgress(getDb()), { headers: { "Cache-Control": "no-store" } });
  });
}

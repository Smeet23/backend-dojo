import { getDb } from "@/db";
import { handle, isAuthenticated, unauthorized } from "@/server/auth";
import { listReports } from "@/server/ai/reports-repo";

/** Saved interview scorecards or design reviews for a course (no AI call, so no budget used). */
export async function GET(req: Request) {
  return handle(async () => {
    if (!(await isAuthenticated())) return unauthorized();
    const url = new URL(req.url);
    const course = url.searchParams.get("course") ?? "";
    const kind = url.searchParams.get("kind");
    if (kind !== "interview" && kind !== "review") return Response.json({ error: "kind must be interview or review" }, { status: 400 });
    return Response.json(await listReports(getDb(), course, kind));
  });
}

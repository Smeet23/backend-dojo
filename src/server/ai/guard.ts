import "server-only";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { aiUsage } from "@/db/schema";
import { handle, isAuthenticated } from "@/server/auth";

/**
 * Daily ceiling on AI calls. Groq's free tier allows ~1,000 requests a day and Gemini's
 * less, so this keeps a leaked passcode (or a runaway loop) from burning the whole quota.
 */
export const AI_DAILY_LIMIT = 300;

/** Counts one call against today's budget (atomically); false once the budget is spent. */
export async function reserveAiCall(): Promise<boolean> {
  const [row] = await getDb()
    .insert(aiUsage)
    .values({ day: sql`(now() at time zone 'utc')::date`, calls: 1 })
    .onConflictDoUpdate({ target: aiUsage.day, set: { calls: sql`${aiUsage.calls} + 1` } })
    .returning({ calls: aiUsage.calls });
  return row.calls <= AI_DAILY_LIMIT;
}

/** Wraps an AI route: passcode required, daily budget enforced, failures logged. */
export function aiRoute(fn: (req: Request) => Promise<Response>) {
  return (req: Request) =>
    handle(async () => {
      if (!(await isAuthenticated())) return Response.json({ error: "Unlock with your passcode to use AI features" }, { status: 401 });
      if (!(await reserveAiCall())) {
        return Response.json({ error: `Daily AI limit reached (${AI_DAILY_LIMIT} calls). It resets at midnight UTC.` }, { status: 429 });
      }
      return fn(req);
    });
}

export const badRequest = (error: string) => Response.json({ error }, { status: 400 });

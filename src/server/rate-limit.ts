import { and, gt, inArray, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { loginAttempts } from "@/db/schema";

export type Limit = { key: string; maxFailures: number; windowSeconds: number; lockSeconds: number };

/** 5 wrong passcodes per IP per 15 minutes, and 30 overall per hour, to stop distributed guessing. */
export function unlockLimits(ip: string): Limit[] {
  return [
    { key: `ip:${ip}`, maxFailures: 5, windowSeconds: 15 * 60, lockSeconds: 15 * 60 },
    { key: "global", maxFailures: 30, windowSeconds: 60 * 60, lockSeconds: 60 * 60 },
  ];
}

/** The client's IP. On Vercel, x-real-ip / x-forwarded-for are set by the platform, not the client. */
export function clientIp(headers: Headers): string {
  return headers.get("x-real-ip") ?? headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

/** Seconds until the longest active lock ends, or 0 when no limit is locked. */
export async function lockedFor(db: Db, limits: Limit[]): Promise<number> {
  const rows = await db
    .select({ lockedUntil: loginAttempts.lockedUntil })
    .from(loginAttempts)
    .where(and(inArray(loginAttempts.key, limits.map((l) => l.key)), gt(loginAttempts.lockedUntil, sql`now()`)));
  const until = Math.max(0, ...rows.map((r) => r.lockedUntil!.getTime()));
  return until ? Math.ceil((until - Date.now()) / 1000) : 0;
}

/**
 * Reserves one attempt against each limit *before* the passcode is checked, using a
 * single atomic upsert per key. Parallel guesses each get a distinct count, so a burst
 * can't test more passcodes than the limit allows. Returns false if any limit is exceeded.
 * A new window starts once the old one expires; reaching the max locks the key.
 */
export async function reserveAttempt(db: Db, limits: Limit[]): Promise<boolean> {
  let allowed = true;
  for (const l of limits) {
    const expired = sql`${loginAttempts.windowStart} < now() - make_interval(secs => ${l.windowSeconds})`;
    const failures = sql`case when ${expired} then 1 else ${loginAttempts.failures} + 1 end`;
    const [row] = await db
      .insert(loginAttempts)
      .values({
        key: l.key,
        failures: 1,
        windowStart: sql`now()`,
        lockedUntil: l.maxFailures <= 1 ? sql`now() + make_interval(secs => ${l.lockSeconds})` : null,
      })
      .onConflictDoUpdate({
        target: loginAttempts.key,
        set: {
          failures,
          windowStart: sql`case when ${expired} then now() else ${loginAttempts.windowStart} end`,
          lockedUntil: sql`case when ${failures} >= ${l.maxFailures} then now() + make_interval(secs => ${l.lockSeconds}) else ${loginAttempts.lockedUntil} end`,
        },
      })
      .returning({ failures: loginAttempts.failures });
    if (row.failures > l.maxFailures) allowed = false;
  }
  return allowed;
}

/** A correct passcode clears this IP's counter and gives its slot in the global window back. */
export async function releaseAttempt(db: Db, limits: Limit[]): Promise<void> {
  const [ip, ...shared] = limits;
  await db.delete(loginAttempts).where(inArray(loginAttempts.key, [ip.key]));
  for (const l of shared) {
    await db
      .update(loginAttempts)
      .set({ failures: sql`greatest(${loginAttempts.failures} - 1, 0)` })
      .where(inArray(loginAttempts.key, [l.key]));
  }
}

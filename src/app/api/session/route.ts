import { cookies } from "next/headers";
import { getDb } from "@/db";
import { handle, isAuthenticated, readJson } from "@/server/auth";
import { clientIp, lockedFor, releaseAttempt, reserveAttempt, unlockLimits } from "@/server/rate-limit";
import { SESSION_COOKIE, SESSION_MAX_AGE, createSessionToken, passcodeMatches } from "@/server/session";

/** Is this device unlocked? */
export async function GET() {
  return handle(async () => Response.json({ authenticated: await isAuthenticated() }));
}

const tooMany = (seconds: number) =>
  Response.json(
    { error: "Too many wrong attempts. Try again later.", retryAfter: seconds },
    { status: 429, headers: { "Retry-After": String(seconds) } },
  );

/** Unlock this device with the passcode. */
export async function POST(req: Request) {
  return handle(async () => {
    const db = getDb();
    const limits = unlockLimits(clientIp(req.headers));

    // Checked before the passcode, so even a correct guess is refused while locked.
    const wait = await lockedFor(db, limits);
    if (wait > 0) return tooMany(wait);
    // Count the attempt first: parallel guesses beyond the limit never reach the passcode check.
    if (!(await reserveAttempt(db, limits))) return tooMany(await lockedFor(db, limits));

    const body = (await readJson(req)) as { passcode?: unknown } | undefined;
    const passcode = typeof body?.passcode === "string" ? body.passcode : "";
    if (!passcode || passcode.length > 200 || !passcodeMatches(passcode)) {
      // Slow down guessing; the comparison itself is constant-time.
      await new Promise((r) => setTimeout(r, 800));
      const nowLocked = await lockedFor(db, limits);
      return nowLocked > 0 ? tooMany(nowLocked) : Response.json({ error: "Wrong passcode" }, { status: 401 });
    }

    await releaseAttempt(db, limits);
    const store = await cookies();
    store.set(SESSION_COOKIE, createSessionToken(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
    return new Response(null, { status: 204 });
  });
}

/** Lock this device again. */
export async function DELETE() {
  return handle(async () => {
    (await cookies()).delete(SESSION_COOKIE);
    return new Response(null, { status: 204 });
  });
}

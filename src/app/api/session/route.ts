import { cookies } from "next/headers";
import { handle, isAuthenticated, readJson } from "@/server/auth";
import { SESSION_COOKIE, SESSION_MAX_AGE, createSessionToken, passcodeMatches } from "@/server/session";

/** Is this device unlocked? */
export async function GET() {
  return handle(async () => Response.json({ authenticated: await isAuthenticated() }));
}

/** Unlock this device with the passcode. */
export async function POST(req: Request) {
  return handle(async () => {
    const body = (await readJson(req)) as { passcode?: unknown } | undefined;
    const passcode = typeof body?.passcode === "string" ? body.passcode : "";
    if (!passcode || passcode.length > 200 || !passcodeMatches(passcode)) {
      // Slow down guessing; the comparison itself is constant-time.
      await new Promise((r) => setTimeout(r, 800));
      return Response.json({ error: "Wrong passcode" }, { status: 401 });
    }
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

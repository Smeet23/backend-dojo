import { cookies } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "./session";

export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

export const unauthorized = () => Response.json({ error: "Enter the passcode to sync progress" }, { status: 401 });

/** Turns unexpected failures into a generic 500 and keeps the details in server logs. */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    // Let Next.js's own control-flow signals (e.g. "this route is dynamic") through.
    unstable_rethrow(err);
    console.error(err);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return undefined;
  }
}

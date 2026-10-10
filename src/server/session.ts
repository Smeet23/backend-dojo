import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "dojo_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 365; // one year, per device

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET must be set (32+ chars)");
  return s;
}

function hmac(value: string): Buffer {
  return createHmac("sha256", secret()).update(value).digest();
}

/** Compares the attempt to APP_PASSCODE in constant time (HMAC both so lengths match). */
export function passcodeMatches(attempt: string): boolean {
  const expected = process.env.APP_PASSCODE;
  if (!expected) throw new Error("APP_PASSCODE must be set");
  return timingSafeEqual(hmac(`passcode:${attempt}`), hmac(`passcode:${expected}`));
}

/** Token format: "<expiry-unix-seconds>.<hex hmac of expiry>". */
export function createSessionToken(now = Date.now()): string {
  const exp = Math.floor(now / 1000) + SESSION_MAX_AGE;
  return `${exp}.${hmac(`session:${exp}`).toString("hex")}`;
}

export function verifySessionToken(token: string | undefined, now = Date.now()): boolean {
  if (!token) return false;
  const [expRaw, sig] = token.split(".");
  if (!expRaw || !sig || !/^\d+$/.test(expRaw) || !/^[0-9a-f]{64}$/.test(sig)) return false;
  if (Number(expRaw) * 1000 < now) return false;
  return timingSafeEqual(Buffer.from(sig, "hex"), hmac(`session:${expRaw}`));
}

"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

const SERVER_SECRET = "notes-app-server-secret";
const ATTACKER_SECRET = "guessed-secret";
const ISSUED_AT = 1772357400; // 2026-03-01T09:30:00Z
const TTL_MIN = 15;

function b64url(s: string): string {
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Toy keyed hash standing in for HMAC-SHA256, so the widget stays synchronous.
 * Same idea: output depends on the secret and every byte of header.payload.
 */
export function toySign(data: string, secret: string): string {
  let out = "";
  for (let round = 0; round < 4; round++) {
    let h = 2166136261 ^ round;
    for (const ch of `${secret}|${round}|${data}`) {
      h ^= ch.charCodeAt(0);
      h = Math.imul(h, 16777619) >>> 0;
    }
    out += String.fromCharCode(h & 255, (h >>> 8) & 255, (h >>> 16) & 255, (h >>> 24) & 255);
  }
  return b64url(out);
}

export function JwtInspector() {
  const [tampered, setTampered] = useState(false);
  const [signer, setSigner] = useState<"server" | "attacker">("server");
  const [minutes, setMinutes] = useState(3);

  const header = { alg: "HS256", typ: "JWT" };
  const claims = { sub: "user_123", name: "Asha", role: "member", iat: ISSUED_AT, exp: ISSUED_AT + TTL_MIN * 60 };
  const signedPart = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claims))}`;
  const signature = toySign(signedPart, signer === "server" ? SERVER_SECRET : ATTACKER_SECRET);

  // What actually arrives at the server (maybe edited after signing).
  const sentClaims = tampered ? { ...claims, role: "admin" } : claims;
  const h64 = b64url(JSON.stringify(header));
  const p64 = b64url(JSON.stringify(sentClaims));

  const expected = toySign(`${h64}.${p64}`, SERVER_SECRET);
  const sigOk = expected === signature;
  const now = ISSUED_AT + minutes * 60;
  const expired = now >= sentClaims.exp;

  const verdict = !sigOk
    ? { tone: "bad", text: "401 Unauthorized: signature doesn't match. The token was altered or signed with the wrong key." }
    : expired
      ? { tone: "warn", text: "401 Unauthorized: signature is fine but exp has passed. The client must refresh or log in again." }
      : { tone: "good", text: `200 OK: trusted claims, request runs as ${sentClaims.sub} with role "${sentClaims.role}". No database lookup needed.` };

  return (
    <Widget title="JWT inspector" hint="A token is three Base64URL parts. Tamper with it, change who signs it, or move the clock.">
      <p className="break-all rounded-lg bg-surface-2 p-3 font-mono text-[0.75rem] leading-5">
        <span className="text-accent">{h64}</span>.<span className="text-warn">{p64}</span>.<span className="text-good">{signature}</span>
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="min-w-0 rounded-lg border border-border">
          <p className="border-b border-border bg-surface-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-accent">Header (decoded)</p>
          <pre className="overflow-x-auto whitespace-pre-wrap break-all p-3 font-mono text-[0.75rem]">{JSON.stringify(header, null, 2)}</pre>
        </div>
        <div className="min-w-0 rounded-lg border border-border">
          <p className="border-b border-border bg-surface-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-warn">Payload (decoded, readable by anyone)</p>
          <pre className="overflow-x-auto whitespace-pre-wrap break-all p-3 font-mono text-[0.75rem]">{JSON.stringify(sentClaims, null, 2)}</pre>
        </div>
      </div>

      <div className="mt-4 space-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-24 text-muted">Payload</span>
          <Pill active={!tampered} onClick={() => setTampered(false)}>As issued</Pill>
          <Pill active={tampered} onClick={() => setTampered(true)}>Edit role → admin</Pill>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-24 text-muted">Signed with</span>
          <Pill active={signer === "server"} onClick={() => setSigner("server")}>Server&apos;s secret</Pill>
          <Pill active={signer === "attacker"} onClick={() => setSigner("attacker")}>A guessed secret</Pill>
        </div>
        <label className="flex flex-wrap items-center gap-2">
          <span className="w-24 text-muted">Clock</span>
          <input type="range" min={0} max={30} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className="min-h-10 flex-1" />
          <span className="font-mono text-[0.8rem]">iat + {minutes} min (exp at +{TTL_MIN})</span>
        </label>
      </div>

      <ul className="mt-4 space-y-1 text-sm">
        <li>Server recomputes signature over header.payload with its secret: <span className={sigOk ? "text-good" : "text-bad"}>{sigOk ? "matches" : "mismatch"}</span></li>
        <li>exp check: <span className={expired ? "text-bad" : "text-good"}>{expired ? "expired" : `valid for ${TTL_MIN - minutes} more min`}</span></li>
      </ul>
      <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${verdict.tone === "good" ? "bg-good-soft" : verdict.tone === "warn" ? "bg-warn-soft" : "bg-bad-soft"}`}>{verdict.text}</p>
      <p className="mt-2 text-xs text-muted">The signature here is a simplified stand-in for HMAC-SHA256; the behaviour (any change breaks it) is the same.</p>
    </Widget>
  );
}

"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

const NOW = 1760000300; // fixed "current time" for the demo
const CONFIG = { alg: "RS256", iss: "https://auth.shop.example", aud: "orders-api", leeway: 30 };

function b64urlEncode(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Deterministic stand-in for the auth server's RS256 signature (the demo can't hold a real private key). */
function fakeSign(signedPart: string): string {
  let h = 2166136261;
  let out = "";
  for (let round = 0; round < 8; round++) {
    for (const ch of `auth-server-private-key|${round}|${signedPart}`) {
      h ^= ch.charCodeAt(0);
      h = Math.imul(h, 16777619) >>> 0;
    }
    out += String.fromCharCode(h & 255, (h >>> 8) & 255, (h >>> 16) & 255, (h >>> 24) & 255);
  }
  return btoa(out).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function makeToken(header: object, payload: object, sign = true): string {
  const part = `${b64urlEncode(JSON.stringify(header))}.${b64urlEncode(JSON.stringify(payload))}`;
  return `${part}.${sign ? fakeSign(part) : ""}`;
}

const H = { alg: "RS256", typ: "JWT", kid: "2026-09-key-1" };
const BASE = { iss: CONFIG.iss, sub: "user_42", aud: CONFIG.aud, iat: 1760000000, exp: 1760000900, role: "member" };

const SAMPLES: { id: string; label: string; token: string }[] = [
  { id: "valid", label: "Valid", token: makeToken(H, BASE) },
  { id: "expired", label: "Expired", token: makeToken(H, { ...BASE, iat: 1759990000, exp: 1759990900 }) },
  { id: "aud", label: "Wrong audience", token: makeToken(H, { ...BASE, aud: "reports-api" }) },
  { id: "none", label: "alg none", token: makeToken({ alg: "none", typ: "JWT" }, { ...BASE, role: "admin" }, false) },
];

type Check = { label: string; ok: boolean; detail: string };

function analyse(token: string): { header?: Record<string, unknown>; payload?: Record<string, unknown>; error?: string; checks: Check[] } {
  const parts = token.trim().split(".");
  if (parts.length !== 3) return { error: `Expected 3 dot-separated parts, got ${parts.length}.`, checks: [] };
  let header: Record<string, unknown>;
  let payload: Record<string, unknown>;
  try {
    header = JSON.parse(b64urlDecode(parts[0]));
    payload = JSON.parse(b64urlDecode(parts[1]));
  } catch {
    return { error: "Header or payload isn't valid base64url JSON.", checks: [] };
  }
  const signedPart = `${parts[0]}.${parts[1]}`;
  const algOk = header.alg === CONFIG.alg;
  const sigOk = algOk && parts[2].length > 0 && parts[2] === fakeSign(signedPart);
  const exp = typeof payload.exp === "number" ? payload.exp : NaN;
  const nbf = typeof payload.nbf === "number" ? payload.nbf : -Infinity;
  const aud = payload.aud;
  const audOk = Array.isArray(aud) ? aud.includes(CONFIG.aud) : aud === CONFIG.aud;
  const checks: Check[] = [
    { label: "alg is on the allowlist", ok: algOk, detail: `header says ${JSON.stringify(header.alg)}; server only accepts "${CONFIG.alg}"` },
    { label: "signature verifies", ok: sigOk, detail: !algOk ? "not attempted: the algorithm was already rejected" : sigOk ? "matches the auth server's key" : "doesn't match: header or payload was changed, or another key signed it" },
    { label: "not expired", ok: exp + CONFIG.leeway > NOW, detail: isNaN(exp) ? "no exp claim" : `exp ${exp} vs now ${NOW} (${exp - NOW >= 0 ? `${exp - NOW}s left` : `${NOW - exp}s ago`})` },
    { label: "nbf has passed", ok: nbf - CONFIG.leeway <= NOW, detail: nbf === -Infinity ? "no nbf claim" : `nbf ${nbf}` },
    { label: "iss matches", ok: payload.iss === CONFIG.iss, detail: `${JSON.stringify(payload.iss)}` },
    { label: "aud includes this API", ok: audOk, detail: `${JSON.stringify(aud)}; this API is "${CONFIG.aud}"` },
  ];
  return { header, payload, checks };
}

export function HldJwtDecoder() {
  const [token, setToken] = useState(SAMPLES[0].token);
  const [sample, setSample] = useState("valid");
  const r = analyse(token);
  const parts = token.trim().split(".");
  const accepted = !r.error && r.checks.every((c) => c.ok);

  function forgeAdmin() {
    if (!r.payload || parts.length !== 3) return;
    const p = b64urlEncode(JSON.stringify({ ...r.payload, role: "admin" }));
    setToken(`${parts[0]}.${p}.${parts[2]}`);
    setSample("");
  }

  return (
    <Widget title="Decode and validate a JWT" hint={`Decoding needs no key. Validation runs as the orders-api would, at a fixed "now" of ${NOW}. You can paste any token; signatures are simulated.`}>
      <div className="flex flex-wrap gap-2">
        {SAMPLES.map((s) => (
          <Pill key={s.id} active={sample === s.id} onClick={() => { setToken(s.token); setSample(s.id); }}>
            {s.label}
          </Pill>
        ))}
        <button type="button" onClick={forgeAdmin} disabled={!r.payload} className="min-h-9 rounded-full border border-border px-3 text-sm hover:bg-surface-2 disabled:opacity-50">
          Edit payload: role → admin
        </button>
      </div>

      <label className="mt-3 block text-xs text-muted" htmlFor="hld-jwt-input">Token</label>
      <textarea
        id="hld-jwt-input"
        value={token}
        onChange={(e) => { setToken(e.target.value); setSample(""); }}
        rows={4}
        spellCheck={false}
        className="mt-1 w-full rounded-lg border border-border bg-bg p-2 font-mono text-[0.72rem] break-all"
      />

      {r.error ? (
        <p className="mt-2 rounded-lg bg-bad-soft p-2 text-sm">{r.error}</p>
      ) : (
        <>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <div className="min-w-0 rounded-lg border border-border p-2">
              <p className="text-xs font-semibold text-accent">Header (just base64url)</p>
              <pre className="mt-1 overflow-x-auto font-mono text-[0.72rem] whitespace-pre-wrap break-all">{JSON.stringify(r.header, null, 2)}</pre>
            </div>
            <div className="min-w-0 rounded-lg border border-border p-2">
              <p className="text-xs font-semibold text-accent">Payload (readable by anyone)</p>
              <pre className="mt-1 overflow-x-auto font-mono text-[0.72rem] whitespace-pre-wrap break-all">{JSON.stringify(r.payload, null, 2)}</pre>
            </div>
          </div>

          <ul className="mt-3 space-y-1">
            {r.checks.map((c) => (
              <li key={c.label} className={`rounded px-2 py-1 text-[0.8rem] ${c.ok ? "bg-good-soft" : "bg-bad-soft"}`}>
                <span className="font-medium">{c.ok ? "✓" : "✗"} {c.label}</span>
                <span className="block break-words text-muted">{c.detail}</span>
              </li>
            ))}
          </ul>
          <p className={`mt-3 rounded-lg p-2 text-sm font-medium ${accepted ? "bg-good-soft" : "bg-bad-soft"}`}>
            {accepted ? `Accepted: now authorize sub ${String(r.payload?.sub)} for the requested action.` : "Rejected with 401. Note the payload above was still perfectly readable."}
          </p>
        </>
      )}
    </Widget>
  );
}

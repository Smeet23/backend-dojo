"use client";

import { useState } from "react";
import { Widget } from "./Widget";

const SECRET = "whsec_notes_4f9a";
const ORIGINAL = '{"id":"evt_9f2","type":"payment.succeeded","user_id":42,"plan":"pro"}';
const TAMPERED = '{"id":"evt_9f2","type":"payment.succeeded","user_id":7,"plan":"pro"}';
const SENT_AT = 1760090000;
const TOLERANCE = 300;

type Toggle = "tamper" | "wrongSecret" | "reserialize" | "replay";

const TOGGLES: { id: Toggle; label: string }[] = [
  { id: "tamper", label: "Attacker changes user_id to 7 in transit" },
  { id: "wrongSecret", label: "Receiver has an old secret configured" },
  { id: "reserialize", label: "Framework parses JSON, receiver re-serializes before verifying" },
  { id: "replay", label: "Attacker replays the captured request 2 hours later" },
];

async function hmacHex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Pretty-prints like many JSON encoders do: a space after every colon and comma. */
function reserialize(raw: string): string {
  const obj = JSON.parse(raw) as Record<string, unknown>;
  return "{" + Object.entries(obj).map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(", ") + "}";
}

type Result = { header: string; signedByReceiver: string; expected: string; ok: boolean; reasons: string[] };

export function HmacVerifier() {
  const [on, setOn] = useState<Record<Toggle, boolean>>({ tamper: false, wrongSecret: false, reserialize: false, replay: false });
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: Toggle) {
    setOn((s) => ({ ...s, [id]: !s[id] }));
    setResult(null);
  }

  async function verify() {
    try {
      setError(null);
      // Provider side: sign "timestamp.body" over the exact bytes it sends.
      const providerSig = await hmacHex(SECRET, `${SENT_AT}.${ORIGINAL}`);
      const arrivedBody = on.tamper ? TAMPERED : ORIGINAL;
      const receiverBody = on.reserialize ? reserialize(arrivedBody) : arrivedBody;
      const receiverSecret = on.wrongSecret ? "whsec_notes_OLD1" : SECRET;
      const expected = await hmacHex(receiverSecret, `${SENT_AT}.${receiverBody}`);
      const now = SENT_AT + (on.replay ? 7200 : 2);

      const reasons: string[] = [];
      if (expected !== providerSig) {
        if (on.tamper) reasons.push("The body bytes changed, so the fingerprint changed completely.");
        if (on.wrongSecret) reasons.push("Different secret, different HMAC, even for identical bytes.");
        if (on.reserialize) reasons.push("Re-encoding added spaces. Same data, different bytes, so the HMAC differs.");
      }
      if (now - SENT_AT > TOLERANCE) reasons.push(`Signature is genuine, but the signed timestamp is ${now - SENT_AT} s old (limit ${TOLERANCE} s).`);

      setResult({
        header: `t=${SENT_AT},v1=${providerSig}`,
        signedByReceiver: `${SENT_AT}.${receiverBody}`,
        expected,
        ok: reasons.length === 0,
        reasons,
      });
    } catch {
      setError("This browser can't compute HMAC here (Web Crypto needs HTTPS or localhost).");
    }
  }

  return (
    <Widget title="HMAC signature check" hint="The provider signs timestamp.body with a shared secret. Break something, then verify like a receiver would.">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Body as the provider sent it</p>
      <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-surface-2 px-3 py-2 font-mono text-[0.78rem]">{ORIGINAL}</pre>

      <div className="mt-3 space-y-2">
        {TOGGLES.map((t) => (
          <label key={t.id} className="flex min-h-10 cursor-pointer items-center gap-3 rounded-lg border border-border px-3 text-sm hover:bg-surface-2">
            <input type="checkbox" checked={on[t.id]} onChange={() => toggle(t.id)} className="h-4 w-4 accent-accent" />
            <span>{t.label}</span>
          </label>
        ))}
      </div>

      <button type="button" onClick={verify} className="mt-3 min-h-10 w-full rounded-lg bg-accent px-4 text-sm font-medium text-white dark:text-bg">
        Verify delivery
      </button>

      {error && <p className="mt-3 rounded-lg bg-warn-soft px-3 py-2 text-sm">{error}</p>}

      {result && (
        <div className="mt-3 space-y-2 text-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Signature header received</p>
            <pre className="mt-1 whitespace-pre-wrap break-all rounded-lg bg-surface-2 px-3 py-2 font-mono text-[0.75rem]">{result.header}</pre>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Receiver signs these bytes</p>
            <pre className="mt-1 whitespace-pre-wrap break-all rounded-lg bg-surface-2 px-3 py-2 font-mono text-[0.75rem]">{result.signedByReceiver}</pre>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Receiver&apos;s HMAC-SHA256</p>
            <pre className="mt-1 whitespace-pre-wrap break-all rounded-lg bg-surface-2 px-3 py-2 font-mono text-[0.75rem]">{result.expected}</pre>
          </div>
          <div className={`rounded-lg px-3 py-2 ${result.ok ? "bg-good-soft" : "bg-bad-soft"}`}>
            <p className="font-semibold">{result.ok ? "Verified: respond 2xx and process it" : "Rejected: respond 401 and do nothing"}</p>
            {result.reasons.length > 0 && <ul className="ml-5 mt-1 list-disc">{result.reasons.map((r) => <li key={r}>{r}</li>)}</ul>}
          </div>
        </div>
      )}
    </Widget>
  );
}

"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Tone = "good" | "warn" | "bad" | "neutral";
type Step = { who: string; title: string; body: string; note: string; tone: Tone };

const VERIFIER = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
const CHALLENGE = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";
const CODE = "SplxlOBeZQQYbYS6WxSbIA";

function build(pkce: boolean, attacker: boolean): Step[] {
  const steps: Step[] = [];
  if (pkce) {
    steps.push({
      who: "Mobile app",
      title: "Generate the PKCE pair",
      body: `code_verifier  = ${VERIFIER}\ncode_challenge = BASE64URL(SHA256(verifier))\n               = ${CHALLENGE}`,
      note: "The verifier never leaves the app until the token exchange.",
      tone: "neutral",
    });
  }
  steps.push({
    who: "Browser",
    title: "Redirect to the authorization endpoint",
    body: `GET https://auth.example/authorize\n  ?response_type=code&client_id=print-app\n  &redirect_uri=printapp://callback\n  &scope=photos.read&state=xyz123${pkce ? `\n  &code_challenge=${CHALLENGE}\n  &code_challenge_method=S256` : ""}`,
    note: pkce ? "Only the hash travels through the browser." : "No PKCE: nothing binds the code to this app instance.",
    tone: "neutral",
  });
  steps.push({
    who: "User",
    title: "Log in and consent on auth.example",
    body: "Password + MFA on the authorization server's page.\nConsent: \"Print App wants to view your photos\" → Allow",
    note: "The app never sees the password.",
    tone: "good",
  });
  steps.push({
    who: "Auth server",
    title: "Redirect back with a one-time code",
    body: `302 Location: printapp://callback?code=${CODE}&state=xyz123`,
    note: attacker
      ? "A malicious app registered the same printapp:// scheme and receives this redirect too. It now has the code."
      : "The app checks that state matches what it stored.",
    tone: attacker ? "warn" : "neutral",
  });
  if (attacker) {
    steps.push({
      who: "Attacker app",
      title: "Race to redeem the stolen code",
      body: `POST https://auth.example/token\ngrant_type=authorization_code\n&code=${CODE}\n&redirect_uri=printapp://callback\n&client_id=print-app${pkce ? "\n&code_verifier=???  (it only ever saw the challenge)" : ""}`,
      note: pkce
        ? "SHA256 is one-way: the attacker can't turn the challenge back into the verifier."
        : "client_id is public, and a public client has no secret. Nothing else is checked.",
      tone: "warn",
    });
    steps.push(
      pkce
        ? { who: "Auth server", title: "Reject the attacker", body: '400 Bad Request\n{ "error": "invalid_grant",\n  "error_description": "PKCE verification failed" }', note: "No verifier, no tokens. The stolen code is worthless.", tone: "good" }
        : { who: "Auth server", title: "Issue tokens to the attacker", body: '200 OK\n{ "access_token": "eyJhbGciOi...",\n  "refresh_token": "8xLOxBtZp8", "expires_in": 900 }', note: "The attacker can now read the user's photos and keep refreshing.", tone: "bad" },
    );
    return steps;
  }
  steps.push({
    who: "Mobile app",
    title: "Exchange the code on the back channel",
    body: `POST https://auth.example/token\ngrant_type=authorization_code\n&code=${CODE}\n&redirect_uri=printapp://callback\n&client_id=print-app${pkce ? `\n&code_verifier=${VERIFIER}` : ""}`,
    note: pkce ? "Server computes SHA256(verifier) and compares it with the stored challenge." : "Works, but anyone holding the code could have sent this same request.",
    tone: pkce ? "good" : "warn",
  });
  steps.push({
    who: "Auth server",
    title: "Tokens issued",
    body: '200 OK\nCache-Control: no-store\n{ "access_token": "eyJhbGciOi...", "token_type": "Bearer",\n  "expires_in": 900, "refresh_token": "8xLOxBtZp8",\n  "scope": "photos.read" }',
    note: "Code is now spent; replaying it fails.",
    tone: "good",
  });
  steps.push({
    who: "Mobile app",
    title: "Call the photos API",
    body: "GET https://photos.example/v1/media\nAuthorization: Bearer eyJhbGciOi...",
    note: "The resource server validates the token and checks the photos.read scope.",
    tone: "good",
  });
  return steps;
}

const TONE: Record<Tone, string> = { good: "bg-good-soft", warn: "bg-warn-soft", bad: "bg-bad-soft", neutral: "bg-surface-2" };

export function HldPkceFlow() {
  const [pkce, setPkce] = useState(true);
  const [attacker, setAttacker] = useState(false);
  const [shown, setShown] = useState(1);
  const steps = build(pkce, attacker);
  const done = shown >= steps.length;

  return (
    <Widget title="Authorization code flow with PKCE" hint="Step through a mobile login. Then let a malicious app intercept the redirect, with and without PKCE.">
      <div className="flex flex-wrap gap-2">
        <Pill active={pkce} onClick={() => { setPkce((v) => !v); setShown(1); }}>PKCE: {pkce ? "on (S256)" : "off"}</Pill>
        <Pill active={attacker} onClick={() => { setAttacker((v) => !v); setShown(1); }}>Attacker intercepts redirect: {attacker ? "yes" : "no"}</Pill>
      </div>

      <ol className="mt-3 space-y-2">
        {steps.slice(0, shown).map((s, i) => (
          <li key={i} className={`rounded-lg p-2 ${TONE[s.tone]}`}>
            <p className="text-xs text-muted">{i + 1}. {s.who}</p>
            <p className="text-sm font-medium">{s.title}</p>
            <pre className="mt-1 overflow-x-auto rounded bg-surface p-2 font-mono text-[0.72rem] whitespace-pre-wrap break-all">{s.body}</pre>
            <p className="mt-1 text-[0.8rem]">{s.note}</p>
          </li>
        ))}
      </ol>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={done} onClick={() => setShown((n) => n + 1)} className="min-h-10 flex-1 rounded-lg bg-accent px-3 text-sm font-medium text-white disabled:opacity-50 dark:text-bg">
          Next step
        </button>
        <button type="button" disabled={done} onClick={() => setShown(steps.length)} className="min-h-10 rounded-lg border border-border px-3 text-sm disabled:opacity-50">
          Show all
        </button>
        <button type="button" onClick={() => setShown(1)} className="min-h-10 rounded-lg border border-border px-3 text-sm">
          Reset
        </button>
      </div>
    </Widget>
  );
}

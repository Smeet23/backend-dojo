"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type SameSite = "None" | "Lax" | "Strict";
type Req = "form" | "link" | "img" | "fetch" | "own";

const REQUESTS: Record<Req, { label: string; desc: string; method: string; topLevel: boolean; crossSite: boolean }> = {
  form: { label: "Auto-submitted form", desc: "evil.com silently POSTs a hidden form to bank.com/transfer", method: "POST", topLevel: true, crossSite: true },
  link: { label: "Link click", desc: "User clicks a link on evil.com to bank.com/transfer?to=attacker (a GET with side effects)", method: "GET", topLevel: true, crossSite: true },
  img: { label: "Hidden image", desc: "evil.com embeds an img whose src is bank.com/transfer?to=attacker", method: "GET", topLevel: false, crossSite: true },
  fetch: { label: "fetch with credentials", desc: "evil.com's script calls fetch(bank.com/transfer, { method: POST, credentials: include }) with a form body", method: "POST", topLevel: false, crossSite: true },
  own: { label: "bank.com's own form", desc: "The real transfer page on bank.com submits the form", method: "POST", topLevel: true, crossSite: false },
};

function cookieSent(ss: SameSite, r: (typeof REQUESTS)[Req]) {
  if (!r.crossSite) return true;
  if (ss === "None") return true;
  if (ss === "Strict") return false;
  // Lax: only top-level navigations with safe methods
  return r.topLevel && r.method === "GET";
}

export function HldCsrfLab() {
  const [ss, setSs] = useState<SameSite>("None");
  const [req, setReq] = useState<Req>("form");
  const [token, setToken] = useState(false);

  const r = REQUESTS[req];
  const sent = cookieSent(ss, r);
  const hasToken = !r.crossSite; // only the genuine page can read and embed the token
  const tokenBlocks = token && !hasToken;
  const executed = sent && !tokenBlocks;
  const attack = r.crossSite;

  let verdict: { tone: string; title: string; body: string };
  if (!attack) {
    verdict = executed
      ? { tone: "bg-good-soft", title: "Legitimate transfer works", body: "Same-site request: the cookie is attached and the page included its CSRF token. Defenses must not break this path." }
      : { tone: "bg-bad-soft", title: "Legitimate transfer broken", body: "Something blocked the real user. That should not happen here." };
  } else if (!sent) {
    verdict = { tone: "bg-good-soft", title: "Blocked: no session cookie", body: `SameSite=${ss} stops the browser attaching the cookie to this cross-site request, so the bank sees an anonymous request and rejects it.` };
  } else if (tokenBlocks) {
    verdict = { tone: "bg-good-soft", title: "Blocked: missing CSRF token", body: "The cookie was sent, but the request lacks the secret token. evil.com can't read bank.com's pages, so it can't learn the token." };
  } else {
    verdict = {
      tone: "bg-bad-soft",
      title: "Money moved",
      body:
        req === "fetch"
          ? "The browser sent the request with the cookie. CORS will hide the response from evil.com's script, but the transfer already happened. CORS doesn't stop CSRF."
          : req === "link" || req === "img"
            ? "A GET with side effects is forgeable. Lax allows top-level GET navigations by design, which is why state-changing GET endpoints are a bug."
            : "The browser attached the session cookie to a request evil.com created. The bank can't tell it apart from a real one.",
    };
  }

  return (
    <Widget title="CSRF lab" hint="You're logged in to bank.com. Pick the cookie setting, the request, and whether the bank checks a CSRF token.">
      <div className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-24 text-muted">SameSite</span>
          {(["None", "Lax", "Strict"] as SameSite[]).map((v) => (
            <Pill key={v} active={ss === v} onClick={() => setSs(v)}>
              {v}
            </Pill>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-24 text-muted">Request</span>
          {(Object.keys(REQUESTS) as Req[]).map((k) => (
            <Pill key={k} active={req === k} onClick={() => setReq(k)}>
              {REQUESTS[k].label}
            </Pill>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-24 text-muted">CSRF token</span>
          <Pill active={!token} onClick={() => setToken(false)}>Not checked</Pill>
          <Pill active={token} onClick={() => setToken(true)}>Required</Pill>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm">
        <p>{r.desc}</p>
        <pre className="mt-2 whitespace-pre-wrap break-all font-mono text-[0.75rem] leading-5">
          {`${r.method} /transfer HTTP/1.1
Host: bank.com
Origin: ${r.crossSite ? "https://evil.com" : "https://bank.com"}
Cookie: ${sent ? "session=abc123" : "(not sent)"}${token ? `\ncsrf_token: ${hasToken ? "9f2c... (matches session)" : "(missing)"}` : ""}`}
        </pre>
      </div>

      <div className={`mt-3 rounded-lg px-3 py-2 text-sm ${verdict.tone}`}>
        <p className="font-semibold">{verdict.title}</p>
        <p className="mt-1">{verdict.body}</p>
      </div>
    </Widget>
  );
}

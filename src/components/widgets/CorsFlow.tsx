"use client";

import { useMemo, useState } from "react";
import { Pill, Widget } from "./Widget";

const METHODS = ["GET", "POST", "PUT", "DELETE"] as const;
const TYPES = ["text/plain", "application/x-www-form-urlencoded", "application/json"] as const;
type Method = (typeof METHODS)[number];

type Step = { from: "Browser" | "Server"; title: string; lines: string[]; tone?: "good" | "bad" };

const SIMPLE_METHODS = new Set(["GET", "POST", "HEAD"]);
const SIMPLE_TYPES = new Set(["text/plain", "application/x-www-form-urlencoded", "multipart/form-data"]);

/** Why the browser decided this request needs a preflight (empty = simple request). */
export function preflightReasons(method: string, withAuth: boolean, contentType: string): string[] {
  const reasons: string[] = [];
  if (!SIMPLE_METHODS.has(method)) reasons.push(`${method} is not a simple method (GET, POST, HEAD)`);
  if (withAuth) reasons.push("Authorization is a non-simple header");
  if (method !== "GET" && !SIMPLE_TYPES.has(contentType)) reasons.push(`Content-Type ${contentType} is not a simple type`);
  return reasons;
}

export function CorsFlow() {
  const [method, setMethod] = useState<Method>("PUT");
  const [auth, setAuth] = useState(true);
  const [ctype, setCtype] = useState<string>("application/json");
  const [allowed, setAllowed] = useState(true);
  const [step, setStep] = useState(0);

  const reasons = preflightReasons(method, auth, ctype);
  const preflight = reasons.length > 0;

  const steps = useMemo<Step[]>(() => {
    const origin = "Origin: https://app.notes.dev";
    const out: Step[] = [];
    const actual: Step = {
      from: "Browser",
      title: "Actual request",
      lines: [`${method} /api/notes/7`, "Host: api.notes.dev", origin, ...(auth ? ["Authorization: Bearer …"] : []), ...(method !== "GET" ? [`Content-Type: ${ctype}`] : [])],
    };
    if (preflight) {
      out.push({
        from: "Browser",
        title: "Preflight (sent automatically, no body)",
        lines: ["OPTIONS /api/notes/7", origin, `Access-Control-Request-Method: ${method}`, ...(auth ? ["Access-Control-Request-Headers: authorization"] : [])],
      });
      if (!allowed) {
        out.push({ from: "Server", title: "Preflight response — origin not allowed", lines: ["HTTP/1.1 204 No Content", "(no Access-Control-Allow-Origin header)"] });
        out.push({ from: "Browser", title: "Blocked ✋", lines: ["CORS error in the console.", "The actual request is never sent."], tone: "bad" });
        return out;
      }
      out.push({
        from: "Server",
        title: "Preflight response",
        lines: ["HTTP/1.1 204 No Content", "Access-Control-Allow-Origin: https://app.notes.dev", "Access-Control-Allow-Methods: GET, POST, PUT, DELETE", "Access-Control-Allow-Headers: authorization, content-type", "Access-Control-Max-Age: 86400"],
      });
      out.push({ from: "Browser", title: "Checks pass ✓", lines: ["Origin, method and headers are all allowed.", "Result cached for 24h (Max-Age)."], tone: "good" });
    }
    out.push(actual);
    if (allowed) {
      out.push({ from: "Server", title: "Response", lines: ["HTTP/1.1 200 OK", "Access-Control-Allow-Origin: https://app.notes.dev", "{ …note… }"] });
      out.push({ from: "Browser", title: "Delivered to your JavaScript ✓", lines: ["Allow-Origin matches the page's origin."], tone: "good" });
    } else {
      out.push({ from: "Server", title: "Response (server still ran it!)", lines: ["HTTP/1.1 200 OK", "(no Access-Control-Allow-Origin header)"] });
      out.push({ from: "Browser", title: "Blocked ✋", lines: ["The response is hidden from your JavaScript.", "CORS error in the console and Network tab."], tone: "bad" });
    }
    return out;
  }, [method, auth, ctype, allowed, preflight]);

  const reset = <T,>(set: (v: T) => void) => (v: T) => { set(v); setStep(0); };
  const current = Math.min(step, steps.length - 1);

  return (
    <Widget title="CORS flow simulator" hint="Page at app.notes.dev calls api.notes.dev. Change the request and step through what the browser does.">
      <div className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-20 text-muted">Method</span>
          {METHODS.map((m) => <Pill key={m} active={method === m} onClick={() => reset(setMethod)(m)}>{m}</Pill>)}
        </div>
        {method !== "GET" && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-20 text-muted">Body type</span>
            {TYPES.map((t) => <Pill key={t} active={ctype === t} onClick={() => reset(setCtype)(t)}>{t.replace("application/", "")}</Pill>)}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-20 text-muted">Auth</span>
          <Pill active={auth} onClick={() => reset(setAuth)(!auth)}>{auth ? "Authorization header ✓" : "No auth header"}</Pill>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-20 text-muted">Server</span>
          <Pill active={allowed} onClick={() => reset(setAllowed)(true)}>Allows this origin</Pill>
          <Pill active={!allowed} onClick={() => reset(setAllowed)(false)}>Doesn&apos;t</Pill>
        </div>
      </div>

      <div className={`mt-4 rounded-lg px-3 py-2 text-sm ${preflight ? "bg-warn-soft" : "bg-good-soft"}`}>
        {preflight ? (
          <>
            <strong>Preflighted request</strong>, because:
            <ul className="ml-5 list-disc">{reasons.map((r) => <li key={r}>{r}</li>)}</ul>
          </>
        ) : (
          <><strong>Simple request</strong> — no preflight. The browser sends it directly and checks the response.</>
        )}
      </div>

      <ol className="mt-4 space-y-2">
        {steps.slice(0, current + 1).map((s, i) => (
          <li
            key={i}
            className={`rounded-lg border p-3 text-sm ${s.from === "Server" ? "ml-6 border-border bg-surface-2" : "mr-6 border-border"} ${
              s.tone === "good" ? "border-good bg-good-soft" : s.tone === "bad" ? "border-bad bg-bad-soft" : ""
            }`}
          >
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
              {s.from === "Browser" ? "Browser →" : "← Server"} · {s.title}
            </p>
            <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-[0.78rem] leading-6">{s.lines.join("\n")}</pre>
          </li>
        ))}
      </ol>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => setStep(0)} className="min-h-10 rounded-lg border border-border px-4 text-sm">Restart</button>
        <button
          type="button"
          onClick={() => setStep(current + 1)}
          disabled={current >= steps.length - 1}
          className="min-h-10 flex-1 rounded-lg bg-accent px-4 text-sm font-medium text-white disabled:opacity-40 dark:text-bg"
        >
          {current >= steps.length - 1 ? "Done" : `Next step (${current + 1}/${steps.length})`}
        </button>
      </div>
    </Widget>
  );
}

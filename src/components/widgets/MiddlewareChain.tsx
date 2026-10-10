"use client";

import { useMemo, useState } from "react";
import { Pill, Widget } from "./Widget";

type Mw = "cors" | "requestId" | "logger" | "rateLimit" | "auth" | "handler" | "errors";
type Token = "valid" | "expired" | "missing";
type Outcome = "ok" | "notFound" | "bug";

const LABEL: Record<Mw, string> = {
  cors: "CORS",
  requestId: "Request ID",
  logger: "Logger",
  rateLimit: "Rate limit",
  auth: "Auth",
  handler: "GET /notes/42 handler",
  errors: "Global error handler",
};

const ORDERS: { label: string; order: Mw[] }[] = [
  { label: "Recommended", order: ["cors", "requestId", "logger", "rateLimit", "auth", "handler", "errors"] },
  { label: "Logger after auth", order: ["cors", "requestId", "rateLimit", "auth", "logger", "handler", "errors"] },
  { label: "Error handler too early", order: ["cors", "requestId", "errors", "logger", "rateLimit", "auth", "handler"] },
];

type Ctx = Record<string, string>;
type Step = { mw: Mw; tone: "pass" | "stop" | "error" | "skip"; text: string; ctx: Ctx };

function simulate(order: Mw[], originOk: boolean, token: Token, limited: boolean, outcome: Outcome) {
  const steps: Step[] = [];
  const ctx: Ctx = {};
  const logs: string[] = [];
  let response = "";
  let pendingError: string | null = null;

  for (let i = 0; i < order.length; i++) {
    const mw = order[i];
    const snap = () => ({ ...ctx });
    if (pendingError) {
      if (mw === "errors") {
        const status = pendingError === "NotFoundError" ? "404 Not Found" : "500 Internal Server Error";
        const code = pendingError === "NotFoundError" ? "NOTE_NOT_FOUND" : "INTERNAL";
        response = `${status}\n{ "error": { "code": "${code}", "requestId": "${ctx.requestId ?? "?"}" } }`;
        steps.push({ mw, tone: "pass", text: `Caught ${pendingError} → ${status} with a structured body. Stack trace stays in the logs.`, ctx: snap() });
        break;
      }
      steps.push({ mw, tone: "skip", text: "Skipped: an error is propagating.", ctx: snap() });
      continue;
    }
    if (mw === "errors") {
      steps.push({ mw, tone: "skip", text: "No error so far. Calls next().", ctx: snap() });
      continue;
    }
    if (mw === "cors") {
      steps.push({
        mw,
        tone: "pass",
        text: originOk
          ? "Origin app.notes.dev is allowed → adds Access-Control-Allow-Origin, next()."
          : "Origin evil.example not allowed → adds no CORS headers, next(). The server still runs; the browser will hide the response.",
        ctx: snap(),
      });
    } else if (mw === "requestId") {
      ctx.requestId = "3f2b9c1e";
      steps.push({ mw, tone: "pass", text: "Generates an ID, stores it in the context, next().", ctx: snap() });
    } else if (mw === "logger") {
      logs.push(`[${ctx.requestId ?? "no-id"}] GET /notes/42${ctx.userId ? ` user=${ctx.userId}` : ""}`);
      steps.push({ mw, tone: "pass", text: "Writes a log line, next().", ctx: snap() });
    } else if (mw === "rateLimit") {
      if (limited) {
        response = "429 Too Many Requests\nRetry-After: 30";
        steps.push({ mw, tone: "stop", text: "Over 100 requests/minute → responds 429 and does NOT call next().", ctx: snap() });
        break;
      }
      steps.push({ mw, tone: "pass", text: "Under the limit, next().", ctx: snap() });
    } else if (mw === "auth") {
      if (token !== "valid") {
        response = `401 Unauthorized\n{ "error": { "code": "${token === "expired" ? "TOKEN_EXPIRED" : "UNAUTHENTICATED"}" } }`;
        steps.push({ mw, tone: "stop", text: `Token ${token} → responds 401 and does NOT call next(). Handler never runs.`, ctx: snap() });
        break;
      }
      ctx.userId = "u_17";
      ctx.role = "member";
      steps.push({ mw, tone: "pass", text: "JWT verified → puts userId and role in the context, next().", ctx: snap() });
    } else if (mw === "handler") {
      if (outcome === "ok") {
        response = `200 OK\n{ "id": 42, "ownerId": "${ctx.userId}", "title": "Groceries" }`;
        steps.push({ mw, tone: "pass", text: `Reads userId=${ctx.userId} from the context, calls the service → 200.`, ctx: snap() });
        break;
      }
      pendingError = outcome === "notFound" ? "NotFoundError" : "TypeError";
      steps.push({ mw, tone: "error", text: `Service throws ${pendingError}. Passed to the next error-handling step…`, ctx: snap() });
    }
  }

  if (!response) {
    response = pendingError
      ? "500 Internal Server Error\n(framework default page, possibly with a stack trace, no request ID, inconsistent shape)"
      : "(no response)";
  }
  return { steps, logs, response, uncaught: Boolean(pendingError) && !steps.some((s) => s.mw === "errors" && s.tone === "pass") };
}

const TONE: Record<Step["tone"], string> = {
  pass: "border-border",
  stop: "border-warn bg-warn-soft",
  error: "border-bad bg-bad-soft",
  skip: "border-border opacity-60",
};

export function MiddlewareChain() {
  const [orderIdx, setOrderIdx] = useState(0);
  const [originOk, setOriginOk] = useState(true);
  const [token, setToken] = useState<Token>("valid");
  const [limited, setLimited] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>("ok");
  const [step, setStep] = useState(0);

  const order = ORDERS[orderIdx].order;
  const sim = useMemo(() => simulate(order, originOk, token, limited, outcome), [order, originOk, token, limited, outcome]);
  const current = Math.min(step, sim.steps.length - 1);
  const done = current >= sim.steps.length - 1;
  const reset = <T,>(set: (v: T) => void) => (v: T) => { set(v); setStep(0); };

  return (
    <Widget title="Middleware chain" hint="A request for GET /notes/42 runs through the chain. Break something, change the order, and step through.">
      <div className="space-y-2 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-20 text-muted-foreground">Order</span>
          {ORDERS.map((o, i) => <Pill key={o.label} active={orderIdx === i} onClick={() => reset(setOrderIdx)(i)}>{o.label}</Pill>)}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-20 text-muted-foreground">Origin</span>
          <Pill active={originOk} onClick={() => reset(setOriginOk)(true)}>app.notes.dev</Pill>
          <Pill active={!originOk} onClick={() => reset(setOriginOk)(false)}>evil.example</Pill>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-20 text-muted-foreground">Token</span>
          {(["valid", "expired", "missing"] as Token[]).map((t) => <Pill key={t} active={token === t} onClick={() => reset(setToken)(t)}>{t}</Pill>)}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-20 text-muted-foreground">Traffic</span>
          <Pill active={!limited} onClick={() => reset(setLimited)(false)}>Normal</Pill>
          <Pill active={limited} onClick={() => reset(setLimited)(true)}>Flooding</Pill>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-20 text-muted-foreground">Service</span>
          <Pill active={outcome === "ok"} onClick={() => reset(setOutcome)("ok")}>Works</Pill>
          <Pill active={outcome === "notFound"} onClick={() => reset(setOutcome)("notFound")}>Throws NotFound</Pill>
          <Pill active={outcome === "bug"} onClick={() => reset(setOutcome)("bug")}>Has a bug</Pill>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_12rem]">
        <ol className="space-y-2">
          {sim.steps.slice(0, current + 1).map((s, i) => (
            <li key={i} className={`rounded-lg border p-3 text-sm ${TONE[s.tone]}`}>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{order.indexOf(s.mw) + 1} · {LABEL[s.mw]}</p>
              <p className="mt-1">{s.text}</p>
            </li>
          ))}
        </ol>
        <div className="space-y-3">
          <div className="rounded-lg bg-muted p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Request context</p>
            <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all font-mono text-[0.78rem] leading-6">
              {Object.keys(sim.steps[current]?.ctx ?? {}).length ? JSON.stringify(sim.steps[current].ctx, null, 2) : "{ }"}
            </pre>
          </div>
          {done && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Log file</p>
              <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all font-mono text-[0.78rem] leading-6">{sim.logs.length ? sim.logs.join("\n") : "(empty: this request was never logged)"}</pre>
            </div>
          )}
        </div>
      </div>

      {done && (
        <div className={`mt-3 rounded-lg px-3 py-2 text-sm ${sim.uncaught ? "bg-bad-soft" : "bg-primary/10"}`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Response</p>
          <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-[0.78rem] leading-6">{sim.response}</pre>
          {sim.uncaught && <p className="mt-1">The error handler was registered before the handler, so it never saw this error.</p>}
          {!originOk && !sim.uncaught && <p className="mt-1">No CORS headers were added, so the browser hides this response from the page.</p>}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => setStep(0)} className="min-h-10 rounded-lg border border-border px-4 text-sm">Restart</button>
        <button
          type="button"
          onClick={() => setStep(current + 1)}
          disabled={done}
          className="min-h-10 flex-1 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-40"
        >
          {done ? "Done" : `Next step (${current + 1}/${sim.steps.length})`}
        </button>
      </div>
    </Widget>
  );
}

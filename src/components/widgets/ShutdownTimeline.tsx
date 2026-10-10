"use client";

import { useMemo, useState } from "react";
import { Pill, Widget } from "./Widget";

type Mode = "graceful" | "kill" | "ignore";
type Tone = "good" | "bad" | "warn" | undefined;
type Event = { t: number; text: string; tone?: Tone };

const GRACE = 30; // orchestrator's grace period before SIGKILL, in seconds

const REQUESTS = [
  { name: "GET /cart", left: 0.3 },
  { name: "POST /orders (card charged, saving order)", left: 1.2 },
  { name: "POST /uploads (product photo)", left: 8 },
  { name: "GET /exports/yearly-report", left: 45 },
];

function buildEvents(mode: Mode, timeout: number): Event[] {
  if (mode === "kill") {
    return [
      { t: 0, text: "SIGKILL. The process stops instantly; no code runs." },
      ...REQUESTS.map((r) => ({
        t: 0,
        text: `${r.name}: connection reset${r.name.startsWith("POST /orders") ? ". Card charged, but no order row. The customer retries and pays twice." : ""}`,
        tone: "bad" as Tone,
      })),
      { t: 0, text: "Open DB transaction abandoned; locks held until the database notices the dead connection.", tone: "bad" },
    ];
  }

  if (mode === "ignore") {
    return [
      { t: 0, text: "SIGTERM arrives. No handler registered, the app keeps going as if nothing happened.", tone: "warn" },
      { t: 0.3, text: "GET /cart finishes" },
      { t: 1.2, text: "POST /orders finishes" },
      { t: 8, text: "POST /uploads finishes" },
      { t: 12, text: "Still in the balancer's pool, so new requests keep arriving", tone: "warn" },
      { t: GRACE, text: `Grace period over (${GRACE}s). SIGKILL.`, tone: "bad" },
      { t: GRACE, text: "GET /exports/yearly-report and 3 newer requests: connection reset", tone: "bad" },
      { t: GRACE, text: "No cleanup ran: connections, buffers and temp files abandoned", tone: "bad" },
    ];
  }

  const deadline = Math.min(timeout, GRACE);
  const events: Event[] = [
    { t: 0, text: "SIGTERM received. Handler runs: readiness check now fails." },
    { t: 0, text: "Load balancer stops routing new requests here; they go to the new instances.", tone: "good" },
    { t: 2, text: "Listener closed. No new connections accepted." },
  ];
  for (const r of REQUESTS) {
    if (r.left <= deadline) events.push({ t: r.left, text: `${r.name}: finished and responded`, tone: "good" });
    else
      events.push({
        t: deadline,
        text:
          timeout > GRACE
            ? `${r.name}: still running when the orchestrator's ${GRACE}s grace period ends. SIGKILL cuts it off.`
            : `${r.name}: drain timeout (${timeout}s) hit, request cancelled with an error`,
        // Work that could never fit in the grace period is a design problem, not a timeout problem.
        tone: timeout <= GRACE && r.left > GRACE ? "warn" : "bad",
      });
  }
  if (timeout > GRACE) {
    events.push({ t: GRACE, text: "Killed before cleanup: your timeout was longer than the grace period.", tone: "bad" });
  } else {
    const end = Math.min(Math.max(...REQUESTS.map((r) => r.left)), deadline);
    events.push({ t: end, text: "Job workers stopped; logs and metrics flushed" });
    events.push({ t: end, text: "Redis client closed, then DB pool closed (reverse order)" });
    events.push({ t: end, text: "Process exits with code 0", tone: "good" });
  }
  return events.sort((a, b) => a.t - b.t);
}

export function ShutdownTimeline() {
  const [mode, setMode] = useState<Mode>("graceful");
  const [timeout, setTimeoutSecs] = useState(25);
  const [step, setStep] = useState(0);

  const events = useMemo(() => buildEvents(mode, timeout), [mode, timeout]);
  const current = Math.min(step, events.length - 1);
  const shown = events.slice(0, current + 1);
  const done = current >= events.length - 1;
  const bad = events.filter((e) => e.tone === "bad").length;

  return (
    <Widget
      title="Shutdown timeline"
      hint={`Four requests are in flight when a deploy stops this instance. The orchestrator allows ${GRACE}s before SIGKILL.`}
    >
      <div className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-20 text-muted">Signal</span>
          <Pill active={mode === "graceful"} onClick={() => { setMode("graceful"); setStep(0); }}>SIGTERM, handled</Pill>
          <Pill active={mode === "ignore"} onClick={() => { setMode("ignore"); setStep(0); }}>SIGTERM, ignored</Pill>
          <Pill active={mode === "kill"} onClick={() => { setMode("kill"); setStep(0); }}>SIGKILL</Pill>
        </div>
        {mode === "graceful" && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-20 text-muted">Drain timeout</span>
            {[5, 25, 60].map((t) => (
              <Pill key={t} active={timeout === t} onClick={() => { setTimeoutSecs(t); setStep(0); }}>{t}s</Pill>
            ))}
          </div>
        )}
      </div>

      <ol className="mt-4 space-y-2">
        {shown.map((e, i) => (
          <li
            key={i}
            className={`flex gap-3 rounded-lg border p-2.5 text-sm ${
              e.tone === "good" ? "border-good bg-good-soft" : e.tone === "bad" ? "border-bad bg-bad-soft" : e.tone === "warn" ? "border-warn bg-warn-soft" : "border-border"
            }`}
          >
            <span className="w-12 shrink-0 font-mono text-xs text-muted">t={e.t}s</span>
            <span>{e.text}</span>
          </li>
        ))}
      </ol>

      {done && (
        <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${bad === 0 ? "bg-good-soft" : "bg-warn-soft"}`}>
          {bad === 0
            ? "Clean exit: every normal request finished and resources were released. The 45-second export could never fit in any window; long work like that belongs in a background job."
            : mode === "graceful" && timeout === 5
              ? "Too short: the photo upload was legitimate work and got killed."
              : mode === "graceful" && timeout > GRACE
                ? "Too long: the orchestrator doesn't wait for you. Keep your timeout under the grace period."
                : `${bad} bad outcomes. This is what graceful shutdown exists to prevent.`}
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => setStep(0)} className="min-h-10 rounded-lg border border-border px-4 text-sm">Restart</button>
        <button
          type="button"
          onClick={() => setStep(current + 1)}
          disabled={done}
          className="min-h-10 flex-1 rounded-lg bg-accent px-4 text-sm font-medium text-white disabled:opacity-40 dark:text-bg"
        >
          {done ? "Done" : `Next event (${current + 1}/${events.length})`}
        </button>
      </div>
    </Widget>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Pill, Widget } from "./Widget";

type Receiver = "healthy" | "deploying" | "ack-lost";
type Policy = "backoff" | "none";

type Attempt = {
  at: string;
  request: string;
  outcome: string;
  note: string;
  tone: "good" | "bad" | "warn";
  proDays: number;
  receipts: number;
};

const RECEIVERS: { id: Receiver; label: string }[] = [
  { id: "healthy", label: "Healthy" },
  { id: "deploying", label: "Mid-deploy (fails twice)" },
  { id: "ack-lost", label: "Does the work, 200 gets lost" },
];

/** Retry schedule with a fixed (deterministic) jitter so the demo is repeatable. */
const SCHEDULE = ["0:00", "0:06", "5:42", "36:15", "2:41:03"];

/** Builds the provider's delivery log for one event under the chosen conditions. */
export function simulateDeliveries(receiver: Receiver, idempotent: boolean, policy: Policy): Attempt[] {
  const out: Attempt[] = [];
  let proDays = 0;
  let receipts = 0;
  let processed = false;
  const maxAttempts = policy === "none" ? 1 : SCHEDULE.length;

  for (let i = 0; i < maxAttempts; i++) {
    const request = `POST /hooks/stripe  (delivery ${i + 1} of evt_9f2, same event id)`;
    const failsBecauseDeploying = receiver === "deploying" && i < 2;
    const ackLost = receiver === "ack-lost" && i === 0;

    if (failsBecauseDeploying) {
      out.push({
        at: SCHEDULE[i],
        request,
        outcome: i === 0 ? "503 Service Unavailable" : "No response within 10 s",
        note: i === 0 ? "Old instance shutting down. Nothing was written." : "New instance still warming up. The provider gives up on this attempt.",
        tone: "bad",
        proDays,
        receipts,
      });
      continue;
    }

    // The handler runs. With idempotency it first claims the event id in the same transaction.
    let note: string;
    if (idempotent && processed) {
      note = "INSERT of evt_9f2 hits the UNIQUE constraint, so the transaction does nothing and returns 200.";
    } else {
      proDays += 30;
      receipts += 1;
      processed = true;
      note = idempotent
        ? "One transaction: record evt_9f2, add 30 days of Pro, queue a receipt email."
        : "Adds 30 days of Pro and sends a receipt. No record of which events were handled.";
    }

    if (ackLost) {
      out.push({
        at: SCHEDULE[i],
        request,
        outcome: "200 sent, connection dropped before the provider saw it",
        note: `${note} The provider counts this delivery as failed.`,
        tone: "warn",
        proDays,
        receipts,
      });
      continue;
    }

    out.push({ at: SCHEDULE[i], request, outcome: "200 OK, event marked delivered", note, tone: "good", proDays, receipts });
    return out;
  }

  const last = out[out.length - 1];
  out.push({
    at: last.at,
    request: "No more automatic attempts",
    outcome: policy === "none" ? "Delivery marked failed. Someone must press Redeliver." : "Event exhausted, endpoint flagged",
    note: last.proDays > 0 ? "The work happened, but the provider believes it didn't." : "The customer paid and never got Pro.",
    tone: "bad",
    proDays: last.proDays,
    receipts: last.receipts,
  });
  return out;
}

export function WebhookDeliverySim() {
  const [receiver, setReceiver] = useState<Receiver>("ack-lost");
  const [idempotent, setIdempotent] = useState(false);
  const [policy, setPolicy] = useState<Policy>("backoff");
  const [step, setStep] = useState(0);

  const attempts = useMemo(() => simulateDeliveries(receiver, idempotent, policy), [receiver, idempotent, policy]);
  const current = Math.min(step, attempts.length - 1);
  const shown = attempts.slice(0, current + 1);
  const state = shown[shown.length - 1];
  const finished = current >= attempts.length - 1;
  const duplicated = state.proDays > 30;

  const reset = <T,>(set: (v: T) => void) => (v: T) => { set(v); setStep(0); };

  return (
    <Widget title="Webhook delivery simulator" hint="A customer pays once. Stripe sends payment_succeeded (evt_9f2) to your endpoint. Step through the deliveries.">
      <div className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-24 text-muted-foreground">Your server</span>
          {RECEIVERS.map((r) => <Pill key={r.id} active={receiver === r.id} onClick={() => reset(setReceiver)(r.id)}>{r.label}</Pill>)}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-24 text-muted-foreground">Handler</span>
          <Pill active={!idempotent} onClick={() => reset(setIdempotent)(false)}>Just does the work</Pill>
          <Pill active={idempotent} onClick={() => reset(setIdempotent)(true)}>Dedupes on event id</Pill>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-24 text-muted-foreground">Provider</span>
          <Pill active={policy === "backoff"} onClick={() => reset(setPolicy)("backoff")}>Retries with backoff</Pill>
          <Pill active={policy === "none"} onClick={() => reset(setPolicy)("none")}>Never retries</Pill>
        </div>
      </div>

      <ol className="mt-4 space-y-2">
        {shown.map((a, i) => (
          <li
            key={i}
            className={`rounded-lg border p-3 text-sm ${
              a.tone === "good" ? "border-good bg-good-soft" : a.tone === "bad" ? "border-bad bg-bad-soft" : "border-warn bg-warn-soft"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">t = {a.at}</p>
            <p className="mt-1 break-words font-mono text-[0.78rem]">{a.request}</p>
            <p className="mt-1 font-medium">{a.outcome}</p>
            <p className="mt-0.5 text-muted-foreground">{a.note}</p>
          </li>
        ))}
      </ol>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className={`rounded-lg px-3 py-2 text-sm ${duplicated ? "bg-bad-soft" : "bg-muted"}`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pro time granted</p>
          <p className="font-mono">{state.proDays} days {duplicated && "(paid for 30!)"}</p>
        </div>
        <div className={`rounded-lg px-3 py-2 text-sm ${state.receipts > 1 ? "bg-bad-soft" : "bg-muted"}`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Receipt emails sent</p>
          <p className="font-mono">{state.receipts}</p>
        </div>
      </div>

      {finished && (
        <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm">
          {duplicated
            ? "At-least-once delivery bit you: the same event ran twice. Switch the handler to dedupe on the event id."
            : state.proDays === 0
              ? "With no retries, a short outage loses the event. You need a manual redeliver or a reconciliation job."
              : "The side effect happened exactly once, however many deliveries it took."}
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => setStep(0)} className="min-h-10 rounded-lg border border-border px-4 text-sm">Restart</button>
        <button
          type="button"
          onClick={() => setStep(current + 1)}
          disabled={finished}
          className="min-h-10 flex-1 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-40"
        >
          {finished ? "Done" : `Next delivery (${current + 1}/${attempts.length})`}
        </button>
      </div>
    </Widget>
  );
}

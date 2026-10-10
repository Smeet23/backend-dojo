"use client";

import { useMemo, useState } from "react";
import { Pill, Widget } from "./Widget";

type Mode = "orchestration" | "choreography";
type FailAt = "none" | "stock" | "card" | "courier";
type Dup = "none" | "nodedupe" | "dedupe";
type Status = "pending" | "done" | "failed" | "compensated";
type Tone = "good" | "warn" | "bad" | "neutral";
type Frame = { text: string; tone: Tone; status: Status[]; note?: string };

type Step = {
  svc: string;
  act: string;
  comp?: string;
  cmd: string;
  ok: string;
  fail?: string;
  kind: "compensatable" | "pivot" | "retryable";
};

const STEPS: Step[] = [
  { svc: "Order", act: "create order #42 as PENDING", comp: "mark order #42 REJECTED", cmd: "CreateOrder", ok: "OrderCreated", kind: "compensatable" },
  { svc: "Inventory", act: "reserve 2 x MUG-01", comp: "release 2 x MUG-01", cmd: "ReserveStock", ok: "StockReserved", fail: "StockReservationFailed (out of stock)", kind: "compensatable" },
  { svc: "Payment", act: "authorize 49.90 on the card", comp: "void the authorization", cmd: "AuthorizePayment", ok: "PaymentAuthorized", fail: "PaymentDeclined (card declined)", kind: "compensatable" },
  { svc: "Shipping", act: "book a courier pickup", comp: "cancel the pickup", cmd: "BookShipment", ok: "ShipmentBooked", fail: "ShipmentFailed (no courier for this pincode)", kind: "compensatable" },
  { svc: "Payment", act: "capture the authorized 49.90", cmd: "CapturePayment", ok: "PaymentCaptured", kind: "pivot" },
  { svc: "Order", act: "mark order #42 APPROVED", cmd: "ApproveOrder", ok: "OrderApproved", kind: "retryable" },
  { svc: "Notification", act: "email the confirmation", cmd: "SendEmail", ok: "EmailSent", kind: "retryable" },
];

const FAIL_INDEX: Record<FailAt, number> = { none: -1, stock: 1, card: 2, courier: 3 };
const FAIL_LABEL: Record<FailAt, string> = {
  none: "Nothing fails",
  stock: "Out of stock",
  card: "Card declined",
  courier: "No courier",
};

export function buildFrames(mode: Mode, failAt: FailAt, dup: Dup, flakyComp: boolean): Frame[] {
  const status: Status[] = STEPS.map(() => "pending");
  const frames: Frame[] = [];
  const push = (text: string, tone: Tone, note?: string) => frames.push({ text, tone, status: [...status], note });
  const orch = mode === "orchestration";
  const failIdx = FAIL_INDEX[failAt];

  push(
    orch
      ? "Checkout API starts saga 42. Orchestrator writes saga row {id: 42, step: 0, state: RUNNING} before doing anything."
      : "Checkout API calls the Order service directly. There is no saga row anywhere; the flow lives in each service's event handlers.",
    "neutral",
  );

  let failed = -1;
  for (let i = 0; i < STEPS.length; i++) {
    const s = STEPS[i];
    const prevEvent = i === 0 ? "the API call" : STEPS[i - 1].ok;
    if (i === failIdx) {
      status[i] = "failed";
      push(
        orch
          ? `Orchestrator -> ${s.svc}: ${s.cmd}. Reply: ${s.fail}. Orchestrator records state COMPENSATING.`
          : `${s.svc} hears ${prevEvent}, tries to ${s.act}, fails and publishes ${s.fail}.`,
        "bad",
      );
      failed = i;
      break;
    }
    status[i] = "done";
    const pivot = s.kind === "pivot" ? " This is the pivot: from here the saga can only go forward." : "";
    push(
      orch
        ? `Orchestrator -> ${s.svc}: ${s.cmd}. ${s.svc} commits locally (${s.act}) and replies ${s.ok}. Saga row: step ${i + 1} done.${pivot}`
        : `${s.svc} hears ${prevEvent}, commits locally (${s.act}) and publishes ${s.ok}.${pivot}`,
      s.kind === "pivot" ? "warn" : "good",
    );
    if (s.svc === "Payment" && s.cmd === "AuthorizePayment" && dup !== "none") {
      if (dup === "dedupe") {
        push(
          `The ack for ${s.cmd} was lost, so the message is delivered again. Payment finds (saga 42, ${s.cmd}) in its processed-messages table and returns the stored result. One hold on the card.`,
          "good",
        );
      } else {
        push(
          `The ack for ${s.cmd} was lost, so the message is delivered again. Payment has no dedupe table and authorizes AGAIN: the customer now sees two holds of 49.90.`,
          "bad",
          "Duplicate side effect",
        );
      }
    }
  }

  if (failed >= 0) {
    const toUndo = STEPS.slice(0, failed)
      .map((s, i) => ({ s, i }))
      .reverse();
    let first = true;
    for (const { s, i } of toUndo) {
      if (!s.comp) continue;
      if (first && flakyComp) {
        push(
          orch
            ? `Orchestrator -> ${s.svc}: compensate (${s.comp}). Call times out. Orchestrator keeps COMPENSATING and retries with backoff.`
            : `${s.svc} hears the failure event, tries to ${s.comp}, but its downstream call times out. The event is not acked, so it is redelivered.`,
          "warn",
        );
      }
      first = false;
      status[i] = "compensated";
      push(
        orch
          ? `Orchestrator -> ${s.svc}: ${s.comp}. Done (idempotent, keyed by saga 42). Saga row: step ${i + 1} compensated.`
          : `${s.svc} hears ${STEPS[failed].fail?.split(" ")[0]} and runs its own compensation: ${s.comp}.`,
        "warn",
      );
    }
    push(
      orch
        ? "Orchestrator writes state ABORTED. Order #42 shows 'Payment failed / item unavailable' to the customer."
        : "Every listener has reacted. To answer 'what happened to order 42?' you must stitch together events from several services.",
      "neutral",
      orch ? "Saga aborted cleanly" : "Saga aborted, no central record",
    );
  } else {
    push(
      orch ? "Orchestrator writes state COMPLETED." : "Last event published. Nobody owns the 'saga finished' fact; dashboards infer it from OrderApproved.",
      "good",
      "Saga completed",
    );
  }
  return frames;
}

const STATUS_STYLE: Record<Status, string> = {
  pending: "bg-surface-2 text-muted",
  done: "bg-good-soft",
  failed: "bg-bad-soft",
  compensated: "bg-warn-soft",
};

const TONE_STYLE: Record<Tone, string> = {
  good: "bg-good-soft",
  warn: "bg-warn-soft",
  bad: "bg-bad-soft",
  neutral: "bg-surface-2",
};

export function HldSagaRunner() {
  const [mode, setMode] = useState<Mode>("orchestration");
  const [failAt, setFailAt] = useState<FailAt>("courier");
  const [dup, setDup] = useState<Dup>("none");
  const [flaky, setFlaky] = useState(false);
  const [shown, setShown] = useState(1);

  const frames = useMemo(() => buildFrames(mode, failAt, dup, flaky), [mode, failAt, dup, flaky]);
  const visible = frames.slice(0, Math.min(shown, frames.length));
  const current = visible[visible.length - 1];
  const finished = shown >= frames.length;

  function reset<T>(setter: (v: T) => void, v: T) {
    setter(v);
    setShown(1);
  }

  return (
    <Widget
      title="Run an order saga"
      hint="Pick a coordination style and a failure, then step through. Watch which local commits happen and which compensations run, in which order."
    >
      <div className="flex flex-wrap gap-2">
        {(["orchestration", "choreography"] as Mode[]).map((m) => (
          <Pill key={m} active={mode === m} onClick={() => reset(setMode, m)}>
            {m}
          </Pill>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {(Object.keys(FAIL_LABEL) as FailAt[]).map((f) => (
          <Pill key={f} active={failAt === f} onClick={() => reset(setFailAt, f)}>
            {FAIL_LABEL[f]}
          </Pill>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Pill active={dup === "none"} onClick={() => reset(setDup, "none" as Dup)}>
          No duplicates
        </Pill>
        <Pill active={dup === "nodedupe"} onClick={() => reset(setDup, "nodedupe" as Dup)}>
          Payment msg redelivered, no dedupe
        </Pill>
        <Pill active={dup === "dedupe"} onClick={() => reset(setDup, "dedupe" as Dup)}>
          Redelivered, with dedupe
        </Pill>
        <Pill active={flaky} onClick={() => reset(setFlaky, !flaky)}>
          First compensation times out: {flaky ? "yes" : "no"}
        </Pill>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {STEPS.map((s, i) => (
          <div key={s.cmd} className={`min-w-0 rounded-lg p-2 text-xs ${STATUS_STYLE[current.status[i]]}`}>
            <p className="font-semibold">
              {i + 1}. {s.svc}
            </p>
            <p className="break-words">{s.cmd}</p>
            <p className="mt-0.5 text-muted">
              {s.kind} · {current.status[i]}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={finished}
          onClick={() => setShown((n) => n + 1)}
          className="min-h-10 flex-1 rounded-lg bg-accent px-3 text-sm font-medium text-white disabled:opacity-50 dark:text-bg"
        >
          {finished ? "Saga finished" : "Next step"}
        </button>
        <button type="button" onClick={() => setShown(frames.length)} className="min-h-10 rounded-lg border border-border px-3 text-sm">
          Run to end
        </button>
        <button type="button" onClick={() => setShown(1)} className="min-h-10 rounded-lg border border-border px-3 text-sm">
          Reset
        </button>
      </div>

      <ol className="mt-3 space-y-1">
        {visible.map((f, i) => (
          <li key={i} className={`rounded px-2 py-1 text-[0.78rem] break-words ${TONE_STYLE[f.tone]}`}>
            {f.text}
          </li>
        ))}
      </ol>
      {finished && current.note && <p className="mt-2 text-sm font-medium">{current.note}</p>}
    </Widget>
  );
}

"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Semantic = "at-most-once" | "at-least-once";
type Fault = "none" | "before" | "after";
type Tone = "good" | "warn" | "bad" | "neutral";
type Line = { text: string; tone: Tone };
type State = { next: number; charges: Record<number, number>; reserved: number; emails: number; analytics: number; log: Line[] };

const START: State = { next: 1, charges: {}, reserved: 0, emails: 0, analytics: 0, log: [] };

const FAULT_LABEL: Record<Fault, string> = {
  none: "No crash",
  before: "Payment crashes before processing",
  after: "Payment crashes after charging, before ack",
};

function publish(s: State, semantic: Semantic, fault: Fault, idempotent: boolean, analytics: boolean): State {
  const id = s.next;
  const log: Line[] = [{ text: `order-service → broker: order.created #${id} (producer moves on)`, tone: "neutral" }];
  const charges = { ...s.charges, [id]: 0 };

  // Payment consumer
  if (semantic === "at-most-once") {
    log.push({ text: `broker → payment: #${id}, offset committed on receipt`, tone: "neutral" });
    if (fault === "before") {
      log.push({ text: `payment crashed before charging. Broker thinks #${id} is done. Event lost.`, tone: "bad" });
    } else {
      charges[id] = 1;
      log.push({ text: `payment charged order #${id}`, tone: "good" });
      if (fault === "after") log.push({ text: "payment crashed after charging. Already acked, so no redelivery.", tone: "neutral" });
    }
  } else {
    log.push({ text: `broker → payment: #${id} (ack only after processing)`, tone: "neutral" });
    if (fault === "before") {
      log.push({ text: "payment crashed before charging. No ack, so the broker redelivers.", tone: "warn" });
      charges[id] = 1;
      log.push({ text: `redelivery: payment charged order #${id}, then acked`, tone: "good" });
    } else if (fault === "after") {
      charges[id] = 1;
      log.push({ text: `payment charged order #${id}, crashed before ack`, tone: "warn" });
      if (idempotent) {
        log.push({ text: `redelivery: payment sees event #${id} in processed_events, skips, acks`, tone: "good" });
      } else {
        charges[id] = 2;
        log.push({ text: `redelivery: payment charged order #${id} AGAIN`, tone: "bad" });
      }
    } else {
      charges[id] = 1;
      log.push({ text: `payment charged order #${id}, acked`, tone: "good" });
    }
  }

  // The other consumers are unaffected by payment's crash.
  log.push({ text: `inventory reserved stock for #${id}; email queued confirmation`, tone: "good" });
  if (analytics) log.push({ text: `analytics recorded #${id} (new consumer, producer unchanged)`, tone: "good" });

  return {
    next: id + 1,
    charges,
    reserved: s.reserved + 1,
    emails: s.emails + 1,
    analytics: s.analytics + (analytics ? 1 : 0),
    log: [...log.reverse(), ...s.log].slice(0, 12),
  };
}

export function SdEventDelivery() {
  const [semantic, setSemantic] = useState<Semantic>("at-least-once");
  const [fault, setFault] = useState<Fault>("after");
  const [idempotent, setIdempotent] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [state, setState] = useState<State>(START);

  const orders = Object.keys(state.charges).map(Number);
  const lost = orders.filter((o) => state.charges[o] === 0).length;
  const doubled = orders.filter((o) => state.charges[o] > 1).length;

  return (
    <Widget title="Delivery guarantees with a crashing consumer" hint="An order event fans out to payment, inventory and email. Make payment crash and compare what each guarantee does.">
      <div className="flex flex-wrap gap-2">
        {(["at-most-once", "at-least-once"] as Semantic[]).map((m) => (
          <Pill key={m} active={semantic === m} onClick={() => setSemantic(m)}>
            {m}
          </Pill>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {(Object.keys(FAULT_LABEL) as Fault[]).map((f) => (
          <Pill key={f} active={fault === f} onClick={() => setFault(f)}>
            {FAULT_LABEL[f]}
          </Pill>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Pill active={idempotent} onClick={() => setIdempotent((v) => !v)}>
          Payment dedupes by event id: {idempotent ? "on" : "off"}
        </Pill>
        <Pill active={analytics} onClick={() => setAnalytics((v) => !v)}>
          Analytics consumer: {analytics ? "subscribed" : "not yet"}
        </Pill>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setState((s) => publish(s, semantic, fault, idempotent, analytics))}
          className="min-h-10 flex-1 rounded-lg bg-accent px-3 text-sm font-medium text-white dark:text-bg"
        >
          Place order #{state.next}
        </button>
        <button type="button" onClick={() => setState(START)} className="min-h-10 rounded-lg border border-border px-3 text-sm">
          Reset
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <div className="min-w-0 rounded-lg bg-surface-2 p-2">
          <p className="text-xs text-muted">Orders</p>
          <p className="font-mono">{orders.length}</p>
        </div>
        <div className={`min-w-0 rounded-lg p-2 ${lost ? "bg-bad-soft" : "bg-good-soft"}`}>
          <p className="text-xs text-muted">Never charged</p>
          <p className="font-mono">{lost}</p>
        </div>
        <div className={`min-w-0 rounded-lg p-2 ${doubled ? "bg-bad-soft" : "bg-good-soft"}`}>
          <p className="text-xs text-muted">Charged twice</p>
          <p className="font-mono">{doubled}</p>
        </div>
        <div className="min-w-0 rounded-lg bg-surface-2 p-2">
          <p className="text-xs text-muted">Analytics saw</p>
          <p className="font-mono">{state.analytics}</p>
        </div>
      </div>

      <ol className="mt-3 space-y-1">
        {state.log.map((l, i) => (
          <li
            key={`${state.next}-${i}`}
            className={`rounded px-2 py-1 font-mono text-[0.72rem] break-words ${l.tone === "good" ? "bg-good-soft" : l.tone === "warn" ? "bg-warn-soft" : l.tone === "bad" ? "bg-bad-soft" : "bg-surface-2"}`}
          >
            {l.text}
          </li>
        ))}
      </ol>
    </Widget>
  );
}

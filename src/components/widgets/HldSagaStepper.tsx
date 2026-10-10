"use client";

import { useMemo, useState } from "react";
import { Pill, Widget } from "./Widget";

type Mode = "orch" | "choreo";
type Fail = "none" | "stock" | "payment" | "delivery";

type Step = {
  key: Exclude<Fail, "none"> | "order";
  service: string;
  action: string;
  event: string;
  failEvent: string;
  compensate: string;
  compensated: string;
};

const STEPS: Step[] = [
  { key: "order", service: "Orders", action: "CreateOrder", event: "OrderCreated", failEvent: "", compensate: "CancelOrder", compensated: "OrderCancelled" },
  { key: "stock", service: "Inventory", action: "ReserveStock", event: "StockReserved", failEvent: "StockUnavailable", compensate: "ReleaseStock", compensated: "StockReleased" },
  { key: "payment", service: "Payments", action: "ChargeCard", event: "PaymentCaptured", failEvent: "PaymentDeclined", compensate: "RefundCard", compensated: "PaymentRefunded" },
  { key: "delivery", service: "Shipping", action: "ScheduleDelivery", event: "DeliveryScheduled", failEvent: "NoCourierAvailable", compensate: "", compensated: "" },
];

type Line = { text: string; tone: "good" | "bad" | "warn" | "neutral" };

function script(mode: Mode, fail: Fail): Line[] {
  const lines: Line[] = [];
  const failAt = STEPS.findIndex((s) => s.key === fail);
  const last = failAt === -1 ? STEPS.length : failAt + 1;
  for (let i = 0; i < last; i++) {
    const s = STEPS[i];
    const failed = i === failAt;
    if (mode === "orch") {
      lines.push({ text: `Orchestrator → ${s.service}: ${s.action}`, tone: "neutral" });
      lines.push(
        failed
          ? { text: `${s.service} → Orchestrator: ${s.failEvent} (local transaction rolled back)`, tone: "bad" }
          : { text: `${s.service} commits locally → Orchestrator: ${s.event}`, tone: "good" },
      );
    } else {
      const trigger = i === 0 ? "Client request" : STEPS[i - 1].event;
      lines.push({ text: `${s.service} hears ${trigger} and runs ${s.action}`, tone: "neutral" });
      lines.push(
        failed
          ? { text: `${s.service} publishes ${s.failEvent}`, tone: "bad" }
          : { text: `${s.service} commits locally, publishes ${s.event}`, tone: "good" },
      );
    }
  }
  if (failAt === -1) {
    lines.push({ text: mode === "orch" ? "Orchestrator → Orders: ConfirmOrder. Saga complete." : "Orders hears DeliveryScheduled, marks order CONFIRMED. Saga complete.", tone: "good" });
    return lines;
  }
  // Compensate completed steps in reverse order.
  for (let i = failAt - 1; i >= 0; i--) {
    const s = STEPS[i];
    if (mode === "orch") {
      lines.push({ text: `Orchestrator → ${s.service}: ${s.compensate}`, tone: "warn" });
      lines.push({ text: `${s.service} → Orchestrator: ${s.compensated}`, tone: "warn" });
    } else {
      const heard = i === failAt - 1 ? STEPS[failAt].failEvent : STEPS[i + 1].compensated;
      lines.push({ text: `${s.service} hears ${heard}, runs ${s.compensate}, publishes ${s.compensated}`, tone: "warn" });
    }
  }
  lines.push({ text: "Saga ended: every completed step was undone by a compensating action. The order shows CANCELLED.", tone: "bad" });
  return lines;
}

export function HldSagaStepper() {
  const [mode, setMode] = useState<Mode>("orch");
  const [fail, setFail] = useState<Fail>("payment");
  const [shown, setShown] = useState(0);
  const lines = useMemo(() => script(mode, fail), [mode, fail]);
  const visible = lines.slice(0, shown);

  function choose(next: () => void) {
    next();
    setShown(0);
  }

  return (
    <Widget title="Order saga" hint="Four services, four local transactions. Pick a step to fail, then step through the messages.">
      <div className="flex flex-wrap gap-2">
        <Pill active={mode === "orch"} onClick={() => choose(() => setMode("orch"))}>Orchestration</Pill>
        <Pill active={mode === "choreo"} onClick={() => choose(() => setMode("choreo"))}>Choreography</Pill>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted">Fails at:</span>
        {([
          ["none", "Nothing"],
          ["stock", "Reserve stock"],
          ["payment", "Charge card"],
          ["delivery", "Schedule delivery"],
        ] as [Fail, string][]).map(([f, l]) => (
          <Pill key={f} active={fail === f} onClick={() => choose(() => setFail(f))}>
            {l}
          </Pill>
        ))}
      </div>

      <ol className="mt-3 min-h-24 space-y-1">
        {visible.map((l, i) => (
          <li
            key={`${i}-${l.text}`}
            className={`rounded px-2 py-1 font-mono text-[0.72rem] break-words ${
              l.tone === "good" ? "bg-good-soft" : l.tone === "warn" ? "bg-warn-soft" : l.tone === "bad" ? "bg-bad-soft" : "bg-surface-2"
            }`}
          >
            {i + 1}. {l.text}
          </li>
        ))}
        {visible.length === 0 && <li className="text-sm text-muted">Press Next to send the first message.</li>}
      </ol>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={shown >= lines.length}
          onClick={() => setShown((n) => n + 1)}
          className="min-h-10 flex-1 rounded-lg bg-accent px-3 text-sm font-medium text-white disabled:opacity-50 dark:text-bg"
        >
          {shown >= lines.length ? "Done" : `Next (${shown}/${lines.length})`}
        </button>
        <button type="button" onClick={() => setShown(lines.length)} className="min-h-10 rounded-lg border border-border px-3 text-sm">
          Show all
        </button>
        <button type="button" onClick={() => setShown(0)} className="min-h-10 rounded-lg border border-border px-3 text-sm">
          Reset
        </button>
      </div>
      <p className="mt-2 text-xs text-muted">
        {mode === "orch"
          ? "One coordinator knows the whole flow and stores the saga's state, so it's easy to see where an order is stuck."
          : "No coordinator: each service reacts to events. Loosely coupled, but the flow only exists as the sum of everyone's subscriptions."}
      </p>
    </Widget>
  );
}

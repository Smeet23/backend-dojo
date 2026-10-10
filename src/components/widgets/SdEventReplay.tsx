"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Ev = { at: string; type: string; amount?: number; status?: string };

const EVENTS: Ev[] = [
  { at: "Mon 09:00", type: "OrderCreated", amount: 1200, status: "CREATED" },
  { at: "Mon 09:01", type: "PaymentCaptured", amount: 1200, status: "PAID" },
  { at: "Mon 15:30", type: "ItemRemoved", amount: -300, status: "PAID" },
  { at: "Mon 15:31", type: "RefundIssued", amount: -300, status: "PAID" },
  { at: "Tue 11:00", type: "OrderPacked", status: "PACKED" },
  { at: "Wed 08:10", type: "OrderShipped", status: "SHIPPED" },
  { at: "Thu 17:45", type: "OrderDelivered", status: "DELIVERED" },
];

function project(upTo: number, skip: number | null) {
  let total = 0;
  let paid = 0;
  let status = "(nothing yet)";
  EVENTS.slice(0, upTo).forEach((e, i) => {
    if (i === skip) return;
    if (e.type === "OrderCreated" || e.type === "ItemRemoved") total += e.amount ?? 0;
    if (e.type === "PaymentCaptured" || e.type === "RefundIssued") paid += e.amount ?? 0;
    if (e.status) status = e.status;
  });
  return { total, paid, status };
}

export function SdEventReplay() {
  const [n, setN] = useState(EVENTS.length);
  const [skipRefund, setSkipRefund] = useState(false);
  const skip = skipRefund ? 3 : null;
  const view = project(n, skip);
  const crudRow = project(EVENTS.length, null);

  return (
    <Widget title="Event sourcing: state is a replay" hint="The event log is the source of truth. Drag through history to rebuild the order as it was at any moment.">
      <label className="block text-sm">
        <span className="text-muted">Replay the first {n} of {EVENTS.length} events</span>
        <input type="range" min={0} max={EVENTS.length} value={n} onChange={(e) => setN(Number(e.target.value))} className="mt-2 h-10 w-full accent-accent" />
      </label>

      <ol className="mt-2 space-y-1">
        {EVENTS.map((e, i) => {
          const applied = i < n && i !== skip;
          return (
            <li
              key={i}
              className={`flex flex-wrap items-baseline gap-x-2 rounded px-2 py-1 font-mono text-[0.72rem] ${applied ? "bg-accent-soft" : i === skip && i < n ? "bg-bad-soft line-through" : "bg-surface-2 text-muted"}`}
            >
              <span className="text-muted">{i + 1}.</span>
              <span>{e.at}</span>
              <span className="font-semibold">{e.type}</span>
              {e.amount !== undefined && <span>{e.amount > 0 ? `+${e.amount}` : e.amount}</span>}
            </li>
          );
        })}
      </ol>

      <div className="mt-3 flex flex-wrap gap-2">
        <Pill active={skipRefund} onClick={() => setSkipRefund((v) => !v)}>
          Buggy replay that skips event 4: {skipRefund ? "on" : "off"}
        </Pill>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <div className="min-w-0 rounded-lg border border-accent p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Derived from events</p>
          <p className="mt-1 font-mono">status = {view.status}</p>
          <p className="font-mono">order total = {view.total}</p>
          <p className={`font-mono ${view.paid !== view.total && n >= 4 ? "text-bad" : ""}`}>net paid = {view.paid}</p>
        </div>
        <div className="min-w-0 rounded-lg border border-border p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">A CRUD table only stores</p>
          <p className="mt-1 font-mono">status = {crudRow.status}</p>
          <p className="font-mono">order total = {crudRow.total}</p>
          <p className="text-xs text-muted">{`"What was it on Tuesday?" Unanswerable: earlier values were overwritten.`}</p>
        </div>
      </div>
    </Widget>
  );
}

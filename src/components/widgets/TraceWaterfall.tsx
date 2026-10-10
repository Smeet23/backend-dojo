"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Span = {
  name: string;
  depth: number;
  start: number;
  duration: number;
  attrs: Record<string, string>;
  error?: string;
};

type Scenario = "healthy" | "slow-payment" | "n-plus-one";

const SCENARIOS: Record<Scenario, { label: string; spans: Span[] }> = {
  healthy: {
    label: "Healthy checkout",
    spans: [
      { name: "POST /orders", depth: 0, start: 0, duration: 240, attrs: { "http.status": "201", "user.id": "81", "request.id": "req_7f2" } },
      { name: "auth middleware", depth: 1, start: 2, duration: 8, attrs: { "session.store": "redis" } },
      { name: "validate payload", depth: 1, start: 11, duration: 3, attrs: { items: "3" } },
      { name: "orders.service.create", depth: 1, start: 15, duration: 220, attrs: { "order.total": "49.90" } },
      { name: "SELECT products", depth: 2, start: 17, duration: 14, attrs: { "db.system": "postgres", rows: "3" } },
      { name: "POST payments-api /charge", depth: 2, start: 33, duration: 180, attrs: { "peer.service": "payments", "http.status": "200" } },
      { name: "INSERT orders", depth: 2, start: 215, duration: 18, attrs: { "db.system": "postgres" } },
    ],
  },
  "slow-payment": {
    label: "Payment provider hangs",
    spans: [
      { name: "POST /orders", depth: 0, start: 0, duration: 10060, attrs: { "http.status": "502", "user.id": "81", "request.id": "req_9c1" }, error: "upstream timeout" },
      { name: "auth middleware", depth: 1, start: 2, duration: 8, attrs: { "session.store": "redis" } },
      { name: "validate payload", depth: 1, start: 11, duration: 3, attrs: { items: "3" } },
      { name: "orders.service.create", depth: 1, start: 15, duration: 10040, attrs: { "order.total": "49.90" }, error: "payment timeout" },
      { name: "SELECT products", depth: 2, start: 17, duration: 14, attrs: { "db.system": "postgres", rows: "3" } },
      { name: "POST payments-api /charge", depth: 2, start: 33, duration: 10000, attrs: { "peer.service": "payments", timeout: "10s" }, error: "context deadline exceeded" },
    ],
  },
  "n-plus-one": {
    label: "N+1 queries",
    spans: [
      { name: "GET /orders", depth: 0, start: 0, duration: 920, attrs: { "http.status": "200", "user.id": "81" } },
      { name: "auth middleware", depth: 1, start: 2, duration: 8, attrs: { "session.store": "redis" } },
      { name: "SELECT orders", depth: 1, start: 12, duration: 20, attrs: { rows: "40" } },
      ...Array.from({ length: 8 }, (_, i) => ({
        name: `SELECT items WHERE order_id = …`,
        depth: 1,
        start: 34 + i * 110,
        duration: 105,
        attrs: { "db.system": "postgres", note: i === 0 ? "one query per order (40 total, 8 shown)" : "same query, different id" },
      })),
    ],
  },
};

export function TraceWaterfall() {
  const [scenario, setScenario] = useState<Scenario>("healthy");
  const [selected, setSelected] = useState(0);
  const { spans } = SCENARIOS[scenario];
  const total = spans[0].duration;
  const span = spans[Math.min(selected, spans.length - 1)];

  return (
    <Widget title="Trace waterfall" hint="Each bar is a span. Pick a scenario, then tap a span to see its attributes.">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(SCENARIOS) as Scenario[]).map((s) => (
          <Pill key={s} active={scenario === s} onClick={() => { setScenario(s); setSelected(0); }}>
            {SCENARIOS[s].label}
          </Pill>
        ))}
      </div>

      <ul className="mt-4 space-y-1">
        {spans.map((s, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => setSelected(i)}
              className={`block min-h-10 w-full rounded-md px-2 py-1 text-left ${i === selected ? "bg-accent-soft" : "hover:bg-surface-2"}`}
            >
              <span className="flex items-baseline justify-between gap-2 text-xs">
                <span className="truncate font-mono" style={{ paddingLeft: `${s.depth * 0.75}rem` }}>
                  {s.error ? "✗ " : ""}{s.name}
                </span>
                <span className="shrink-0 text-muted">{s.duration} ms</span>
              </span>
              <span className="relative mt-1 block h-2 rounded bg-surface-2">
                <span
                  className={`absolute top-0 h-2 rounded ${s.error ? "bg-bad" : "bg-accent"}`}
                  style={{ left: `${(s.start / total) * 100}%`, width: `${Math.max((s.duration / total) * 100, 0.8)}%` }}
                />
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className={`mt-3 rounded-lg border p-3 text-sm ${span.error ? "border-bad bg-bad-soft" : "border-border bg-surface-2"}`}>
        <p className="font-mono text-xs font-semibold">{span.name}</p>
        <pre className="mt-1 whitespace-pre-wrap break-all font-mono text-[0.75rem] leading-5">
          {[`trace_id: 4bf92f3577b34da6`, `start: +${span.start} ms, duration: ${span.duration} ms`, ...Object.entries(span.attrs).map(([k, v]) => `${k}: ${v}`), ...(span.error ? [`error: ${span.error}`] : [])].join("\n")}
        </pre>
      </div>

      <p className="mt-3 text-sm text-muted">
        {scenario === "healthy" && "Most of the time is the payment call. That's expected: an external API is usually the slowest hop."}
        {scenario === "slow-payment" && "The handler, validation and database were all fast. One child span ate 10 seconds and timed out. No amount of log reading tells you this as quickly."}
        {scenario === "n-plus-one" && "A staircase of identical short queries is the classic N+1 shape. Each is fast, but together they dominate the request. Fix it with one JOIN or an IN query."}
      </p>
    </Widget>
  );
}

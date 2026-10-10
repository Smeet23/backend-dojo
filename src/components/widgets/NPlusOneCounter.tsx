"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Strategy = "loop" | "bulk" | "join";

const SIZES = [20, 100, 1000];
const COSTS = [
  { ms: 1, label: "1 ms (same machine)" },
  { ms: 5, label: "5 ms (same data center)" },
  { ms: 30, label: "30 ms (another zone)" },
];

const STRATEGIES: { id: Strategy; label: string }[] = [
  { id: "loop", label: "Loop with await (N+1)" },
  { id: "bulk", label: "Bulk fetch with IN" },
  { id: "join", label: "Single JOIN" },
];

function plan(strategy: Strategy, n: number): { queries: number; sql: string[] } {
  if (strategy === "loop") {
    const sql = ["SELECT id, title, author_id FROM posts ORDER BY created_at DESC LIMIT " + n + ";"];
    for (let i = 1; i <= Math.min(3, n); i++) sql.push(`SELECT id, name FROM users WHERE id = ${i * 7};`);
    if (n > 3) sql.push(`… ${n - 3} more identical queries, one per post …`);
    return { queries: n + 1, sql };
  }
  if (strategy === "bulk") {
    return {
      queries: 2,
      sql: [
        "SELECT id, title, author_id FROM posts ORDER BY created_at DESC LIMIT " + n + ";",
        "SELECT id, name FROM users WHERE id IN (7, 14, 21, …);",
      ],
    };
  }
  return {
    queries: 1,
    sql: [
      "SELECT p.id, p.title, u.name AS author\nFROM posts p\nJOIN users u ON u.id = p.author_id\nORDER BY p.created_at DESC LIMIT " + n + ";",
    ],
  };
}

export function NPlusOneCounter() {
  const [strategy, setStrategy] = useState<Strategy>("loop");
  const [n, setN] = useState(100);
  const [cost, setCost] = useState(5);

  const { queries, sql } = plan(strategy, n);
  const total = queries * cost;
  const tone = total >= 1000 ? "bg-bad-soft" : total >= 200 ? "bg-warn-soft" : "bg-good-soft";

  return (
    <Widget title="N+1 query counter" hint="A blog homepage lists posts with each author's name. Count the queries your ORM really sends.">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">How the code loads authors</p>
      <div className="mt-1 flex flex-wrap gap-2">
        {STRATEGIES.map((s) => (
          <Pill key={s.id} active={strategy === s.id} onClick={() => setStrategy(s.id)}>{s.label}</Pill>
        ))}
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted">Posts on the page</p>
      <div className="mt-1 flex flex-wrap gap-2">
        {SIZES.map((s) => (
          <Pill key={s} active={n === s} onClick={() => setN(s)}>{s}</Pill>
        ))}
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted">Cost of one round trip</p>
      <div className="mt-1 flex flex-wrap gap-2">
        {COSTS.map((c) => (
          <Pill key={c.ms} active={cost === c.ms} onClick={() => setCost(c.ms)}>{c.label}</Pill>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg bg-surface-2 p-2">
          <p className="text-xs text-muted">Queries sent</p>
          <p className="font-mono text-lg">{queries.toLocaleString("en-US")}</p>
        </div>
        <div className={`rounded-lg p-2 ${tone}`}>
          <p className="text-xs text-muted">Time in round trips</p>
          <p className="font-mono text-lg">{total >= 1000 ? `${(total / 1000).toFixed(1)} s` : `${total} ms`}</p>
        </div>
      </div>

      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted">SQL log</p>
      <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-surface-2 p-3 font-mono text-[0.75rem] leading-relaxed">
        {sql.join("\n")}
      </pre>
      <p className="mt-2 text-xs text-muted">
        Round-trip time only. Each query also pays parsing, planning and execution, so real numbers are worse.
      </p>
    </Widget>
  );
}

"use client";

import { useState } from "react";
import { Widget } from "./Widget";

const STAGES = [
  { label: "Monolith", share: 0, note: "The facade forwards everything to the monolith." },
  { label: "Shadow", share: 0, note: "Monolith still answers. A copy of each request goes to the new service and responses are compared." },
  { label: "Canary 5%", share: 5, note: "5% of real users are served by the new service. Watch errors and latency." },
  { label: "New service", share: 100, note: "All traffic for this route goes to the new service. The monolith code is now dead." },
  { label: "Code deleted", share: 100, note: "The old module is removed from the monolith. The vine has replaced that branch." },
] as const;

const ROUTES = [
  { path: "/search", traffic: 30 },
  { path: "/catalogue", traffic: 25 },
  { path: "/reviews", traffic: 10 },
  { path: "/cart", traffic: 20 },
  { path: "/checkout", traffic: 15 },
];

export function HldStranglerRouter() {
  const [stage, setStage] = useState<number[]>(ROUTES.map(() => 0));
  const [log, setLog] = useState<string[]>([]);

  const newShare = ROUTES.reduce((s, r, i) => s + (r.traffic * STAGES[stage[i]].share) / 100, 0);
  const deleted = ROUTES.filter((_, i) => stage[i] === STAGES.length - 1).reduce((s, r) => s + r.traffic, 0);

  function advance(i: number) {
    setStage((st) => st.map((v, j) => (j === i ? Math.min(v + 1, STAGES.length - 1) : v)));
    const next = Math.min(stage[i] + 1, STAGES.length - 1);
    setLog((l) => [`${ROUTES[i].path} → ${STAGES[next].label}`, ...l].slice(0, 5));
  }

  function rollback(i: number) {
    if (stage[i] === 0 || stage[i] === STAGES.length - 1) return;
    setStage((st) => st.map((v, j) => (j === i ? 0 : v)));
    setLog((l) => [`${ROUTES[i].path} rolled back: one routing change, no redeploy`, ...l].slice(0, 5));
  }

  return (
    <Widget title="Strangler fig migration" hint="Move one route at a time from the monolith to new services through a routing facade. Roll back if something looks wrong.">
      <ul className="space-y-2">
        {ROUTES.map((r, i) => {
          const s = STAGES[stage[i]];
          const done = stage[i] === STAGES.length - 1;
          return (
            <li key={r.path} className="rounded-lg border border-border bg-surface-2 p-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-sm">
                  {r.path} <span className="text-xs text-muted">({r.traffic}% of traffic)</span>
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${s.share === 100 ? "bg-good-soft" : s.share > 0 || stage[i] === 1 ? "bg-warn-soft" : "bg-surface"}`}>
                  {s.label}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">{s.note}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={done}
                  onClick={() => advance(i)}
                  className="min-h-10 rounded-lg bg-accent px-3 text-sm text-white disabled:opacity-50 dark:text-bg"
                >
                  Next stage
                </button>
                <button
                  type="button"
                  disabled={stage[i] === 0 || done}
                  onClick={() => rollback(i)}
                  className="min-h-10 rounded-lg border border-border bg-surface px-3 text-sm disabled:opacity-50"
                >
                  Roll back
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-3">
        <p className="text-xs text-muted">Traffic served by new services: {newShare.toFixed(0)}%</p>
        <div className="mt-1 h-3 rounded bg-surface-2">
          <div className="h-3 rounded bg-good" style={{ width: `${newShare}%` }} />
        </div>
        <p className="mt-2 text-xs text-muted">Monolith code already deleted: {deleted}% of features</p>
        <div className="mt-1 h-3 rounded bg-surface-2">
          <div className="h-3 rounded bg-accent" style={{ width: `${deleted}%` }} />
        </div>
      </div>

      {log.length > 0 && (
        <ol className="mt-3 space-y-1">
          {log.map((l, i) => (
            <li key={`${log.length}-${i}`} className="rounded bg-surface-2 px-2 py-1 font-mono text-[0.72rem] break-words">
              {l}
            </li>
          ))}
        </ol>
      )}
      <button
        type="button"
        onClick={() => {
          setStage(ROUTES.map(() => 0));
          setLog([]);
        }}
        className="mt-3 min-h-10 rounded-lg border border-border px-3 text-sm"
      >
        Reset
      </button>
    </Widget>
  );
}

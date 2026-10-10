"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

const SLOS = [99, 99.5, 99.9, 99.95, 99.99];
const WINDOW_MIN = 30 * 24 * 60;

const INCIDENTS = [
  { label: "Bad deploy, rolled back", minutes: 6 },
  { label: "Expired TLS cert", minutes: 25 },
  { label: "Database failover", minutes: 12 },
];

/** Minutes of full downtime a given SLO allows over a 30-day window. */
export function budgetMinutes(slo: number): number {
  return WINDOW_MIN * (1 - slo / 100);
}

function fmt(min: number): string {
  if (min >= 60) return `${Math.floor(min / 60)} h ${Math.round(min % 60)} min`;
  if (min >= 1) return `${min.toFixed(1)} min`;
  return `${Math.round(min * 60)} s`;
}

export function ErrorBudgetMeter() {
  const [slo, setSlo] = useState(99.9);
  const [spent, setSpent] = useState<{ label: string; minutes: number }[]>([]);

  const budget = budgetMinutes(slo);
  const used = spent.reduce((s, i) => s + i.minutes, 0);
  const remaining = budget - used;
  const pct = Math.min(100, (used / budget) * 100);
  const frozen = remaining <= 0;

  return (
    <Widget title="Error budget" hint="Pick an availability SLO over 30 days, then spend the budget on incidents. When it hits zero, deploys freeze.">
      <div className="flex flex-wrap gap-2">
        {SLOS.map((s) => <Pill key={s} active={slo === s} onClick={() => setSlo(s)}>{s}%</Pill>)}
      </div>
      <p className="mt-3 text-sm">
        Budget: <strong className="font-mono">{fmt(budget)}</strong> of downtime per 30 days
      </p>
      <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-surface-2">
        <div className={frozen ? "h-full bg-bad" : pct > 75 ? "h-full bg-warn" : "h-full bg-good"} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-xs text-muted">Used {fmt(used)} · {frozen ? `over by ${fmt(-remaining)}` : `${fmt(remaining)} left`}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {INCIDENTS.map((i) => (
          <button
            key={i.label}
            type="button"
            onClick={() => setSpent((s) => [...s, i])}
            className="min-h-10 rounded-lg border border-border px-3 text-sm hover:bg-surface-2"
          >
            + {i.label} ({i.minutes} min)
          </button>
        ))}
        <button type="button" onClick={() => setSpent([])} className="min-h-10 rounded-lg border border-border px-3 text-sm text-muted">
          New month
        </button>
      </div>

      <div className={`mt-3 rounded-lg px-3 py-2 text-sm ${frozen ? "bg-bad-soft" : "bg-good-soft"}`}>
        {frozen
          ? "Budget exhausted: freeze feature deploys until the window resets and spend the time on reliability work."
          : "Budget left: keep shipping small changes as often as you like."}
      </div>
    </Widget>
  );
}

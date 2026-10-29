"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

const NS = [1, 3, 5, 9, 15, 25];
const RHOS = [0, 0.2, 0.5, 0.8];

function choose(n: number, k: number) {
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return r;
}

// P(more than half of n independent votes are right), n odd.
function independentMajority(p: number, n: number) {
  let total = 0;
  for (let k = Math.floor(n / 2) + 1; k <= n; k++) total += choose(n, k) * p ** k * (1 - p) ** (n - k);
  return total;
}

// Correlation model: with probability rho the item is one where every vote makes
// the same call (a shared blind spot), so the panel is exactly as good as one judge.
// Otherwise the votes are independent.
function majority(p: number, n: number, rho: number) {
  return rho * p + (1 - rho) * independentMajority(p, n);
}

function ceiling(p: number, rho: number) {
  const indep = p > 0.5 ? 1 : p < 0.5 ? 0 : 0.5;
  return rho * p + (1 - rho) * indep;
}

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className={`rounded-lg border border-border p-2 text-center ${tone}`}>
      <p className="text-xs text-muted">{label}</p>
      <p className="font-mono text-lg font-semibold">{value}</p>
    </div>
  );
}

export function EvMajorityVoteLab() {
  const [p, setP] = useState(0.75);
  const [n, setN] = useState(5);
  const [rho, setRho] = useState(0);

  const acc = majority(p, n, rho);
  const errCut = 1 - p > 0 ? (1 - acc) / (1 - p) : 1;
  const cap = ceiling(p, rho);
  const worse = acc < p - 1e-9;

  return (
    <Widget
      title="Majority-vote simulator"
      hint="One judge call is right with probability p. Ask n judges (or sample one judge n times) and take the majority verdict."
    >
      <label className="block text-sm">
        <span className="flex justify-between">
          <span>Accuracy of a single judge call (p)</span>
          <span className="font-mono">{p.toFixed(2)}</span>
        </span>
        <input
          type="range"
          min={0.3}
          max={0.95}
          step={0.01}
          value={p}
          onChange={(e) => setP(Number(e.target.value))}
          className="mt-1 w-full accent-accent"
        />
      </label>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">Votes (n):</span>
        {NS.map((x) => (
          <Pill key={x} active={n === x} onClick={() => setN(x)}>
            {x}
          </Pill>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">Share of items where all votes err together:</span>
        {RHOS.map((x) => (
          <Pill key={x} active={rho === x} onClick={() => setRho(x)}>
            {x === 0 ? "0 (independent)" : `${x * 100}%`}
          </Pill>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="One judge" value={pct(p)} tone="bg-surface-2" />
        <Stat label={`Majority of ${n}`} value={pct(acc)} tone={worse ? "bg-warn-soft" : "bg-good-soft"} />
        <Stat label="Errors left" value={pct(errCut)} tone="bg-accent-soft" />
        <Stat label="Cost and calls" value={`${n}x`} tone="bg-surface-2" />
      </div>

      <div className="mt-4 space-y-1.5">
        <p className="text-xs text-muted">Majority accuracy by number of votes (dashed line: ceiling with infinite votes)</p>
        {NS.map((x) => {
          const a = majority(p, x, rho);
          return (
            <button
              key={x}
              type="button"
              onClick={() => setN(x)}
              className="flex w-full items-center gap-2 text-left text-xs"
            >
              <span className="w-8 shrink-0 font-mono text-muted">n={x}</span>
              <span className="relative h-5 flex-1 rounded bg-surface-2">
                <span
                  className={`absolute inset-y-0 left-0 rounded ${x === n ? "bg-accent" : "bg-accent-soft border border-accent"}`}
                  style={{ width: `${a * 100}%` }}
                />
                <span className="absolute inset-y-0 border-l-2 border-dashed border-text" style={{ left: `${cap * 100}%` }} />
              </span>
              <span className="w-12 shrink-0 text-right font-mono">{pct(a)}</span>
            </button>
          );
        })}
      </div>

      <p className={`mt-4 rounded-lg border p-2 text-sm ${worse ? "border-warn bg-warn-soft" : "border-good bg-good-soft"}`}>
        {worse
          ? `A single call is wrong more often than right, so the majority amplifies the mistake: more votes make it worse. Fix the judge before you ensemble it.`
          : p === 0.5
            ? "A coin-flip judge stays a coin flip no matter how many votes you add."
            : rho === 0
              ? `Independent errors cancel: ${n} votes leave ${pct(errCut)} of the single judge's errors, and enough votes would push accuracy toward 100%.`
              : `On ${rho * 100}% of items every vote makes the same mistake, so no number of votes can beat ${pct(cap)}. You pay ${n}x for gains that flatten fast.`}
      </p>
      <p className="mt-2 text-xs text-muted">
        Exact binomial math, odd n so there are no ties. The correlation model is deliberately simple: on a fraction of items the
        votes share one draw (a blind spot of the shared model or prompt), on the rest they are independent. Real samples from one
        model sit between these extremes, closer to the correlated end.
      </p>
    </Widget>
  );
}

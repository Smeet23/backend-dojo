"use client";

import { useMemo, useState } from "react";
import { Pill, Widget } from "./Widget";

const TOTAL = 1000;
const TAIL_SHARES = [0, 0.5, 2, 5, 15];
const SLOW_MS = [800, 5000];

/** Small seeded PRNG so the sample is identical on every render. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sample(tailPct: number, slowMs: number): number[] {
  const rand = mulberry32(42);
  const slowCount = Math.round((TOTAL * tailPct) / 100);
  const out: number[] = [];
  for (let i = 0; i < TOTAL; i++) {
    const u = rand();
    if (i < slowCount) out.push(Math.round(slowMs * (0.8 + 0.4 * u)));
    else out.push(Math.round(18 + 45 * u * u));
  }
  return out.sort((a, b) => a - b);
}

/** Nearest-rank percentile. */
function pct(sorted: number[], p: number) {
  const rank = Math.max(1, Math.ceil((p / 100) * sorted.length));
  return sorted[rank - 1];
}

function fmt(ms: number) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${ms} ms`;
}

export function LatencyPercentiles() {
  const [tail, setTail] = useState(2);
  const [slow, setSlow] = useState(5000);

  const sorted = useMemo(() => sample(tail, slow), [tail, slow]);
  const avg = Math.round(sorted.reduce((s, x) => s + x, 0) / sorted.length);
  const rows = [
    { label: "Average", value: avg, note: "One number that describes nobody" },
    { label: "p50", value: pct(sorted, 50), note: "Half of requests are this fast or faster" },
    { label: "p90", value: pct(sorted, 90), note: "The slowest 10% take longer than this" },
    { label: "p95", value: pct(sorted, 95), note: "The slowest 5% take longer than this" },
    { label: "p99", value: pct(sorted, 99), note: "The slowest 1% take longer than this" },
    { label: "p99.9", value: pct(sorted, 99.9), note: "The slowest 0.1% take longer than this" },
  ];
  const max = Math.max(...rows.map((r) => r.value));
  const slowPerDay = Math.round((1_000_000 * tail) / 100);

  return (
    <Widget title="Latency percentiles" hint="1,000 requests to GET /products. Most are fast. Change how many are slow and watch which numbers notice.">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Share of slow requests</p>
      <div className="mt-1 flex flex-wrap gap-2">
        {TAIL_SHARES.map((t) => (
          <Pill key={t} active={tail === t} onClick={() => setTail(t)}>{t}%</Pill>
        ))}
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted">A slow request takes about</p>
      <div className="mt-1 flex flex-wrap gap-2">
        {SLOW_MS.map((s) => (
          <Pill key={s} active={slow === s} onClick={() => setSlow(s)}>{fmt(s)}</Pill>
        ))}
      </div>

      <ul className="mt-4 space-y-2">
        {rows.map((r) => {
          const width = Math.max(2, (Math.log10(r.value) / Math.log10(max)) * 100);
          const tone = r.value >= 500 ? "bg-bad" : r.value >= 100 ? "bg-warn" : "bg-good";
          return (
            <li key={r.label}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="font-semibold">{r.label}</span>
                <span className="font-mono">{fmt(r.value)}</span>
              </div>
              <div className="mt-1 h-2 w-full rounded-full bg-surface-2">
                <div className={`h-2 rounded-full ${tone}`} style={{ width: `${width}%` }} />
              </div>
              <p className="mt-0.5 text-xs text-muted">{r.note}</p>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-sm">
        {tail === 0
          ? "No slow tail: every percentile tells roughly the same story."
          : `At 1 million requests a day, about ${slowPerDay.toLocaleString("en-US")} people wait around ${fmt(slow)}. Notice the p50 barely moves, and the average lands somewhere no real request lives.`}
      </p>
      <p className="mt-2 text-xs text-muted">Bars use a log scale so fast and slow values fit on one screen.</p>
    </Widget>
  );
}

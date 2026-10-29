"use client";

import { useMemo, useState } from "react";
import { Pill, Widget } from "./Widget";

const NS = [1, 2, 4, 8, 16, 32];
const SLO = 0.95;
const TRIALS = 4000;

// Seeded generator so the numbers are stable between renders.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Model assumption from the talk: pushing the ControlNet harder makes codes
// scan more often but look worse. Mean aesthetic score falls as p rises.
const meanFor = (p: number) => 7 - 3 * p;

function aesthetic(rand: () => number, mean: number) {
  const u = Math.max(rand(), 1e-9);
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
  return Math.min(10, Math.max(1, mean + 0.9 * z));
}

type Candidate = { scans: boolean; score: number };

function batch(seed: number, p: number, n: number): Candidate[] {
  const rand = mulberry32(seed);
  const mean = meanFor(p);
  return Array.from({ length: n }, () => ({ scans: rand() < p, score: aesthetic(rand, mean) }));
}

// Monte Carlo: average aesthetic score of the best scanning candidate, over requests where one scans.
function expectedBest(p: number, n: number) {
  const rand = mulberry32(12345);
  const mean = meanFor(p);
  let total = 0;
  let hits = 0;
  for (let t = 0; t < TRIALS; t++) {
    let best = -1;
    for (let i = 0; i < n; i++) {
      const scans = rand() < p;
      const s = aesthetic(rand, mean);
      if (scans && s > best) best = s;
    }
    if (best >= 0) {
      total += best;
      hits++;
    }
  }
  return hits ? total / hits : 0;
}

const pct = (x: number) => `${(Math.round(x * 1000) / 10).toFixed(1)}%`;

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className={`rounded-lg border border-border p-2 text-center ${tone}`}>
      <p className="text-xs text-muted">{label}</p>
      <p className="font-mono text-lg font-semibold">{value}</p>
    </div>
  );
}

export function EvBestOfNSimulator() {
  const [p, setP] = useState(0.33);
  const [n, setN] = useState(8);
  const [seed, setSeed] = useState(7);

  const success = 1 - Math.pow(1 - p, n);
  const needed = p >= 1 ? 1 : Math.ceil(Math.log(1 - SLO) / Math.log(1 - p));
  const best = useMemo(() => expectedBest(p, n), [p, n]);
  const single = meanFor(p);
  const cands = useMemo(() => batch(seed, p, n), [seed, p, n]);
  const bestIdx = cands.reduce(
    (b, c, i) => (c.scans && (b < 0 || c.score > cands[b].score) ? i : b),
    -1,
  );
  const meets = success >= SLO;

  return (
    <Widget
      title="Best-of-n simulator"
      hint="Each candidate scans with probability p and gets an aesthetic score. Generate n, drop the ones that fail the scan check, show the prettiest survivor."
    >
      <label className="block text-sm">
        <span className="flex justify-between">
          <span>Scan probability per candidate (p)</span>
          <span className="font-mono">{p.toFixed(2)}</span>
        </span>
        <input
          type="range"
          min={0.05}
          max={0.95}
          step={0.01}
          value={p}
          onChange={(e) => setP(Number(e.target.value))}
          className="mt-1 w-full accent-accent"
        />
        <span className="flex justify-between text-xs text-muted">
          <span>artistic, rarely scans</span>
          <span>heavy guidance, plain looking</span>
        </span>
      </label>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">Candidates per request (n):</span>
        {NS.map((x) => (
          <Pill key={x} active={n === x} onClick={() => setN(x)}>
            {x}
          </Pill>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="P(at least one scans)" value={pct(success)} tone={meets ? "bg-good-soft" : "bg-warn-soft"} />
        <Stat label="Best score shown" value={best.toFixed(2)} tone="bg-accent-soft" />
        <Stat label="Compute per request" value={`${n}x`} tone="bg-surface-2" />
        <Stat label="Compute per scanning code" value={`${(n / success).toFixed(1)}x`} tone="bg-surface-2" />
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-muted">
          <span>One request&apos;s batch (green scans, ring marks the one shown)</span>
          <button
            type="button"
            onClick={() => setSeed((s) => s + 1)}
            className="min-h-8 rounded-md border border-border px-2 hover:bg-surface-2"
          >
            New batch
          </button>
        </div>
        <div className="mt-2 grid grid-cols-8 gap-1">
          {cands.map((c, i) => (
            <div
              key={i}
              title={`${c.scans ? "scans" : "does not scan"}, aesthetic ${c.score.toFixed(1)}`}
              className={`rounded-md border p-1 text-center font-mono text-xs ${
                c.scans ? "border-good bg-good-soft" : "border-border bg-surface-2 text-muted line-through"
              } ${i === bestIdx ? "ring-2 ring-accent" : ""}`}
            >
              {c.score.toFixed(1)}
            </div>
          ))}
        </div>
        {bestIdx < 0 && <p className="mt-2 text-sm text-bad">Nothing in this batch scans: the user gets an error or has to wait for a retry.</p>}
      </div>

      <p className={`mt-4 rounded-lg border p-2 text-sm ${meets ? "border-good bg-good-soft" : "border-warn bg-warn-soft"}`}>
        {meets
          ? `Meets the 95% SLO. The smallest n that does is ${needed}; anything above that buys a slightly prettier winner for more compute.`
          : `Below the 95% SLO. At p = ${p.toFixed(2)} you need n = ${needed} candidates per request.`}{" "}
        A single unfiltered draw averages {single.toFixed(2)} and scans {pct(p)} of the time.
      </p>
      <p className="mt-2 text-xs text-muted">
        Assumes independent draws and a scan check you trust. The link between p and aesthetics (mean score 7 minus 3p, spread 0.9) is
        a made-up model of the trade-off, not the talk&apos;s data. Best score is a seeded simulation of {TRIALS} requests, averaged over
        those where something scans.
      </p>
    </Widget>
  );
}

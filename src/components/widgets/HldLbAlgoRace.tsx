"use client";

import { useMemo, useState } from "react";
import { Pill, Widget } from "./Widget";

type Algo = "rr" | "least" | "lrt" | "p2c";

const ALGOS: { id: Algo; label: string }[] = [
  { id: "rr", label: "Round robin" },
  { id: "least", label: "Least connections" },
  { id: "lrt", label: "Least response time" },
  { id: "p2c", label: "Power of two choices" },
];

const SERVERS = ["A", "B", "C", "D"];
const REQUESTS = 240;
const FAST = 3; // ms of work per request on a healthy server (scaled)
const SLOW = 12; // server D when degraded
const LOAD_PENALTY = 0.3; // each concurrent request slows the server a little
const GAP = 0.35; // time between arrivals: busy enough that every server is needed

function simulate(algo: Algo, degraded: boolean) {
  const base = SERVERS.map((s) => (degraded && s === "D" ? SLOW : FAST));
  const active: number[][] = SERVERS.map(() => []); // end times
  const ewma = SERVERS.map(() => FAST);
  const pendingLatency: { end: number; lat: number }[][] = SERVERS.map(() => []);
  const counts = SERVERS.map(() => 0);
  const lats: number[] = [];
  let rr = 0;
  let seed = 7;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };

  // Lowest score wins; ties rotate so no server is favoured by its position.
  const argmin = (scores: number[], start: number) => {
    let best = start % scores.length;
    for (let k = 1; k < scores.length; k++) {
      const i = (start + k) % scores.length;
      if (scores[i] < scores[best]) best = i;
    }
    return best;
  };

  for (let n = 0; n < REQUESTS; n++) {
    const t = n * GAP;
    for (let i = 0; i < SERVERS.length; i++) {
      active[i] = active[i].filter((end) => end > t);
      const done = pendingLatency[i].filter((p) => p.end <= t);
      for (const d of done) ewma[i] = ewma[i] * 0.7 + d.lat * 0.3;
      pendingLatency[i] = pendingLatency[i].filter((p) => p.end > t);
    }
    let pick = 0;
    if (algo === "rr") pick = rr++ % SERVERS.length;
    else if (algo === "least") pick = argmin(active.map((a) => a.length), n);
    else if (algo === "lrt") pick = argmin(ewma.map((e, i) => e * (1 + active[i].length)), n);
    else {
      const a = Math.floor(rand() * SERVERS.length);
      let b = Math.floor(rand() * (SERVERS.length - 1));
      if (b >= a) b += 1;
      pick = active[a].length <= active[b].length ? a : b;
    }
    const lat = base[pick] * (1 + LOAD_PENALTY * active[pick].length);
    active[pick].push(t + lat);
    pendingLatency[pick].push({ end: t + lat, lat });
    counts[pick] += 1;
    lats.push(lat);
  }
  const sorted = [...lats].sort((x, y) => x - y);
  const avg = lats.reduce((x, y) => x + y, 0) / lats.length;
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  return { counts, avg, p95 };
}

export function HldLbAlgoRace() {
  const [degraded, setDegraded] = useState(true);
  const results = useMemo(() => ALGOS.map((a) => ({ ...a, r: simulate(a.id, degraded) })), [degraded]);
  const worstP95 = Math.max(...results.map((x) => x.r.p95));

  return (
    <Widget
      title="Algorithms vs a slow server"
      hint={`${REQUESTS} requests arrive at a steady rate across 4 servers. Each request takes ${FAST} units on a healthy server, more when the server is busy. Make server D slow (a noisy neighbour, a GC pause) and compare.`}
    >
      <div className="flex flex-wrap gap-2">
        <Pill active={!degraded} onClick={() => setDegraded(false)}>All servers healthy</Pill>
        <Pill active={degraded} onClick={() => setDegraded(true)}>Server D is 4x slower</Pill>
      </div>

      <div className="mt-3 space-y-2">
        {results.map(({ id, label, r }) => (
          <div key={id} className="rounded-lg border border-border p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-semibold">{label}</p>
              <p className="font-mono text-xs">
                avg {r.avg.toFixed(1)} · p95 {r.p95.toFixed(1)}
              </p>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
              <div
                className={`h-full ${r.p95 > 60 ? "bg-bad" : r.p95 > 15 ? "bg-warn" : "bg-good"}`}
                style={{ width: `${Math.max(4, (r.p95 / worstP95) * 100)}%` }}
              />
            </div>
            <div className="mt-2 grid grid-cols-4 gap-1 text-center text-[0.7rem]">
              {SERVERS.map((s, i) => (
                <div key={s} className={`min-w-0 rounded px-1 py-1 ${degraded && s === "D" ? "bg-warn-soft" : "bg-surface-2"}`}>
                  <p className="font-semibold">{s}</p>
                  <p className="font-mono">{r.counts[i]}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm text-muted">
        Round robin keeps feeding D its full quarter, so requests queue up there and the p95 explodes. The load-aware algorithms notice
        D is busy or slow and send it less work. Power of two choices gets close to least connections while only ever looking at two servers.
      </p>
    </Widget>
  );
}

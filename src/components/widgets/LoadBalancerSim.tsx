"use client";

import { useMemo, useState } from "react";
import { Pill, Widget } from "./Widget";

type Algo = "rr" | "weighted" | "least";
type ServerId = "A" | "B" | "C";
type Assigned = { n: number; heavy: boolean; failed: boolean };

const SERVERS: { id: ServerId; size: string; weight: number }[] = [
  { id: "A", size: "8 GB · 4 vCPU", weight: 2 },
  { id: "B", size: "4 GB · 2 vCPU", weight: 1 },
  { id: "C", size: "4 GB · 2 vCPU", weight: 1 },
];

const ALGOS: { id: Algo; label: string }[] = [
  { id: "rr", label: "Round robin" },
  { id: "weighted", label: "Weighted round robin" },
  { id: "least", label: "Least connections" },
];

const REQUESTS = 18;
const HEAVY_TICKS = 9; // e.g. checkout: external API + big write
const LIGHT_TICKS = 1; // e.g. GET /profile

function simulate(algo: Algo, bDown: boolean, healthChecks: boolean) {
  const active: Record<ServerId, number[]> = { A: [], B: [], C: [] };
  const log: Record<ServerId, Assigned[]> = { A: [], B: [], C: [] };
  const peak: Record<ServerId, number> = { A: 0, B: 0, C: 0 };
  let rr = 0;

  for (let t = 0; t < REQUESTS; t++) {
    const heavy = t % 3 === 0;
    for (const s of SERVERS) active[s.id] = active[s.id].filter((end) => end > t);

    const pool = SERVERS.filter((s) => !(healthChecks && bDown && s.id === "B"));
    let target: ServerId;
    if (algo === "rr") {
      target = pool[rr % pool.length].id;
      rr++;
    } else if (algo === "weighted") {
      const ring = pool.flatMap((s) => Array<ServerId>(s.weight).fill(s.id));
      target = ring[rr % ring.length];
      rr++;
    } else {
      target = pool.reduce((best, s) => (active[s.id].length < active[best.id].length ? s : best), pool[0]).id;
    }

    const failed = bDown && target === "B";
    if (!failed) active[target].push(t + (heavy ? HEAVY_TICKS : LIGHT_TICKS));
    log[target].push({ n: t + 1, heavy, failed });
    peak[target] = Math.max(peak[target], active[target].length);
  }
  return { log, peak };
}

export function LoadBalancerSim() {
  const [algo, setAlgo] = useState<Algo>("rr");
  const [bDown, setBDown] = useState(false);
  const [health, setHealth] = useState(false);

  const { log, peak } = useMemo(() => simulate(algo, bDown, health), [algo, bDown, health]);
  const failures = Object.values(log).flat().filter((r) => r.failed).length;

  return (
    <Widget
      title="Load balancer"
      hint="18 requests arrive one per tick. Every third one is heavy (checkout: slow external call plus a big write), the rest are light. Compare where the heavy ones land."
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Algorithm</p>
      <div className="mt-1 flex flex-wrap gap-2">
        {ALGOS.map((a) => (
          <Pill key={a.id} active={algo === a.id} onClick={() => setAlgo(a.id)}>{a.label}</Pill>
        ))}
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Break it</p>
      <div className="mt-1 flex flex-wrap gap-2">
        <Pill active={bDown} onClick={() => setBDown((v) => !v)}>Server B crashed</Pill>
        <Pill active={health} onClick={() => setHealth((v) => !v)}>Health checks on</Pill>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {SERVERS.map((s) => {
          const items = log[s.id];
          const heavyCount = items.filter((r) => r.heavy && !r.failed).length;
          const down = bDown && s.id === "B";
          const removed = down && health;
          return (
            <div key={s.id} className={`rounded-lg border p-2 ${down ? "border-bad bg-bad-soft" : "border-border bg-muted"}`}>
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-semibold">Server {s.id}</p>
                <p className="text-xs text-muted-foreground">{s.size}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {removed ? "Failed health check: out of rotation" : down ? "Down, but still in rotation" : `Peak in-flight: ${peak[s.id]} · heavy: ${heavyCount}`}
              </p>
              <ul className="mt-2 flex flex-wrap gap-1">
                {items.length === 0 && <li className="text-xs text-muted-foreground">no requests</li>}
                {items.map((r) => (
                  <li
                    key={r.n}
                    className={`rounded px-1.5 py-0.5 font-mono text-[0.7rem] ${
                      r.failed ? "bg-bad text-primary-foreground" : r.heavy ? "bg-warn-soft font-semibold" : "bg-card"
                    }`}
                  >
                    #{r.n}
                    {r.failed ? " 502" : r.heavy ? " H" : ""}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${failures > 0 ? "bg-bad-soft" : "bg-muted"}`}>
        {failures > 0
          ? `${failures} users got a 502 because the load balancer kept sending traffic to a dead server. Turn on health checks.`
          : algo === "rr"
            ? "Round robin ignores how expensive a request is. Here every heavy request lands on the same server and piles up."
            : algo === "weighted"
              ? "Weighting sends A twice the traffic because it's twice the size, but it still can't see which requests are heavy."
              : "Least connections skips servers that are still busy with a heavy request, so heavy work spreads out."}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">H = heavy request (9 ticks). Light requests finish within a tick.</p>
    </Widget>
  );
}

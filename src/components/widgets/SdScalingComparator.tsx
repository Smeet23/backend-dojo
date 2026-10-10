"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

/** Illustrative machine sizes: capacity grows linearly, price grows faster near the top. */
const BIG_BOXES = [
  { name: "4 vCPU · 16 GB", capacity: 2_000, cost: 120 },
  { name: "8 vCPU · 32 GB", capacity: 4_000, cost: 250 },
  { name: "16 vCPU · 64 GB", capacity: 8_000, cost: 560 },
  { name: "32 vCPU · 128 GB", capacity: 16_000, cost: 1_300 },
  { name: "64 vCPU · 256 GB", capacity: 32_000, cost: 3_100 },
];
const SMALL = { name: "4 vCPU · 16 GB", capacity: 2_000, cost: 120 };
const LB_COST = 30;
const LOADS = [1_000, 6_000, 14_000, 30_000, 60_000];

function fmt(n: number) {
  return n >= 1000 ? `${n / 1000}k` : String(n);
}

export function SdScalingComparator() {
  const [load, setLoad] = useState(6_000);
  const [failed, setFailed] = useState(false);

  const box = BIG_BOXES.find((b) => b.capacity >= load);
  const nodes = Math.ceil(load / SMALL.capacity) + 1; // N + 1: one spare
  const hCost = nodes * SMALL.cost + LB_COST;
  const hCapacity = (failed ? nodes - 1 : nodes) * SMALL.capacity;
  const vCapacity = box && !failed ? box.capacity : 0;

  return (
    <Widget title="Scale up or scale out" hint="Pick a peak load, then knock one machine over. Prices and sizes are illustrative.">
      <div className="flex flex-wrap gap-2">
        {LOADS.map((l) => (
          <Pill key={l} active={load === l} onClick={() => setLoad(l)}>{fmt(l)} req/s</Pill>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Pill active={failed} onClick={() => setFailed((f) => !f)}>{failed ? "One machine is down" : "All machines healthy"}</Pill>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="min-w-0 rounded-lg border border-border bg-surface-2 p-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Vertical: one bigger box</p>
          {box ? (
            <>
              <p className="mt-1 font-medium">{box.name}</p>
              <p className="text-muted">Monthly cost ≈ ${box.cost.toLocaleString()}</p>
              <p className="text-muted">Headroom: {fmt(box.capacity)} req/s max</p>
            </>
          ) : (
            <p className="mt-1 rounded bg-bad-soft p-2">No single machine in the catalogue handles {fmt(load)} req/s. You&apos;ve hit the ceiling.</p>
          )}
          <p className={`mt-2 rounded p-2 ${vCapacity >= load ? "bg-good-soft" : "bg-bad-soft"}`}>
            Serving {fmt(Math.min(vCapacity, load))} of {fmt(load)} req/s
            {failed && box ? ": the only server is down, so the site is down." : ""}
          </p>
        </div>

        <div className="min-w-0 rounded-lg border border-border bg-surface-2 p-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Horizontal: many small boxes</p>
          <p className="mt-1 font-medium">{nodes} × {SMALL.name} + load balancer</p>
          <p className="text-muted">Monthly cost ≈ ${hCost.toLocaleString()}</p>
          <p className="text-muted">{nodes - 1} needed for the load, plus 1 spare</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {Array.from({ length: Math.min(nodes, 32) }).map((_, i) => (
              <span key={i} className={`h-4 w-4 rounded-sm ${failed && i === 0 ? "bg-bad" : "bg-accent"}`} />
            ))}
          </div>
          <p className={`mt-2 rounded p-2 ${hCapacity >= load ? "bg-good-soft" : "bg-warn-soft"}`}>
            Serving {fmt(Math.min(hCapacity, load))} of {fmt(load)} req/s{failed ? ": the balancer routed around the dead node." : ""}
          </p>
        </div>
      </div>

      <p className="mt-3 text-xs text-muted">
        What the numbers hide: horizontal scaling only works if servers are stateless and the data layer can keep up. Vertical scaling keeps the code and operations simple.
      </p>
    </Widget>
  );
}

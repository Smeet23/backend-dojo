"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Strategy = "none" | "limit" | "priority";
type Row = { t: number; offered: number; good: number; critGood: number; rejected: number; wasted: number; latency: number };

const CAPACITY = 100; // requests per second the service can really do
const LIMIT = 90; // admission limit, a little under capacity
const CRIT_SHARE = 0.3; // 30% of traffic is checkout, 70% is recommendations
const TIMEOUT = 1; // clients give up after 1 second
const SECONDS = 8;

const STRATEGY_LABEL: Record<Strategy, string> = {
  none: "No protection",
  limit: "Rate limit at 90/s",
  priority: "Priority shedding",
};

function simulate(load: number, strategy: Strategy, retries: boolean): Row[] {
  const rows: Row[] = [];
  let queue = 0;
  let retryLoad = 0;
  for (let t = 1; t <= SECONDS; t++) {
    const offered = Math.round(load + retryLoad);
    if (strategy === "none") {
      queue += offered;
      // Under heavy queueing the box thrashes (GC, context switches), losing capacity.
      const eff = queue > 2 * CAPACITY ? CAPACITY * 0.7 : CAPACITY;
      const latency = Math.max(0, (queue - Math.min(queue, eff)) / eff);
      const served = Math.min(queue, eff);
      queue -= served;
      const wasted = latency > TIMEOUT ? served : 0;
      const good = served - wasted;
      retryLoad = retries ? Math.min(load * 2, wasted + (latency > TIMEOUT ? load * 0.5 : 0)) : 0;
      rows.push({ t, offered, good: Math.round(good), critGood: Math.round(good * CRIT_SHARE), rejected: 0, wasted: Math.round(wasted), latency });
    } else {
      const crit = offered * CRIT_SHARE;
      const low = offered - crit;
      let critAdmit: number;
      let lowAdmit: number;
      if (strategy === "priority") {
        critAdmit = Math.min(crit, LIMIT);
        lowAdmit = Math.min(low, LIMIT - critAdmit);
      } else {
        const admit = Math.min(offered, LIMIT);
        critAdmit = admit * CRIT_SHARE;
        lowAdmit = admit - critAdmit;
      }
      const admitted = critAdmit + lowAdmit;
      const rejected = offered - admitted;
      retryLoad = retries ? Math.min(load * 2, rejected) : 0;
      rows.push({ t, offered, good: Math.round(admitted), critGood: Math.round(critAdmit), rejected: Math.round(rejected), wasted: 0, latency: 0.05 });
    }
  }
  return rows;
}

export function HldLoadShedSim() {
  const [load, setLoad] = useState(200);
  const [strategy, setStrategy] = useState<Strategy>("none");
  const [retries, setRetries] = useState(false);
  const rows = simulate(load, strategy, retries);
  const totalGood = rows.reduce((a, r) => a + r.good, 0);
  const critOffered = Math.round(load * CRIT_SHARE * SECONDS);
  // Retried checkouts are the same customers trying again, so cap at the original demand.
  const totalCrit = Math.min(critOffered, rows.reduce((a, r) => a + r.critGood, 0));
  const max = Math.max(...rows.map((r) => r.offered), CAPACITY);

  return (
    <Widget
      title="Overload: queue, limit or shed"
      hint={`The service can do ${CAPACITY} req/s. Clients time out after ${TIMEOUT}s. 30% of traffic is checkout (critical), 70% is recommendations.`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">Offered load</span>
        {[60, 120, 200, 400].map((l) => (
          <Pill key={l} active={load === l} onClick={() => setLoad(l)}>
            {l}/s
          </Pill>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {(Object.keys(STRATEGY_LABEL) as Strategy[]).map((s) => (
          <Pill key={s} active={strategy === s} onClick={() => setStrategy(s)}>
            {STRATEGY_LABEL[s]}
          </Pill>
        ))}
        <Pill active={retries} onClick={() => setRetries((r) => !r)}>
          Clients retry failures: {retries ? "on" : "off"}
        </Pill>
      </div>

      <div className="mt-4 space-y-1.5">
        {rows.map((r) => (
          <div key={r.t} className="flex items-center gap-2 text-[0.72rem]">
            <span className="w-6 shrink-0 font-mono text-muted">{r.t}s</span>
            <div className="flex h-5 min-w-0 flex-1 overflow-hidden rounded bg-surface-2">
              <div className="h-full bg-good" style={{ width: `${(r.good / max) * 100}%` }} title="useful work" />
              <div className="h-full bg-bad" style={{ width: `${(r.wasted / max) * 100}%` }} title="served after the client gave up" />
              <div className="h-full bg-warn" style={{ width: `${(r.rejected / max) * 100}%` }} title="rejected fast" />
            </div>
            <span className="w-24 shrink-0 text-right font-mono">
              {r.latency > TIMEOUT ? `${r.latency.toFixed(1)}s wait` : `${r.good} ok`}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-[0.7rem] text-muted">
        <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-good" />useful</span>
        <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-bad" />served too late (wasted)</span>
        <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-warn" />rejected fast (429/503)</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-center text-sm">
        <div className="min-w-0 rounded-lg bg-surface-2 p-2">
          <p className="text-xs text-muted">Useful responses ({SECONDS}s)</p>
          <p className="font-mono">{totalGood}</p>
        </div>
        <div className={`min-w-0 rounded-lg p-2 ${totalCrit >= critOffered * 0.95 ? "bg-good-soft" : "bg-bad-soft"}`}>
          <p className="text-xs text-muted">Checkouts completed</p>
          <p className="font-mono">
            {totalCrit} / {critOffered}
          </p>
        </div>
      </div>
    </Widget>
  );
}

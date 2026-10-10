"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

const PARTITIONS = 4;
const PER_CONSUMER_PER_TICK = 2;
const KEY_PARTITION: Record<string, number> = { A: 1, B: 3, C: 1 };

type Msg = { label: string; key: string | null };
type State = {
  logs: Msg[][]; // per partition, index = offset
  billing: number[]; // committed offset per partition (next to read)
  analytics: number[];
  seq: Record<string, number>;
  rr: number;
  events: string[];
};

const fresh = (): State => ({
  logs: Array.from({ length: PARTITIONS }, () => []),
  billing: Array(PARTITIONS).fill(0),
  analytics: Array(PARTITIONS).fill(0),
  seq: {},
  rr: 0,
  events: [],
});

/** Range-style assignment: partition p goes to consumer p mod n; extra consumers idle. */
export function assign(consumers: number): number[][] {
  const out: number[][] = Array.from({ length: consumers }, () => []);
  for (let p = 0; p < PARTITIONS; p++) out[p % consumers].push(p);
  return out;
}

function produce(s: State, key: string | null): State {
  const p = key ? KEY_PARTITION[key] : s.rr % PARTITIONS;
  const tag = key ?? "x";
  const n = (s.seq[tag] ?? 0) + 1;
  const label = key ? `${key}${n}` : `x${n}`;
  const logs = s.logs.map((l, i) => (i === p ? [...l, { label, key }] : l));
  const how = key ? `key ${key} hashes to P${p}` : `no key, round robin to P${p}`;
  return {
    ...s,
    logs,
    seq: { ...s.seq, [tag]: n },
    rr: key ? s.rr : s.rr + 1,
    events: [`produce ${label}: ${how}, offset ${logs[p].length - 1}`, ...s.events].slice(0, 10),
  };
}

function tick(s: State, consumers: number, analyticsOn: boolean): State {
  const billing = [...s.billing];
  const events: string[] = [];
  assign(consumers).forEach((parts, c) => {
    let budget = PER_CONSUMER_PER_TICK;
    let progressed = true;
    while (budget > 0 && progressed) {
      progressed = false;
      for (const p of parts) {
        if (budget > 0 && billing[p] < s.logs[p].length) {
          events.push(`billing consumer-${c + 1} processed ${s.logs[p][billing[p]].label} (P${p}@${billing[p]}), commits ${billing[p] + 1}`);
          billing[p] += 1;
          budget -= 1;
          progressed = true;
        }
      }
    }
    if (parts.length === 0) events.push(`billing consumer-${c + 1} is idle: no partition left for it`);
  });
  const analytics = [...s.analytics];
  if (analyticsOn) {
    const p = [0, 1, 2, 3].find((x) => analytics[x] < s.logs[x].length);
    if (p !== undefined) {
      events.push(`analytics consumer-1 processed ${s.logs[p][analytics[p]].label} (P${p}@${analytics[p]})`);
      analytics[p] += 1;
    }
  }
  if (events.length === 0) events.push("nothing to consume");
  return { ...s, billing, analytics, events: [...events.reverse(), ...s.events].slice(0, 10) };
}

export function HldConsumerGroupLab() {
  const [consumers, setConsumers] = useState(1);
  const [analyticsOn, setAnalyticsOn] = useState(false);
  const [s, setS] = useState<State>(fresh);

  const groups = assign(consumers);
  const billingLag = s.logs.reduce((a, l, p) => a + l.length - s.billing[p], 0);
  const analyticsLag = s.logs.reduce((a, l, p) => a + l.length - s.analytics[p], 0);
  const owner = (p: number) => groups.findIndex((g) => g.includes(p)) + 1;

  function setCount(n: number) {
    setConsumers(n);
    setS((p) => ({ ...p, events: [`rebalance: billing group now has ${n} consumer${n > 1 ? "s" : ""}; partitions reassigned, reading resumes from committed offsets`, ...p.events].slice(0, 10) }));
  }

  function burst() {
    setS((p) => {
      let x = p;
      for (const k of ["A", "B", null, "C", "A", null, "B", "A"]) x = produce(x, k);
      return x;
    });
  }

  return (
    <Widget
      title="Partitions and consumer groups"
      hint="Topic 'orders' has 4 partitions. Produce messages with and without keys, then consume. Change the number of consumers in the billing group and turn on a second group."
    >
      <div className="flex flex-wrap gap-2">
        {["A", "B", "C"].map((k) => (
          <button key={k} type="button" onClick={() => setS((p) => produce(p, k))} className="min-h-10 rounded-lg border border-accent px-3 text-sm text-accent">
            Produce key {k}
          </button>
        ))}
        <button type="button" onClick={() => setS((p) => produce(p, null))} className="min-h-10 rounded-lg border border-border px-3 text-sm">
          Produce, no key
        </button>
        <button type="button" onClick={burst} className="min-h-10 rounded-lg border border-border px-3 text-sm">
          Burst of 8
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">Billing consumers:</span>
        {[1, 2, 4, 6].map((n) => (
          <Pill key={n} active={consumers === n} onClick={() => setCount(n)}>
            {n}
          </Pill>
        ))}
        <Pill active={analyticsOn} onClick={() => setAnalyticsOn((v) => !v)}>
          Analytics group: {analyticsOn ? "subscribed (slow)" : "off"}
        </Pill>
      </div>

      <div className="mt-3 space-y-2">
        {s.logs.map((log, p) => (
          <div key={p} className="min-w-0 rounded-lg border border-border bg-surface-2 p-2">
            <p className="text-xs text-muted">
              P{p} · billing consumer-{owner(p)} · billing lag {log.length - s.billing[p]}
              {analyticsOn ? ` · analytics lag ${log.length - s.analytics[p]}` : ""}
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {log.length === 0 && <span className="text-xs text-muted">empty</span>}
              {log.map((m, o) => (
                <span
                  key={o}
                  className={`rounded px-1.5 py-0.5 font-mono text-[0.7rem] ${o < s.billing[p] ? "bg-good-soft" : "bg-surface"} ${analyticsOn && o === s.analytics[p] ? "border border-warn" : "border border-transparent"}`}
                  title={`offset ${o}`}
                >
                  {o}:{m.label}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">
        Green = committed by billing. {analyticsOn ? "Outlined = analytics' next offset. " : ""}Messages are not deleted when consumed; each group just moves its own offset.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => setS((p) => tick(p, consumers, analyticsOn))} className="min-h-10 flex-1 rounded-lg bg-accent px-3 text-sm font-medium text-white dark:text-bg">
          Consume one tick
        </button>
        <button type="button" onClick={() => setS(fresh())} className="min-h-10 rounded-lg border border-border px-3 text-sm">
          Reset
        </button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
        <div className={`min-w-0 rounded-lg p-2 ${billingLag > 6 ? "bg-bad-soft" : "bg-surface-2"}`}>
          <p className="text-xs text-muted">Billing total lag</p>
          <p className="font-mono">{billingLag}</p>
        </div>
        <div className="min-w-0 rounded-lg bg-surface-2 p-2">
          <p className="text-xs text-muted">Analytics total lag</p>
          <p className="font-mono">{analyticsOn ? analyticsLag : "n/a"}</p>
        </div>
      </div>

      <ol className="mt-3 space-y-1">
        {s.events.map((e, i) => (
          <li key={`${i}-${e}`} className="rounded bg-surface-2 px-2 py-1 font-mono text-[0.72rem] break-words">
            {e}
          </li>
        ))}
      </ol>
    </Widget>
  );
}

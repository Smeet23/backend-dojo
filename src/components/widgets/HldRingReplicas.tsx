"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

/** Hand-placed virtual nodes (degrees), three per physical server, deliberately uneven. */
const RAW = [
  { deg: 10, node: "B" },
  { deg: 40, node: "A" },
  { deg: 60, node: "D" },
  { deg: 95, node: "C" },
  { deg: 120, node: "D" },
  { deg: 150, node: "B" },
  { deg: 170, node: "C" },
  { deg: 200, node: "C" },
  { deg: 230, node: "A" },
  { deg: 260, node: "D" },
  { deg: 290, node: "B" },
  { deg: 320, node: "A" },
];
const VNODES = RAW.map((v, i) => ({ ...v, label: `${v.node}${RAW.slice(0, i + 1).filter((x) => x.node === v.node).length}` }));

const KEYS = [
  { key: "cart:17", deg: 50 },
  { key: "user:42", deg: 155 },
  { key: "img:9", deg: 300 },
  { key: "order:7", deg: 20 },
];

const SERVERS = ["A", "B", "C", "D"];

type Visit = { label: string; node: string; outcome: "replica" | "skip-dup" | "skip-down" | "hint" };

function preference(keyDeg: number, rf: number, distinct: boolean, down: string | null) {
  const first = VNODES.findIndex((v) => v.deg >= keyDeg);
  const start = first === -1 ? 0 : first;
  const steps: { label: string; node: string; skip: "dup" | "down" | null }[] = [];
  const chosen: string[] = [];
  for (let k = 0; k < VNODES.length && chosen.length < rf; k++) {
    const v = VNODES[(start + k) % VNODES.length];
    if (distinct && chosen.includes(v.node)) steps.push({ ...v, skip: "dup" });
    else if (v.node === down) steps.push({ ...v, skip: "down" });
    else {
      steps.push({ ...v, skip: null });
      chosen.push(v.node);
    }
  }
  return { steps, chosen };
}

/** Walk clockwise; servers that only hold a copy because another is down are hint holders. */
export function walk(keyDeg: number, rf: number, distinct: boolean, down: string | null) {
  const normal = preference(keyDeg, rf, distinct, null).chosen;
  const { steps, chosen } = preference(keyDeg, rf, distinct, down);
  const visits: Visit[] = steps.map((s) => ({
    label: s.label,
    node: s.node,
    outcome: s.skip === "dup" ? "skip-dup" : s.skip === "down" ? "skip-down" : down && !normal.includes(s.node) ? "hint" : "replica",
  }));
  return { visits, chosen };
}

const OUTCOME: Record<Visit["outcome"], { text: string; cls: string }> = {
  replica: { text: "stores a replica", cls: "bg-good-soft" },
  hint: { text: "stores a hinted replica for the down server", cls: "bg-warn-soft" },
  "skip-dup": { text: "skipped: same physical server already chosen", cls: "bg-surface-2 text-muted" },
  "skip-down": { text: "skipped: server is down", cls: "bg-bad-soft" },
};

export function HldRingReplicas() {
  const [keyIdx, setKeyIdx] = useState(1);
  const [rf, setRf] = useState(3);
  const [distinct, setDistinct] = useState(false);
  const [down, setDown] = useState<string | null>(null);

  const k = KEYS[keyIdx];
  const { visits, chosen } = walk(k.deg, rf, distinct, down);
  const physical = new Set(chosen).size;

  const C = 120;
  const R = 92;
  const at = (deg: number, r: number) => {
    const a = (deg / 360) * 2 * Math.PI - Math.PI / 2;
    return { x: C + r * Math.cos(a), y: C + r * Math.sin(a) };
  };
  const chosenLabels = new Set(visits.filter((v) => v.outcome === "replica" || v.outcome === "hint").map((v) => v.label));
  const kp = at(k.deg, R - 22);

  return (
    <Widget
      title="Replicas along the ring"
      hint="Four servers, three virtual nodes each. Pick a key and a replication factor, and walk clockwise to find its replicas. Then require distinct physical servers, and take a server down."
    >
      <div className="flex flex-wrap gap-2">
        {KEYS.map((x, i) => (
          <Pill key={x.key} active={keyIdx === i} onClick={() => setKeyIdx(i)}>
            {x.key}
          </Pill>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {[1, 2, 3].map((n) => (
          <Pill key={n} active={rf === n} onClick={() => setRf(n)}>
            RF = {n}
          </Pill>
        ))}
        <Pill active={distinct} onClick={() => setDistinct((d) => !d)}>
          Distinct physical servers: {distinct ? "on" : "off"}
        </Pill>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Pill active={down === null} onClick={() => setDown(null)}>
          All up
        </Pill>
        {SERVERS.map((s) => (
          <Pill key={s} active={down === s} onClick={() => setDown(s)}>
            {s} down
          </Pill>
        ))}
      </div>

      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div className="min-w-0">
          <svg viewBox="0 0 240 240" className="mx-auto h-auto w-full max-w-xs" role="img" aria-label="Ring with virtual nodes and the selected key">
            <circle cx={C} cy={C} r={R} fill="none" className="stroke-border" strokeWidth={2} />
            {VNODES.map((v) => {
              const p = at(v.deg, R);
              const l = at(v.deg, R + 16);
              const isDown = v.node === down;
              const picked = chosenLabels.has(v.label);
              return (
                <g key={v.label}>
                  <circle cx={p.x} cy={p.y} r={picked ? 7 : 5} className={isDown ? "fill-bad" : picked ? "fill-good" : "fill-accent"} />
                  <text x={l.x} y={l.y + 4} textAnchor="middle" fontSize={10} className="fill-text">
                    {v.label}
                  </text>
                </g>
              );
            })}
            <circle cx={kp.x} cy={kp.y} r={5} className="fill-warn" />
            <text x={C} y={C + 4} textAnchor="middle" fontSize={11} className="fill-muted">
              {k.key}
            </text>
          </svg>
        </div>
        <div className="min-w-0 space-y-1.5">
          <p className="text-xs text-muted">Clockwise walk from {k.key}</p>
          {visits.map((v, i) => (
            <p key={`${v.label}-${i}`} className={`rounded px-2 py-1 text-xs break-words ${OUTCOME[v.outcome].cls}`}>
              <span className="font-mono font-semibold">{v.label}</span> (server {v.node}): {OUTCOME[v.outcome].text}
            </p>
          ))}
          <p className={`rounded-lg p-2 text-sm ${physical < rf ? "bg-bad-soft" : "bg-good-soft"}`}>
            {rf} copies on {physical} physical server{physical === 1 ? "" : "s"}: {chosen.join(", ")}.
            {physical < rf ? " Losing one machine loses more than one copy." : " Each copy is on a different machine."}
          </p>
        </div>
      </div>
    </Widget>
  );
}

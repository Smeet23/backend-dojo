"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Mode = "sync" | "semi" | "async";
type Tone = "good" | "warn" | "bad" | "neutral";
type Line = { text: string; tone: Tone };
type Node = "R1" | "R2";
type State = {
  log: number[]; // values written to the primary, in order
  has: Record<Node, number>; // how many log entries each replica holds
  tick: number;
  rr: number; // round-robin pointer for reads
  dead: boolean;
  promoted: Node | null;
  lines: Line[];
};

const START: State = { log: [], has: { R1: 0, R2: 0 }, tick: 0, rr: 0, dead: false, promoted: null, lines: [] };

const MODE_INFO: Record<Mode, { label: string; ack: string }> = {
  sync: { label: "Synchronous (all replicas)", ack: "≈ 80 ms: waits for the slowest replica (R2, other region)" },
  semi: { label: "Semi-synchronous (one replica)", ack: "≈ 2 ms: waits for the nearest replica (R1)" },
  async: { label: "Asynchronous", ack: "≈ 0.5 ms: primary acks on its own commit" },
};

function push(s: State, lines: Line[]): Line[] {
  return [...lines.reverse(), ...s.lines].slice(0, 10);
}

export function SdReplicationFailover() {
  const [mode, setMode] = useState<Mode>("async");
  const [sticky, setSticky] = useState(false);
  const [s, setS] = useState<State>(START);

  const value = (n: number) => (n === 0 ? "(empty)" : `likes=${s.log[n - 1]}`);

  function write() {
    setS((p) => {
      const v = (p.log[p.log.length - 1] ?? 100) + 10;
      const log = [...p.log, v];
      const has = { ...p.has };
      if (mode === "sync") has.R1 = has.R2 = log.length;
      if (mode === "semi") has.R1 = log.length;
      return { ...p, log, has, lines: push(p, [{ text: `WRITE likes=${v} → primary acked (${mode})`, tone: "neutral" }]) };
    });
  }

  function tick() {
    setS((p) => {
      const t = p.tick + 1;
      const has = {
        R1: Math.min(p.log.length, p.has.R1 + 1),
        R2: t % 2 === 0 ? Math.min(p.log.length, p.has.R2 + 1) : p.has.R2,
      };
      return { ...p, tick: t, has, lines: push(p, [{ text: `+100 ms: R1 has ${has.R1}/${p.log.length}, R2 has ${has.R2}/${p.log.length}`, tone: "neutral" }]) };
    });
  }

  function read() {
    setS((p) => {
      const node: Node = sticky ? "R1" : p.rr % 2 === 0 ? "R1" : "R2";
      const n = p.has[node];
      const behind = p.log.length - n;
      const prev = p.lines.find((l) => l.text.startsWith("READ"));
      const prevVal = prev ? Number(/likes=(\d+)/.exec(prev.text)?.[1] ?? 0) : 0;
      const val = n === 0 ? 0 : p.log[n - 1];
      const backwards = prevVal > 0 && val < prevVal;
      const tone: Tone = backwards ? "bad" : behind > 0 ? "warn" : "good";
      const note = backwards ? " (went BACKWARDS)" : behind > 0 ? ` (stale by ${behind})` : " (fresh)";
      return { ...p, rr: p.rr + 1, lines: push(p, [{ text: `READ from ${node}: ${n === 0 ? "(empty)" : `likes=${val}`}${note}`, tone }]) };
    });
  }

  function failover() {
    setS((p) => {
      const best: Node = p.has.R1 >= p.has.R2 ? "R1" : "R2";
      const lost = p.log.length - p.has[best];
      const lines: Line[] = [
        { text: "Primary crashed. Health checks fail.", tone: "bad" },
        { text: `Promote the most up-to-date replica: ${best} (${p.has[best]}/${p.log.length} writes)`, tone: "neutral" },
        lost > 0
          ? { text: `${lost} acknowledged write${lost > 1 ? "s" : ""} LOST: they existed only on the old primary`, tone: "bad" }
          : { text: "No acknowledged writes lost.", tone: "good" },
      ];
      return { ...p, dead: true, promoted: best, lines: push(p, lines) };
    });
  }

  const nodes: { name: string; n: number; role: string }[] = [
    { name: "Primary", n: s.log.length, role: s.dead ? "crashed" : "leader · takes writes" },
    { name: "R1", n: s.has.R1, role: s.promoted === "R1" ? "new leader" : "same region" },
    { name: "R2", n: s.has.R2, role: s.promoted === "R2" ? "new leader" : "other region, slower" },
  ];

  return (
    <Widget title="Replication lag and failover" hint="Write to the primary, let time pass, read from replicas, then crash the primary. Try each mode.">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(MODE_INFO) as Mode[]).map((m) => (
          <Pill
            key={m}
            active={mode === m}
            onClick={() => {
              setMode(m);
              setS(START);
            }}
          >
            {MODE_INFO[m].label}
          </Pill>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">Write latency: {MODE_INFO[mode].ack}</p>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {nodes.map((nd, i) => {
          const behind = s.log.length - nd.n;
          const dead = i === 0 && s.dead;
          return (
            <div key={nd.name} className={`min-w-0 rounded-lg border p-2 text-sm ${dead ? "border-border bg-bad-soft" : i === 0 || s.promoted === nd.name ? "border-accent bg-accent-soft" : "border-border"}`}>
              <p className="font-semibold">{nd.name}</p>
              <p className="text-xs text-muted">{nd.role}</p>
              <p className="mt-1 font-mono text-[0.75rem]">{value(nd.n)}</p>
              {i > 0 && <p className={`mt-1 text-xs ${behind > 0 ? "text-warn" : "text-good"}`}>{behind > 0 ? `behind by ${behind} write${behind > 1 ? "s" : ""}` : "caught up"}</p>}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={s.dead} onClick={write} className="min-h-10 rounded-lg bg-accent px-3 text-sm font-medium text-white disabled:opacity-40 dark:text-bg">
          Write
        </button>
        <button type="button" disabled={s.dead} onClick={tick} className="min-h-10 rounded-lg border border-border px-3 text-sm disabled:opacity-40">
          Let 100 ms pass
        </button>
        <button type="button" disabled={s.dead} onClick={read} className="min-h-10 rounded-lg border border-border px-3 text-sm disabled:opacity-40">
          Read from a replica
        </button>
        <button type="button" disabled={s.dead || s.log.length === 0} onClick={failover} className="min-h-10 rounded-lg border border-border px-3 text-sm disabled:opacity-40">
          Crash primary
        </button>
        <button type="button" onClick={() => setS(START)} className="min-h-10 rounded-lg border border-border px-3 text-sm">
          Reset
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Pill active={sticky} onClick={() => setSticky((v) => !v)}>
          Reads: {sticky ? "sticky to R1" : "round-robin R1/R2"}
        </Pill>
      </div>

      <ol className="mt-3 space-y-1">
        {s.lines.map((l, i) => (
          <li
            key={`${s.tick}-${s.log.length}-${s.rr}-${i}`}
            className={`rounded px-2 py-1 font-mono text-[0.72rem] break-words ${l.tone === "good" ? "bg-good-soft" : l.tone === "warn" ? "bg-warn-soft" : l.tone === "bad" ? "bg-bad-soft" : "bg-surface-2"}`}
          >
            {l.text}
          </li>
        ))}
      </ol>
    </Widget>
  );
}

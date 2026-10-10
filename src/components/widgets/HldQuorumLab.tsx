"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Log = { text: string; tone: "good" | "warn" | "bad" | "neutral" };
type State = { versions: number[]; down: boolean[]; latest: number; log: Log[] };

const NAMES = ["A", "B", "C", "D", "E"];

function fresh(n: number): State {
  return { versions: Array(n).fill(1), down: Array(n).fill(false), latest: 1, log: [] };
}

function push(s: State, entries: Log[]): Log[] {
  return [...entries, ...s.log].slice(0, 7);
}

export function HldQuorumLab() {
  const [n, setN] = useState(3);
  const [r, setR] = useState(2);
  const [w, setW] = useState(2);
  const [s, setS] = useState<State>(fresh(3));

  function chooseN(next: number) {
    setN(next);
    setR(Math.min(r, next));
    setW(Math.min(w, next));
    setS(fresh(next));
  }

  function toggleDown(i: number) {
    setS((st) => {
      const down = st.down.map((d, j) => (j === i ? !d : d));
      return { ...st, down, log: push(st, [{ text: `${NAMES[i]} is now ${down[i] ? "down" : "back up (still holding whatever it had)"}`, tone: "neutral" }]) };
    });
  }

  /** Worst case: the write lands on exactly W live replicas; the others never see it (in flight, or down). */
  function write() {
    setS((st) => {
      const alive = st.versions.map((_, i) => i).filter((i) => !st.down[i]);
      if (alive.length < w) {
        return { ...st, log: push(st, [{ text: `PUT v${st.latest + 1} → FAILED: only ${alive.length} replicas up, W=${w} acks needed`, tone: "bad" }]) };
      }
      const v = st.latest + 1;
      const targets = alive.slice(0, w);
      const versions = st.versions.map((x, i) => (targets.includes(i) ? v : x));
      return {
        ...st,
        versions,
        latest: v,
        log: push(st, [{ text: `PUT v${v} → OK after ${w} ack(s) from ${targets.map((i) => NAMES[i]).join(", ")}; the rest are still stale`, tone: "good" }]),
      };
    });
  }

  /** Worst case: the read is answered by the R live replicas with the OLDEST data. */
  function read(repair: boolean) {
    setS((st) => {
      const alive = st.versions.map((_, i) => i).filter((i) => !st.down[i]);
      if (alive.length < r) {
        return { ...st, log: push(st, [{ text: `GET → FAILED: only ${alive.length} replicas up, R=${r} replies needed`, tone: "bad" }]) };
      }
      const picked = [...alive].sort((a, b) => st.versions[a] - st.versions[b] || a - b).slice(0, r);
      const best = Math.max(...picked.map((i) => st.versions[i]));
      const stale = best < st.latest;
      const who = picked.map((i) => `${NAMES[i]}:v${st.versions[i]}`).join(", ");
      const entries: Log[] = [
        { text: `GET asked ${who} → returns v${best}${stale ? ` (STALE, latest is v${st.latest})` : " (latest)"}`, tone: stale ? "bad" : "good" },
      ];
      let versions = st.versions;
      if (repair) {
        const fixed = picked.filter((i) => st.versions[i] < best);
        if (fixed.length) {
          versions = st.versions.map((x, i) => (fixed.includes(i) ? best : x));
          entries.unshift({ text: `Read repair: pushed v${best} to ${fixed.map((i) => NAMES[i]).join(", ")}`, tone: "neutral" });
        }
      }
      return { ...st, versions, log: push(st, entries) };
    });
  }

  const overlap = r + w > n;

  return (
    <Widget title="Quorum explorer" hint="Every write and read here is the worst case the quorum allows: writes reach only W replicas, reads hit the stalest R. Find the settings that can never return stale data.">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">N</span>
        {[3, 5].map((x) => (
          <Pill key={x} active={n === x} onClick={() => chooseN(x)}>{x}</Pill>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">W</span>
        {Array.from({ length: n }, (_, i) => i + 1).map((x) => (
          <Pill key={x} active={w === x} onClick={() => setW(x)}>{x}</Pill>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">R</span>
        {Array.from({ length: n }, (_, i) => i + 1).map((x) => (
          <Pill key={x} active={r === x} onClick={() => setR(x)}>{x}</Pill>
        ))}
      </div>

      <p className={`mt-3 rounded-lg p-2 text-sm ${overlap ? "bg-good-soft" : "bg-warn-soft"}`}>
        R + W = {r + w} {overlap ? ">" : "≤"} N = {n}:{" "}
        {overlap ? "every read set overlaps every write set, so a read always includes at least one up-to-date replica." : "read and write sets can miss each other, so stale reads are possible."}{" "}
        Writes survive {n - w} replica failure{n - w === 1 ? "" : "s"}; reads survive {n - r}.
      </p>

      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
        {s.versions.map((v, i) => (
          <button
            key={i}
            type="button"
            onClick={() => toggleDown(i)}
            className={`min-h-16 min-w-0 rounded-lg border p-2 text-left text-sm ${
              s.down[i] ? "border-border bg-bad-soft" : v === s.latest ? "border-accent bg-accent-soft" : "border-border bg-surface-2"
            }`}
          >
            <p className="font-semibold">Replica {NAMES[i]}</p>
            <p className="font-mono text-xs">{s.down[i] ? "down" : `v${v}${v === s.latest ? " ✓" : " stale"}`}</p>
          </button>
        ))}
      </div>
      <p className="mt-1 text-xs text-muted">Tap a replica to take it down or bring it back.</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={write} className="min-h-10 rounded-lg bg-accent px-3 text-sm font-medium text-white dark:text-bg">
          Write next version
        </button>
        <button type="button" onClick={() => read(false)} className="min-h-10 rounded-lg border border-border px-3 text-sm hover:bg-surface-2">
          Read
        </button>
        <button type="button" onClick={() => read(true)} className="min-h-10 rounded-lg border border-border px-3 text-sm hover:bg-surface-2">
          Read + repair
        </button>
        <button type="button" onClick={() => setS(fresh(n))} className="min-h-10 rounded-lg border border-border px-3 text-sm hover:bg-surface-2">
          Reset
        </button>
      </div>

      <ol className="mt-3 space-y-1">
        {s.log.map((l, i) => (
          <li
            key={`${s.log.length}-${i}-${l.text}`}
            className={`rounded px-2 py-1 font-mono text-[0.72rem] break-words ${l.tone === "good" ? "bg-good-soft" : l.tone === "warn" ? "bg-warn-soft" : l.tone === "bad" ? "bg-bad-soft" : "bg-surface-2"}`}
          >
            {l.text}
          </li>
        ))}
      </ol>
    </Widget>
  );
}

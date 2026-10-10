"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Mode = "cp" | "ap";
type NodeId = "A" | "B" | "C";
type Log = { text: string; tone: "good" | "warn" | "bad" | "neutral" };

const START_BALANCE = 100;
const WITHDRAW = 60;
const NODES: NodeId[] = ["A", "B", "C"];

type State = {
  balances: Record<NodeId, number>;
  partitioned: boolean;
  /** Withdrawals accepted while split, per side; merged on heal. */
  majorityWithdrawn: number;
  minorityWithdrawn: number;
  log: Log[];
};

const START: State = {
  balances: { A: START_BALANCE, B: START_BALANCE, C: START_BALANCE },
  partitioned: false,
  majorityWithdrawn: 0,
  minorityWithdrawn: 0,
  log: [],
};

const isMinority = (n: NodeId) => n === "C";

function push(s: State, entries: Log[]): Log[] {
  return [...entries, ...s.log].slice(0, 7);
}

export function SdCapPartition() {
  const [mode, setMode] = useState<Mode>("cp");
  const [s, setS] = useState<State>(START);

  function withdraw(n: NodeId) {
    setS((st) => {
      const local = st.balances[n];
      if (st.partitioned && mode === "cp" && isMinority(n)) {
        return { ...st, log: push(st, [{ text: `Withdraw ${WITHDRAW} via ${n} → 503: can't reach a majority, refusing`, tone: "bad" }]) };
      }
      if (local < WITHDRAW) {
        return { ...st, log: push(st, [{ text: `Withdraw ${WITHDRAW} via ${n} → declined: ${n} sees balance ${local}`, tone: "warn" }]) };
      }
      if (!st.partitioned) {
        const v = local - WITHDRAW;
        return { ...st, balances: { A: v, B: v, C: v }, log: push(st, [{ text: `Withdraw ${WITHDRAW} via ${n} → OK, replicated to all: ${v}`, tone: "good" }]) };
      }
      // Partitioned: apply only on the side that received it.
      const side: NodeId[] = isMinority(n) ? ["C"] : ["A", "B"];
      const balances = { ...st.balances };
      for (const id of side) balances[id] = local - WITHDRAW;
      return {
        ...st,
        balances,
        majorityWithdrawn: st.majorityWithdrawn + (isMinority(n) ? 0 : WITHDRAW),
        minorityWithdrawn: st.minorityWithdrawn + (isMinority(n) ? WITHDRAW : 0),
        log: push(st, [{ text: `Withdraw ${WITHDRAW} via ${n} → OK on ${side.join("+")} only (${local - WITHDRAW})`, tone: mode === "ap" && isMinority(n) ? "warn" : "good" }]),
      };
    });
  }

  function read(n: NodeId) {
    setS((st) => {
      if (st.partitioned && mode === "cp" && isMinority(n)) {
        return { ...st, log: push(st, [{ text: `Read via ${n} → 503: can't confirm it's current`, tone: "bad" }]) };
      }
      const stale = st.partitioned && (isMinority(n) ? st.majorityWithdrawn > 0 : st.minorityWithdrawn > 0);
      return { ...st, log: push(st, [{ text: `Read via ${n} → ${st.balances[n]}${stale ? " (stale: other side has newer writes)" : ""}`, tone: stale ? "warn" : "neutral" }]) };
    });
  }

  function togglePartition() {
    setS((st) => {
      if (!st.partitioned) return { ...st, partitioned: true, log: push(st, [{ text: "Network split: {A, B} can't reach {C}", tone: "warn" }]) };
      const total = st.majorityWithdrawn + st.minorityWithdrawn;
      const base = st.balances.A + st.majorityWithdrawn; // balance before the split
      const merged = base - total;
      const entries: Log[] = [{ text: `Partition healed → replicas reconcile to ${merged}`, tone: merged < 0 ? "bad" : "neutral" }];
      if (merged < 0) entries.unshift({ text: `Both sides approved withdrawals: account overdrawn by ${-merged}`, tone: "bad" });
      return { balances: { A: merged, B: merged, C: merged }, partitioned: false, majorityWithdrawn: 0, minorityWithdrawn: 0, log: push(st, entries) };
    });
  }

  function chooseMode(m: Mode) {
    setMode(m);
    setS(START);
  }

  return (
    <Widget title="Partition: choose C or A" hint={`A bank balance of ${START_BALANCE} lives on three replicas. Split the network, then withdraw ${WITHDRAW} on both sides.`}>
      <div className="flex flex-wrap gap-2">
        <Pill active={mode === "cp"} onClick={() => chooseMode("cp")}>CP: correct or nothing</Pill>
        <Pill active={mode === "ap"} onClick={() => chooseMode("ap")}>AP: always answer</Pill>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {NODES.map((n) => {
          const cut = s.partitioned && isMinority(n);
          return (
            <div key={n} className={`min-w-0 rounded-lg border p-2 text-center ${cut ? "border-dashed border-bad bg-bad-soft" : "border-border bg-surface-2"}`}>
              <p className="text-xs text-muted">Replica {n}{s.partitioned ? (cut ? " · minority" : " · majority") : ""}</p>
              <p className="font-mono text-lg">{s.balances[n]}</p>
              <div className="mt-1 flex flex-col gap-1">
                <button type="button" onClick={() => withdraw(n)} className="min-h-10 rounded-md border border-border bg-surface px-1 text-xs hover:bg-surface-2">
                  Withdraw {WITHDRAW}
                </button>
                <button type="button" onClick={() => read(n)} className="min-h-10 rounded-md border border-border bg-surface px-1 text-xs hover:bg-surface-2">
                  Read
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={togglePartition} className="min-h-10 flex-1 rounded-lg bg-accent px-3 text-sm font-medium text-white dark:text-bg">
          {s.partitioned ? "Heal the network" : "Split the network"}
        </button>
        <button type="button" onClick={() => setS(START)} className="min-h-10 rounded-lg border border-border px-3 text-sm">
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

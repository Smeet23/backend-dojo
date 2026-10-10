"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Dep = "pay" | "recs" | "profile";
type Slot = { dep: Dep; left: number; willTimeout: boolean } | null;
type Stats = Record<Dep, { ok: number; rejected: number; timedOut: number }>;
type State = { tick: number; shared: Slot[]; pools: Record<Dep, Slot[]>; stats: Stats };

const DEPS: Dep[] = ["pay", "recs", "profile"];
const DEP_LABEL: Record<Dep, string> = { pay: "Payments", recs: "Recommendations", profile: "Profile" };
const DEP_SHORT: Record<Dep, string> = { pay: "P", recs: "R", profile: "U" };
const TOTAL = 12;
const PER_DEP: Record<Dep, number> = { pay: 5, recs: 3, profile: 4 };
const SLOW_MS = 8; // ticks a call to a hung dependency would take
const TIMEOUT = 2; // ticks before we give up when timeouts are on
/** Arrivals per tick, interleaved. */
const ARRIVALS: Dep[] = ["recs", "pay", "profile", "recs", "pay", "profile"];

function empty(): State {
  return {
    tick: 0,
    shared: Array(TOTAL).fill(null),
    pools: { pay: Array(PER_DEP.pay).fill(null), recs: Array(PER_DEP.recs).fill(null), profile: Array(PER_DEP.profile).fill(null) },
    stats: { pay: { ok: 0, rejected: 0, timedOut: 0 }, recs: { ok: 0, rejected: 0, timedOut: 0 }, profile: { ok: 0, rejected: 0, timedOut: 0 } },
  };
}

function step(s: State, isolated: boolean, slowDep: Dep | null, timeouts: boolean): State {
  const stats: Stats = { pay: { ...s.stats.pay }, recs: { ...s.stats.recs }, profile: { ...s.stats.profile } };
  // Finish or time out calls in progress.
  const release = (slots: Slot[]) =>
    slots.map((slot) => {
      if (!slot) return null;
      const left = slot.left - 1;
      if (left > 0) return { ...slot, left };
      if (slot.willTimeout) stats[slot.dep].timedOut++;
      else stats[slot.dep].ok++;
      return null;
    });
  const shared = release(s.shared);
  const pools = { pay: release(s.pools.pay), recs: release(s.pools.recs), profile: release(s.pools.profile) };

  for (const dep of ARRIVALS) {
    const slots = isolated ? pools[dep] : shared;
    const free = slots.indexOf(null);
    if (free === -1) {
      stats[dep].rejected++;
      continue;
    }
    const slow = dep === slowDep;
    const left = slow ? (timeouts ? TIMEOUT : SLOW_MS) : 1;
    slots[free] = { dep, left, willTimeout: slow && timeouts };
  }
  return { tick: s.tick + 1, shared, pools, stats };
}

function SlotBox({ slot }: { slot: Slot }) {
  const tone = !slot ? "border-dashed border-border" : slot.dep === "recs" ? "border-bad bg-bad-soft" : slot.dep === "pay" ? "border-good bg-good-soft" : "border-accent bg-accent-soft";
  return (
    <div className={`flex h-9 w-9 items-center justify-center rounded-md border font-mono text-[0.7rem] ${tone}`}>
      {slot ? `${DEP_SHORT[slot.dep]}${slot.left}` : ""}
    </div>
  );
}

export function HldBulkheadPools() {
  const [isolated, setIsolated] = useState(false);
  const [slowDep, setSlowDep] = useState<Dep | null>("recs");
  const [timeouts, setTimeouts] = useState(false);
  const [s, setS] = useState<State>(empty);

  function reset(next?: () => void) {
    next?.();
    setS(empty());
  }

  function run(n: number) {
    setS((prev) => {
      let cur = prev;
      for (let i = 0; i < n; i++) cur = step(cur, isolated, slowDep, timeouts);
      return cur;
    });
  }

  return (
    <Widget
      title="Shared pool vs bulkheads"
      hint={`A service calls three dependencies, two requests each per tick. It has ${TOTAL} worker threads. Make one dependency hang and see who suffers.`}
    >
      <div className="flex flex-wrap gap-2">
        <Pill active={!isolated} onClick={() => reset(() => setIsolated(false))}>One shared pool of {TOTAL}</Pill>
        <Pill active={isolated} onClick={() => reset(() => setIsolated(true))}>Bulkheads {PER_DEP.pay}/{PER_DEP.recs}/{PER_DEP.profile}</Pill>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">Hung dependency</span>
        <Pill active={slowDep === null} onClick={() => reset(() => setSlowDep(null))}>None</Pill>
        {DEPS.map((d) => (
          <Pill key={d} active={slowDep === d} onClick={() => reset(() => setSlowDep(d))}>{DEP_LABEL[d]}</Pill>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Pill active={timeouts} onClick={() => reset(() => setTimeouts((t) => !t))}>
          Call timeout {TIMEOUT} ticks: {timeouts ? "on" : "off"}
        </Pill>
      </div>

      <div className="mt-4">
        {isolated ? (
          <div className="space-y-2">
            {DEPS.map((d) => (
              <div key={d}>
                <p className="text-xs text-muted">{DEP_LABEL[d]} pool</p>
                <div className="mt-1 flex flex-wrap gap-1.5">{s.pools[d].map((slot, i) => <SlotBox key={i} slot={slot} />)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            <p className="text-xs text-muted">Shared pool</p>
            <div className="mt-1 flex flex-wrap gap-1.5">{s.shared.map((slot, i) => <SlotBox key={i} slot={slot} />)}</div>
          </div>
        )}
        <p className="mt-2 text-[0.7rem] text-muted">P = payments, R = recommendations, U = profile; the number is ticks left on that thread.</p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => run(1)} className="min-h-10 flex-1 rounded-lg bg-accent px-3 text-sm font-medium text-white dark:text-bg">
          Advance 1 tick (t{s.tick})
        </button>
        <button type="button" onClick={() => run(5)} className="min-h-10 rounded-lg border border-border px-3 text-sm">+5 ticks</button>
        <button type="button" onClick={() => reset()} className="min-h-10 rounded-lg border border-border px-3 text-sm">Reset</button>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {DEPS.map((d) => {
          const st = s.stats[d];
          const bad = st.rejected + st.timedOut;
          return (
            <div key={d} className={`min-w-0 rounded-lg p-2 text-sm ${bad === 0 ? "bg-good-soft" : st.ok === 0 ? "bg-bad-soft" : "bg-warn-soft"}`}>
              <p className="font-semibold">{DEP_LABEL[d]}</p>
              <p className="font-mono text-[0.75rem]">ok {st.ok} · rejected {st.rejected} · timed out {st.timedOut}</p>
            </div>
          );
        })}
      </div>
    </Widget>
  );
}

"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Mode = "naive" | "incr" | "lua";
type ServerId = "A" | "B" | "C";
type Srv = { phase: 0 | 1 | 2; read?: number; verdict?: "allow" | "reject" };
type State = { counter: number; servers: Record<ServerId, Srv>; log: string[] };

const LIMIT = 100;
const START_COUNT = 98;
const IDS: ServerId[] = ["A", "B", "C"];

const MODES: { id: Mode; label: string; blurb: string }[] = [
  { id: "naive", label: "GET then SET", blurb: "Two round trips: read the counter, decide, write count + 1. Another gateway can run in between." },
  { id: "incr", label: "INCR first", blurb: "One atomic command increments and returns the new value. Decide from that value." },
  { id: "lua", label: "Lua script", blurb: "The whole read-refill-decide-write runs atomically inside Redis. Nothing interleaves." },
];

const fresh = (): State => ({
  counter: START_COUNT,
  servers: { A: { phase: 0 }, B: { phase: 0 }, C: { phase: 0 } },
  log: [],
});

function step(s: State, id: ServerId, mode: Mode): State {
  const srv = s.servers[id];
  if (srv.phase === 2) return s;
  const servers = { ...s.servers };
  if (mode === "naive") {
    if (srv.phase === 0) {
      servers[id] = { phase: 1, read: s.counter };
      return { ...s, servers, log: [`${id}: GET → ${s.counter}`, ...s.log] };
    }
    const read = srv.read ?? 0;
    if (read < LIMIT) {
      servers[id] = { phase: 2, read, verdict: "allow" };
      return { counter: read + 1, servers, log: [`${id}: ${read} is under ${LIMIT}, SET ${read + 1}, allow`, ...s.log] };
    }
    servers[id] = { phase: 2, read, verdict: "reject" };
    return { ...s, servers, log: [`${id}: ${read} reached ${LIMIT}, reject 429`, ...s.log] };
  }
  const next = s.counter + 1;
  const ok = next <= LIMIT;
  servers[id] = { phase: 2, read: next, verdict: ok ? "allow" : "reject" };
  const cmd = mode === "incr" ? "INCR" : "EVALSHA limiter";
  return { counter: next, servers, log: [`${id}: ${cmd} → ${next}, ${ok ? "allow" : "reject 429"}`, ...s.log] };
}

export function HldCounterRace() {
  const [mode, setMode] = useState<Mode>("naive");
  const [s, setS] = useState<State>(fresh);

  const allowed = IDS.filter((id) => s.servers[id].verdict === "allow").length;
  const done = IDS.every((id) => s.servers[id].phase === 2);
  const shouldAllow = LIMIT - START_COUNT;

  function interleave() {
    let st = fresh();
    for (const id of IDS) st = step(st, id, mode);
    for (const id of IDS) st = step(st, id, mode);
    setS(st);
  }

  return (
    <Widget
      title="Three gateways, one Redis counter"
      hint={`Limit ${LIMIT}/min. The counter is already at ${START_COUNT}, so exactly ${shouldAllow} more requests should pass. Three gateways each get one request at the same moment. Step them in any order.`}
    >
      <div className="flex flex-wrap gap-2">
        {MODES.map((m) => (
          <Pill key={m.id} active={mode === m.id} onClick={() => { setMode(m.id); setS(fresh()); }}>
            {m.label}
          </Pill>
        ))}
      </div>
      <p className="mt-2 text-sm text-muted">{MODES.find((m) => m.id === mode)?.blurb}</p>

      <div className="mt-3 rounded-lg border border-accent bg-accent-soft p-3 text-center">
        <p className="text-xs text-muted">Redis key rl:user42 (shared)</p>
        <p className="font-mono text-2xl">{s.counter}</p>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {IDS.map((id) => {
          const srv = s.servers[id];
          const status =
            srv.phase === 0 ? "waiting" : srv.phase === 1 ? `read ${srv.read}, deciding…` : srv.verdict === "allow" ? "allowed" : "rejected (429)";
          const tone = srv.verdict === "allow" ? "bg-good-soft" : srv.verdict === "reject" ? "bg-bad-soft" : "bg-surface-2";
          return (
            <div key={id} className={`min-w-0 rounded-lg border border-border p-2 ${tone}`}>
              <p className="text-sm font-semibold">Gateway {id}</p>
              <p className="text-xs text-muted">{status}</p>
              <button
                type="button"
                disabled={srv.phase === 2}
                onClick={() => setS((st) => step(st, id, mode))}
                className="mt-2 min-h-10 w-full rounded-lg border border-border bg-surface px-2 text-sm disabled:opacity-40"
              >
                {srv.phase === 2 ? "done" : mode === "naive" ? (srv.phase === 0 ? "Step: GET" : "Step: decide + SET") : "Step: run atomically"}
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={interleave} className="min-h-10 flex-1 rounded-lg bg-accent px-3 text-sm font-medium text-white dark:text-bg">
          Worst-case interleaving
        </button>
        <button type="button" onClick={() => setS(fresh())} className="min-h-10 rounded-lg border border-border px-3 text-sm">
          Reset
        </button>
      </div>

      {done && (
        <p className={`mt-3 rounded-lg p-2 text-sm ${allowed > shouldAllow ? "bg-bad-soft" : "bg-good-soft"}`}>
          {allowed} allowed, {shouldAllow} should have been.{" "}
          {allowed > shouldAllow
            ? `The limit leaked: gateways decided on stale reads, and the counter ended at ${s.counter} even though ${START_COUNT + allowed} requests were counted as allowed.`
            : "The limit held: every gateway saw a unique, up-to-date value."}
        </p>
      )}

      <ol className="mt-3 space-y-1 font-mono text-[0.72rem]">
        {s.log.map((l, i) => (
          <li key={i} className="break-words text-muted">{l}</li>
        ))}
      </ol>
    </Widget>
  );
}

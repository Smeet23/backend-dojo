"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Instance = { id: string; alive: boolean; missed: number; listed: boolean };
type Log = { text: string; tone: "good" | "bad" | "warn" | "neutral" };
type State = { tick: number; instances: Instance[]; clientCache: string[]; cachedAt: number; rr: number; ok: number; failed: number; log: Log[] };

const IDS = ["pay-1", "pay-2", "pay-3", "pay-4"];

function start(): State {
  return {
    tick: 0,
    instances: IDS.map((id) => ({ id, alive: true, missed: 0, listed: true })),
    clientCache: [...IDS],
    cachedAt: 0,
    rr: 0,
    ok: 0,
    failed: 0,
    log: [],
  };
}

function step(s: State, missLimit: number, refreshEvery: number): State {
  const tick = s.tick + 1;
  const log: Log[] = [];
  // Heartbeats: alive instances reset their counter; dead ones accumulate misses.
  const instances = s.instances.map((inst) => {
    if (inst.alive) return { ...inst, missed: 0 };
    const missed = inst.missed + 1;
    const evict = inst.listed && missed >= missLimit;
    if (evict) log.push({ text: `t${tick}: registry evicts ${inst.id} after ${missed} missed heartbeats`, tone: "warn" });
    return { ...inst, missed, listed: inst.listed && !evict };
  });
  let clientCache = s.clientCache;
  let cachedAt = s.cachedAt;
  if (tick - s.cachedAt >= refreshEvery) {
    clientCache = instances.filter((i) => i.listed).map((i) => i.id);
    cachedAt = tick;
    log.push({ text: `t${tick}: client refreshes its cache → [${clientCache.join(", ")}]`, tone: "neutral" });
  }
  // The client sends two requests per tick, round robin over its cached list.
  let { ok, failed, rr } = s;
  for (let r = 0; r < 2 && clientCache.length > 0; r++) {
    const target = clientCache[rr % clientCache.length];
    rr++;
    const inst = instances.find((i) => i.id === target);
    if (inst?.alive) ok++;
    else {
      failed++;
      log.push({ text: `t${tick}: request to ${target} → connection refused`, tone: "bad" });
    }
  }
  return { tick, instances, clientCache, cachedAt, rr, ok, failed, log: [...log.reverse(), ...s.log].slice(0, 8) };
}

export function HldServiceRegistry() {
  const [missLimit, setMissLimit] = useState(3);
  const [refreshEvery, setRefreshEvery] = useState(4);
  const [s, setS] = useState<State>(start);

  function kill(id: string) {
    setS((prev) => ({
      ...prev,
      instances: prev.instances.map((i) => (i.id === id ? { ...i, alive: !i.alive, missed: 0, listed: i.alive ? i.listed : true } : i)),
      log: [{ text: `t${prev.tick}: ${id} ${prev.instances.find((i) => i.id === id)?.alive ? "crashes (no deregister)" : "restarts and re-registers"}`, tone: "neutral" as const }, ...prev.log].slice(0, 8),
    }));
  }

  return (
    <Widget title="Registry with heartbeats and client caches" hint="Crash an instance, then advance time. Dead instances keep getting traffic until the registry evicts them and the client refreshes its cache.">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">Evict after</span>
        {[1, 3, 5].map((n) => (
          <Pill key={n} active={missLimit === n} onClick={() => { setMissLimit(n); setS(start()); }}>
            {n} missed
          </Pill>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">Client cache refresh</span>
        {[1, 4, 8].map((n) => (
          <Pill key={n} active={refreshEvery === n} onClick={() => { setRefreshEvery(n); setS(start()); }}>
            every {n} ticks
          </Pill>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {s.instances.map((i) => (
          <button
            key={i.id}
            type="button"
            onClick={() => kill(i.id)}
            className={`min-h-10 min-w-0 rounded-lg border p-2 text-left text-[0.75rem] ${i.alive ? "border-good bg-good-soft" : "border-bad bg-bad-soft"}`}
          >
            <p className="font-mono font-semibold">{i.id}</p>
            <p className="text-muted">{i.alive ? "running" : `dead · missed ${i.missed}`}</p>
            <p className="text-muted">{i.listed ? "in registry" : "evicted"}</p>
            <p className="mt-1 text-[0.7rem] text-accent">{i.alive ? "tap to crash" : "tap to restart"}</p>
          </button>
        ))}
      </div>

      <p className="mt-3 text-xs text-muted break-words">
        Client cache (refreshed t{s.cachedAt}): <span className="font-mono text-text">[{s.clientCache.join(", ")}]</span>
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => setS((p) => step(p, missLimit, refreshEvery))} className="min-h-10 flex-1 rounded-lg bg-accent px-3 text-sm font-medium text-white dark:text-bg">
          Advance 1 tick (t{s.tick})
        </button>
        <button type="button" onClick={() => setS(start())} className="min-h-10 rounded-lg border border-border px-3 text-sm">
          Reset
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-center text-sm">
        <div className="min-w-0 rounded-lg bg-good-soft p-2"><p className="text-xs text-muted">Succeeded</p><p className="font-mono">{s.ok}</p></div>
        <div className="min-w-0 rounded-lg bg-bad-soft p-2"><p className="text-xs text-muted">Failed</p><p className="font-mono">{s.failed}</p></div>
      </div>

      <ol className="mt-3 space-y-1">
        {s.log.map((l, i) => (
          <li key={i} className={`rounded-md px-2 py-1 font-mono text-[0.72rem] break-words ${l.tone === "bad" ? "bg-bad-soft" : l.tone === "warn" ? "bg-warn-soft" : l.tone === "good" ? "bg-good-soft" : "bg-surface-2"}`}>
            {l.text}
          </li>
        ))}
      </ol>
    </Widget>
  );
}

"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Policy = "none" | "lru" | "lfu" | "ttl";
type Entry = { key: string; storedAt: number; lastUsed: number; uses: number; expiresAt: number };
type Log = { text: string; tone: "good" | "warn" | "bad" | "neutral" };

const KEYS = ["product:1", "product:2", "product:3", "product:4", "product:5"];
const CAPACITY = 3;
const TTL = 6;
/** A traffic pattern where product:1 is the hot item and others come and go. */
const PATTERN = ["product:1", "product:2", "product:1", "product:3", "product:1", "product:4", "product:2", "product:1", "product:5", "product:1", "product:3", "product:1"];

const POLICY_LABEL: Record<Policy, string> = {
  none: "No eviction",
  lru: "LRU",
  lfu: "LFU",
  ttl: "Nearest expiry",
};

type State = { clock: number; cache: Entry[]; hits: number; misses: number; log: Log[] };

const START: State = { clock: 0, cache: [], hits: 0, misses: 0, log: [] };

function pickVictim(cache: Entry[], policy: Policy): Entry | null {
  if (policy === "none" || cache.length === 0) return null;
  const sorted = [...cache].sort((a, b) => {
    if (policy === "lru") return a.lastUsed - b.lastUsed;
    if (policy === "lfu") return a.uses - b.uses || a.lastUsed - b.lastUsed;
    return a.expiresAt - b.expiresAt;
  });
  return sorted[0];
}

function request(state: State, key: string, policy: Policy, ttlOn: boolean): State {
  const clock = state.clock + 1;
  const log: Log[] = [];
  // Expired keys are gone, whatever the eviction policy.
  let cache = state.cache.filter((e) => {
    const expired = ttlOn && e.expiresAt <= clock;
    if (expired) log.push({ text: `${e.key} expired (TTL ran out)`, tone: "neutral" });
    return !expired;
  });
  const found = cache.find((e) => e.key === key);
  if (found) {
    cache = cache.map((e) => (e.key === key ? { ...e, lastUsed: clock, uses: e.uses + 1 } : e));
    log.push({ text: `GET ${key} → HIT (~1 ms from memory)`, tone: "good" });
    return { clock, cache, hits: state.hits + 1, misses: state.misses, log: [...log.reverse(), ...state.log].slice(0, 8) };
  }
  log.push({ text: `GET ${key} → MISS, query the database (~40 ms)`, tone: "warn" });
  if (cache.length >= CAPACITY) {
    const victim = pickVictim(cache, policy);
    if (!victim) {
      log.push({ text: `SET ${key} → error: cache is full and eviction is off (OOM)`, tone: "bad" });
      return { clock, cache, hits: state.hits, misses: state.misses + 1, log: [...log.reverse(), ...state.log].slice(0, 8) };
    }
    const why = policy === "lru" ? `last used at t${victim.lastUsed}` : policy === "lfu" ? `only ${victim.uses} use${victim.uses === 1 ? "" : "s"}` : `expires soonest (t${victim.expiresAt})`;
    log.push({ text: `Evicted ${victim.key} (${why})`, tone: "neutral" });
    cache = cache.filter((e) => e.key !== victim.key);
  }
  cache = [...cache, { key, storedAt: clock, lastUsed: clock, uses: 1, expiresAt: clock + TTL }];
  log.push({ text: `SET ${key}${ttlOn ? ` EX ${TTL}` : ""} → stored`, tone: "neutral" });
  return { clock, cache, hits: state.hits, misses: state.misses + 1, log: [...log.reverse(), ...state.log].slice(0, 8) };
}

export function CacheEvictionLab() {
  const [policy, setPolicy] = useState<Policy>("lru");
  const [ttlOn, setTtlOn] = useState(true);
  const [state, setState] = useState<State>(START);

  const total = state.hits + state.misses;
  const rate = total ? Math.round((state.hits / total) * 100) : 0;

  function choosePolicy(p: Policy) {
    setPolicy(p);
    if (p === "ttl") setTtlOn(true);
    setState(START);
  }

  function playPattern() {
    let s = START;
    for (const k of PATTERN) s = request(s, k, policy, ttlOn);
    setState(s);
  }

  return (
    <Widget title="Cache-aside with eviction" hint={`A shop caches product pages. The cache holds ${CAPACITY} keys. Request products, or play a fixed traffic pattern and compare policies.`}>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(POLICY_LABEL) as Policy[]).map((p) => (
          <Pill key={p} active={policy === p} onClick={() => choosePolicy(p)}>
            {POLICY_LABEL[p]}
          </Pill>
        ))}
        <Pill
          active={ttlOn}
          onClick={() => {
            if (policy === "ttl") return;
            setTtlOn((t) => !t);
            setState(START);
          }}
        >
          TTL {TTL} ticks: {ttlOn ? "on" : "off"}
        </Pill>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {Array.from({ length: CAPACITY }).map((_, i) => {
          const e = state.cache[i];
          return (
            <div key={i} className={`min-h-16 rounded-lg border p-2 text-[0.72rem] ${e ? "border-accent bg-accent-soft" : "border-dashed border-border"}`}>
              {e ? (
                <>
                  <p className="font-mono font-semibold break-all">{e.key}</p>
                  <p className="text-muted">used t{e.lastUsed} · {e.uses}×</p>
                  {ttlOn && <p className="text-muted">expires t{e.expiresAt}</p>}
                </>
              ) : (
                <p className="text-muted">empty slot</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {KEYS.map((k) => (
          <button key={k} type="button" onClick={() => setState((s) => request(s, k, policy, ttlOn))} className="min-h-10 rounded-lg border border-border px-3 font-mono text-[0.75rem] hover:bg-surface-2">
            GET {k}
          </button>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={playPattern} className="min-h-10 flex-1 rounded-lg bg-accent px-3 text-sm font-medium text-white dark:text-bg">
          Play traffic pattern
        </button>
        <button type="button" onClick={() => setState(START)} className="min-h-10 rounded-lg border border-border px-3 text-sm">
          Reset
        </button>
      </div>
      <p className="mt-2 text-xs text-muted break-words">Pattern: {PATTERN.map((k) => k.split(":")[1]).join(" ")} (product:1 is the hot item)</p>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-lg bg-good-soft p-2"><p className="text-xs text-muted">Hits</p><p className="font-mono">{state.hits}</p></div>
        <div className="rounded-lg bg-warn-soft p-2"><p className="text-xs text-muted">Misses</p><p className="font-mono">{state.misses}</p></div>
        <div className="rounded-lg bg-surface-2 p-2"><p className="text-xs text-muted">Hit rate</p><p className="font-mono">{rate}%</p></div>
      </div>

      <ol className="mt-3 space-y-1">
        {state.log.map((l, i) => (
          <li
            key={`${state.clock}-${i}`}
            className={`rounded px-2 py-1 font-mono text-[0.72rem] break-all ${l.tone === "good" ? "bg-good-soft" : l.tone === "warn" ? "bg-warn-soft" : l.tone === "bad" ? "bg-bad-soft" : "bg-surface-2"}`}
          >
            {l.text}
          </li>
        ))}
      </ol>
    </Widget>
  );
}

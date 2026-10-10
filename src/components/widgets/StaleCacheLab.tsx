"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Strategy = "ttlOnly" | "invalidate" | "writeThrough";
type Log = { text: string; tone: "good" | "warn" | "bad" | "neutral" };

const LABEL: Record<Strategy, string> = {
  ttlOnly: "Cache-aside, TTL only",
  invalidate: "Cache-aside + delete on write",
  writeThrough: "Write-through",
};

const TTL_MIN = 60;

type State = {
  minute: number;
  db: number;
  cache: { price: number; expiresAt: number } | null;
  dbReads: number;
  cacheWrites: number;
  staleServed: number;
  log: Log[];
};

const START: State = { minute: 0, db: 1299, cache: null, dbReads: 0, cacheWrites: 0, staleServed: 0, log: [] };

function push(s: State, ...entries: Log[]): Log[] {
  return [...entries.reverse(), ...s.log].slice(0, 7);
}

export function StaleCacheLab() {
  const [strategy, setStrategy] = useState<Strategy>("ttlOnly");
  const [s, setS] = useState<State>(START);

  const cacheLive = s.cache && s.cache.expiresAt > s.minute ? s.cache : null;
  const stale = cacheLive !== null && cacheLive.price !== s.db;

  function read() {
    setS((s) => {
      const live = s.cache && s.cache.expiresAt > s.minute ? s.cache : null;
      if (live) {
        const isStale = live.price !== s.db;
        return {
          ...s,
          staleServed: s.staleServed + (isStale ? 1 : 0),
          log: push(s, { text: `GET /products/7 → cache HIT, price $${live.price}${isStale ? `  (database says $${s.db}: STALE)` : ""}`, tone: isStale ? "bad" : "good" }),
        };
      }
      return {
        ...s,
        cache: { price: s.db, expiresAt: s.minute + TTL_MIN },
        dbReads: s.dbReads + 1,
        cacheWrites: s.cacheWrites + 1,
        log: push(s, { text: `GET /products/7 → MISS, read DB ($${s.db}), SET with TTL ${TTL_MIN} min`, tone: "warn" }),
      };
    });
  }

  function adminUpdate() {
    setS((s) => {
      const price = s.db === 1299 ? 999 : s.db - 100;
      const base = { ...s, db: price };
      if (strategy === "ttlOnly") {
        return { ...base, log: push(s, { text: `PATCH price → $${price} in DB only. The cache still holds the old value.`, tone: "neutral" }) };
      }
      if (strategy === "invalidate") {
        return { ...base, cache: null, log: push(s, { text: `PATCH price → $${price} in DB, then DEL product:7 from cache`, tone: "neutral" }) };
      }
      return {
        ...base,
        cache: { price, expiresAt: s.minute + TTL_MIN },
        cacheWrites: s.cacheWrites + 1,
        log: push(s, { text: `PATCH price → $${price} in DB and SET product:7 in cache (same request)`, tone: "neutral" }),
      };
    });
  }

  function wait() {
    setS((s) => ({ ...s, minute: s.minute + 30, log: push(s, { text: "30 minutes pass", tone: "neutral" }) }));
  }

  return (
    <Widget title="Stale cache" hint="Read the product, change its price as an admin, then read again. Try each strategy.">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(LABEL) as Strategy[]).map((k) => (
          <Pill key={k} active={strategy === k} onClick={() => { setStrategy(k); setS(START); }}>
            {LABEL[k]}
          </Pill>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
        <div className="rounded-lg bg-surface-2 p-2">
          <p className="text-xs text-muted">Database</p>
          <p className="font-mono">${s.db}</p>
        </div>
        <div className={`rounded-lg p-2 ${stale ? "bg-bad-soft" : cacheLive ? "bg-good-soft" : "bg-surface-2"}`}>
          <p className="text-xs text-muted">Cache</p>
          <p className="font-mono">{cacheLive ? `$${cacheLive.price}` : "empty"}</p>
          {cacheLive && <p className="text-[0.7rem] text-muted">{cacheLive.expiresAt - s.minute} min left</p>}
        </div>
        <div className="rounded-lg bg-surface-2 p-2">
          <p className="text-xs text-muted">Clock</p>
          <p className="font-mono">{s.minute} min</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <button type="button" onClick={read} className="min-h-10 rounded-lg bg-accent px-3 text-sm font-medium text-white dark:text-bg">
          Shopper reads price
        </button>
        <button type="button" onClick={adminUpdate} className="min-h-10 rounded-lg border border-border px-3 text-sm">
          Admin changes price
        </button>
        <button type="button" onClick={wait} className="min-h-10 rounded-lg border border-border px-3 text-sm">
          Wait 30 min
        </button>
      </div>

      <p className="mt-2 text-xs text-muted">
        DB reads: {s.dbReads} · cache writes: {s.cacheWrites} · stale responses served: <span className={s.staleServed ? "font-semibold text-bad" : ""}>{s.staleServed}</span>
      </p>
      <button type="button" onClick={() => setS(START)} className="mt-2 min-h-10 rounded-lg border border-border px-3 text-sm">
        Reset
      </button>

      <ol className="mt-3 space-y-1">
        {s.log.map((l, i) => (
          <li
            key={`${s.log.length}-${i}-${l.text}`}
            className={`rounded px-2 py-1 font-mono text-[0.72rem] break-all ${l.tone === "good" ? "bg-good-soft" : l.tone === "warn" ? "bg-warn-soft" : l.tone === "bad" ? "bg-bad-soft" : "bg-surface-2"}`}
          >
            {l.text}
          </li>
        ))}
      </ol>
    </Widget>
  );
}

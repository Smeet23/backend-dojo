"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

/**
 * A deterministic model of a cache stampede.
 * Scenario: 4 app servers, a burst of readers right after expiry, a 200 ms DB load.
 * "Many keys" mode shows 1,000 keys written together and when they expire.
 */

const SERVERS = 4;
const READS_DURING_LOAD = 400; // requests that arrive while the first load is still running
const KEYS = 1000;
const BASE_TTL = 60; // minutes
const JITTER = 10; // minutes

type Mode = "hot" | "bulk";
type Coalesce = "none" | "single" | "lock";

/** Deterministic pseudo-random so the chart is the same every render. */
function rand(i: number) {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function hotKeyQueries(c: Coalesce) {
  if (c === "none") return READS_DURING_LOAD;
  if (c === "single") return SERVERS;
  return 1;
}

function bulkHistogram(jitter: boolean) {
  // Expirations per minute, minutes 60..70
  const buckets = Array.from({ length: JITTER + 1 }, () => 0);
  for (let i = 0; i < KEYS; i++) {
    const extra = jitter ? Math.floor(rand(i + 1) * JITTER) : 0;
    buckets[extra] += 1;
  }
  return buckets;
}

export function HldStampedeSim() {
  const [mode, setMode] = useState<Mode>("hot");
  const [coalesce, setCoalesce] = useState<Coalesce>("none");
  const [jitter, setJitter] = useState(false);

  const queries = hotKeyQueries(coalesce);
  const hist = bulkHistogram(jitter);
  const peak = Math.max(...hist);
  const DB_LIMIT = 200; // queries per minute bucket the DB handles comfortably (illustrative)

  return (
    <Widget title="Cache stampede simulator" hint="Pick a scenario, then switch the fixes on and watch database load.">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="w-20 text-muted">Scenario</span>
        <Pill active={mode === "hot"} onClick={() => setMode("hot")}>One hot key expires</Pill>
        <Pill active={mode === "bulk"} onClick={() => setMode("bulk")}>1,000 keys written together</Pill>
      </div>

      {mode === "hot" ? (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="w-20 text-muted">Fix</span>
            <Pill active={coalesce === "none"} onClick={() => setCoalesce("none")}>None</Pill>
            <Pill active={coalesce === "single"} onClick={() => setCoalesce("single")}>Single-flight (per server)</Pill>
            <Pill active={coalesce === "lock"} onClick={() => setCoalesce("lock")}>Distributed lock</Pill>
          </div>
          <p className="mt-3 text-sm text-muted">
            product:42 expires. The DB load takes 200 ms, and {READS_DURING_LOAD} reads arrive across {SERVERS} app servers in that window.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-4">
            {Array.from({ length: SERVERS }, (_, s) => {
              const perServer = coalesce === "none" ? READS_DURING_LOAD / SERVERS : coalesce === "single" ? 1 : s === 0 ? 1 : 0;
              return (
                <div key={s} className="min-w-0 rounded-lg border border-border bg-surface-2 p-2 text-sm">
                  <p className="font-semibold">App server {s + 1}</p>
                  <p className="text-muted">{READS_DURING_LOAD / SERVERS} misses</p>
                  <p className={perServer > 1 ? "text-bad" : "text-good"}>
                    {perServer} DB {perServer === 1 ? "query" : "queries"}
                  </p>
                  {coalesce === "lock" && <p className="text-xs text-muted">{s === 0 ? "won the lock" : "waits, re-reads cache"}</p>}
                </div>
              );
            })}
          </div>
          <div
            className={`mt-3 rounded-lg px-3 py-2 text-sm ${queries > 50 ? "bg-bad-soft" : queries > 1 ? "bg-warn-soft" : "bg-good-soft"}`}
          >
            <p className="font-semibold">Database receives {queries} identical {queries === 1 ? "query" : "queries"}</p>
            <p className="mt-1">
              {coalesce === "none" && "Every miss recomputes the same value. The DB slows, the window widens, and more requests pile in."}
              {coalesce === "single" && "Each server coalesces its own misses into one load. Huge win, but every server still loads once."}
              {coalesce === "lock" && "One request in the whole fleet loads; the rest wait briefly and then hit the fresh cache."}
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="w-20 text-muted">TTL</span>
            <Pill active={!jitter} onClick={() => setJitter(false)}>Fixed 60 min</Pill>
            <Pill active={jitter} onClick={() => setJitter(true)}>60 min + random 0 to 10</Pill>
          </div>
          <p className="mt-3 text-sm text-muted">A warm-up job writes {KEYS} keys at once. Expirations per minute, an hour later:</p>
          <div className="mt-3 flex h-40 items-end gap-1">
            {hist.map((n, i) => (
              <div key={i} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
                <span className="text-[0.65rem] text-muted">{n}</span>
                <div
                  className={`w-full rounded-t ${n > DB_LIMIT ? "bg-bad" : "bg-good"}`}
                  style={{ height: `${Math.max(2, (n / KEYS) * 120)}px` }}
                />
                <span className="text-[0.65rem] text-muted">{BASE_TTL + i}</span>
              </div>
            ))}
          </div>
          <div className={`mt-3 rounded-lg px-3 py-2 text-sm ${peak > DB_LIMIT ? "bg-bad-soft" : "bg-good-soft"}`}>
            <p className="font-semibold">Peak: {peak} misses in one minute</p>
            <p className="mt-1">
              {jitter
                ? "Jitter spreads the same expirations over ten minutes. The database barely notices."
                : "Every key was written together with the same TTL, so they all die together. The warm-up job scheduled a stampede."}
            </p>
          </div>
        </>
      )}
    </Widget>
  );
}

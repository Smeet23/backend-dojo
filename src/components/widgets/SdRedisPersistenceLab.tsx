"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Mode = "none" | "rdb" | "aof-always" | "aof-everysec" | "aof-no" | "hybrid";

const MODES: { id: Mode; label: string }[] = [
  { id: "none", label: "No persistence" },
  { id: "rdb", label: "RDB snapshots" },
  { id: "aof-always", label: "AOF always" },
  { id: "aof-everysec", label: "AOF everysec" },
  { id: "aof-no", label: "AOF no" },
  { id: "hybrid", label: "RDB + AOF" },
];

const TOTAL = 60;
/** With appendfsync no, assume the OS flushes dirty pages roughly every 30 s. */
const OS_FLUSH = 30;
/** In hybrid mode, the AOF is rewritten (compacted into an RDB base) this often. */
const REWRITE_EVERY = 20;

type Outcome = {
  /** Last second whose write survived the crash (0 = nothing survived). */
  durableUpTo: number;
  restart: string;
  cost: string;
};

function outcome(mode: Mode, crashAt: number, rdbEvery: number): Outcome {
  // One write lands every second. The crash happens just after second `crashAt` wrote,
  // before any background flush scheduled for that same second ran.
  const lastMultiple = (n: number) => Math.floor((crashAt - 1) / n) * n;
  switch (mode) {
    case "none":
      return { durableUpTo: 0, restart: "Starts empty. Every key is gone.", cost: "Zero disk work, zero recovery." };
    case "rdb": {
      const snap = lastMultiple(rdbEvery);
      return {
        durableUpTo: snap,
        restart: snap ? `Loads dump.rdb taken at t=${snap}s. A compact binary file, so it loads fast.` : "No snapshot was taken yet. Starts empty.",
        cost: `A fork every ${rdbEvery}s. Copy-on-write can push memory up to ~2x under heavy writes.`,
      };
    }
    case "aof-always":
      return {
        durableUpTo: crashAt,
        restart: `Replays all ${crashAt} logged writes from appendonly.aof.`,
        cost: "An fsync before every reply. The slowest option: disk latency is on every write.",
      };
    case "aof-everysec":
      return {
        durableUpTo: crashAt - 1,
        restart: `Replays ${crashAt - 1} writes. The last second was still in the OS buffer.`,
        cost: "One background fsync per second. The usual production choice.",
      };
    case "aof-no": {
      const flushed = lastMultiple(OS_FLUSH);
      return {
        durableUpTo: flushed,
        restart: flushed ? `Replays ${flushed} writes the OS happened to flush.` : "The OS had not flushed anything yet. Starts empty.",
        cost: `Redis never calls fsync; the kernel flushes when it likes (here every ~${OS_FLUSH}s).`,
      };
    }
    case "hybrid": {
      const base = lastMultiple(REWRITE_EVERY);
      return {
        durableUpTo: crashAt - 1,
        restart: base
          ? `Loads the RDB base from t=${base}s, then replays only ${crashAt - 1 - base} logged writes.`
          : `No rewrite yet, so replays ${crashAt - 1} logged writes.`,
        cost: `AOF everysec, with the log compacted into an RDB base every ${REWRITE_EVERY}s.`,
      };
    }
  }
}

export function SdRedisPersistenceLab() {
  const [mode, setMode] = useState<Mode>("rdb");
  const [rdbEvery, setRdbEvery] = useState(15);
  const [crashAt, setCrashAt] = useState(42);

  const o = outcome(mode, crashAt, rdbEvery);
  const lost = crashAt - o.durableUpTo;

  return (
    <Widget title="Crash a Redis node" hint="One write arrives every second. Pick a persistence mode, pick when the power goes out, and see what survives the restart.">
      <div className="flex flex-wrap gap-2">
        {MODES.map((m) => (
          <Pill key={m.id} active={mode === m.id} onClick={() => setMode(m.id)}>
            {m.label}
          </Pill>
        ))}
      </div>

      {mode === "rdb" && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">Snapshot every</span>
          {[5, 15, 30].map((n) => (
            <Pill key={n} active={rdbEvery === n} onClick={() => setRdbEvery(n)}>
              {n}s
            </Pill>
          ))}
        </div>
      )}

      <label className="mt-4 block text-sm">
        <span className="text-muted">Crash at </span>
        <span className="font-mono font-semibold">t = {crashAt}s</span>
        <input
          type="range"
          min={1}
          max={TOTAL}
          value={crashAt}
          onChange={(e) => setCrashAt(Number(e.target.value))}
          className="mt-1 block min-h-10 w-full accent-accent"
        />
      </label>

      <div className="mt-2 grid grid-cols-12 gap-0.5 sm:grid-cols-[repeat(30,minmax(0,1fr))]">
        {Array.from({ length: TOTAL }).map((_, i) => {
          const t = i + 1;
          const tone = t > crashAt ? "bg-surface-2" : t <= o.durableUpTo ? "bg-good" : "bg-bad";
          return <div key={t} title={`write at t=${t}s`} className={`h-4 min-w-0 rounded-sm ${tone}`} />;
        })}
      </div>
      <p className="mt-1 flex flex-wrap gap-x-4 text-xs text-muted">
        <span>green = recovered</span>
        <span>red = lost</span>
        <span>grey = never happened</span>
      </p>

      <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
        <div className={`min-w-0 rounded-lg p-2 ${lost === 0 ? "bg-good-soft" : lost <= 1 ? "bg-warn-soft" : "bg-bad-soft"}`}>
          <p className="text-xs text-muted">Writes lost</p>
          <p className="font-mono text-lg">{lost}</p>
        </div>
        <div className="min-w-0 rounded-lg bg-surface-2 p-2 sm:col-span-2">
          <p className="text-xs text-muted">On restart</p>
          <p>{o.restart}</p>
        </div>
      </div>
      <p className="mt-2 rounded-lg border border-border p-2 text-sm">
        <span className="font-semibold">Cost while running: </span>
        {o.cost}
      </p>
    </Widget>
  );
}

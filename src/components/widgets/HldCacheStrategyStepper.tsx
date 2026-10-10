"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Strategy = "cache-aside" | "read-through" | "write-through" | "write-back" | "write-around";
type Tone = "good" | "warn" | "bad" | "neutral";
type Step = { actor: string; text: string; tone: Tone };
type Op = { title: string; steps: Step[] };
type State = { cache: number | null; dirty: boolean; db: number; dbReads: number; dbWrites: number; lost: number; log: Op[] };

const STRATEGIES: { id: Strategy; label: string; note: string }[] = [
  { id: "cache-aside", label: "Cache-aside", note: "App checks the cache, loads from the DB on a miss, and deletes the key after writing the DB." },
  { id: "read-through", label: "Read-through", note: "Cache runs the loader on a miss. Writes here go to the DB and invalidate the key." },
  { id: "write-through", label: "Write-through", note: "Writes go to the cache, which synchronously writes the DB before acking." },
  { id: "write-back", label: "Write-back", note: "Writes are acked by the cache and flushed to the DB later." },
  { id: "write-around", label: "Write-around", note: "Writes go straight to the DB and skip the cache; reads fill it later." },
];

const INITIAL: State = { cache: null, dirty: false, db: 10, dbReads: 0, dbWrites: 0, lost: 0, log: [] };
const TONE: Record<Tone, string> = { good: "bg-good-soft", warn: "bg-warn-soft", bad: "bg-bad-soft", neutral: "bg-surface-2" };

function read(s: State, strategy: Strategy): State {
  const steps: Step[] = [];
  const cacheLoads = strategy === "read-through" || strategy === "write-through" || strategy === "write-back";
  const loader = cacheLoads ? "Cache" : "App";
  steps.push({ actor: "App", text: cacheLoads ? "GET price from the cache (the only thing the app talks to)." : "GET price from the cache.", tone: "neutral" });
  if (s.cache !== null) {
    steps.push({ actor: "Cache", text: `Hit → ${s.cache}${s.dirty ? " (dirty: newer than the DB)" : ""}. No DB query.`, tone: "good" });
    return { ...s, log: [{ title: "Read", steps }, ...s.log] };
  }
  steps.push({ actor: "Cache", text: "Miss.", tone: "warn" });
  steps.push({ actor: loader, text: `SELECT price FROM products → ${s.db}`, tone: "neutral" });
  steps.push({ actor: loader, text: `SET price ${s.db} EX 300 in the cache, then return ${s.db}.`, tone: "neutral" });
  return { ...s, cache: s.db, dirty: false, dbReads: s.dbReads + 1, log: [{ title: "Read (miss)", steps }, ...s.log] };
}

function write(s: State, strategy: Strategy): State {
  const v = Math.max(s.db, s.cache ?? 0) + 1;
  const steps: Step[] = [];
  let next: State = s;
  switch (strategy) {
    case "cache-aside":
    case "read-through":
    case "write-around":
      steps.push({ actor: "App", text: `UPDATE products SET price = ${v} (DB first).`, tone: "neutral" });
      steps.push({ actor: "App", text: s.cache !== null ? "DEL price from the cache, so the next read reloads it." : "DEL price (nothing cached, harmless).", tone: "neutral" });
      steps.push({ actor: "App", text: "Ack. The next read will be a miss.", tone: strategy === "write-around" ? "good" : "neutral" });
      next = { ...s, db: v, cache: null, dirty: false, dbWrites: s.dbWrites + 1 };
      break;
    case "write-through":
      steps.push({ actor: "App", text: `SET price ${v} in the cache.`, tone: "neutral" });
      steps.push({ actor: "Cache", text: `Synchronously UPDATE the DB to ${v}.`, tone: "neutral" });
      steps.push({ actor: "Cache", text: "Ack after both writes. Cache and DB agree; the next read is a hit.", tone: "good" });
      next = { ...s, db: v, cache: v, dirty: false, dbWrites: s.dbWrites + 1 };
      break;
    case "write-back":
      steps.push({ actor: "App", text: `SET price ${v} in the cache.`, tone: "neutral" });
      steps.push({ actor: "Cache", text: "Ack immediately and mark the entry dirty. The DB is not touched yet.", tone: "warn" });
      next = { ...s, cache: v, dirty: true };
      break;
  }
  return { ...next, log: [{ title: `Write price = ${v}`, steps }, ...s.log] };
}

function flush(s: State): State {
  if (!s.dirty || s.cache === null) {
    return { ...s, log: [{ title: "Flush", steps: [{ actor: "Cache", text: "Nothing dirty to flush.", tone: "neutral" }] }, ...s.log] };
  }
  const steps: Step[] = [{ actor: "Cache", text: `Background flush: UPDATE the DB to ${s.cache}. Several writes since the last flush collapse into this one.`, tone: "good" }];
  return { ...s, db: s.cache, dirty: false, dbWrites: s.dbWrites + 1, log: [{ title: "Flush dirty entries", steps }, ...s.log] };
}

function crash(s: State): State {
  const steps: Step[] = [];
  if (s.dirty) {
    steps.push({ actor: "Cache", text: `Node crashes holding unflushed price = ${s.cache}. The DB still says ${s.db}. That acknowledged write is gone.`, tone: "bad" });
  } else {
    steps.push({ actor: "Cache", text: "Node crashes. Nothing was dirty, so nothing is lost; the next read just misses and reloads.", tone: "good" });
  }
  return { ...s, cache: null, dirty: false, lost: s.lost + (s.dirty ? 1 : 0), log: [{ title: "Cache node crashes", steps }, ...s.log] };
}

function otherService(s: State): State {
  const stale = s.dirty && s.cache !== null;
  const steps: Step[] = [
    { actor: "Reports", text: `A reporting job reads the DB directly → ${s.db}${stale ? ` while the cache says ${s.cache}. The DB is behind.` : "."}`, tone: stale ? "warn" : "neutral" },
  ];
  return { ...s, dbReads: s.dbReads + 1, log: [{ title: "Another service reads the DB", steps }, ...s.log] };
}

export function HldCacheStrategyStepper() {
  const [strategy, setStrategy] = useState<Strategy>("cache-aside");
  const [s, setS] = useState<State>(INITIAL);
  const info = STRATEGIES.find((x) => x.id === strategy)!;

  const btn = "min-h-10 rounded-lg border border-border px-3 text-sm hover:bg-surface-2 disabled:opacity-50";

  return (
    <Widget title="Read and write paths per strategy" hint="Pick a strategy, then read, write, flush and crash the cache node. Watch where each step goes and what the DB holds.">
      <div className="flex flex-wrap gap-2">
        {STRATEGIES.map((x) => (
          <Pill key={x.id} active={strategy === x.id} onClick={() => { setStrategy(x.id); setS(INITIAL); }}>
            {x.label}
          </Pill>
        ))}
      </div>
      <p className="mt-2 text-sm text-muted">{info.note}</p>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <div className="min-w-0 rounded-lg border border-border p-2">
          <p className="text-xs text-muted">Cache: price</p>
          <p className="font-mono">{s.cache === null ? "(empty)" : s.cache}{s.dirty && <span className="ml-1 text-warn">dirty</span>}</p>
        </div>
        <div className="min-w-0 rounded-lg border border-border p-2">
          <p className="text-xs text-muted">DB: price</p>
          <p className="font-mono">{s.db}</p>
        </div>
        <div className="min-w-0 rounded-lg border border-border p-2">
          <p className="text-xs text-muted">DB reads / writes</p>
          <p className="font-mono">{s.dbReads} / {s.dbWrites}</p>
        </div>
        <div className={`min-w-0 rounded-lg border border-border p-2 ${s.lost ? "bg-bad-soft" : ""}`}>
          <p className="text-xs text-muted">Lost writes</p>
          <p className="font-mono">{s.lost}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className={btn} onClick={() => setS(read(s, strategy))}>Read price</button>
        <button type="button" className={btn} onClick={() => setS(write(s, strategy))}>Write new price</button>
        <button type="button" className={btn} disabled={strategy !== "write-back"} onClick={() => setS(flush(s))}>Flush</button>
        <button type="button" className={btn} onClick={() => setS(otherService(s))}>Other service reads DB</button>
        <button type="button" className={btn} onClick={() => setS(crash(s))}>Crash cache node</button>
        <button type="button" className={btn} onClick={() => setS(INITIAL)}>Reset</button>
      </div>

      <ol className="mt-3 space-y-2">
        {s.log.length === 0 && <li className="text-sm text-muted">No operations yet. Start with a read.</li>}
        {s.log.slice(0, 6).map((op, i) => (
          <li key={s.log.length - i} className="rounded-lg border border-border p-2">
            <p className="text-xs font-semibold text-accent">{op.title}</p>
            <ul className="mt-1 space-y-1">
              {op.steps.map((st, j) => (
                <li key={j} className={`rounded px-2 py-1 text-[0.8rem] ${TONE[st.tone]}`}>
                  <span className="font-medium">{st.actor}:</span> {st.text}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </Widget>
  );
}

"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Strategy = "hash" | "range" | "directory";
type State = {
  users: number[];
  shards: number;
  /** Directory strategy only: user id → shard. */
  directory: Record<number, number>;
  note: { text: string; tone: "good" | "warn" | "bad" | "neutral" } | null;
};

const RANGE_SIZE = 10;
const START_USERS = 24;
const BATCH = 8;
const HOT_WINDOW = 8; // the newest signups are the most active
const MAX_SHARDS = 6;

const LABEL: Record<Strategy, string> = { hash: "Hash (id mod N)", range: "Range", directory: "Directory" };

function rangeShard(id: number, shards: number) {
  return Math.min(Math.floor((id - 1) / RANGE_SIZE), shards - 1);
}

function shardOf(s: State, strategy: Strategy, id: number) {
  if (strategy === "hash") return id % s.shards;
  if (strategy === "range") return rangeShard(id, s.shards);
  return s.directory[id] ?? 0;
}

function leastLoaded(dir: Record<number, number>, shards: number) {
  const counts = Array.from({ length: shards }, () => 0);
  for (const v of Object.values(dir)) counts[v]++;
  return counts.indexOf(Math.min(...counts));
}

function initial(): State {
  const users = Array.from({ length: START_USERS }, (_, i) => i + 1);
  const directory: Record<number, number> = {};
  for (const id of users) directory[id] = leastLoaded(directory, 3);
  return { users, shards: 3, directory, note: null };
}

function rangeLabel(i: number, shards: number) {
  const lo = i * RANGE_SIZE + 1;
  return i === shards - 1 ? `ids ${lo}+` : `ids ${lo}–${lo + RANGE_SIZE - 1}`;
}

export function SdShardRouter() {
  const [strategy, setStrategy] = useState<Strategy>("hash");
  const [s, setS] = useState<State>(initial);
  const [directoryDown, setDirectoryDown] = useState(false);
  const [lookup, setLookup] = useState<number | null>(null);

  const hot = new Set(s.users.slice(-HOT_WINDOW));
  const perShard = Array.from({ length: s.shards }, (_, i) => s.users.filter((u) => shardOf(s, strategy, u) === i));

  function signups() {
    setS((st) => {
      const max = st.users[st.users.length - 1] ?? 0;
      const added = Array.from({ length: BATCH }, (_, i) => max + i + 1);
      const directory = { ...st.directory };
      for (const id of added) directory[id] = leastLoaded(directory, st.shards);
      return { ...st, users: [...st.users, ...added], directory, note: { text: `${BATCH} new users signed up (ids ${added[0]}–${added[added.length - 1]}). New users are the most active.`, tone: "neutral" } };
    });
    setLookup(null);
  }

  function addShard() {
    setS((st) => {
      if (st.shards >= MAX_SHARDS) return st;
      const next = { ...st, shards: st.shards + 1 };
      const moved = st.users.filter((u) => shardOf(st, strategy, u) !== shardOf(next, strategy, u)).length;
      const pct = Math.round((moved / st.users.length) * 100);
      const tone = pct > 50 ? "bad" : pct > 0 ? "warn" : "good";
      const why =
        strategy === "hash"
          ? "The modulus changed, so most ids map somewhere new."
          : strategy === "range"
            ? "Only the open-ended last range was split."
            : "Existing entries stay put; new users can be placed on the new shard.";
      return { ...next, note: { text: `Added shard ${st.shards}: ${moved} of ${st.users.length} users must move (${pct}%). ${why}`, tone } };
    });
    setLookup(null);
  }

  function choose(st: Strategy) {
    setStrategy(st);
    setS(initial());
    setDirectoryDown(false);
    setLookup(null);
  }

  const lookupId = s.users[Math.floor(s.users.length / 2)];

  return (
    <Widget title="Where does this row live?" hint="Pick a strategy, sign up users and add shards. Highlighted users are the newest, most active ones.">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(LABEL) as Strategy[]).map((k) => (
          <Pill key={k} active={strategy === k} onClick={() => choose(k)}>{LABEL[k]}</Pill>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {perShard.map((ids, i) => {
          const hotCount = ids.filter((u) => hot.has(u)).length;
          return (
            <div key={i} className={`min-w-0 rounded-lg border p-2 ${hotCount >= HOT_WINDOW * 0.75 ? "border-bad bg-bad-soft" : "border-border bg-surface-2"}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-1">
                <p className="text-xs font-semibold">Shard {i}</p>
                <p className="text-[0.7rem] text-muted">
                  {strategy === "range" ? rangeLabel(i, s.shards) : `${ids.length} users`} · {hotCount} hot
                </p>
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {ids.map((u) => (
                  <span
                    key={u}
                    className={`rounded px-1 font-mono text-[0.68rem] ${lookup === u ? "bg-accent text-white dark:text-bg" : hot.has(u) ? "bg-warn-soft" : "bg-surface"}`}
                  >
                    {u}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={signups} className="min-h-10 flex-1 rounded-lg bg-accent px-3 text-sm font-medium text-white dark:text-bg">
          +{BATCH} signups
        </button>
        <button type="button" onClick={addShard} disabled={s.shards >= MAX_SHARDS} className="min-h-10 flex-1 rounded-lg border border-border px-3 text-sm disabled:opacity-50">
          Add a shard
        </button>
        <button type="button" onClick={() => choose(strategy)} className="min-h-10 rounded-lg border border-border px-3 text-sm">
          Reset
        </button>
      </div>

      {strategy === "directory" && (
        <div className="mt-3 rounded-lg border border-border p-2 text-sm">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setLookup(directoryDown ? null : lookupId)} className="min-h-10 rounded-lg border border-border px-3 text-sm hover:bg-surface-2">
              GET /users/{lookupId}
            </button>
            <Pill active={directoryDown} onClick={() => { setDirectoryDown((d) => !d); setLookup(null); }}>
              {directoryDown ? "Directory: DOWN" : "Directory: up"}
            </Pill>
          </div>
          <p className={`mt-2 rounded p-2 text-xs ${directoryDown ? "bg-bad-soft" : "bg-surface-2"}`}>
            {directoryDown
              ? "Every query starts with a directory lookup. With it down, no shard can be found, even though all shards are healthy."
              : lookup
                ? `Step 1: directory says user ${lookup} → shard ${s.directory[lookup]}. Step 2: query shard ${s.directory[lookup]}. One extra hop per query.`
                : "Try a lookup, then take the directory down."}
          </p>
        </div>
      )}

      {s.note && (
        <p className={`mt-3 rounded-lg p-2 text-sm ${s.note.tone === "good" ? "bg-good-soft" : s.note.tone === "warn" ? "bg-warn-soft" : s.note.tone === "bad" ? "bg-bad-soft" : "bg-surface-2"}`}>
          {s.note.text}
        </p>
      )}
    </Widget>
  );
}

"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

const ALL = ["S1", "S2", "S3", "S4", "S5", "S6"];
const CLIENTS = Array.from({ length: 24 }, (_, i) => `user-${101 + i}`);
const VNODES = 40;

function fnv(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // Final avalanche so similar strings spread around the ring.
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  return h >>> 0;
}

function modulo(servers: string[]) {
  return Object.fromEntries(CLIENTS.map((c) => [c, servers[fnv(c) % servers.length]]));
}

function ring(servers: string[]) {
  const points = servers
    .flatMap((s) => Array.from({ length: VNODES }, (_, v) => ({ s, h: fnv(`${s}#${v}`) })))
    .sort((a, b) => a.h - b.h);
  return Object.fromEntries(
    CLIENTS.map((c) => {
      const h = fnv(c);
      const p = points.find((x) => x.h >= h) ?? points[0];
      return [c, p.s];
    }),
  );
}

export function HldHashRemap() {
  const [before, setBefore] = useState(4);
  const [after, setAfter] = useState(3);
  const b = ALL.slice(0, before);
  const a = ALL.slice(0, after);

  const mb = modulo(b), ma = modulo(a), rb = ring(b), ra = ring(a);
  const res = CLIENTS.map((c) => ({ c, modMoved: mb[c] !== ma[c], ringMoved: rb[c] !== ra[c], mod: ma[c], ring: ra[c] }));

  const modMoved = res.filter((r) => r.modMoved).length;
  const ringMoved = res.filter((r) => r.ringMoved).length;

  return (
    <Widget
      title="hash % N vs consistent hashing"
      hint="24 users are pinned to servers by hashing their id. Change the pool size and count how many users land on a different server (each move is a cold cache or a lost in-memory session)."
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted">Before</span>
        {[3, 4, 5].map((n) => (
          <Pill key={n} active={before === n} onClick={() => setBefore(n)}>{n} servers</Pill>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted">After</span>
        {[3, 4, 5, 6].map((n) => (
          <Pill key={n} active={after === n} onClick={() => setAfter(n)}>{n} servers</Pill>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-center">
        <div className={`min-w-0 rounded-lg p-2 ${modMoved > 8 ? "bg-bad-soft" : "bg-surface-2"}`}>
          <p className="text-xs text-muted">hash(id) % N moved</p>
          <p className="font-mono text-lg">{modMoved} / {CLIENTS.length}</p>
        </div>
        <div className="min-w-0 rounded-lg bg-good-soft p-2">
          <p className="text-xs text-muted">Consistent hash moved</p>
          <p className="font-mono text-lg">{ringMoved} / {CLIENTS.length}</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-1 sm:grid-cols-3">
        {res.map((r) => (
          <div key={r.c} className="min-w-0 rounded border border-border px-2 py-1 font-mono text-[0.68rem]">
            <p className="truncate font-semibold">{r.c}</p>
            <p className={r.modMoved ? "text-bad" : "text-muted"}>mod → {r.mod}{r.modMoved ? " (moved)" : ""}</p>
            <p className={r.ringMoved ? "text-warn" : "text-muted"}>ring → {r.ring}{r.ringMoved ? " (moved)" : ""}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm text-muted">
        {before === after
          ? "Same pool, nothing moves. Pick a different size."
          : `With modulo, changing N reshuffles most users. With a ring, only the users whose arc changed hands move: about ${Math.round((Math.abs(after - before) / Math.max(after, before)) * 100)}% in theory.`}
      </p>
    </Widget>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Pill, Widget } from "./Widget";

const ALL_NODES = ["A", "B", "C", "D", "E", "F"];
const KEY_COUNT = 120;
const KEYS = Array.from({ length: KEY_COUNT }, (_, i) => `user:${1000 + i}`);
const VNODES_ON = 64;
const SPACE = 2 ** 32;

/** FNV-1a plus a murmur-style finaliser, so similar strings land far apart. */
function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

type Point = { pos: number; node: string; label: string };

function buildRing(nodes: string[], vnodes: number): Point[] {
  const pts: Point[] = [];
  for (const n of nodes) {
    for (let v = 0; v < vnodes; v++) {
      const label = vnodes === 1 ? n : `${n}#${v}`;
      pts.push({ pos: hash32(`node-${label}`), node: n, label });
    }
  }
  return pts.sort((a, b) => a.pos - b.pos);
}

/** Walk clockwise from the key's position to the first node point (binary search). */
function ownerOf(h: number, ring: Point[]): string {
  let lo = 0;
  let hi = ring.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (ring[mid].pos < h) lo = mid + 1;
    else hi = mid;
  }
  return ring[lo === ring.length ? 0 : lo].node;
}

function assignRing(nodes: string[], vnodes: number): string[] {
  const ring = buildRing(nodes, vnodes);
  return KEYS.map((k) => ownerOf(hash32(k), ring));
}

function assignMod(nodes: string[]): string[] {
  return KEYS.map((k) => nodes[hash32(k) % nodes.length]);
}

type Change = { text: string; moved: Set<number>; ringMoved: number; modMoved: number };

export function SdHashRing() {
  const [active, setActive] = useState<string[]>(["A", "B", "C", "D"]);
  const [vnodesOn, setVnodesOn] = useState(false);
  const [change, setChange] = useState<Change | null>(null);

  const vnodes = vnodesOn ? VNODES_ON : 1;
  const ring = useMemo(() => buildRing(active, vnodes), [active, vnodes]);
  const owners = useMemo(() => assignRing(active, vnodes), [active, vnodes]);

  // Share of the ring each server owns: the arc from its predecessor point up to each of its points.
  const share: Record<string, number> = {};
  ring.forEach((pt, i) => {
    const prev = i ? ring[i - 1].pos : ring[ring.length - 1].pos - SPACE;
    share[pt.node] = (share[pt.node] ?? 0) + (pt.pos - prev) / SPACE;
  });
  const counts = active.map((n) => ({ node: n, share: share[n] ?? 0, count: owners.filter((o) => o === n).length }));
  const ideal = 1 / active.length;
  const maxShare = Math.max(...counts.map((c) => c.share));

  function toggleNode(n: string) {
    const isOn = active.includes(n);
    if (isOn && active.length <= 2) return;
    const next = isOn ? active.filter((x) => x !== n) : ALL_NODES.filter((x) => x === n || active.includes(x));
    const before = assignRing(active, vnodes);
    const after = assignRing(next, vnodes);
    const moved = new Set<number>();
    before.forEach((o, i) => {
      if (o !== after[i]) moved.add(i);
    });
    const modBefore = assignMod(active);
    const modAfter = assignMod(next);
    const modMoved = modBefore.filter((o, i) => o !== modAfter[i]).length;
    const others = new Set<string>();
    moved.forEach((i) => others.add(isOn ? after[i] : before[i]));
    const peers = [...others].sort().join(", ");
    const text = isOn
      ? `Removed ${n}: its ${moved.size} keys went to ${peers || "nobody"}.`
      : `Added ${n}: it took ${moved.size} keys, from ${peers || "nobody"}.`;
    setActive(next);
    setChange({ text, moved, ringMoved: moved.size, modMoved });
  }

  function toggleVnodes() {
    setVnodesOn((v) => !v);
    setChange(null);
  }

  const C = 130;
  const R = 108;
  const angle = (pos: number) => (pos / SPACE) * 2 * Math.PI - Math.PI / 2;
  const at = (pos: number, r: number) => ({ x: C + r * Math.cos(angle(pos)), y: C + r * Math.sin(angle(pos)) });

  return (
    <Widget
      title="Consistent-hash ring"
      hint={`${KEY_COUNT} user keys on a 32-bit ring. Add or remove servers and watch which keys move (highlighted). Then turn on virtual nodes and compare the balance and the spread of moved keys.`}
    >
      <div className="flex flex-wrap gap-2">
        {ALL_NODES.map((n) => (
          <Pill key={n} active={active.includes(n)} onClick={() => toggleNode(n)}>
            Server {n}
          </Pill>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Pill active={vnodesOn} onClick={toggleVnodes}>
          Virtual nodes: {vnodesOn ? `on (${VNODES_ON} per server)` : "off (1 per server)"}
        </Pill>
      </div>

      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div className="min-w-0">
          <svg viewBox="0 0 260 260" className="mx-auto h-auto w-full max-w-xs" role="img" aria-label="Hash ring with server points and key dots">
            <circle cx={C} cy={C} r={R} fill="none" className="stroke-border" strokeWidth={2} />
            {KEYS.map((k, i) => {
              const p = at(hash32(k), R - 14);
              const moved = change?.moved.has(i);
              return <circle key={k} cx={p.x} cy={p.y} r={moved ? 3 : 2} className={moved ? "fill-warn" : "fill-muted"} />;
            })}
            {ring.map((pt) => {
              const p = at(pt.pos, R);
              const l = at(pt.pos, R + 13);
              return (
                <g key={pt.label}>
                  <circle cx={p.x} cy={p.y} r={vnodesOn ? 2.5 : 6} className="fill-accent" />
                  {!vnodesOn && (
                    <text x={l.x} y={l.y + 4} textAnchor="middle" fontSize={11} className="fill-text">
                      {pt.node}
                    </text>
                  )}
                </g>
              );
            })}
            <text x={C} y={C - 4} textAnchor="middle" fontSize={10} className="fill-muted">
              0 at top, clockwise
            </text>
            <text x={C} y={C + 10} textAnchor="middle" fontSize={10} className="fill-muted">
              {ring.length} points on ring
            </text>
          </svg>
        </div>

        <div className="min-w-0 space-y-2">
          <p className="text-xs text-muted">Share of the ring per server (fair share is {Math.round(ideal * 100)}%)</p>
          {counts.map((c) => (
            <div key={c.node} className="flex items-center gap-2 text-sm">
              <span className="w-6 font-mono">{c.node}</span>
              <div className="h-4 min-w-0 flex-1 rounded bg-surface-2">
                <div
                  className={`h-4 rounded ${c.share > ideal * 1.5 ? "bg-bad" : c.share < ideal * 0.5 ? "bg-warn" : "bg-accent"}`}
                  style={{ width: `${(c.share / Math.max(maxShare, ideal)) * 100}%` }}
                />
              </div>
              <span className="w-20 text-right font-mono text-xs">
                {Math.round(c.share * 100)}% · {c.count}
              </span>
            </div>
          ))}
          <p className="text-xs text-muted">
            Busiest server owns {(maxShare / ideal).toFixed(2)}× its fair share. The second number is how many of the {KEY_COUNT} sample keys it holds.
          </p>
        </div>
      </div>

      {change ? (
        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div className="min-w-0 rounded-lg bg-good-soft p-2">
            <p className="text-xs text-muted">Consistent hashing</p>
            <p className="font-mono">
              {change.ringMoved} / {KEY_COUNT} keys moved ({Math.round((change.ringMoved / KEY_COUNT) * 100)}%)
            </p>
            <p className="mt-1 text-xs break-words">{change.text}</p>
          </div>
          <div className="min-w-0 rounded-lg bg-bad-soft p-2">
            <p className="text-xs text-muted">Same change with hash(key) mod N</p>
            <p className="font-mono">
              {change.modMoved} / {KEY_COUNT} keys moved ({Math.round((change.modMoved / KEY_COUNT) * 100)}%)
            </p>
          </div>
        </div>
      ) : (
        <p className="mt-3 rounded-lg bg-surface-2 p-2 text-sm text-muted">Toggle a server to see how many keys have to move.</p>
      )}
    </Widget>
  );
}

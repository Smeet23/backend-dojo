"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Cell = { q: number; r: number };
type Driver = Cell & { id: number; busy: boolean };

const R = 4;
const SIZE = 14;
const SQRT3 = Math.sqrt(3);

const CELLS: Cell[] = [];
for (let q = -R; q <= R; q++) {
  for (let r = -R; r <= R; r++) if (Math.abs(q + r) <= R) CELLS.push({ q, r });
}

const START_DRIVERS: Driver[] = [
  { id: 101, q: 2, r: -1, busy: false },
  { id: 102, q: -2, r: 2, busy: false },
  { id: 103, q: 1, r: 0, busy: true },
  { id: 104, q: 0, r: -1, busy: true },
  { id: 105, q: -3, r: 0, busy: false },
  { id: 106, q: 3, r: 1, busy: false },
  { id: 107, q: -1, r: -2, busy: false },
  { id: 108, q: 0, r: 3, busy: false },
  { id: 109, q: 4, r: -4, busy: false },
  { id: 110, q: -4, r: 1, busy: true },
];

const dist = (a: Cell, b: Cell) => (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - b.q - b.r)) / 2;
const center = (c: Cell) => ({ x: SIZE * SQRT3 * (c.q + c.r / 2), y: SIZE * 1.5 * c.r });
const corners = (c: Cell) => {
  const { x, y } = center(c);
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i - 30);
    return `${(x + SIZE * Math.cos(a)).toFixed(1)},${(y + SIZE * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
};
const cellsInRing = (k: number) => (k === 0 ? 1 : 3 * k * (k + 1) + 1);

export function SdHexDispatchMap() {
  const [rider, setRider] = useState<Cell>({ q: 0, r: 0 });
  const [drivers, setDrivers] = useState<Driver[]>(START_DRIVERS);
  const [k, setK] = useState(0);
  const [mode, setMode] = useState<"rider" | "driver">("rider");

  const inRange = (c: Cell) => dist(c, rider) <= k;
  const found = drivers.filter((d) => !d.busy && inRange(d)).sort((a, b) => dist(a, rider) - dist(b, rider) || a.id - b.id);
  const best = found[0];
  const skippedBusy = drivers.filter((d) => d.busy && inRange(d)).length;

  function tap(c: Cell) {
    if (mode === "rider") {
      setRider(c);
      return;
    }
    setDrivers((ds) => ds.map((d) => (d.q === c.q && d.r === c.r ? { ...d, busy: !d.busy } : d)));
  }

  function autoExpand() {
    for (let kk = 0; kk <= 2 * R; kk++) {
      if (drivers.some((d) => !d.busy && dist(d, rider) <= kk)) {
        setK(kk);
        return;
      }
    }
    setK(2 * R);
  }

  const half = SIZE * SQRT3 * (R + 0.5) + 2;
  const halfY = SIZE * (1.5 * R + 1) + 2;

  return (
    <Widget title="k-ring driver search" hint="Each hexagon is one cell of the geo index. The rider's cell is looked up first, then rings of neighbours. Tap the map to move the rider, or switch modes and tap a driver to flip them busy/free.">
      <div className="flex flex-wrap gap-2">
        <Pill active={mode === "rider"} onClick={() => setMode("rider")}>Tap moves rider</Pill>
        <Pill active={mode === "driver"} onClick={() => setMode("driver")}>Tap toggles driver</Pill>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">k =</span>
        {[0, 1, 2, 3, 4].map((n) => (
          <Pill key={n} active={k === n} onClick={() => setK(n)}>{n}</Pill>
        ))}
        <button type="button" onClick={autoExpand} className="min-h-10 rounded-lg bg-accent px-3 text-sm font-medium text-white dark:text-bg">
          Expand until found
        </button>
      </div>

      <svg viewBox={`${-half} ${-halfY} ${half * 2} ${halfY * 2}`} className="mx-auto mt-3 block w-full max-w-sm" role="img" aria-label="Hexagonal grid with rider and drivers">
        {CELLS.map((c) => {
          const isRider = c.q === rider.q && c.r === rider.r;
          const searched = inRange(c);
          return (
            <polygon
              key={`${c.q},${c.r}`}
              points={corners(c)}
              onClick={() => tap(c)}
              className={`cursor-pointer stroke-border ${isRider ? "fill-accent-soft" : searched ? "fill-warn-soft" : "fill-surface"}`}
              strokeWidth={1}
            />
          );
        })}
        {drivers.map((d) => {
          const { x, y } = center(d);
          const chosen = best?.id === d.id;
          return (
            <g key={d.id} onClick={() => tap(d)} className="cursor-pointer">
              <circle cx={x} cy={y} r={7.5} className={d.busy ? "fill-bad" : chosen ? "fill-good" : "fill-muted"} />
              <text x={x} y={y + 2.5} textAnchor="middle" fontSize={6.5} className="fill-bg font-mono">{d.id % 100}</text>
            </g>
          );
        })}
        {(() => {
          const { x, y } = center(rider);
          return (
            <text x={x} y={y - 8} textAnchor="middle" fontSize={8} className="pointer-events-none fill-accent font-semibold">rider</text>
          );
        })()}
      </svg>
      <p className="mt-1 flex flex-wrap justify-center gap-x-4 text-xs text-muted">
        <span>grey = free</span>
        <span>red = on a trip</span>
        <span>green = best match</span>
      </p>

      <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
        <div className="min-w-0 rounded-lg bg-surface-2 p-2">
          <p className="text-xs text-muted">Cells queried</p>
          <p className="font-mono text-lg">{cellsInRing(k)}</p>
        </div>
        <div className="min-w-0 rounded-lg bg-surface-2 p-2">
          <p className="text-xs text-muted">Free drivers found</p>
          <p className="font-mono text-lg">{found.length}</p>
        </div>
        <div className={`min-w-0 rounded-lg p-2 ${best ? "bg-good-soft" : "bg-warn-soft"}`}>
          <p className="text-xs text-muted">Offer goes to</p>
          <p className="font-mono text-lg">{best ? `driver ${best.id}` : "nobody yet"}</p>
        </div>
      </div>
      <p className="mt-2 text-sm text-muted">
        {best
          ? `Driver ${best.id} is ${dist(best, rider)} ring${dist(best, rider) === 1 ? "" : "s"} away.${skippedBusy ? ` ${skippedBusy} busy driver${skippedBusy > 1 ? "s were" : " was"} skipped.` : ""} A real dispatcher would rank the candidates by road ETA, not ring distance.`
          : `No free driver within k=${k}${skippedBusy ? ` (${skippedBusy} busy driver${skippedBusy > 1 ? "s" : ""} skipped)` : ""}. Widen the ring.`}
      </p>
    </Widget>
  );
}

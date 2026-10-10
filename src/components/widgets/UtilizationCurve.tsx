"use client";

import { useState } from "react";
import { Widget } from "./Widget";

const SERVICE_MS = 50;
const MAX_U = 98;
const Y_CAP = 2000;

/** Simple single-queue model: average time in system = service / (1 - utilization). */
function responseMs(u: number) {
  return SERVICE_MS / (1 - u / 100);
}

function zone(u: number) {
  if (u < 60) return { label: "Smooth", text: "Requests rarely find a queue. Latency is close to the raw processing time.", tone: "bg-good-soft" };
  if (u < 80) return { label: "Busy but healthy", text: "Short queues form now and then. This is where well-run production systems like to sit.", tone: "bg-good-soft" };
  if (u < 90) return { label: "Slowing down", text: "Queues are common. Small bursts noticeably stretch latency.", tone: "bg-warn-soft" };
  return { label: "On the cliff", text: "Every extra request waits behind a long line. A small burst tips you into timeouts.", tone: "bg-bad-soft" };
}

export function UtilizationCurve() {
  const [u, setU] = useState(50);
  const [burst, setBurst] = useState(false);
  const effective = Math.min(MAX_U, burst ? u + 20 : u);
  const latency = responseMs(effective);
  const z = zone(effective);

  // Curve geometry in a 300 x 150 viewBox.
  const W = 300;
  const H = 150;
  const x = (val: number) => (val / 100) * W;
  const y = (ms: number) => H - (Math.min(ms, Y_CAP) / Y_CAP) * H;
  const points: string[] = [];
  for (let i = 0; i <= MAX_U; i++) points.push(`${x(i).toFixed(1)},${y(responseMs(i)).toFixed(1)}`);

  return (
    <Widget title="Utilization vs latency" hint="Each request needs 50 ms of work. Drag utilization up and watch the waiting time, not the work time, explode.">
      <svg viewBox={`0 0 ${W} ${H + 18}`} className="h-auto w-full" role="img" aria-label="Latency curve rising sharply near 100% utilization">
        <rect x={x(80)} y={0} width={x(100) - x(80)} height={H} className="fill-warn-soft" />
        <line x1={0} y1={H} x2={W} y2={H} className="stroke-border" strokeWidth={1} />
        <polyline points={points.join(" ")} fill="none" className="stroke-accent" strokeWidth={2.5} />
        <circle cx={x(effective)} cy={y(latency)} r={5} className="fill-accent" />
        <text x={2} y={H + 14} className="fill-muted" fontSize={10}>0%</text>
        <text x={x(80) - 8} y={H + 14} className="fill-muted" fontSize={10}>80%</text>
        <text x={W - 28} y={H + 14} className="fill-muted" fontSize={10}>100%</text>
      </svg>

      <label className="mt-3 block text-sm">
        <span className="font-semibold">Steady utilization: {u}%</span>
        <input
          type="range"
          min={0}
          max={MAX_U}
          value={u}
          onChange={(e) => setU(Number(e.target.value))}
          className="mt-1 block min-h-10 w-full accent-accent"
        />
      </label>
      <button
        type="button"
        onClick={() => setBurst((b) => !b)}
        aria-pressed={burst}
        className={`mt-1 min-h-10 w-full rounded-lg border px-3 text-sm font-medium ${burst ? "border-accent bg-accent text-white dark:text-bg" : "border-border"}`}
      >
        {burst ? "Burst on: +20% traffic (tap to end)" : "Simulate a traffic burst (+20%)"}
      </button>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
        <div className="rounded-lg bg-surface-2 p-2">
          <p className="text-xs text-muted">Utilization now</p>
          <p className="font-mono text-base">{effective}%</p>
        </div>
        <div className="rounded-lg bg-surface-2 p-2">
          <p className="text-xs text-muted">Avg response time</p>
          <p className="font-mono text-base">{Math.round(latency)} ms</p>
        </div>
        <div className="col-span-2 rounded-lg bg-surface-2 p-2 sm:col-span-1">
          <p className="text-xs text-muted">Of which is queueing</p>
          <p className="font-mono text-base">{Math.round(latency - SERVICE_MS)} ms</p>
        </div>
      </div>
      <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${z.tone}`}>
        <span className="font-semibold">{z.label}.</span> {z.text}
      </p>
    </Widget>
  );
}

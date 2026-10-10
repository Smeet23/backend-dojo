"use client";

import { useMemo, useState } from "react";
import { Pill, Widget } from "./Widget";

type Mode = "sync" | "concurrent" | "parallel";
type Workload = "io" | "cpu";
type Phase = { kind: "cpu" | "io"; ms: number };
type Cell = "cpu" | "io" | "wait";
type Segment = { kind: Cell; start: number; len: number };

const MODES: { id: Mode; label: string; cores: number; blocking: boolean; note: string }[] = [
  { id: "sync", label: "One at a time (1 core)", cores: 1, blocking: true, note: "Each request holds the CPU even while it waits for the database." },
  { id: "concurrent", label: "Concurrent (1 core)", cores: 1, blocking: false, note: "A request gives up the CPU while it waits, so another can run." },
  { id: "parallel", label: "Concurrent + parallel (2 cores)", cores: 2, blocking: false, note: "Two requests can run CPU work at the same instant." },
];

const WORKLOADS: Record<Workload, { label: string; phases: Phase[] }> = {
  io: { label: "IO-bound (typical API)", phases: [{ kind: "cpu", ms: 5 }, { kind: "io", ms: 40 }, { kind: "cpu", ms: 5 }] },
  cpu: { label: "CPU-bound (hashing, resizing)", phases: [{ kind: "cpu", ms: 40 }, { kind: "io", ms: 5 }, { kind: "cpu", ms: 5 }] },
};

const HEAVY: Phase[] = [{ kind: "cpu", ms: 80 }];

type Task = { name: string; phases: Phase[] };

function simulate(tasks: Task[], cores: number, blocking: boolean) {
  const n = tasks.length;
  const phase = Array<number>(n).fill(0);
  const left = tasks.map((t) => t.phases[0].ms);
  const status: ("ready" | "running" | "io" | "done")[] = Array(n).fill("ready");
  const readySince = Array<number>(n).fill(0);
  const core: (number | null)[] = Array(n).fill(null);
  const cells: Cell[][] = tasks.map(() => []);
  let t = 0;

  while (status.some((s) => s !== "done") && t < 2000) {
    // Hand free cores to ready tasks, oldest first.
    const busy = new Set(core.filter((c): c is number => c !== null));
    const queue = [...Array(n).keys()].filter((i) => status[i] === "ready").sort((a, b) => readySince[a] - readySince[b] || a - b);
    for (let c = 0; c < cores; c++) {
      if (busy.has(c)) continue;
      const next = queue.shift();
      if (next === undefined) break;
      status[next] = "running";
      core[next] = c;
      busy.add(c);
    }

    for (let i = 0; i < n; i++) {
      if (status[i] === "running") cells[i][t] = "cpu";
      else if (status[i] === "io") cells[i][t] = "io";
      else if (status[i] === "ready") cells[i][t] = "wait";
    }

    for (let i = 0; i < n; i++) {
      if (status[i] !== "running" && status[i] !== "io") continue;
      left[i]--;
      if (left[i] > 0) continue;
      phase[i]++;
      const next = tasks[i].phases[phase[i]];
      if (!next) {
        status[i] = "done";
        core[i] = null;
      } else if (next.kind === "io") {
        status[i] = "io";
        left[i] = next.ms;
        if (!blocking) core[i] = null;
      } else {
        left[i] = next.ms;
        if (blocking && core[i] !== null) status[i] = "running";
        else {
          status[i] = "ready";
          readySince[i] = t + 1;
        }
      }
    }
    t++;
  }

  const segments: Segment[][] = cells.map((row) => {
    const segs: Segment[] = [];
    row.forEach((kind, i) => {
      if (kind === undefined) return;
      const last = segs[segs.length - 1];
      if (last && last.kind === kind && last.start + last.len === i) last.len++;
      else segs.push({ kind, start: i, len: 1 });
    });
    return segs;
  });
  const cpuMs = cells.flat().filter((c) => c === "cpu").length;
  const finish = cells.map((row) => row.length);
  return { total: t, segments, finish, busyPct: Math.round((cpuMs / (t * cores)) * 100) };
}

const COLOR: Record<Cell, string> = {
  cpu: "bg-accent",
  io: "bg-surface-2 border border-dashed border-border",
  wait: "bg-warn-soft",
};

export function ConcurrencyTimeline() {
  const [mode, setMode] = useState<Mode>("concurrent");
  const [workload, setWorkload] = useState<Workload>("io");
  const [heavy, setHeavy] = useState(false);

  const tasks: Task[] = useMemo(() => {
    const base = ["A", "B", "C"].map((name) => ({ name: `Request ${name}`, phases: WORKLOADS[workload].phases }));
    if (heavy) base.splice(1, 0, { name: "Image resize", phases: HEAVY });
    return base;
  }, [workload, heavy]);

  const results = useMemo(
    () => Object.fromEntries(MODES.map((m) => [m.id, simulate(tasks, m.cores, m.blocking)])) as Record<Mode, ReturnType<typeof simulate>>,
    [tasks],
  );
  const scale = Math.max(...Object.values(results).map((r) => r.total));
  const current = results[mode];
  const modeInfo = MODES.find((m) => m.id === mode)!;

  return (
    <Widget title="Concurrency timeline" hint="Three requests arrive at the same moment. Switch the execution model and the kind of work, and compare when each one finishes.">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Execution model</p>
      <div className="mt-1 flex flex-wrap gap-2">
        {MODES.map((m) => (
          <Pill key={m.id} active={mode === m.id} onClick={() => setMode(m.id)}>{m.label}</Pill>
        ))}
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted">Each request is</p>
      <div className="mt-1 flex flex-wrap gap-2">
        {(Object.keys(WORKLOADS) as Workload[]).map((w) => (
          <Pill key={w} active={workload === w} onClick={() => setWorkload(w)}>{WORKLOADS[w].label}</Pill>
        ))}
        <Pill active={heavy} onClick={() => setHeavy((v) => !v)}>+ 80 ms CPU task</Pill>
      </div>
      <p className="mt-2 text-xs text-muted">{modeInfo.note}</p>

      <div className="mt-4 space-y-3">
        {tasks.map((task, i) => (
          <div key={task.name}>
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-semibold">{task.name}</span>
              <span className="font-mono text-muted">done at {current.finish[i]} ms</span>
            </div>
            <div className="relative mt-1 h-5 w-full rounded bg-surface">
              {current.segments[i].map((s) => (
                <div
                  key={s.start}
                  className={`absolute top-0 h-5 rounded-sm ${COLOR[s.kind]}`}
                  style={{ left: `${(s.start / scale) * 100}%`, width: `${(s.len / scale) * 100}%` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-sm bg-accent" /> on the CPU</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-sm border border-dashed border-border bg-surface-2" /> waiting for IO</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-sm bg-warn-soft" /> ready, waiting for a CPU</span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
        {MODES.map((m) => (
          <div key={m.id} className={`rounded-lg p-2 ${m.id === mode ? "bg-accent-soft" : "bg-surface-2"}`}>
            <p className="text-[0.7rem] leading-tight text-muted">{m.label}</p>
            <p className="font-mono">{results[m.id].total} ms</p>
            <p className="text-[0.7rem] text-muted">CPU busy {results[m.id].busyPct}%</p>
          </div>
        ))}
      </div>
    </Widget>
  );
}

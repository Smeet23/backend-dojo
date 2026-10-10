"use client";

import { useMemo, useState } from "react";
import { Pill, Widget } from "./Widget";

type Strategy = "recreate" | "rolling" | "blue-green" | "canary";
type Pod = { v: 1 | 2; state: "ready" | "starting" | "stopping"; group?: "blue" | "green" };
type Phase = { label: string; pods: Pod[]; v1: number; v2: number; down: number; note: string };

const STRATEGIES: { id: Strategy; label: string }[] = [
  { id: "recreate", label: "Recreate" },
  { id: "rolling", label: "Rolling" },
  { id: "blue-green", label: "Blue-green" },
  { id: "canary", label: "Canary" },
];

const BUG_RATE = 0.3;
const BASELINE_PODS = 4;

const pods = (n: number, v: 1 | 2, state: Pod["state"] = "ready", group?: Pod["group"]): Pod[] =>
  Array.from({ length: n }, () => ({ v, state, group }));

/** The phases a deploy of v2 goes through for each strategy. */
export function deployPhases(strategy: Strategy, buggy: boolean): Phase[] {
  const start: Phase = { label: "Before the deploy", pods: pods(4, 1), v1: 100, v2: 0, down: 0, note: "Four v1 pods behind the load balancer." };
  switch (strategy) {
    case "recreate":
      return [
        start,
        { label: "Stop everything", pods: pods(4, 1, "stopping"), v1: 0, v2: 0, down: 100, note: "All v1 pods terminate. Nothing can answer requests." },
        { label: "Start v2", pods: pods(4, 2, "starting"), v1: 0, v2: 0, down: 100, note: "v2 pods boot. Users still get errors until they're ready." },
        {
          label: "v2 live",
          pods: pods(4, 2),
          v1: 0,
          v2: 100,
          down: 0,
          note: buggy ? "The bug hits every user at once, and rolling back means another downtime gap." : "Simple, but users saw a gap of errors.",
        },
      ];
    case "rolling": {
      const out: Phase[] = [start, { label: "Surge one v2 pod", pods: [...pods(4, 1), ...pods(1, 2, "starting")], v1: 100, v2: 0, down: 0, note: "maxSurge allows one extra pod. It gets no traffic until its readiness probe passes." }];
      for (let n = 1; n <= 4; n++) {
        out.push({
          label: `${n} of 4 replaced`,
          pods: [...pods(4 - n, 1), ...pods(n, 2)],
          v1: (4 - n) * 25,
          v2: n * 25,
          down: 0,
          note: n < 4 ? "Ready v2 pod joins, one v1 pod leaves. Both versions serve real traffic now." : "Done. The old ReplicaSet is kept at 0 replicas for rollback.",
        });
      }
      if (buggy) out.push({ label: "Rollout undo", pods: pods(4, 1), v1: 100, v2: 0, down: 0, note: "The bug didn't fail the readiness probe, so it reached 100% first. Undo scales the old ReplicaSet back up." });
      return out;
    }
    case "blue-green": {
      const blue = (state: Pod["state"] = "ready") => pods(4, 1, state, "blue");
      const out: Phase[] = [
        { ...start, pods: blue(), note: "Blue (v1) is live." },
        { label: "Build green", pods: [...blue(), ...pods(4, 2, "starting", "green")], v1: 100, v2: 0, down: 0, note: "A full second environment boots with v2. No user traffic yet, double the cost." },
        { label: "Test green", pods: [...blue(), ...pods(4, 2, "ready", "green")], v1: 100, v2: 0, down: 0, note: "Smoke tests hit green directly while users stay on blue." },
        { label: "Switch router", pods: [...blue(), ...pods(4, 2, "ready", "green")], v1: 0, v2: 100, down: 0, note: "All traffic flips at once. Only one version is live at any moment." },
      ];
      out.push(
        buggy
          ? { label: "Switch back", pods: [...blue(), ...pods(4, 2, "ready", "green")], v1: 100, v2: 0, down: 0, note: "Errors spike, so flip the router back to blue. Rollback takes seconds." }
          : { label: "Retire blue", pods: [...blue("stopping"), ...pods(4, 2, "ready", "green")], v1: 0, v2: 100, down: 0, note: "After a safe window, blue is scaled down (or kept as the next deploy's target)." },
      );
      return out;
    }
    case "canary": {
      const out: Phase[] = [start, { label: "Canary at 10%", pods: [...pods(4, 1), ...pods(1, 2)], v1: 90, v2: 10, down: 0, note: "One v2 pod gets 10% of traffic. Compare its error rate and latency with v1." }];
      if (buggy) {
        out.push({ label: "Abort", pods: pods(4, 1), v1: 100, v2: 0, down: 0, note: "Canary errors are far above v1's. Traffic goes back to v1; only 10% of users were ever exposed." });
        return out;
      }
      out.push(
        { label: "Widen to 50%", pods: [...pods(2, 1), ...pods(3, 2)], v1: 50, v2: 50, down: 0, note: "Metrics look healthy, so the share grows." },
        { label: "100%", pods: pods(4, 2), v1: 0, v2: 100, down: 0, note: "Full rollout. Automating these steps with metric checks is progressive delivery." },
      );
      return out;
    }
  }
}

function podClass(p: Pod) {
  const base = "flex h-10 w-10 items-center justify-center rounded-md border text-xs font-semibold";
  const color = p.v === 1 ? "border-border bg-surface-2" : "border-accent bg-accent-soft text-accent";
  const state = p.state === "starting" ? "border-dashed opacity-60" : p.state === "stopping" ? "line-through opacity-40" : "";
  return `${base} ${color} ${state}`;
}

export function DeployStrategySim() {
  const [strategy, setStrategy] = useState<Strategy>("rolling");
  const [buggy, setBuggy] = useState(false);
  const [step, setStep] = useState(0);

  const phases = useMemo(() => deployPhases(strategy, buggy), [strategy, buggy]);
  const current = Math.min(step, phases.length - 1);
  const phase = phases[current];
  const errors = Math.round(phase.down + (buggy ? phase.v2 * BUG_RATE : 0));
  const running = phase.pods.filter((p) => p.state !== "stopping").length;
  const mixed = phase.v1 > 0 && phase.v2 > 0;
  const finished = current >= phases.length - 1;

  const pick = (s: Strategy) => { setStrategy(s); setStep(0); };

  return (
    <Widget title="Deployment strategy comparator" hint="Ship v2 of the notes API with each strategy. Then make v2 buggy (30% of its requests fail) and compare the damage.">
      <div className="flex flex-wrap gap-2">
        {STRATEGIES.map((s) => <Pill key={s.id} active={strategy === s.id} onClick={() => pick(s.id)}>{s.label}</Pill>)}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Pill active={!buggy} onClick={() => { setBuggy(false); setStep(0); }}>v2 is fine</Pill>
        <Pill active={buggy} onClick={() => { setBuggy(true); setStep(0); }}>v2 has a bug</Pill>
      </div>

      <div className="mt-4 rounded-lg border border-border p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Phase {current + 1}/{phases.length} · {phase.label}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {phase.pods.map((p, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <span className={podClass(p)}>v{p.v}</span>
              {p.group && <span className="text-[0.65rem] text-muted">{p.group}</span>}
            </div>
          ))}
        </div>
        <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-surface-2" aria-label="Traffic split">
          <div className="bg-muted" style={{ width: `${phase.v1}%` }} />
          <div className="bg-accent" style={{ width: `${phase.v2}%` }} />
          <div className="bg-bad" style={{ width: `${phase.down}%` }} />
        </div>
        <p className="mt-1 text-xs text-muted">Traffic: v1 {phase.v1}% · v2 {phase.v2}%{phase.down > 0 && ` · nobody home ${phase.down}%`}</p>
        <p className="mt-2 text-sm">{phase.note}</p>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
        <div className={`rounded-lg px-3 py-2 ${errors > 0 ? "bg-bad-soft" : "bg-good-soft"}`}>
          <p className="text-xs text-muted">Requests failing</p>
          <p className="font-mono">{errors}%</p>
        </div>
        <div className={`rounded-lg px-3 py-2 ${mixed ? "bg-warn-soft" : "bg-surface-2"}`}>
          <p className="text-xs text-muted">Versions serving</p>
          <p className="font-mono">{mixed ? "v1 + v2 mixed" : phase.v2 > 0 ? "v2 only" : phase.v1 > 0 ? "v1 only" : "none"}</p>
        </div>
        <div className={`rounded-lg px-3 py-2 ${running > BASELINE_PODS + 1 ? "bg-warn-soft" : "bg-surface-2"}`}>
          <p className="text-xs text-muted">Pods running</p>
          <p className="font-mono">{running} (normal: {BASELINE_PODS})</p>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => setStep(0)} className="min-h-10 rounded-lg border border-border px-4 text-sm">Restart</button>
        <button
          type="button"
          onClick={() => setStep(current + 1)}
          disabled={finished}
          className="min-h-10 flex-1 rounded-lg bg-accent px-4 text-sm font-medium text-white disabled:opacity-40 dark:text-bg"
        >
          {finished ? "Done" : "Next phase"}
        </button>
      </div>
    </Widget>
  );
}

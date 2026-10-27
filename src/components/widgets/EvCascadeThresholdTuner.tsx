"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

// 30 labeled dev examples: the proxy's confidence in its own label, and whether
// that label matched the oracle. Higher confidence is usually, not always, right.
const DATA: { c: number; ok: boolean }[] = [
  [0.52, false], [0.55, false], [0.58, true], [0.61, false], [0.63, true], [0.66, true],
  [0.68, false], [0.71, true], [0.73, true], [0.75, false], [0.77, true], [0.79, true],
  [0.81, true], [0.83, false], [0.85, true], [0.86, true], [0.88, true], [0.89, true],
  [0.9, true], [0.91, false], [0.92, true], [0.93, true], [0.94, true], [0.95, true],
  [0.96, true], [0.97, true], [0.97, true], [0.98, true], [0.99, true], [0.99, true],
].map(([c, ok]) => ({ c: c as number, ok: ok as boolean }));

const N = DATA.length;
const TARGETS = [0.85, 0.9, 0.95, 1];
const RATIOS = [10, 25, 50];

function simulate(t: number) {
  const kept = DATA.filter((d) => d.c >= t);
  const wrong = kept.filter((d) => !d.ok).length;
  const escalated = N - kept.length;
  // Escalated items get the oracle's answer, which matches the oracle by definition.
  return { kept: kept.length, wrong, escalated, acc: (N - wrong) / N };
}

const pct = (x: number) => `${Math.round(x * 1000) / 10}%`;

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className={`rounded-lg border border-border p-2 text-center ${tone}`}>
      <p className="text-xs text-muted">{label}</p>
      <p className="font-mono text-lg font-semibold">{value}</p>
    </div>
  );
}

export function EvCascadeThresholdTuner() {
  const [t, setT] = useState(0.8);
  const [target, setTarget] = useState(0.95);
  const [ratio, setRatio] = useState(25);

  const s = simulate(t);
  const share = s.kept / N;
  // Every query pays for the proxy; escalated ones also pay for the oracle.
  const cost = (N * 1 + s.escalated * ratio) / (N * ratio);
  const meets = s.acc >= target - 1e-9;

  const autoTune = () => {
    const candidates = [...new Set(DATA.map((d) => d.c))].sort((a, b) => a - b);
    const best = candidates.find((c) => simulate(c).acc >= target - 1e-9);
    setT(best ?? 1.01);
  };

  return (
    <Widget
      title="Cascade threshold tuner"
      hint="30 dev examples the proxy labeled, sorted by its confidence. Green dots matched the oracle, red ones did not. Slide the threshold: dots left of it are escalated to the oracle."
    >
      <div className="relative mt-2 flex h-10 items-end gap-[2px]">
        {DATA.map((d, i) => {
          const kept = d.c >= t;
          return (
            <div
              key={i}
              title={`confidence ${d.c.toFixed(2)}, ${d.ok ? "matches oracle" : "wrong"}`}
              className={`h-8 min-w-0 flex-1 rounded-sm ${
                kept ? (d.ok ? "bg-good" : "bg-bad") : "bg-surface-2 border border-border"
              }`}
            />
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted">
        <span>0.52 (unsure)</span>
        <span>grey = sent to oracle</span>
        <span>0.99 (sure)</span>
      </div>

      <label className="mt-4 block text-sm">
        <span className="flex justify-between">
          <span>Confidence threshold T</span>
          <span className="font-mono">{t > 1 ? "∞ (always escalate)" : t.toFixed(2)}</span>
        </span>
        <input
          type="range"
          min={0.5}
          max={1.01}
          step={0.01}
          value={t}
          onChange={(e) => setT(Number(e.target.value))}
          className="mt-1 w-full accent-accent"
        />
      </label>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Handled by proxy" value={pct(share)} tone="bg-surface-2" />
        <Stat label="Agreement with oracle" value={pct(s.acc)} tone={meets ? "bg-good-soft" : "bg-bad-soft"} />
        <Stat label="Cost vs oracle only" value={pct(cost)} tone="bg-accent-soft" />
        <Stat label="Wrong answers kept" value={`${s.wrong} of ${N}`} tone="bg-warn-soft" />
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted">Accuracy target:</span>
          {TARGETS.map((x) => (
            <Pill key={x} active={target === x} onClick={() => setTarget(x)}>
              {pct(x)}
            </Pill>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted">Oracle costs:</span>
          {RATIOS.map((r) => (
            <Pill key={r} active={ratio === r} onClick={() => setRatio(r)}>
              {r}x the proxy
            </Pill>
          ))}
        </div>
        <button
          type="button"
          onClick={autoTune}
          className="min-h-9 rounded-lg border border-accent px-3 text-sm text-accent hover:bg-accent-soft"
        >
          Find the lowest T that meets the target
        </button>
      </div>

      <p className={`mt-4 rounded-lg border p-2 text-sm ${meets ? "border-good bg-good-soft" : "border-bad bg-bad-soft"}`}>
        {t > 1
          ? `Everything goes to the oracle. Agreement is 100%, but you pay ${pct(cost)} of oracle-only cost because the proxy still runs first. In a real cascade you would skip the proxy for this class.`
          : meets
            ? `Meets the ${pct(target)} target. The proxy answers ${s.kept} of ${N} queries; ${s.escalated} go to the oracle. Cost is ${pct(cost)} of always using the big model.`
            : `Misses the ${pct(target)} target: ${s.wrong} wrong proxy answers slip through. Raise T to escalate more of the low-confidence ones.`}
      </p>
      <p className="mt-2 text-xs text-muted">
        Agreement assumes escalated queries get the oracle&apos;s answer. Cost counts one proxy call for every query plus an oracle call for each escalation. Proxy alone agrees with the oracle on {pct(simulate(0).acc)} of these examples.
      </p>
    </Widget>
  );
}

"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Inputs = { tpr: number; tnr: number; pObs: number };

const PRESETS: { name: string; note: string; v: Inputs }[] = [
  { name: "Worked example", note: "A slightly harsh judge: it fails 12% of good traces, so the raw rate is too low.", v: { tpr: 0.88, tnr: 0.82, pObs: 0.76 } },
  { name: "Lenient judge", note: "It waves through 30% of real failures, so the raw rate is too high.", v: { tpr: 0.95, tnr: 0.7, pObs: 0.8 } },
  { name: "Clipped", note: "The judge passes more traces than even a perfect pipeline would produce at this TPR. The raw formula exceeds 1 and is clipped.", v: { tpr: 0.9, tnr: 0.85, pObs: 0.95 } },
  { name: "Near random", note: "TPR + TNR - 1 is tiny. Every point of p_obs moves the estimate by many points: the correction is meaningless.", v: { tpr: 0.56, tnr: 0.52, pObs: 0.6 } },
];

const pct = (x: number) => `${Math.round(x * 1000) / 10}%`;
const f2 = (x: number) => x.toFixed(2);

function Slider({ label, value, min, onChange }: { label: string; value: number; min: number; onChange: (v: number) => void }) {
  return (
    <label className="block min-w-0 text-sm">
      <span className="flex justify-between gap-2">
        <span>{label}</span>
        <span className="font-mono">{f2(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={1}
        step={0.01}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-accent"
      />
    </label>
  );
}

function Bar({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-20 shrink-0 text-muted">{label}</span>
      <div className="h-5 min-w-0 flex-1 overflow-hidden rounded bg-surface-2">
        <div className={`h-full ${tone}`} style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
      </div>
      <span className="w-14 shrink-0 text-right font-mono">{pct(value)}</span>
    </div>
  );
}

export function EvJudgeBiasCorrector() {
  const [preset, setPreset] = useState(0);
  const [v, setV] = useState<Inputs>(PRESETS[0].v);
  const set = (k: keyof Inputs) => (x: number) => {
    setPreset(-1);
    setV((s) => ({ ...s, [k]: x }));
  };

  const num = v.pObs + v.tnr - 1;
  const den = v.tpr + v.tnr - 1;
  const raw = den > 0 ? num / den : NaN;
  const theta = Number.isNaN(raw) ? NaN : Math.min(1, Math.max(0, raw));
  const unstable = den < 0.15;
  const clipped = !Number.isNaN(raw) && (raw > 1 || raw < 0);
  const gap = theta - v.pObs;

  // What the judge's "pass" count is made of, if theta were the truth.
  const realPass = v.tpr * theta;
  const fakePass = (1 - v.tnr) * (1 - theta);
  const missed = (1 - v.tpr) * theta;

  return (
    <Widget title="Bias correction calculator" hint="Set the judge's test-set TPR and TNR and the pass rate it reports on new traces. See what the true pass rate most likely is.">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p, i) => (
          <Pill key={p.name} active={preset === i} onClick={() => { setPreset(i); setV(p.v); }}>
            {p.name}
          </Pill>
        ))}
      </div>
      {preset >= 0 && <p className="mt-2 text-sm text-muted">{PRESETS[preset].note}</p>}

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Slider label="TPR (test set)" value={v.tpr} min={0.5} onChange={set("tpr")} />
        <Slider label="TNR (test set)" value={v.tnr} min={0.5} onChange={set("tnr")} />
        <Slider label="p_obs (new traces)" value={v.pObs} min={0} onChange={set("pObs")} />
      </div>

      <div className="mt-4 rounded-lg border border-border bg-surface-2 p-3 font-mono text-[0.78rem] break-words">
        <p>
          θ̂ = (p_obs + TNR - 1) / (TPR + TNR - 1)
        </p>
        <p className="mt-1">
          = ({f2(v.pObs)} + {f2(v.tnr)} - 1) / ({f2(v.tpr)} + {f2(v.tnr)} - 1) = {f2(num)} / {f2(den)}
          {" = "}
          <b>{Number.isNaN(raw) ? "undefined" : raw.toFixed(3)}</b>
          {clipped && <span> → clipped to {f2(theta)}</span>}
        </p>
      </div>

      <div className="mt-4 space-y-2">
        <Bar label="Judge says" value={v.pObs} tone="bg-bad" />
        <Bar label="Corrected" value={Number.isNaN(theta) ? 0 : theta} tone="bg-accent" />
      </div>

      {Number.isNaN(theta) ? (
        <p className="mt-3 rounded-lg border border-bad bg-bad-soft p-2 text-sm">
          TPR + TNR - 1 is zero or negative: the judge is no better than a coin flip, and no correction is possible. Go back and fix the judge.
        </p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border border-border bg-good-soft p-2">
              <p className="text-xs text-muted">Real passes it keeps</p>
              <p className="font-mono text-lg font-semibold">{pct(realPass)}</p>
            </div>
            <div className="rounded-lg border border-border bg-warn-soft p-2">
              <p className="text-xs text-muted">Failures it waves through</p>
              <p className="font-mono text-lg font-semibold">{pct(fakePass)}</p>
            </div>
            <div className="rounded-lg border border-border bg-bad-soft p-2">
              <p className="text-xs text-muted">Good traces it fails</p>
              <p className="font-mono text-lg font-semibold">{pct(missed)}</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted">
            Of all traces, if the corrected rate is right. The first two add up to p_obs
            {clipped ? " only when the estimate is not clipped" : ""}.
          </p>
          <p className={`mt-3 rounded-lg border p-2 text-sm ${unstable ? "border-bad bg-bad-soft" : "border-border bg-surface-2"}`}>
            {unstable
              ? `Denominator ${f2(den)}: a 1-point change in p_obs moves the estimate by about ${Math.round(1 / den)} points. Treat this number as noise.`
              : Math.abs(gap) < 0.005
                ? "Raw and corrected agree: the two kinds of judge error cancel out at this pass rate."
                : `The judge ${gap > 0 ? "under" : "over"}states the pass rate by ${Math.abs(Math.round(gap * 1000) / 10)} points.`}
          </p>
        </>
      )}
    </Widget>
  );
}

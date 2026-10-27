"use client";

import { useMemo, useState } from "react";
import { Pill, Widget } from "./Widget";

const THETA = 0.8; // true pass rate, known only because this is a simulation
const SIZES = [20, 50, 100, 200, 400];
const B = 2000;

type Setup = { n: number; tpr: number; tnr: number };

const PRESETS: { name: string; note: string; s: Setup }[] = [
  { name: "Few labels, good judge", note: "TPR 0.90 and TNR 0.85 but only 20 labels. Step up to 100 and watch the band shrink.", s: { n: 20, tpr: 0.9, tnr: 0.85 } },
  { name: "Bad at success", note: "TNR is perfect, TPR is 0.60. The raw rate is far too low and the interval is wide.", s: { n: 100, tpr: 0.6, tnr: 1 } },
  { name: "Bad at failures", note: "TPR is perfect, TNR is 0.60. The raw rate is too high, but the interval stays fairly tight.", s: { n: 100, tpr: 1, tnr: 0.6 } },
];

/** Small seeded RNG so the server and client render the same simulation. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const correct = (pObs: number, tpr: number, tnr: number) => Math.min(1, Math.max(0, (pObs + tnr - 1) / (tpr + tnr - 1)));

function simulate({ n, tpr, tnr }: Setup, seed: number) {
  const r = rng(seed);
  const half = n / 2;
  // Test set: half human-pass, half human-fail. judge[i] is true when the judge said pass.
  const human = Array.from({ length: n }, (_, i) => i < half);
  const judge = human.map((h) => (h ? r() < tpr : r() >= tnr));
  const rates = (idx: number[]) => {
    let P = 0, tp = 0, F = 0, tn = 0;
    for (const i of idx) {
      if (human[i]) { P++; if (judge[i]) tp++; } else { F++; if (!judge[i]) tn++; }
    }
    return { P, F, tpr: P ? tp / P : 0, tnr: F ? tn / F : 0 };
  };
  // The unlabeled batch is large, so p_obs is the judge's expected pass rate.
  const pObs = tpr * THETA + (1 - tnr) * (1 - THETA);
  const m = rates(human.map((_, i) => i));
  const ok = m.tpr + m.tnr - 1 > 0;
  const theta = ok ? correct(pObs, m.tpr, m.tnr) : NaN;
  const boots: number[] = [];
  for (let b = 0; b < B; b++) {
    const idx = Array.from({ length: n }, () => Math.floor(r() * n));
    const s = rates(idx);
    if (!s.P || !s.F || s.tpr + s.tnr - 1 <= 0) continue;
    boots.push(correct(pObs, s.tpr, s.tnr));
  }
  boots.sort((x, y) => x - y);
  const q = (p: number) => boots[Math.min(boots.length - 1, Math.floor(p * boots.length))];
  return { pObs, mTpr: m.tpr, mTnr: m.tnr, theta, lo: boots.length ? q(0.025) : NaN, hi: boots.length ? q(0.975) : NaN };
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

export function EvJudgeBootstrapLab() {
  const [preset, setPreset] = useState(0);
  const [s, setS] = useState<Setup>(PRESETS[0].s);
  const [seed, setSeed] = useState(7);
  const res = useMemo(() => simulate(s, seed), [s, seed]);
  const update = (patch: Partial<Setup>) => { setPreset(-1); setS((x) => ({ ...x, ...patch })); };
  const width = res.hi - res.lo;

  const slider = (label: string, key: "tpr" | "tnr") => (
    <label className="block min-w-0 text-sm">
      <span className="flex justify-between">
        <span>{label}</span>
        <span className="font-mono">{s[key].toFixed(2)}</span>
      </span>
      <input type="range" min={0.55} max={1} step={0.05} value={s[key]} onChange={(e) => update({ [key]: Number(e.target.value) })} className="mt-1 w-full accent-accent" />
    </label>
  );

  return (
    <Widget title="Bootstrap interval lab" hint="The true pass rate is 80%. Draw a labeled test set, correct the judge's pass rate, and bootstrap a 95% interval.">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p, i) => (
          <Pill key={p.name} active={preset === i} onClick={() => { setPreset(i); setS(p.s); }}>
            {p.name}
          </Pill>
        ))}
      </div>
      {preset >= 0 && <p className="mt-2 text-sm text-muted">{PRESETS[preset].note}</p>}

      <p className="mt-4 text-sm">Labeled test set (half pass, half fail)</p>
      <div className="mt-1 flex flex-wrap gap-2">
        {SIZES.map((n) => (
          <Pill key={n} active={s.n === n} onClick={() => update({ n })}>
            {n}
          </Pill>
        ))}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {slider("Judge's real TPR", "tpr")}
        {slider("Judge's real TNR", "tnr")}
      </div>

      <div className="relative mt-6 h-10 rounded bg-surface-2" aria-hidden>
        {!Number.isNaN(width) && (
          <div className="absolute inset-y-1 rounded bg-accent-soft ring-1 ring-accent" style={{ left: `${res.lo * 100}%`, width: `${Math.max(width * 100, 0.5)}%` }} />
        )}
        <div className="absolute inset-y-0 border-l-2 border-dashed border-good" style={{ left: `${THETA * 100}%` }} />
        <div className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-bad" style={{ left: `${res.pObs * 100}%` }} />
        {!Number.isNaN(res.theta) && (
          <div className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent ring-2 ring-surface" style={{ left: `${res.theta * 100}%` }} />
        )}
      </div>
      <div className="mt-1 flex justify-between font-mono text-[0.65rem] text-muted">
        <span>0%</span><span>50%</span><span>100%</span>
      </div>
      <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-bad" />raw judge rate</span>
        <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-accent" />corrected</span>
        <span><span className="mr-1 inline-block h-2 w-2 bg-accent-soft ring-1 ring-accent" />95% interval</span>
        <span className="text-good">dashed: truth (80%)</span>
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-surface-2 p-2">
          <p className="text-xs text-muted">Measured TPR / TNR</p>
          <p className="font-mono text-base font-semibold">{res.mTpr.toFixed(2)} / {res.mTnr.toFixed(2)}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface-2 p-2">
          <p className="text-xs text-muted">Raw p_obs</p>
          <p className="font-mono text-base font-semibold">{pct(res.pObs)}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface-2 p-2">
          <p className="text-xs text-muted">Corrected θ̂</p>
          <p className="font-mono text-base font-semibold">{Number.isNaN(res.theta) ? "n/a" : pct(res.theta)}</p>
        </div>
        <div className={`rounded-lg border p-2 ${width > 0.25 ? "border-bad bg-bad-soft" : width > 0.12 ? "border-warn bg-warn-soft" : "border-good bg-good-soft"}`}>
          <p className="text-xs text-muted">95% interval</p>
          <p className="font-mono text-base font-semibold">{Number.isNaN(width) ? "n/a" : `${pct(res.lo)} to ${pct(res.hi)}`}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setSeed((x) => x + 1)} className="min-h-9 rounded-full border border-border bg-surface px-3 text-sm hover:bg-surface-2">
          Draw a new test set
        </button>
        <span className="text-xs text-muted">{B} bootstrap resamples. With few labels, each draw lands somewhere different.</span>
      </div>
    </Widget>
  );
}

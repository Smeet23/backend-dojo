"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Label = "P" | "F";
type Pair = { a: Label[]; b: Label[] };

const toLabels = (s: string) => s.split("") as Label[];

const PRESETS: { name: string; note: string; pair: Pair }[] = [
  {
    name: "Lesson example",
    note: "80% agreement, but chance alone would give 58%.",
    pair: { a: toLabels("PPFPPFPPFP"), b: toLabels("PPFFPPPPFP") },
  },
  {
    name: "Mostly pass",
    note: "80% agreement again, but they never agree on a single fail, so kappa drops below zero.",
    pair: { a: toLabels("PPPPPPPPPF"), b: toLabels("PPPPPPPPFP") },
  },
  {
    name: "Balanced, aligned",
    note: "Half pass, half fail, one disagreement.",
    pair: { a: toLabels("PFPFPFPFPF"), b: toLabels("PFPFPFPFPP") },
  },
  {
    name: "Opposites",
    note: "Systematic disagreement: kappa goes negative.",
    pair: { a: toLabels("PPPPPFFFFF"), b: toLabels("FFFFFPPPPP") },
  },
];

function stats({ a, b }: Pair) {
  const n = a.length;
  const pp = a.filter((x, i) => x === "P" && b[i] === "P").length;
  const ff = a.filter((x, i) => x === "F" && b[i] === "F").length;
  const pf = a.filter((x, i) => x === "P" && b[i] === "F").length;
  const fp = n - pp - ff - pf;
  const po = (pp + ff) / n;
  const aP = (pp + pf) / n;
  const bP = (pp + fp) / n;
  const pe = aP * bP + (1 - aP) * (1 - bP);
  const kappa = pe === 1 ? (po === 1 ? 1 : 0) : (po - pe) / (1 - pe);
  return { n, pp, ff, pf, fp, po, aP, bP, pe, kappa };
}

function band(k: number) {
  if (k < 0) return { text: "Poor", tone: "bg-bad-soft border-bad" };
  if (k <= 0.2) return { text: "Slight", tone: "bg-bad-soft border-bad" };
  if (k <= 0.4) return { text: "Fair", tone: "bg-warn-soft border-warn" };
  if (k <= 0.6) return { text: "Moderate", tone: "bg-warn-soft border-warn" };
  if (k <= 0.8) return { text: "Substantial", tone: "bg-good-soft border-good" };
  return { text: "Almost perfect", tone: "bg-good-soft border-good" };
}

const f2 = (x: number) => x.toFixed(2);

export function EvKappaCalculator() {
  const [preset, setPreset] = useState(0);
  const [pair, setPair] = useState<Pair>(PRESETS[0].pair);
  const s = stats(pair);
  const b = band(s.kappa);

  const flip = (who: "a" | "b", i: number) => {
    setPreset(-1);
    setPair((p) => ({ ...p, [who]: p[who].map((x, j) => (j === i ? (x === "P" ? "F" : "P") : x)) }));
  };

  const row = (who: "a" | "b", name: string) => (
    <div className="flex items-center gap-2">
      <span className="w-10 shrink-0 text-sm font-medium">{name}</span>
      <div className="grid flex-1 grid-cols-10 gap-1">
        {pair[who].map((x, i) => {
          const agree = pair.a[i] === pair.b[i];
          return (
            <button
              key={i}
              type="button"
              onClick={() => flip(who, i)}
              aria-label={`${name}, trace ${i + 1}: ${x === "P" ? "pass" : "fail"}`}
              className={`min-h-9 min-w-0 rounded-md border font-mono text-sm font-semibold ${
                x === "P" ? "border-good bg-good-soft" : "border-bad bg-bad-soft"
              } ${agree ? "" : "ring-2 ring-warn"}`}
            >
              {x}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <Widget title="Cohen's kappa calculator" hint="Two annotators label 10 traces pass (P) or fail (F). Tap any label to flip it. Disagreements are ringed.">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p, i) => (
          <Pill key={p.name} active={preset === i} onClick={() => { setPreset(i); setPair(p.pair); }}>
            {p.name}
          </Pill>
        ))}
      </div>
      {preset >= 0 && <p className="mt-2 text-sm text-muted">{PRESETS[preset].note}</p>}

      <div className="mt-3 flex items-center gap-2">
        <span className="w-10 shrink-0" />
        <div className="grid flex-1 grid-cols-10 gap-1 text-center font-mono text-[0.65rem] text-muted">
          {pair.a.map((_, i) => <span key={i}>{i + 1}</span>)}
        </div>
      </div>
      <div className="mt-1 space-y-1">
        {row("a", "Ana")}
        {row("b", "Ben")}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <table className="w-full border-collapse text-center text-sm">
          <thead>
            <tr className="text-xs text-muted">
              <th className="p-1" />
              <th className="p-1 font-medium">Ben P</th>
              <th className="p-1 font-medium">Ben F</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            <tr>
              <th className="p-1 text-xs font-medium text-muted">Ana P</th>
              <td className="border border-border bg-good-soft p-1">{s.pp}</td>
              <td className="border border-border p-1">{s.pf}</td>
            </tr>
            <tr>
              <th className="p-1 text-xs font-medium text-muted">Ana F</th>
              <td className="border border-border p-1">{s.fp}</td>
              <td className="border border-border bg-good-soft p-1">{s.ff}</td>
            </tr>
          </tbody>
        </table>

        <div className="space-y-1 font-mono text-[0.78rem] break-words">
          <p>
            P_o = ({s.pp} + {s.ff}) / {s.n} = <b>{f2(s.po)}</b>
          </p>
          <p>
            P_e = {f2(s.aP)}×{f2(s.bP)} + {f2(1 - s.aP)}×{f2(1 - s.bP)} = <b>{f2(s.pe)}</b>
          </p>
          <p>
            κ = ({f2(s.po)} - {f2(s.pe)}) / (1 - {f2(s.pe)}) = <b>{f2(s.kappa)}</b>
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg border border-border bg-surface-2 p-2">
          <p className="text-xs text-muted">Percent agreement</p>
          <p className="font-mono text-lg font-semibold">{Math.round(s.po * 100)}%</p>
        </div>
        <div className="rounded-lg border border-border bg-surface-2 p-2">
          <p className="text-xs text-muted">By chance</p>
          <p className="font-mono text-lg font-semibold">{Math.round(s.pe * 100)}%</p>
        </div>
        <div className={`rounded-lg border p-2 ${b.tone}`}>
          <p className="text-xs text-muted">Kappa · {b.text}</p>
          <p className="font-mono text-lg font-semibold">{f2(s.kappa)}</p>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted">
        {s.kappa >= 0.6 ? "At or above the usual 0.6 target: the rubric is being applied consistently." : "Below the usual 0.6 target: time for an alignment session and a sharper rubric."}
      </p>
    </Widget>
  );
}

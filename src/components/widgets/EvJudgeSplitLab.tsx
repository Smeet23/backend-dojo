"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Split = { name: string; role: string; n: number; fails: number };
type Note = { tone: "bad" | "warn"; text: string };

function Slider({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="flex justify-between">
        <span>{label}</span>
        <span className="font-mono">
          {value}
          {suffix}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-accent"
      />
    </label>
  );
}

export function EvJudgeSplitLab() {
  const [total, setTotal] = useState(100);
  const [failPct, setFailPct] = useState(50);
  const [trainPct, setTrainPct] = useState(20);
  const [devPct, setDevPct] = useState(40);
  const [leak, setLeak] = useState(false);
  const [peek, setPeek] = useState(false);

  const dev = Math.min(devPct, 90 - trainPct);
  const nTrain = Math.round((total * trainPct) / 100);
  const nDev = Math.round((total * dev) / 100);
  const nTest = total - nTrain - nDev;
  const mk = (name: string, role: string, n: number): Split => ({ name, role, n, fails: Math.round((n * failPct) / 100) });
  const splits = [
    mk("Train", "few-shot pool", nTrain),
    mk("Dev", "tune the prompt", nDev),
    mk("Test", "final score, once", nTest),
  ];
  const [tr, dv, ts] = splits;

  const notes: Note[] = [];
  if (tr.fails < 3 || tr.n - tr.fails < 3)
    notes.push({ tone: "warn", text: `Train has ${tr.n - tr.fails} passes and ${tr.fails} fails: too few to choose 2 to 3 good examples of each.` });
  if (trainPct > 30)
    notes.push({ tone: "warn", text: `${trainPct}% in train is wasteful. Few-shot gains plateau after a handful of examples; labels are worth more for measuring.` });
  if (dv.fails < 15)
    notes.push({ tone: "warn", text: `Dev has only ${dv.fails} fails. Each misjudged failure moves dev TNR by ${(100 / Math.max(dv.fails, 1)).toFixed(1)} points, so it's hard to tell if an edit helped.` });
  if (ts.fails < 20)
    notes.push({ tone: "warn", text: `Test has ${ts.fails} fails (aim for at least 20, ideally 30 to 50). The final TNR is noisy: one trace is worth ${(100 / Math.max(ts.fails, 1)).toFixed(1)} points.` });
  if (failPct < 30)
    notes.push({ tone: "warn", text: `Only ${failPct}% of labels are fails. Label more failing traces so dev and test are closer to balanced; the mismatch with production is corrected later.` });
  if (leak)
    notes.push({ tone: "bad", text: "Leakage: test traces in the prompt hand the judge the answers. Test TPR/TNR are inflated and can't be used to correct the success rate." });
  if (peek)
    notes.push({ tone: "bad", text: "Tuning against test turns it into a second dev set. You no longer have an unbiased measure of the judge." });

  return (
    <Widget title="Data split lab" hint="Choose how many traces you labeled and how to split them. Watch what each set can and can't do for your judge.">
      <div className="grid gap-3 sm:grid-cols-2">
        <Slider label="Labeled traces" value={total} min={40} max={300} step={10} suffix="" onChange={setTotal} />
        <Slider label="Share labeled Fail" value={failPct} min={10} max={50} step={5} suffix="%" onChange={setFailPct} />
        <Slider label="Train share" value={trainPct} min={5} max={50} step={5} suffix="%" onChange={setTrainPct} />
        <Slider label="Dev share" value={dev} min={20} max={90 - trainPct} step={5} suffix="%" onChange={setDevPct} />
      </div>

      <div className="mt-4 flex h-8 w-full overflow-hidden rounded-lg border border-border text-[0.7rem] font-mono">
        {splits.map((s, k) => (
          <div
            key={s.name}
            style={{ width: `${(s.n / total) * 100}%` }}
            className={`flex min-w-0 items-center justify-center truncate ${k === 0 ? "bg-accent-soft" : k === 1 ? "bg-surface-2" : "bg-good-soft"}`}
          >
            {s.name}
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {splits.map((s) => (
          <div key={s.name} className="min-w-0 rounded-lg border border-border p-2 text-center">
            <p className="text-sm font-semibold">{s.name}</p>
            <p className="text-[0.7rem] text-muted">{s.role}</p>
            <p className="mt-1 font-mono text-lg">{s.n}</p>
            <p className="font-mono text-[0.7rem]">
              {s.n - s.fails} pass · {s.fails} fail
            </p>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Pill active={leak} onClick={() => setLeak((v) => !v)}>
          Put 3 test traces in the prompt
        </Pill>
        <Pill active={peek} onClick={() => setPeek((v) => !v)}>
          Check test score after each edit
        </Pill>
      </div>

      <ul className="mt-3 space-y-1">
        {notes.length === 0 ? (
          <li className="rounded-md bg-good-soft px-2 py-1.5 text-sm">
            Healthy split: enough train examples to pick from, a dev set that can show progress, and an untouched test set big enough to trust.
          </li>
        ) : (
          notes.map((n, k) => (
            <li key={k} className={`rounded-md px-2 py-1.5 text-sm ${n.tone === "bad" ? "bg-bad-soft" : "bg-warn-soft"}`}>
              {n.text}
            </li>
          ))
        )}
      </ul>
    </Widget>
  );
}

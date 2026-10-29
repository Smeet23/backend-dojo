"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Dir = "met" | "notMet";
type Mode = { name: string; dir: Dir };
type Design = "escalate" | "deny";

// Illustrative week of expert reviews on a prior-authorization assistant: 50 errors.
const MODES: Mode[] = [
  { name: "Under-inferring from evidence", dir: "notMet" },
  { name: "Misreading a clinical term", dir: "notMet" },
  { name: "Over-inferring from evidence", dir: "met" },
  { name: "Retrospective reasoning", dir: "met" },
  { name: "Misunderstanding chronology", dir: "met" },
];
const START_COUNTS = [15, 11, 9, 8, 7];

const DESIGNS: Record<Design, { label: string; desc: string; sev: Record<Dir, number> }> = {
  escalate: {
    label: "AI approves or escalates",
    desc: "A wrong \"not met\" sends the case to a nurse (costs time). A wrong \"met\" approves care no human checks.",
    sev: { notMet: 1, met: 4 },
  },
  deny: {
    label: "AI may also deny",
    desc: "A wrong \"not met\" now denies care to a patient who qualifies. A wrong \"met\" still approves unchecked.",
    sev: { notMet: 5, met: 4 },
  },
};

const DIR_LABEL: Record<Dir, string> = { met: "pushes to \"met\"", notMet: "pushes to \"not met\"" };

function sevFor(design: Design) {
  return MODES.map((m) => DESIGNS[design].sev[m.dir]);
}

function rank(scores: number[]): number[] {
  return scores.map((_, i) => i).sort((a, b) => scores[b] - scores[a] || a - b);
}

export function EvRiskWeightedPrioritizer() {
  const [design, setDesign] = useState<Design>("escalate");
  const [counts, setCounts] = useState<number[]>(START_COUNTS);
  const [sev, setSev] = useState<number[]>(sevFor("escalate"));

  const risk = counts.map((c, i) => c * sev[i]);
  const byFreq = rank(counts);
  const byRisk = rank(risk);
  const total = counts.reduce((a, b) => a + b, 0);
  const maxRisk = Math.max(1, ...risk);
  const sameTop = byFreq[0] === byRisk[0];

  const choose = (d: Design) => {
    setDesign(d);
    setSev(sevFor(d));
  };
  const setAt = (arr: number[], i: number, v: number) => arr.map((x, j) => (j === i ? v : x));

  return (
    <Widget
      title="Risk-weighted failure priorities"
      hint="A week of expert reviews found these errors. Pick a deployment design, adjust counts and severity (1 to 5), and compare the two priority orders."
    >
      <div className="flex flex-wrap gap-2">
        {(Object.keys(DESIGNS) as Design[]).map((d) => (
          <Pill key={d} active={design === d} onClick={() => choose(d)}>
            {DESIGNS[d].label}
          </Pill>
        ))}
      </div>
      <p className="mt-2 text-sm text-muted">{DESIGNS[design].desc} Switching design resets severities.</p>

      <div className="mt-3 space-y-3">
        {MODES.map((m, i) => (
          <div key={m.name} className="rounded-lg border border-border p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <p className="text-sm font-medium">{m.name}</p>
              <p className="text-xs text-muted">{DIR_LABEL[m.dir]}</p>
            </div>
            <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
              <label className="flex items-center gap-2">
                <span className="w-24 shrink-0">Errors: <b>{counts[i]}</b></span>
                <input
                  type="range" min={0} max={30} value={counts[i]}
                  onChange={(e) => setCounts(setAt(counts, i, Number(e.target.value)))}
                  className="w-full accent-accent" aria-label={`${m.name} error count`}
                />
              </label>
              <label className="flex items-center gap-2">
                <span className="w-24 shrink-0">Severity: <b>{sev[i]}</b></span>
                <input
                  type="range" min={1} max={5} value={sev[i]}
                  onChange={(e) => setSev(setAt(sev, i, Number(e.target.value)))}
                  className="w-full accent-accent" aria-label={`${m.name} severity`}
                />
              </label>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded bg-surface-2" aria-hidden>
              <div
                className={`h-full rounded ${m.dir === "met" ? "bg-bad" : "bg-accent"}`}
                style={{ width: `${(risk[i] / maxRisk) * 100}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted">Risk score: {counts[i]} x {sev[i]} = {risk[i]}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {[
          { title: "By frequency alone", order: byFreq, val: (i: number) => `${counts[i]} errors` },
          { title: "By frequency x severity", order: byRisk, val: (i: number) => `risk ${risk[i]}` },
        ].map((col) => (
          <div key={col.title} className="rounded-lg border border-border bg-surface-2 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{col.title}</p>
            <ol className="mt-2 space-y-1 text-sm">
              {col.order.map((i, k) => (
                <li key={i} className="flex justify-between gap-2">
                  <span>{k + 1}. {MODES[i].name}</span>
                  <span className="shrink-0 text-muted">{col.val(i)}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>

      <p className={`mt-3 rounded-lg border p-2 text-sm ${sameTop ? "border-good bg-good-soft" : "border-warn bg-warn-soft"}`}>
        {sameTop
          ? `Both views agree on what to fix first: ${MODES[byRisk[0]].name.toLowerCase()}.`
          : `Frequency says fix ${MODES[byFreq[0]].name.toLowerCase()} first, but by risk ${MODES[byRisk[0]].name.toLowerCase()} matters most.`}{" "}
        {total} errors reviewed in total.
      </p>
    </Widget>
  );
}

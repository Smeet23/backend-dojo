"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Reply = {
  id: number;
  text: string;
  relevant: boolean;
  unitFact: boolean;
  differentiator: boolean;
  cta: boolean;
};

const REPLIES: Reply[] = [
  { id: 1, text: "One-bedrooms are very popular here! Our community is known for its prime location and quiet feel. Any dates in mind for your move?", relevant: true, unitFact: false, differentiator: false, cta: false },
  { id: 2, text: "We have three one-bedrooms right now, 680 sq ft each, starting at $1,450.", relevant: true, unitFact: true, differentiator: false, cta: false },
  { id: 3, text: "One-beds start at $1,450 with in-unit laundry, and the first month is free if you sign this week. I have tours Thursday 2pm or Saturday 11am. Want one?", relevant: true, unitFact: true, differentiator: true, cta: true },
  { id: 4, text: "Residents love our rooftop pool and 24-hour gym! Let me know if you have questions.", relevant: true, unitFact: false, differentiator: true, cta: false },
  { id: 5, text: "Sorry, I can only help with maintenance requests.", relevant: false, unitFact: false, differentiator: false, cta: false },
  { id: 6, text: "One-beds start at $1,450 and two are available June 1. You can book a tour here: [booking link]", relevant: true, unitFact: true, differentiator: false, cta: true },
];

type Fix = "wording" | "rule" | "split";

const FIXES: { key: Fix; label: string; line: string }[] = [
  { key: "wording", label: "Clarify wording", line: "Pass requires at least one specific fact about the units (price, size, layout or availability). Community descriptions alone don't count." },
  { key: "rule", label: "Add decision rule", line: "Rule: the reply must end with a concrete next step (tour times or a booking link). A generic question like 'any dates in mind?' is not enough." },
  { key: "split", label: "Split the criterion", line: "Split 'helpful' into three binary checks: unit fact, differentiator or promotion, call to action. Pass only if all three pass." },
];

/** The expert's taste never changes: they want all three things. */
const expertPass = (r: Reply) => r.relevant && r.unitFact && r.differentiator && r.cta;

/** The engineer applies whatever the rubric currently says, literally. */
function engineerPass(r: Reply, on: Set<Fix>) {
  if (!r.relevant) return false;
  if (on.has("split")) return r.unitFact && r.differentiator && r.cta;
  if (on.has("wording") && !r.unitFact) return false;
  if (on.has("rule") && !r.cta) return false;
  return true;
}

function kappa(a: boolean[], b: boolean[]) {
  const n = a.length;
  const po = a.filter((x, i) => x === b[i]).length / n;
  const pa = a.filter(Boolean).length / n;
  const pb = b.filter(Boolean).length / n;
  const pe = pa * pb + (1 - pa) * (1 - pb);
  return { po, k: pe === 1 ? (po === 1 ? 1 : 0) : (po - pe) / (1 - pe) };
}

const Tag = ({ pass }: { pass: boolean }) => (
  <span className={`inline-block min-w-11 rounded-full border px-2 py-0.5 text-center text-xs font-semibold ${pass ? "border-good bg-good-soft" : "border-bad bg-bad-soft"}`}>
    {pass ? "Pass" : "Fail"}
  </span>
);

export function EvRubricSharpener() {
  const [on, setOn] = useState<Set<Fix>>(new Set());
  const [vote, setVote] = useState(false);

  const toggle = (f: Fix) =>
    setOn((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });

  const eng = REPLIES.map((r) => engineerPass(r, on));
  const exp = REPLIES.map(expertPass);
  const { po, k } = kappa(eng, exp);
  const agreed = eng.filter((x, i) => x === exp[i]).length;

  return (
    <Widget
      title="Sharpen the rubric"
      hint="Query: 'I need a new place soon, maybe a 1-bed? What's good?' The engineer applies the rubric literally; the domain expert judges by taste. Add refinements and watch agreement change."
    >
      <div className="rounded-lg border border-border bg-surface-2 p-3 text-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Current rubric: helpful response</p>
        <p className="mt-1">Pass: the response provides relevant information related to the query. Fail: it is irrelevant or provides no useful information.</p>
        {FIXES.filter((f) => on.has(f.key)).map((f) => (
          <p key={f.key} className="mt-1 text-accent">+ {f.line}</p>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {FIXES.map((f) => (
          <Pill key={f.key} active={on.has(f.key)} onClick={() => toggle(f.key)}>
            {f.label}
          </Pill>
        ))}
        <Pill active={vote} onClick={() => setVote((v) => !v)}>
          Settle by majority vote
        </Pill>
      </div>
      {vote && (
        <p className="mt-2 rounded-md border border-warn bg-warn-soft p-2 text-sm">
          A vote (with a third annotator) would pick a label for each of these six replies, but the rubric text above doesn&apos;t change. The next batch splits exactly the same way, so agreement below stays put.
        </p>
      )}

      <ul className="mt-3 space-y-2">
        {REPLIES.map((r, i) => {
          const same = eng[i] === exp[i];
          return (
            <li key={r.id} className={`rounded-lg border p-2 text-sm ${same ? "border-border" : "border-warn"}`}>
              <p className="break-words">
                <span className="font-mono text-xs text-muted">#{r.id} </span>
                {r.text}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                <span>Engineer <Tag pass={eng[i]} /></span>
                <span>Expert <Tag pass={exp[i]} /></span>
                {!same && <span className="text-text">Disagree</span>}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 grid grid-cols-2 gap-2 text-center">
        <div className="rounded-lg border border-border bg-surface-2 p-2">
          <p className="text-xs text-muted">Agreement</p>
          <p className="font-mono text-lg font-semibold">
            {agreed}/{REPLIES.length} ({Math.round(po * 100)}%)
          </p>
        </div>
        <div className={`rounded-lg border p-2 ${k >= 0.6 ? "border-good bg-good-soft" : "border-warn bg-warn-soft"}`}>
          <p className="text-xs text-muted">Cohen&apos;s kappa</p>
          <p className="font-mono text-lg font-semibold">{k.toFixed(2)}</p>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted">
        {on.has("split")
          ? "Every part of the expert's taste is now written down, so anyone applying the rubric gets the expert's answer. This rubric is ready to become a judge prompt."
          : on.size === 0
            ? "Both annotators followed the draft honestly. The disagreement lives in the rubric, not in either person."
            : "Better. Look at the replies still flagged: what is the expert rewarding that the rubric doesn't mention yet?"}
      </p>
    </Widget>
  );
}

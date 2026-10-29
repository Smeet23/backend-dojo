"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Cause = "Real failure" | "Helper bug" | "Eval is wrong" | "My label is wrong";
type Case = { evalName: string; verdict: string; label: string; finding: string; answer: Cause; why: string };

const CAUSES: Cause[] = ["Real failure", "Helper bug", "Eval is wrong", "My label is wrong"];

const CASES: Case[] = [
  {
    evalName: "Suggests a leading question (judge)",
    verdict: "Fail on 96% of transcripts",
    label: "You marked most of them Pass",
    finding: "You open the cached helper output: for most transcripts the extracted question list holds fragments of tips, not questions.",
    answer: "Helper bug",
    why: "The eval never saw the coach's real questions. Fix the extraction helper, rebuild the cache, and rerun before judging anything else. A column that fails nearly everywhere is a classic sign of broken input.",
  },
  {
    evalName: "Greedy setting-the-scene dimension (code)",
    verdict: "Fail",
    label: "You marked it Pass",
    finding: "Rereading the trace, the scene-setting feedback does call a good timeline question a weak scene-setting question. Your rubric never said this counts as a failure.",
    answer: "My label is wrong",
    why: "Writing the eval forced a precise definition your labeling rubric lacked. Update the rubric and relabel. This is what happened to Teresa: the code was better than her labels.",
  },
  {
    evalName: "Suggests a leading question (judge)",
    verdict: "Fail",
    label: "You marked it Pass",
    finding: "The flagged question is \"What happened after you opened the app?\" The judge's reasoning says it 'assumes the user opened the app'. The participant had just said so.",
    answer: "Eval is wrong",
    why: "A neutral follow-up was flagged. Refine the judge: sharpen the definition, add this as a train-set example, or try showing it one question at a time, then re-measure agreement on the dev set.",
  },
  {
    evalName: "Suggests a general question (code)",
    verdict: "Fail",
    label: "You marked it Pass",
    finding: "The matched word is \"unusual\" in \"Was anything unusual about that morning?\" The question asks about one specific morning.",
    answer: "Eval is wrong",
    why: "A substring match on \"usual\" caught a specific question. Match whole words only, then rerun. Even the best-aligned check needs its false positives read.",
  },
  {
    evalName: "Excerpt repeated across dimensions (code)",
    verdict: "Fail",
    label: "You marked it Fail too",
    finding: "Setting the scene praises \"So it was a Tuesday, I'd just got to work...\" and building the timeline criticizes the same passage, lightly reworded.",
    answer: "Real failure",
    why: "Eval and human agree, and the student would see contradictory feedback. Count it toward the prevalence and fix the product (here, by passing used excerpts to later calls).",
  },
  {
    evalName: "Suggests a general question (code)",
    verdict: "Pass",
    label: "You marked it Fail",
    finding: "The coach recommended \"Walk me through how you plan meals each week.\" None of the red-flag words appear.",
    answer: "Eval is wrong",
    why: "A miss, not a false alarm: the question is general without using a listed keyword. Add the pattern (\"each week\", \"how you plan\") to the list and check it doesn't create new false positives.",
  },
];

export function EvEvalDisagreementTriage() {
  const [picks, setPicks] = useState<(Cause | null)[]>(() => CASES.map(() => null));
  const [i, setI] = useState(0);
  const c = CASES[i];
  const pick = picks[i];
  const done = picks.filter((p) => p !== null).length;
  const right = picks.filter((p, k) => p === CASES[k].answer).length;

  const choose = (g: Cause) => setPicks((prev) => prev.map((p, k) => (k === i ? g : p)));

  return (
    <Widget
      title="Who is wrong here?"
      hint="Cases modeled on Teresa's interview coach, where an eval result looked surprising. Dig in, then name the culprit."
    >
      <div className="flex items-center justify-between text-xs text-muted">
        <span>
          Trace {i + 1} of {CASES.length}
        </span>
        <span>
          {right} right of {done} answered
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-1" aria-label="Progress">
        {CASES.map((cs, k) => {
          const p = picks[k];
          const tone = p === null ? "bg-surface-2" : p === cs.answer ? "bg-good" : "bg-bad";
          return (
            <button
              key={k}
              type="button"
              onClick={() => setI(k)}
              aria-label={`Trace ${k + 1}`}
              className={`h-3 w-6 rounded ${tone} ${k === i ? "ring-2 ring-accent" : ""}`}
            />
          );
        })}
      </div>

      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-surface-2 p-2">
          <dt className="text-xs text-muted">Eval</dt>
          <dd className="font-medium">{c.evalName}</dd>
        </div>
        <div className="rounded-lg border border-border bg-surface-2 p-2">
          <dt className="text-xs text-muted">Eval says</dt>
          <dd className="font-medium">{c.verdict}</dd>
        </div>
        <div className="rounded-lg border border-border bg-surface-2 p-2">
          <dt className="text-xs text-muted">Your label</dt>
          <dd className="font-medium">{c.label}</dd>
        </div>
      </dl>

      <p className="mt-2 rounded-lg border border-border p-3 text-sm leading-relaxed">
        <span className="font-semibold">When you dig in: </span>
        {c.finding}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {CAUSES.map((g) => (
          <Pill key={g} active={pick === g} onClick={() => choose(g)}>
            {g}
          </Pill>
        ))}
      </div>

      {pick && (
        <div className={`mt-3 rounded-lg border p-3 text-sm ${pick === c.answer ? "border-good bg-good-soft" : "border-bad bg-bad-soft"}`}>
          <p className="font-semibold">{pick === c.answer ? "Right: " : `Not quite, it's "${c.answer}": `}</p>
          <p className="mt-1">{c.why}</p>
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={i === 0}
          onClick={() => setI((k) => k - 1)}
          className="min-h-10 rounded-lg border border-border px-3 text-sm disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={i === CASES.length - 1}
          onClick={() => setI((k) => k + 1)}
          className="min-h-10 rounded-lg bg-accent px-3 text-sm font-medium text-white disabled:opacity-40 dark:text-bg"
        >
          Next
        </button>
      </div>

      {done === CASES.length && (
        <p className="mt-3 text-sm text-muted">
          Score {right}/{CASES.length}. Only one of six surprises was a product failure. Check the inputs first (helpers, cache), then the
          eval, then your own rubric, before you count anything toward a failure rate.
        </p>
      )}
    </Widget>
  );
}

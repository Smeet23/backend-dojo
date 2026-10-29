"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Opt = { text: string; ok: boolean; why: string };
type Case = { title: string; seen: string; hyps: Opt[]; vars: Opt[]; crits: Opt[] };

const CASES: Case[] = [
  {
    title: "Competitor question",
    seen: "Asked about a competitor, a note-taker's assistant listed reasons users might prefer the competitor, then argued for itself.",
    hyps: [
      { text: "Nothing scopes questions about other products, so it answers them like a general chatbot", ok: true, why: "Specific and testable: it predicts the same behavior for any competitor and any phrasing." },
      { text: "Transcript retrieval failed for this meeting", ok: false, why: "The question wasn't about the meeting, so retrieval quality doesn't explain the answer." },
      { text: "The model is just weird sometimes", ok: false, why: "Not a hypothesis: nothing you could vary would prove it wrong." },
    ],
    vars: [
      { text: "Name several different competitors", ok: true, why: "Checks the behavior is general, not tied to one name." },
      { text: "Ask indirectly: \"Is there a better tool I should switch to?\"", ok: true, why: "Real users rarely name the competitor; this probes the same gap." },
      { text: "Sample each question 5 times", ok: true, why: "One output says little about a nondeterministic system." },
      { text: "Try a longer meeting recording", ok: false, why: "Meeting length has nothing to do with the hypothesis." },
    ],
    crits: [
      { text: "Fail if the reply names a listed competitor outside the approved canned response", ok: true, why: "Binary, deterministic, and reusable as a guardrail." },
      { text: "A judge rates helpfulness from 1 to 5", ok: false, why: "A helpful comparison is exactly the failure. Scales are also hard to align." },
      { text: "Pass if the reply is under 150 words", ok: false, why: "Length doesn't capture whether it promoted a competitor." },
    ],
  },
  {
    title: "Too-literal next steps",
    seen: "Asked for next steps after a meeting, the assistant wrote \"continue grinding on\" a topic, copied straight from the casual talk.",
    hyps: [
      { text: "It copies informal transcript phrasing instead of restating actions in standalone terms", ok: true, why: "Predicts the failure grows with casual or jargon-heavy meetings, which you can test." },
      { text: "Speaker identification was wrong", ok: false, why: "Who said it doesn't explain why the phrase is unclear." },
      { text: "The answer came back too fast", ok: false, why: "Speed is a separate UX issue; a slow answer could copy phrases too." },
    ],
    vars: [
      { text: "Run on casual, slang-heavy meetings and on formal ones", ok: true, why: "Varies exactly what the hypothesis is about." },
      { text: "Have someone who wasn't in the meeting read the answer", ok: true, why: "Simulates the user returning a week later with no memory of the phrase." },
      { text: "Ask the same question on meetings with many shorthand terms", ok: true, why: "Shorthand is another form of context-dependent wording." },
      { text: "Switch the app to dark mode", ok: false, why: "A display setting can't change the generated text." },
    ],
    crits: [
      { text: "Fail if any next step only makes sense to someone who attended the meeting", ok: true, why: "Binary and tied to the observed failure; a judge can apply it once aligned with your labels." },
      { text: "Fail if any word in the answer appears in the transcript", ok: false, why: "Far too strict: good next steps reuse names and topics from the meeting." },
      { text: "Pass if the answer uses bullet points", ok: false, why: "Formatting says nothing about clarity of the content." },
    ],
  },
  {
    title: "Misread intent",
    seen: "Asked how the team behind the product does its evals, the assistant replied that the meeting didn't cover that topic.",
    hyps: [
      { text: "It treats every question as a question about the current transcript", ok: true, why: "Predicts the same miss for any question about the product itself." },
      { text: "The meeting was too long for the context window", ok: false, why: "It found the meeting fine; it misread what was asked." },
      { text: "The meeting summary was badly formatted", ok: false, why: "Formatting of the summary doesn't affect how a new question is routed." },
    ],
    vars: [
      { text: "Ask other product questions: \"Can I export this to Notion?\"", ok: true, why: "Same category of question, different wording." },
      { text: "Ask questions ambiguous between the meeting and the product", ok: true, why: "Finds where the boundary sits." },
      { text: "Mix in normal meeting questions as controls", ok: true, why: "Makes sure a fix doesn't break the questions that already work." },
      { text: "Compare the default summaries again", ok: false, why: "The summary isn't involved in answering a new question." },
    ],
    crits: [
      { text: "Pass if it recognizes the question is about the product and answers or redirects usefully", ok: true, why: "Binary, scoped to this failure, and checkable on a labeled set." },
      { text: "Pass if it never says \"I don't know\"", ok: false, why: "Admitting a limit can be the right answer." },
      { text: "Score overall answer quality from 1 to 10", ok: false, why: "Too broad: a low score wouldn't tell you this failure happened." },
    ],
  },
  {
    title: "App breaks on a follow-up edit",
    seen: "A generated to-do app worked. After the request \"add tags and categories\", the app broke.",
    hyps: [
      { text: "Edits to an existing generated app can break features that already worked", ok: true, why: "A regression hypothesis: testable by applying edits and rechecking old features." },
      { text: "The first prompt was too vague", ok: false, why: "The first version worked; the break came with the second turn." },
      { text: "The design system looks generic", ok: false, why: "Looks can't explain a broken app." },
    ],
    vars: [
      { text: "Apply a sequence of 3 to 5 small feature requests to the same app", ok: true, why: "Many assistants degrade over turns; test several lengths." },
      { text: "Repeat the same edit on several freshly generated apps", ok: true, why: "Separates a one-off from a pattern and gives you a rate." },
      { text: "Vary edit size: one field versus a new data model", ok: true, why: "Tags and categories change the data model; find whether that's the trigger." },
      { text: "Rate the look of the first version", ok: false, why: "The first version isn't what failed." },
    ],
    crits: [
      { text: "After each edit, the app loads and a scripted test of add, complete, edit and delete passes", ok: true, why: "Deterministic smoke test: the code-based check of choice here." },
      { text: "Pass if the builder says the change succeeded", ok: false, why: "The tool's own report is not evidence; the app broke anyway." },
      { text: "A judge rates the new UI's aesthetics", ok: false, why: "Aesthetics don't tell you whether it works." },
    ],
  },
];

const STEPS = ["Hypothesis", "Variations to try", "Pass/fail criterion"] as const;

export function EvObservationToTestCase() {
  const [ci, setCi] = useState(0);
  const [hyp, setHyp] = useState<number | null>(null);
  const [vars, setVars] = useState<boolean[]>([false, false, false, false]);
  const [crit, setCrit] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const c = CASES[ci];

  const pickCase = (k: number) => {
    setCi(k);
    setHyp(null);
    setVars([false, false, false, false]);
    setCrit(null);
    setChecked(false);
  };
  const varRight = vars.filter((v, k) => v === c.vars[k].ok).length;
  const score = (hyp !== null && c.hyps[hyp].ok ? 1 : 0) + (varRight === c.vars.length ? 1 : 0) + (crit !== null && c.crits[crit].ok ? 1 : 0);

  const single = (opts: Opt[], sel: number | null, set: (k: number) => void) => (
    <div className="space-y-1.5">
      {opts.map((o, k) => {
        const tone = checked && sel === k ? (o.ok ? "border-good bg-good-soft" : "border-bad bg-bad-soft") : sel === k ? "border-accent bg-accent-soft" : "border-border";
        return (
          <button key={k} type="button" onClick={() => { set(k); setChecked(false); }} aria-pressed={sel === k} className={`block w-full rounded-lg border p-2 text-left text-sm ${tone}`}>
            {o.text}
            {checked && (sel === k || o.ok) && <span className="mt-1 block text-xs text-muted">{o.ok ? "Best choice. " : ""}{o.why}</span>}
          </button>
        );
      })}
    </div>
  );

  return (
    <Widget title="Turn an observation into a test case" hint="Pick one failure seen in the session. Choose a hypothesis, the variations worth running and a pass/fail check, then compare.">
      <div className="flex flex-wrap gap-2">
        {CASES.map((cs, k) => (
          <Pill key={cs.title} active={k === ci} onClick={() => pickCase(k)}>
            {cs.title}
          </Pill>
        ))}
      </div>

      <p className="mt-3 rounded-lg border border-border bg-surface-2 p-3 text-sm">
        <span className="font-semibold">Observed once: </span>
        {c.seen}
      </p>

      <h4 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">1. {STEPS[0]}</h4>
      <div className="mt-1">{single(c.hyps, hyp, setHyp)}</div>

      <h4 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">2. {STEPS[1]} (select all that test it)</h4>
      <div className="mt-1 space-y-1.5">
        {c.vars.map((v, k) => {
          const on = vars[k];
          const tone = checked ? (on === v.ok ? "border-good bg-good-soft" : "border-bad bg-bad-soft") : on ? "border-accent bg-accent-soft" : "border-border";
          return (
            <button
              key={k}
              type="button"
              aria-pressed={on}
              onClick={() => { setVars((p) => p.map((x, j) => (j === k ? !x : x))); setChecked(false); }}
              className={`flex w-full items-start gap-2 rounded-lg border p-2 text-left text-sm ${tone}`}
            >
              <span className="mt-0.5 inline-block w-4 shrink-0 text-center font-mono">{on ? "✓" : "○"}</span>
              <span>
                {v.text}
                {checked && <span className="mt-1 block text-xs text-muted">{v.ok ? "Worth running. " : "Skip it. "}{v.why}</span>}
              </span>
            </button>
          );
        })}
      </div>

      <h4 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">3. {STEPS[2]}</h4>
      <div className="mt-1">{single(c.crits, crit, setCrit)}</div>

      <button
        type="button"
        disabled={hyp === null || crit === null}
        onClick={() => setChecked(true)}
        className="mt-4 min-h-10 w-full rounded-lg bg-accent px-3 text-sm font-medium text-white disabled:opacity-40 dark:text-bg"
      >
        Check my test case
      </button>

      {checked && (
        <div className={`mt-3 rounded-lg border p-3 text-sm ${score === 3 ? "border-good bg-good-soft" : "border-warn bg-warn-soft"}`}>
          <p className="font-semibold">{score} of 3 steps right</p>
          <p className="mt-1">
            {score === 3
              ? "That is a repeatable test: a falsifiable cause, inputs that vary it, and a check anyone can apply the same way."
              : `Variations: ${varRight} of ${c.vars.length} choices right. A good test varies what the hypothesis is about, holds the rest fixed, and ends in a binary check.`}
          </p>
          {ci < CASES.length - 1 && (
            <button type="button" onClick={() => pickCase(ci + 1)} className="mt-2 text-sm font-medium text-accent underline">
              Next observation
            </button>
          )}
        </div>
      )}
    </Widget>
  );
}

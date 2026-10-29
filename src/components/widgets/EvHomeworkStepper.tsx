"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Step = {
  hw: "HW1" | "HW2";
  title: string;
  ask: string;
  options: [string, string];
  good: 0 | 1;
  why: string;
  mistake: string;
};

const STEPS: Step[] = [
  {
    hw: "HW1",
    title: "Write the system prompt",
    ask: "Which first prompt sets up useful error analysis?",
    options: [
      "You are a helpful cooking assistant. Give great recipes.",
      "Role: home-cooking assistant, one recipe per answer. Always: quantities in standard units, servings (default 2), respect stated diets and time limits. Never: ask a follow-up instead of answering. Format: ## name, ### Ingredients, ### Instructions, optional ### Tips.",
    ],
    good: 1,
    why: "Each rule is a specification. When a trace breaks one, you know it is a real generalization failure rather than something you never asked for.",
    mistake: "Starting error analysis with a vague prompt, then filling the taxonomy with behaviors the prompt never requested.",
  },
  {
    hw: "HW1",
    title: "Expand the test queries",
    ask: "Which set of new queries is more useful?",
    options: [
      "Spicy Thai curry tonight / gluten free breakfast for kids / chicken, rice and broccoli? / something healthy / high protein meal prep for the week",
      "pasta recipe / pizza recipe / curry recipe / taco recipe / soup recipe ...",
    ],
    good: 0,
    why: "The first spreads across cuisine, diet, ingredients on hand, vagueness and non-recipe questions. The second tests one behavior five times.",
    mistake: "Ten near-identical recipe requests, so every response looks fine and nothing is learned.",
  },
  {
    hw: "HW2",
    title: "Review tuples",
    ask: "You sampled 25 of 240 tuples. Which is ready for query writing?",
    options: [
      "All 25 kept, including (keto, quick lunch, all day, beginner)",
      "21 kept after review; dropped (keto, quick lunch, all day, beginner) and 3 other implausible combinations",
    ],
    good: 1,
    why: "A quick lunch that takes all day is not a request anyone sends. Reviewing tuples is the cheapest place to remove unrealistic data.",
    mistake: "Sampling from the cross product and skipping the human review.",
  },
  {
    hw: "HW2",
    title: "Turn tuples into queries",
    ask: "Which generated query would you keep for (vegan, family meal, under 30 min, beginner)?",
    options: [
      "need something vegan the kids will actually eat, im not great at cooking and have like half an hour",
      "I am a beginner seeking a vegan family meal that takes under 30 minutes.",
    ],
    good: 0,
    why: "The second just recites the tuple. Real users are terse, informal and imply constraints, like the reference queries (\"quick egg spinach cheese recipe pls\").",
    mistake: "Accepting stiff, attribute-listing queries because they technically match the tuple.",
  },
  {
    hw: "HW2",
    title: "Save the traces",
    ask: "What should each saved record contain?",
    options: [
      "query and final response text",
      "id, query, source (hand_coded or synthetic), tuple, prompt_version, and the full message list including the system prompt",
    ],
    good: 1,
    why: "Metadata lets you slice failures by source or tuple, and the prompt version tells you which prompt produced the failure when you iterate.",
    mistake: "Keeping only the reply, then not knowing which prompt or which kind of query caused a failure.",
  },
  {
    hw: "HW2",
    title: "Open code a trace",
    ask: "Query: \"advanced vegan American lunch\". Which note is better?",
    options: [
      "wrong, ignores diet",
      "Asked for vegan; recipe uses heavy cream and parmesan. Should use plant-based substitutes.",
    ],
    good: 1,
    why: "The specific note names the evidence and what should have happened. That detail later becomes a judge's pass and fail definition.",
    mistake: "Writing verdicts (\"wrong\", \"bad\") that can't be clustered or turned into an evaluator.",
  },
  {
    hw: "HW2",
    title: "Build the taxonomy",
    ask: "The LLM proposed 3 top failure modes from your notes. What next?",
    options: [
      "Map every note back to a mode, rename or split where the draft disagrees with you, mark each trace 0 or 1, and count",
      "Copy the 3 modes into failure_mode_taxonomy.md and start writing judges",
    ],
    good: 0,
    why: "In the LangSmith walkthrough the LLM's top three missed the presenter's most frequent issue. Counting against your own labels catches that.",
    mistake: "Treating the LLM's clusters as the answer and skipping the counts that set HW3's priorities.",
  },
];

export function EvHomeworkStepper() {
  const [i, setI] = useState(0);
  const [picks, setPicks] = useState<(number | null)[]>(() => STEPS.map(() => null));
  const step = STEPS[i];
  const pick = picks[i];
  const answered = picks.filter((p) => p !== null).length;
  const correct = picks.filter((p, k) => p === STEPS[k].good).length;

  const choose = (o: number) => setPicks((ps) => ps.map((p, k) => (k === i ? o : p)));

  return (
    <Widget title="Homework stepper" hint="Walk the HW1 and HW2 pipeline. At each step pick the better artifact, then see why and the mistake people make there.">
      <ol className="flex flex-wrap gap-1.5">
        {STEPS.map((s, k) => {
          const state = picks[k] === null ? "" : picks[k] === s.good ? "bg-good-soft" : "bg-warn-soft";
          return (
            <li key={s.title}>
              <button
                type="button"
                onClick={() => setI(k)}
                aria-current={k === i ? "step" : undefined}
                className={`min-h-9 rounded-full border px-3 text-sm ${k === i ? "border-accent font-semibold" : "border-border"} ${state}`}
              >
                {k + 1}
              </button>
            </li>
          );
        })}
      </ol>

      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted">
        {step.hw} · step {i + 1} of {STEPS.length}: {step.title}
      </p>
      <p className="mt-1 font-medium">{step.ask}</p>

      <div className="mt-2 space-y-2">
        {step.options.map((o, k) => {
          const shown = pick !== null;
          const tone = !shown ? "bg-surface hover:bg-surface-2" : k === step.good ? "bg-good-soft" : k === pick ? "bg-warn-soft" : "bg-surface";
          return (
            <button
              key={o}
              type="button"
              onClick={() => choose(k)}
              aria-pressed={pick === k}
              className={`block w-full rounded-lg border px-3 py-2 text-left text-sm break-words ${pick === k ? "border-accent" : "border-border"} ${tone}`}
            >
              <span className="font-mono text-xs text-muted">{k === 0 ? "A" : "B"} </span>
              {o}
            </button>
          );
        })}
      </div>

      {pick !== null && (
        <div className="mt-3 space-y-2 text-sm">
          <p className={`rounded-md p-2 ${pick === step.good ? "bg-good-soft" : "bg-warn-soft"}`}>
            <span className="font-semibold">{pick === step.good ? "Right. " : `Better: ${step.good === 0 ? "A" : "B"}. `}</span>
            {step.why}
          </p>
          <p className="rounded-md bg-surface-2 p-2">
            <span className="font-semibold text-accent">Common mistake: </span>
            {step.mistake}
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <Pill active={false} onClick={() => setI((k) => Math.max(0, k - 1))}>Back</Pill>
          <Pill active={pick !== null} onClick={() => setI((k) => Math.min(STEPS.length - 1, k + 1))}>Next step</Pill>
        </div>
        <p className="text-sm text-muted">
          {answered === STEPS.length ? `Done: ${correct} of ${STEPS.length} artifacts picked well.` : `${answered} of ${STEPS.length} steps answered`}
        </p>
      </div>
    </Widget>
  );
}

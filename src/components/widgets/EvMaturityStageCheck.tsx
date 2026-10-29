"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Q = { key: string; text: string; options: string[]; pass: number };

/** `pass` is the index of the first option that clears the gate (options are ordered weakest first). */
const QUESTIONS: Q[] = [
  {
    key: "good",
    text: "How is \"good\" defined for your product?",
    options: ["We eyeball outputs", "One broad \"is this good?\" rubric", "Narrow yes/no signals: constraints and goodness"],
    pass: 2,
  },
  {
    key: "accurate",
    text: "Have you checked that your scores tell good from bad?",
    options: ["No", "Spot-checked a few", "Yes: degraded responses score lower"],
    pass: 2,
  },
  {
    key: "sample",
    text: "What inputs do you score?",
    options: ["Handwritten or synthetic only", "Real user queries", "Real traffic with chosen slices"],
    pass: 1,
  },
  {
    key: "discern",
    text: "When you swap a model or prompt, do your scores move?",
    options: ["Never tried", "Tried, scores barely moved", "Yes, they separate the variants"],
    pass: 2,
  },
  {
    key: "aligned",
    text: "Do you compare scores against user feedback?",
    options: ["No feedback collected", "Collected, not compared", "Yes: good > meh > bad, weights calibrated"],
    pass: 2,
  },
  {
    key: "online",
    text: "Do scores drive the product itself?",
    options: ["Offline reports only", "Yes: ranking, best-of-n or reward model"],
    pass: 1,
  },
];

type Stage = { name: string; gate: string[]; next: Record<string, string> };

const STAGES: Stage[] = [
  {
    name: "Accurate",
    gate: ["good", "accurate"],
    next: {
      good: "Read your system prompt and expert docs. Write down core constraints (never do X) and goodness metrics, and split vague ones like \"professional\" into narrow yes/no questions.",
      accurate: "Take 10 good responses, make mild and severe degraded copies, and score all of them. Drop or rewrite any signal that doesn't fall with quality.",
    },
  },
  {
    name: "Discerning",
    gate: ["sample", "discern"],
    next: {
      sample: "Log real user queries and build your sample from them, keeping synthetic cases only for behaviors traffic rarely shows.",
      discern: "Run two models or prompt versions on the same real queries. If the scores barely differ where outputs clearly do, your metrics are blind: sharpen the questions.",
    },
  },
  {
    name: "Aligned",
    gate: ["aligned"],
    next: {
      aligned: "Add a thumbs up/meh/down control with an optional comment. Cluster comments into hypothesized signals, then check each signal rises from bad to meh to good and fit weights on about 10 rated examples per signal.",
    },
  },
  {
    name: "In the loop",
    gate: ["online"],
    next: {
      online: "With around 80% alignment, try best-of-n: generate a few candidates and show the top-scoring one. Keep your guardrails and principles in the score so it can't drift toward flattery.",
    },
  },
];

export function EvMaturityStageCheck() {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const passes = (k: string) => {
    const q = QUESTIONS.find((x) => x.key === k)!;
    return (answers[k] ?? -1) >= q.pass;
  };

  let reached = 0;
  while (reached < STAGES.length && STAGES[reached].gate.every(passes)) reached++;
  const blocker = reached < STAGES.length ? STAGES[reached] : null;
  const failing = blocker ? blocker.gate.filter((k) => !passes(k)) : [];
  const skipped = STAGES.slice(reached + 1).some((s) => s.gate.every(passes));
  const answered = Object.keys(answers).length;

  return (
    <Widget title="Where is your eval practice?" hint="Pick the answer closest to your team today. Stages stack: you're at the last one whose gate you fully pass.">
      <ol className="space-y-3">
        {QUESTIONS.map((q, i) => (
          <li key={q.key}>
            <p className="text-sm font-medium">
              {i + 1}. {q.text}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {q.options.map((o, j) => (
                <Pill key={o} active={answers[q.key] === j} onClick={() => setAnswers((a) => ({ ...a, [q.key]: j }))}>
                  {o}
                </Pill>
              ))}
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-4 grid grid-cols-5 gap-1 text-center text-[11px] sm:text-xs" aria-label="Maturity stages">
        {["Vibe checks", ...STAGES.map((s) => s.name)].map((name, k) => (
          <div
            key={name}
            className={`rounded-md border px-1 py-2 ${
              k === reached ? "border-accent bg-accent-soft font-semibold" : k < reached ? "border-good bg-good-soft" : "border-border bg-surface-2 text-muted"
            }`}
          >
            {name}
          </div>
        ))}
      </div>

      {answered === 0 ? (
        <p className="mt-3 text-sm text-muted">Answer the questions to see your stage.</p>
      ) : (
        <div className="mt-3 space-y-2 text-sm">
          <p>
            You are at <span className="font-semibold text-accent">{reached === 0 ? "vibe checks" : STAGES[reached - 1].name.toLowerCase()}</span>
            {reached === 0 ? ": no metric has been shown to track quality yet." : `: you've passed ${reached} of ${STAGES.length} gates.`}
          </p>
          {blocker ? (
            <div className="rounded-lg border border-border bg-surface-2 p-3">
              <p className="font-semibold">Next step toward &quot;{blocker.name}&quot;</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {failing.map((k) => (
                  <li key={k}>{blocker.next[k]}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="rounded-lg border border-good bg-good-soft p-3">
              Every gate passed. Keep re-checking alignment as users and models change, and watch for the reward drifting toward what users merely like.
            </p>
          )}
          {skipped && (
            <p className="rounded-lg border border-warn bg-warn-soft p-3">
              You pass a later gate while an earlier one is open. Scores that drive the product or face users without being accurate, discerning and aligned first can optimize the wrong thing, as ChatGPT&apos;s sycophancy episode showed.
            </p>
          )}
        </div>
      )}
    </Widget>
  );
}

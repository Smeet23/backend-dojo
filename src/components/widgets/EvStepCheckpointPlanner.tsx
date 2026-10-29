"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

const STEPS = [
  "Fetch 100 observations from the API",
  "Pick each observation's photo URL",
  "Fetch same-genus species, sample 4 distractors",
  "Shuffle options and build the prompt",
  "Call the model and parse its choice",
  "Compare to the answer and score",
];

type Bug = { name: string; step: number; seenAt: number[]; effect: number; symptom: string };

// step indexes are 0-based; seenAt = outputs in which the bug is visible to a reader
const BUGS: Bug[] = [
  {
    name: "Thumbnail photos",
    step: 1,
    seenAt: [1],
    effect: -10,
    symptom: "The URL ends in square.jpg: a tiny thumbnail, too small to identify a species.",
  },
  {
    name: "Duplicate distractors",
    step: 2,
    seenAt: [2, 3],
    effect: 4,
    symptom: "random.choices samples with replacement, so one species appears twice.",
  },
  {
    name: "Answer leaks into distractors",
    step: 2,
    seenAt: [2, 3],
    effect: 8,
    symptom: "The correct species is drawn as a distractor too, so it appears twice among the options.",
  },
  {
    name: "Case-sensitive comparison",
    step: 4,
    seenAt: [4],
    effect: -14,
    symptom: "The model answers \"ghost pipe\", the key says \"Ghost pipe\": a right answer is scored wrong.",
  },
];

const TRUE_ACC = 64;
const PRESETS: { label: string; on: boolean[] }[] = [
  { label: "One big prompt", on: [false, false, false, false, false, true] },
  { label: "Every other step", on: [false, true, false, true, false, true] },
  { label: "Every step", on: [true, true, true, true, true, true] },
];

export function EvStepCheckpointPlanner() {
  const [on, setOn] = useState<boolean[]>(PRESETS[0].on);

  const toggle = (i: number) => {
    if (i === STEPS.length - 1) return; // you always see the final score
    setOn((prev) => prev.map((v, k) => (k === i ? !v : v)));
  };

  const checkpoints = on.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
  const results = BUGS.map((b) => {
    const at = checkpoints.find((c) => c >= b.step && b.seenAt.includes(c));
    if (at === undefined) return { b, at: null as number | null, suspects: 0 };
    const prev = checkpoints.filter((c) => c < at).pop() ?? -1;
    return { b, at, suspects: at - prev };
  });
  const missed = results.filter((r) => r.at === null);
  const reported = TRUE_ACC + missed.reduce((s, r) => s + r.b.effect, 0);
  const presetIdx = PRESETS.findIndex((p) => p.on.every((v, k) => v === on[k]));

  return (
    <Widget
      title="Where do you look?"
      hint="Johno's species-ID eval with four planted bugs. Choose after which steps you inspect the output, and see which bugs you catch."
    >
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p, k) => (
          <Pill key={p.label} active={presetIdx === k} onClick={() => setOn(p.on)}>
            {p.label}
          </Pill>
        ))}
      </div>

      <ol className="mt-3 space-y-1.5">
        {STEPS.map((s, i) => {
          const caughtHere = results.filter((r) => r.at === i);
          const final = i === STEPS.length - 1;
          return (
            <li key={s} className="rounded-lg border border-border bg-surface-2 p-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-5 shrink-0 text-center text-xs text-muted">{i + 1}</span>
                <span className="flex-1">{s}</span>
                <button
                  type="button"
                  onClick={() => toggle(i)}
                  disabled={final}
                  aria-pressed={on[i]}
                  className={`min-h-8 shrink-0 rounded-full border px-2.5 text-xs ${
                    on[i] ? "border-accent bg-accent text-white dark:text-bg" : "border-border bg-surface"
                  } ${final ? "opacity-70" : ""}`}
                >
                  {final ? "score shown" : on[i] ? "inspect" : "skip"}
                </button>
              </div>
              {caughtHere.map((r) => (
                <p key={r.b.name} className="mt-1.5 rounded border border-good bg-good-soft px-2 py-1 text-xs">
                  Caught: <span className="font-semibold">{r.b.name}</span>. {r.b.symptom}{" "}
                  <span className="text-muted">
                    Steps to search: {r.suspects === 1 ? "just this one" : r.suspects}.
                  </span>
                </p>
              ))}
            </li>
          );
        })}
      </ol>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg border border-border p-2">
          <p className="text-xs text-muted">Inspections</p>
          <p className="text-lg font-semibold">{checkpoints.length}</p>
        </div>
        <div className="rounded-lg border border-border p-2">
          <p className="text-xs text-muted">Bugs caught</p>
          <p className="text-lg font-semibold">
            {BUGS.length - missed.length}/{BUGS.length}
          </p>
        </div>
        <div className={`rounded-lg border p-2 ${reported === TRUE_ACC ? "border-good bg-good-soft" : "border-warn bg-warn-soft"}`}>
          <p className="text-xs text-muted">Reported accuracy</p>
          <p className="text-lg font-semibold">{reported}%</p>
        </div>
      </div>

      {missed.length > 0 ? (
        <div className="mt-3 rounded-lg border border-warn bg-warn-soft p-3 text-sm">
          <p className="font-semibold">Shipped with {missed.length} silent bug{missed.length > 1 ? "s" : ""}:</p>
          <ul className="mt-1 list-disc pl-5">
            {missed.map((r) => (
              <li key={r.b.name}>
                {r.b.name} ({r.b.effect > 0 ? "+" : ""}
                {r.b.effect} points)
              </li>
            ))}
          </ul>
          <p className="mt-1 text-muted">
            The score still looks plausible, and nothing crashed. With the bugs fixed it would read {TRUE_ACC}%. The errors partly cancel,
            which is why a final number alone cannot tell you they are there.
          </p>
        </div>
      ) : (
        <p className="mt-3 rounded-lg border border-good bg-good-soft p-3 text-sm">
          Every bug caught where it was introduced, and the score ({TRUE_ACC}%) now measures the model. Numbers are illustrative.
        </p>
      )}
    </Widget>
  );
}

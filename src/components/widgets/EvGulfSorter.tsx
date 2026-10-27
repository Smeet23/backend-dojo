"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Gulf = "Comprehension" | "Specification" | "Generalization";
type Case = { text: string; answer: Gulf; why: string };

const GULFS: Gulf[] = ["Comprehension", "Specification", "Generalization"];

const CASES: Case[] = [
  {
    text: "The prompt says \"suggest an easy recipe.\" Some replies are 3-ingredient dishes, others are 15-minute dishes with 14 ingredients. Both readings are defensible.",
    answer: "Specification",
    why: "\"Easy\" was never defined, so the model guesses differently per request. Write down what easy means (time, ingredient count, technique).",
  },
  {
    text: "The bot nails vegan and vegetarian requests in testing. In production, a user asks for low-FODMAP and gets a garlic-and-onion soup.",
    answer: "Generalization",
    why: "The rule (respect dietary restrictions) was clear and worked on familiar cases. The model didn't carry the principle over to a less common diet.",
  },
  {
    text: "The team tracked how much recruiters edited AI-drafted emails. Edits were often non-native speakers making the text less correct, so \"less editing\" wasn't \"better.\"",
    answer: "Comprehension",
    why: "Nobody had read the actual edits. The metric rested on an assumption about the data that looking would have disproved.",
  },
  {
    text: "An email extractor is told to return the sender's name. For emails that mention a celebrity in the body, it sometimes returns the celebrity.",
    answer: "Generalization",
    why: "The instruction is unambiguous; the model misapplies it on a certain kind of input. Decomposing (parse headers in code) or a stronger model helps.",
  },
  {
    text: "Outputs come back as free-form Markdown and your parser crashes. The prompt never mentions a format.",
    answer: "Specification",
    why: "You can't blame the model for a requirement you never stated. Specify the format, or use structured outputs. Fix this before error analysis.",
  },
  {
    text: "Developers assumed support customers describe their problem in detail. Real transcripts are three angry words long, and summaries are mostly invented.",
    answer: "Comprehension",
    why: "The pipeline was designed for inputs that don't exist. Reading real transcripts revealed the true input distribution.",
  },
  {
    text: "Six months in, nobody on the team can say which kinds of queries the bot gets most, because no one has opened the logs since launch.",
    answer: "Comprehension",
    why: "With thousands of free-text queries a day, you need a habit and tooling for reviewing data, or you're blind to what users actually ask.",
  },
  {
    text: "The prompt for a customer-support bot starts with \"You are a data scientist analyzing...\" because that's who wrote the first draft.",
    answer: "Specification",
    why: "The prompt doesn't describe the task you actually want. A human reading it once would have caught it.",
  },
  {
    text: "The bot handles 2 constraints at once (\"vegetarian, under 30 minutes\") and 3 at once fine, but with 4 constraints it silently drops one, though the prompt says to honor all of them.",
    answer: "Generalization",
    why: "Clear instructions, inconsistent execution on harder inputs. Typical fixes: split the task into steps, add a check, or try a stronger model.",
  },
];

export function EvGulfSorter() {
  const [picks, setPicks] = useState<(Gulf | null)[]>(() => CASES.map(() => null));
  const [i, setI] = useState(0);
  const c = CASES[i];
  const pick = picks[i];
  const done = picks.filter((p) => p !== null).length;
  const right = picks.filter((p, k) => p === CASES[k].answer).length;

  const choose = (g: Gulf) => setPicks((prev) => prev.map((p, k) => (k === i ? g : p)));

  return (
    <Widget title="Which gulf is this?" hint="Read each real-world failure and decide which gulf it comes from. Then see why.">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>
          Case {i + 1} of {CASES.length}
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
              aria-label={`Case ${k + 1}`}
              className={`h-3 w-6 rounded ${tone} ${k === i ? "ring-2 ring-accent" : ""}`}
            />
          );
        })}
      </div>

      <p className="mt-3 rounded-lg border border-border bg-surface-2 p-3 text-sm leading-relaxed">{c.text}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {GULFS.map((g) => (
          <Pill key={g} active={pick === g} onClick={() => choose(g)}>
            {g}
          </Pill>
        ))}
      </div>

      {pick && (
        <div className={`mt-3 rounded-lg border p-3 text-sm ${pick === c.answer ? "border-good bg-good-soft" : "border-bad bg-bad-soft"}`}>
          <p className="font-semibold">{pick === c.answer ? "Right: " : `Not quite, it's ${c.answer}: `}</p>
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
          Score {right}/{CASES.length}. A rule of thumb: if the prompt never said it, it&apos;s specification. If the prompt said it and the model
          still fumbled certain inputs, it&apos;s generalization. If you didn&apos;t know the data looked like that, it&apos;s comprehension.
        </p>
      )}
    </Widget>
  );
}

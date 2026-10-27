"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Choice = "Fix the prompt" | "Code eval" | "LLM judge";
type Case = { text: string; answer: Choice; why: string };

const CHOICES: Choice[] = ["Fix the prompt", "Code eval", "LLM judge"];

const CASES: Case[] = [
  {
    text: "The agent calls a tool named reschedule_tour. The only tools you expose are schedule_tour, get_tour_availability and a dozen others.",
    answer: "Code eval",
    why: "You know the full tool list from your schemas. Any name outside it is a failure: a set lookup, cheap enough to run as a guardrail.",
  },
  {
    text: "A user asks about the pool. The agent confirms there is one but offers no photos or link. The system prompt never mentions sharing amenity photos.",
    answer: "Fix the prompt",
    why: "Specification failure: the model was never asked to do it. Add the instruction, then measure whether it sticks.",
  },
  {
    text: "On vague questions like \"what do you have?\", the agent replies with generic facts and stops instead of asking about budget or move-in date.",
    answer: "LLM judge",
    why: "Whether a reply moves the user forward needs interpretation. A judge with crisp pass/fail definitions from your open codes is the right tool.",
  },
  {
    text: "Tours get booked for the wrong day. You notice the prompt does not include today's date.",
    answer: "Fix the prompt",
    why: "An obvious fix you are nearly certain will work. Take the low-hanging fruit before building anything.",
  },
  {
    text: "Replies sometimes say \"I checked our Snowflake warehouse and...\". Users should never see which database you use.",
    answer: "Code eval",
    why: "A keyword match for database names (and internal IDs) catches it deterministically. No LLM needed.",
  },
  {
    text: "The agent claims the property takes part in an affordable-housing program, but nothing in the tool results says so.",
    answer: "LLM judge",
    why: "Deciding whether each claim is backed by tool data means reading and comparing meaning. That is a judge task, and a hard one to align.",
  },
  {
    text: "The agent must return its final answer as JSON with listing_id and price. Some outputs are missing price or don't parse.",
    answer: "Code eval",
    why: "Parsing and schema checks don't need to understand meaning. json.loads plus a key check is exact and free.",
  },
  {
    text: "The prompt clearly says to honor every filter the user states. Users say \"pets allowed, under $2,000\" and the generated query sometimes drops the price filter.",
    answer: "Code eval",
    why: "Generalization failure, so it deserves an eval, and it's objective: check that a price filter appears when the user named a price.",
  },
];

export function EvEvaluatorSorter() {
  const [picks, setPicks] = useState<(Choice | null)[]>(() => CASES.map(() => null));
  const [i, setI] = useState(0);
  const c = CASES[i];
  const pick = picks[i];
  const done = picks.filter((p) => p !== null).length;
  const right = picks.filter((p, k) => p === CASES[k].answer).length;

  const choose = (g: Choice) => setPicks((prev) => prev.map((p, k) => (k === i ? g : p)));

  return (
    <Widget title="Fix, code, or judge?" hint="For each leasing-assistant failure, decide: fix the prompt, write a code eval, or build an LLM judge.">
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
        {CHOICES.map((g) => (
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
          Score {right}/{CASES.length}. The order of questions: did the prompt ever ask for it (if not, fix the prompt)? Can a rule check it
          exactly (code eval)? Only then reach for an LLM judge.
        </p>
      )}
    </Widget>
  );
}

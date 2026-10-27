"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Choice = "Guardrail" | "Async eval";
type Case = { text: string; answer: Choice; latency: string; cost: string; fp: string; why: string };

const CHOICES: Choice[] = ["Guardrail", "Async eval"];

const CASES: Case[] = [
  {
    text: "Before the assistant sends an email to a client, check the body for anything shaped like a social security number (ddd-dd-dddd).",
    answer: "Guardrail",
    latency: "< 1 ms (regex)",
    cost: "Free",
    fp: "Very low",
    why: "Leaking an SSN cannot be undone after the email goes out, and a regex is instant and almost never wrong. Block it in the request path: Reject and return a safe message.",
  },
  {
    text: "Judge whether the assistant's reply matches the warm, professional persona the agent configured.",
    answer: "Async eval",
    latency: "1 to 3 s (LLM judge)",
    cost: "A judge call per trace",
    fp: "Moderate (subjective)",
    why: "Tone is subjective, so even a well-aligned judge has a real false-fail rate, and a slightly off tone is not dangerous. Score a sample after the fact and track the corrected rate.",
  },
  {
    text: "The agent writes SQL against the listings database. Check that it parses before running it.",
    answer: "Guardrail",
    latency: "A few ms (parser)",
    cost: "Free",
    fp: "Near zero",
    why: "A parser is deterministic and fast, and invalid SQL would break the request anyway. Retry once; if the retry also fails, fall back to asking the user to rephrase.",
  },
  {
    text: "Detect whether the agent claimed to have called a tool (\"I checked the calendar\") without actually calling it.",
    answer: "Async eval",
    latency: "1 to 3 s (LLM judge)",
    cost: "A judge call per trace",
    fp: "Moderate",
    why: "Spotting a hallucinated tool claim means reading the reply against the trace. That is a judge, too slow and too noisy for the request path. Run it on 1 to 5% of traces and dashboard the rate.",
  },
  {
    text: "The final answer must be JSON with listing_id and price, because the front end renders it.",
    answer: "Guardrail",
    latency: "< 1 ms (json parse + keys)",
    cost: "Free",
    fp: "Zero",
    why: "A strict format constraint is a textbook guardrail: exact, instant, and a malformed answer would break the page. Retry is a good first action since generation is nondeterministic.",
  },
  {
    text: "Check that property descriptions don't state features that contradict the listing data (\"open yard\" when the listing has none).",
    answer: "Async eval",
    latency: "1 to 3 s (LLM judge)",
    cost: "A judge call per trace",
    fp: "Moderate",
    why: "Factual consistency needs meaning-level comparison, so it is a judge. It belongs in CI on golden examples and as an async eval online. Blocking on it would add seconds and reject good answers.",
  },
];

export function EvCicdGuardrailSorter() {
  const [picks, setPicks] = useState<(Choice | null)[]>(() => CASES.map(() => null));
  const [i, setI] = useState(0);
  const c = CASES[i];
  const pick = picks[i];
  const done = picks.filter((p) => p !== null).length;
  const right = picks.filter((p, k) => p === CASES[k].answer).length;

  const choose = (g: Choice) => setPicks((prev) => prev.map((p, k) => (k === i ? g : p)));

  return (
    <Widget
      title="Guardrail or async eval?"
      hint="Real estate assistant checks. Decide which should block the request in real time and which should score sampled traces afterwards."
    >
      <div className="flex items-center justify-between text-xs text-muted">
        <span>
          Check {i + 1} of {CASES.length}
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
              aria-label={`Check ${k + 1}`}
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
          <p className="font-semibold">{pick === c.answer ? "Right." : `Better as: ${c.answer}.`}</p>
          <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
            <div>
              <dt className="text-muted">Added latency</dt>
              <dd className="font-mono">{c.latency}</dd>
            </div>
            <div>
              <dt className="text-muted">Cost</dt>
              <dd className="font-mono">{c.cost}</dd>
            </div>
            <div>
              <dt className="text-muted">False fails</dt>
              <dd className="font-mono">{c.fp}</dd>
            </div>
          </dl>
          <p className="mt-2">{c.why}</p>
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
          Score {right}/{CASES.length}. The pattern: guardrails are fast, deterministic and nearly never wrong, and they guard harm you cannot
          undo or output that would break anyway. Everything that needs judgment goes async.
        </p>
      )}
    </Widget>
  );
}

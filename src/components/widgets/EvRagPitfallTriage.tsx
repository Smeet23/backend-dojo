"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Pitfall = "Coverage" | "Extraction" | "Chunking" | "Query" | "Sufficiency" | "Hallucination" | "Data change";
type Case = { symptom: string; answer: Pitfall; check: string; fix: string };

const PITFALLS: { id: Pitfall; stage: string }[] = [
  { id: "Coverage", stage: "Indexing" },
  { id: "Extraction", stage: "Indexing" },
  { id: "Chunking", stage: "Indexing" },
  { id: "Query", stage: "Query" },
  { id: "Sufficiency", stage: "Retrieval" },
  { id: "Hallucination", stage: "Generation" },
  { id: "Data change", stage: "Over time" },
];
const STAGES = ["Indexing", "Query", "Retrieval", "Generation", "Over time"];

const CASES: Case[] = [
  {
    symptom: "Every question about third-party integrations (Salesforce, HubSpot, Zendesk) gets a vague answer. Swapping the embedding model and adding a reranker changed nothing.",
    answer: "Coverage",
    check: "Search a wide net (k=50) for each integration query and judge whether any relevant chunk exists. Integrations: 0 of 14.",
    fix: "Write or ingest the missing docs. Until then, decline these questions instead of improvising.",
  },
  {
    symptom: "Setup answers mix instructions from two different guides: step 2 says to create an API key, step 3 configures a webhook for an unrelated product.",
    answer: "Chunking",
    check: "Look at the retrieved chunks: each numbered step is its own tiny chunk, so steps from different pages get retrieved together.",
    fix: "Chunk on document structure, or skip chunking: short help pages can be indexed whole.",
  },
  {
    symptom: "Pricing answers quote numbers that don't match the plan table in the source PDF, but the model faithfully repeats what is in its context.",
    answer: "Extraction",
    check: "Put the PDF next to the extracted Markdown. The table was flattened and its columns shifted.",
    fix: "Change the extraction tool or handle tables specially, then add a code check (row counts, column counts).",
  },
  {
    symptom: "Logs show the same chunk (\"Authentication overview\") appears in the context for roughly 80% of all queries.",
    answer: "Chunking",
    check: "Track retrieval frequency per chunk and read the outliers at both ends.",
    fix: "If it is useful context for nearly every query, move it into the prompt instead of retrieving it.",
  },
  {
    symptom: "A user types \"thing broken\". The bot retrieves a troubleshooting page for a different product and answers confidently. The user retries three times.",
    answer: "Query",
    check: "Seed the eval set with vague queries and measure the elicitation rate. Also measure false alarms on clear queries.",
    fix: "Detect underspecified queries and ask a clarifying question (or say you don't understand) before retrieving.",
  },
  {
    symptom: "Precision@10 is 0.8 and every retrieved chunk is about the right API. Yet answers about the free-plan quota state a number that appears nowhere in the context.",
    answer: "Sufficiency",
    check: "Read only the retrieved context and ask: could I answer from this alone? On-topic chunks, but none states the quota.",
    fix: "Find why the fact is missing: absent doc, split chunk, too-small k, or a query that needs rewriting.",
  },
  {
    symptom: "Answers include citations like [doc-212]. A spot check finds doc-212 was never in the retrieved set, and another citation points to a page that doesn't support the sentence.",
    answer: "Hallucination",
    check: "Two checks per citation: it exists in the context (code), and it supports its sentence (LLM judge or semantic validator).",
    fix: "Track both failure rates over time, and fix the prompt or context ordering where they spike.",
  },
  {
    symptom: "Last week the eval passed 92%. This week it is 81%, with no change to prompt, model or retriever. Failures cluster on rate-limit questions.",
    answer: "Data change",
    check: "Check when the source docs last changed. The rate limit went from 1,000 to 2,500 requests per minute, so the gold answers are stale.",
    fix: "Version the index, log the version with every eval run, and tie gold labels to a document version.",
  },
  {
    symptom: "Twenty chunks in the index contain only \"(c) 2024 Acme Inc. Privacy | Terms | Status\" and show up in the context of unrelated queries.",
    answer: "Chunking",
    check: "Sort chunks by length and read the smallest: they are page footers.",
    fix: "Strip boilerplate during extraction and drop near-empty chunks.",
  },
];

export function EvRagPitfallTriage() {
  const [picks, setPicks] = useState<(Pitfall | null)[]>(() => CASES.map(() => null));
  const [i, setI] = useState(0);
  const c = CASES[i];
  const pick = picks[i];
  const done = picks.filter((p) => p !== null).length;
  const right = picks.filter((p, k) => p === CASES[k].answer).length;
  const stage = PITFALLS.find((p) => p.id === c.answer)?.stage;

  const choose = (p: Pitfall) => setPicks((prev) => prev.map((x, k) => (k === i ? p : x)));

  return (
    <Widget title="Which pitfall is this?" hint="Read the symptom from a production RAG system, pick the pitfall, then see how to confirm it and what fixes it.">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>
          Symptom {i + 1} of {CASES.length}
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
              aria-label={`Symptom ${k + 1}`}
              className={`h-3 w-6 rounded ${tone} ${k === i ? "ring-2 ring-accent" : ""}`}
            />
          );
        })}
      </div>

      <p className="mt-3 rounded-lg border border-border bg-surface-2 p-3 text-sm leading-relaxed">{c.symptom}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {PITFALLS.map((p) => (
          <Pill key={p.id} active={pick === p.id} onClick={() => choose(p.id)}>
            {p.id}
          </Pill>
        ))}
      </div>

      {pick && (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap items-center gap-1 text-xs" aria-label="Pipeline stage">
            {STAGES.map((s, k) => (
              <span key={s} className="flex items-center gap-1">
                <span
                  className={`rounded px-2 py-1 ${s === stage ? "bg-accent font-semibold text-white dark:text-bg" : "bg-surface-2 text-muted"}`}
                >
                  {s}
                </span>
                {k < STAGES.length - 1 && <span className="text-muted">→</span>}
              </span>
            ))}
          </div>
          <div className={`rounded-lg border p-3 text-sm ${pick === c.answer ? "border-good bg-good-soft" : "border-bad bg-bad-soft"}`}>
            <p className="font-semibold">{pick === c.answer ? `Right: ${c.answer}` : `Not quite, it's ${c.answer}`}</p>
            <p className="mt-1">
              <span className="font-medium">Confirm it: </span>
              {c.check}
            </p>
            <p className="mt-1">
              <span className="font-medium">Fix: </span>
              {c.fix}
            </p>
          </div>
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
          Score {right}/{CASES.length}. Five of the nine started at indexing (coverage, extraction, chunking), the stage teams evaluate
          least and where many silent failures begin.
        </p>
      )}
    </Widget>
  );
}

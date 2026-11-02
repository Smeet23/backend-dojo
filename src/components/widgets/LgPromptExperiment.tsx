"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type PromptKind = "strict" | "lenient";
type K = 1 | 4;
type Result = { answer: string; correct: boolean; faithful: boolean };

const EXAMPLES = [
  { q: "How many days of annual leave do I get?", ref: "18 days" },
  { q: "What is the notice period after confirmation?", ref: "90 days" },
  { q: "Is dental covered by health insurance?", ref: "Only for accidents" },
  { q: "How many WFH days are allowed per week?", ref: "2 days" },
  { q: "Can I carry unused leave into next year?", ref: "Not in the handbook: should say it doesn't know" },
];

/** Pre-computed outputs for each configuration, so the demo is deterministic. */
const OUTPUTS: Record<`${PromptKind}-${K}`, Result[]> = {
  "strict-4": [
    { answer: "You get 18 days of paid annual leave.", correct: true, faithful: true },
    { answer: "The notice period is 90 days.", correct: true, faithful: true },
    { answer: "Dental is covered only for accidental injury.", correct: true, faithful: true },
    { answer: "Up to 2 WFH days a week.", correct: true, faithful: true },
    { answer: "I don't know; the handbook doesn't say.", correct: true, faithful: true },
  ],
  "strict-1": [
    { answer: "You get 18 days of paid annual leave.", correct: true, faithful: true },
    { answer: "I don't know; the context doesn't mention it.", correct: false, faithful: true },
    { answer: "Dental is covered under health insurance.", correct: false, faithful: true },
    { answer: "Up to 2 WFH days a week.", correct: true, faithful: true },
    { answer: "I don't know; the handbook doesn't say.", correct: true, faithful: true },
  ],
  "lenient-4": [
    { answer: "You get 18 days of paid annual leave.", correct: true, faithful: true },
    { answer: "The notice period is 90 days.", correct: true, faithful: true },
    { answer: "Dental is covered only for accidental injury.", correct: true, faithful: true },
    { answer: "Up to 2 WFH days a week.", correct: true, faithful: true },
    { answer: "Yes, up to 10 days usually carry over.", correct: false, faithful: false },
  ],
  "lenient-1": [
    { answer: "You get 18 days of paid annual leave.", correct: true, faithful: true },
    { answer: "Typically 30 days, as at most companies.", correct: false, faithful: false },
    { answer: "Yes, dental is fully covered.", correct: false, faithful: false },
    { answer: "Up to 2 WFH days a week.", correct: true, faithful: true },
    { answer: "Yes, up to 10 days usually carry over.", correct: false, faithful: false },
  ],
};

type Experiment = { name: string; correct: number; faithful: number };

export function LgPromptExperiment() {
  const [prompt, setPrompt] = useState<PromptKind>("strict");
  const [k, setK] = useState<K>(4);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const key = `${prompt}-${k}` as const;
  const rows = OUTPUTS[key];
  const correct = rows.filter((r) => r.correct).length;
  const faithful = rows.filter((r) => r.faithful).length;

  function record() {
    const name = `${prompt}-prompt · k=${k}`;
    setExperiments((e) => [...e.filter((x) => x.name !== name), { name, correct, faithful }]);
  }

  return (
    <Widget title="Experiment on a dataset" hint="An HR-policy dataset of 5 questions, scored by two evaluators. Change the prompt or retriever k, run the experiment and compare.">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">System prompt:</span>
        <Pill active={prompt === "strict"} onClick={() => setPrompt("strict")}>
          Strict: only from context
        </Pill>
        <Pill active={prompt === "lenient"} onClick={() => setPrompt("lenient")}>
          Lenient: use context if helpful
        </Pill>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">Retriever k:</span>
        <Pill active={k === 1} onClick={() => setK(1)}>
          k = 1
        </Pill>
        <Pill active={k === 4} onClick={() => setK(4)}>
          k = 4
        </Pill>
      </div>

      <ul className="mt-3 space-y-2">
        {EXAMPLES.map((ex, i) => (
          <li key={i} className="rounded-lg border border-border p-2 text-sm">
            <p className="font-medium break-words">{ex.q}</p>
            <p className="mt-0.5 text-xs text-muted break-words">Reference: {ex.ref}</p>
            <p className="mt-1 rounded bg-surface-2 px-2 py-1 text-xs break-words">{rows[i].answer}</p>
            <div className="mt-1 flex flex-wrap gap-2 text-[0.7rem]">
              <span className={`rounded px-1.5 py-0.5 ${rows[i].correct ? "bg-good-soft" : "bg-bad-soft"}`}>correctness: {rows[i].correct ? "pass" : "fail"}</span>
              <span className={`rounded px-1.5 py-0.5 ${rows[i].faithful ? "bg-good-soft" : "bg-bad-soft"}`}>faithfulness: {rows[i].faithful ? "pass" : "fail"}</span>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <p className="text-sm">
          Correctness <span className="font-mono">{correct}/5</span> · Faithfulness <span className="font-mono">{faithful}/5</span>
        </p>
        <button type="button" onClick={record} className="min-h-10 rounded-lg bg-accent px-3 text-sm font-medium text-white dark:text-bg">
          Save as experiment
        </button>
        {experiments.length > 0 && (
          <button type="button" onClick={() => setExperiments([])} className="min-h-10 rounded-lg border border-border px-3 text-sm hover:bg-surface-2">
            Clear
          </button>
        )}
      </div>

      {experiments.length > 0 && (
        <div className="mt-3 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-2">
              <tr>
                <th className="px-2 py-1 font-semibold">Experiment</th>
                <th className="px-2 py-1 font-semibold">Correctness</th>
                <th className="px-2 py-1 font-semibold">Faithfulness</th>
              </tr>
            </thead>
            <tbody>
              {experiments.map((e) => (
                <tr key={e.name} className="border-t border-border">
                  <td className="px-2 py-1 font-mono">{e.name}</td>
                  <td className="px-2 py-1">{e.correct}/5</td>
                  <td className="px-2 py-1">{e.faithful}/5</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-xs text-muted">
        A small k makes answers incomplete (a retriever problem). A lenient prompt makes the model invent answers (a generator problem). The faithfulness evaluator tells them apart.
      </p>
    </Widget>
  );
}

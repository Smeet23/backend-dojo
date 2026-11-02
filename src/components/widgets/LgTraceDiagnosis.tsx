"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Run = {
  name: string;
  type: string;
  depth: number;
  start: number;
  dur: number;
  tokens?: number;
  cost?: number;
  input: string;
  output: string;
};
type Scenario = {
  label: string;
  complaint: string;
  unit: string;
  runs: Run[];
  culprits: string[];
  verdict: string;
};

const SCENARIOS: Record<string, Scenario> = {
  slow: {
    label: "Slow cover letters",
    complaint: "Users say cover letters now take 7–10 minutes instead of about 2.",
    unit: "s",
    runs: [
      { name: "cover_letter_app", type: "chain", depth: 0, start: 0, dur: 452, tokens: 9120, cost: 0.011, input: "jd_url=…/backend-engineer", output: "Dear Hiring Manager, …" },
      { name: "read_job_description", type: "llm", depth: 1, start: 0, dur: 6, tokens: 2100, cost: 0.002, input: "Summarise the requirements in this JD…", output: "Python, FastAPI, Postgres, 2+ yrs" },
      { name: "fetch_portfolio", type: "tool", depth: 1, start: 6, dur: 410, input: "{ folder: \"/\" }   ← last week: \"/career\"", output: "Scanned 18,204 files, kept 6 documents" },
      { name: "match_skills", type: "llm", depth: 1, start: 416, dur: 9, tokens: 2600, cost: 0.003, input: "JD summary + 6 documents", output: "Matched: FastAPI project, Postgres internship" },
      { name: "draft_letter", type: "llm", depth: 1, start: 425, dur: 18, tokens: 3020, cost: 0.004, input: "Write a cover letter using…", output: "Dear Hiring Manager, …" },
      { name: "proofread", type: "llm", depth: 1, start: 443, dur: 9, tokens: 1400, cost: 0.002, input: "Check tone and errors…", output: "2 fixes applied" },
    ],
    culprits: ["fetch_portfolio"],
    verdict: "fetch_portfolio takes 410 s of 452 s, and its input shows it scanning the whole drive (\"/\") instead of one folder. The LLM steps are as fast as ever.",
  },
  cost: {
    label: "Expensive reports",
    complaint: "Some research reports cost ₹2 instead of ₹0.50. No errors anywhere.",
    unit: "s",
    runs: [
      { name: "research_agent", type: "chain", depth: 0, start: 0, dur: 96, tokens: 61400, cost: 0.024, input: "topic: perovskite solar cells", output: "Report (1,900 words)…" },
      { name: "search_papers", type: "tool", depth: 1, start: 0, dur: 4, input: "perovskite solar cells", output: "12 papers" },
      { name: "write_report", type: "llm", depth: 1, start: 4, dur: 20, tokens: 15200, cost: 0.006, input: "12 papers + instructions", output: "Draft report v1" },
      { name: "critique_report", type: "llm", depth: 1, start: 24, dur: 4, tokens: 2100, cost: 0.001, input: "Is this excellent? Keep improving until it is excellent.", output: "7/10. Not excellent yet → search again" },
      { name: "search_papers", type: "tool", depth: 1, start: 28, dur: 4, input: "perovskite stability 2024", output: "12 papers" },
      { name: "write_report", type: "llm", depth: 1, start: 32, dur: 22, tokens: 17800, cost: 0.007, input: "24 papers + draft v1", output: "Draft report v2" },
      { name: "critique_report", type: "llm", depth: 1, start: 54, dur: 4, tokens: 2400, cost: 0.001, input: "Is this excellent? Keep improving until it is excellent.", output: "8/10. Not excellent yet → search again" },
      { name: "search_papers", type: "tool", depth: 1, start: 58, dur: 4, input: "perovskite efficiency records", output: "12 papers" },
      { name: "write_report", type: "llm", depth: 1, start: 62, dur: 30, tokens: 21300, cost: 0.008, input: "36 papers + draft v2", output: "Draft report v3" },
      { name: "critique_report", type: "llm", depth: 1, start: 92, dur: 4, tokens: 2600, cost: 0.001, input: "Is this excellent? Keep improving until it is excellent.", output: "9/10. Excellent → finish" },
    ],
    culprits: ["critique_report"],
    verdict: "The loop repeats because critique_report keeps answering \"not excellent yet\". Its input shows the new instruction to keep improving until excellent. Each pass re-reads more papers, so tokens and cost climb.",
  },
  retriever: {
    label: "HR bot: wrong notice period",
    complaint: "Asked about the notice period, the bot said there is no fixed notice period.",
    unit: "s",
    runs: [
      { name: "hr_rag_query", type: "chain", depth: 0, start: 0, dur: 2.1, tokens: 640, cost: 0.0004, input: "What is the notice period after confirmation?", output: "There is no fixed notice period; speak to your manager." },
      { name: "retriever (k=1)", type: "retriever", depth: 1, start: 0, dur: 0.3, input: "What is the notice period after confirmation?", output: "[1 doc] \"Company history: founded in 1968 in Mumbai…\"" },
      { name: "ChatPromptTemplate", type: "prompt", depth: 1, start: 0.3, dur: 0.01, input: "question + 1 context chunk", output: "System: Answer only from the context… Context: Company history…" },
      { name: "ChatOpenAI", type: "llm", depth: 1, start: 0.31, dur: 1.7, tokens: 640, cost: 0.0004, input: "(the prompt above)", output: "There is no fixed notice period; speak to your manager." },
    ],
    culprits: ["retriever (k=1)"],
    verdict: "Retriever error. With k=1 it returned a company-history chunk with nothing about notice periods, so the model never saw the answer. Raise k or fix chunking or embeddings; the prompt isn't the issue.",
  },
  generator: {
    label: "HR bot: unlimited leave",
    complaint: "Asked about annual leave, the bot said there's no limit.",
    unit: "s",
    runs: [
      { name: "hr_rag_query", type: "chain", depth: 0, start: 0, dur: 2.4, tokens: 1310, cost: 0.0008, input: "How many days of annual leave do I get?", output: "There's no limit, take leave whenever you need!" },
      { name: "retriever (k=4)", type: "retriever", depth: 1, start: 0, dur: 0.3, input: "How many days of annual leave do I get?", output: "[4 docs] \"Employees receive 18 days of paid annual leave…\" …" },
      { name: "ChatPromptTemplate", type: "prompt", depth: 1, start: 0.3, dur: 0.01, input: "question + 4 context chunks", output: "System: Use the context if it seems helpful, otherwise answer freely. …" },
      { name: "ChatOpenAI", type: "llm", depth: 1, start: 0.31, dur: 2.0, tokens: 1310, cost: 0.0008, input: "(the prompt above)", output: "There's no limit, take leave whenever you need!" },
    ],
    culprits: ["ChatPromptTemplate", "ChatOpenAI"],
    verdict: "Generator error. The retriever found the right chunk (18 days), but the prompt only says \"use the context if helpful\" and the model answered freely. Restore the strict \"answer only from the context\" instruction.",
  },
};

export function LgTraceDiagnosis() {
  const [key, setKey] = useState<keyof typeof SCENARIOS>("slow");
  const [sel, setSel] = useState(0);
  const [guess, setGuess] = useState<string | null>(null);
  const sc = SCENARIOS[key];
  const total = sc.runs[0].start + sc.runs[0].dur;
  const run = sc.runs[sel];

  function pick(k: keyof typeof SCENARIOS) {
    setKey(k);
    setSel(0);
    setGuess(null);
  }

  const children = sc.runs.slice(1);
  const correct = guess !== null && sc.culprits.includes(guess);

  return (
    <Widget title="Trace explorer" hint="Pick a complaint, open the trace, click runs to inspect them, then name the culprit.">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(SCENARIOS) as (keyof typeof SCENARIOS)[]).map((k) => (
          <Pill key={k} active={key === k} onClick={() => pick(k)}>
            {SCENARIOS[k].label}
          </Pill>
        ))}
      </div>
      <p className="mt-3 rounded-lg bg-warn-soft px-3 py-2 text-sm">{sc.complaint}</p>

      <div className="mt-3 space-y-1">
        {sc.runs.map((r, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setSel(i)}
            className={`flex min-h-10 w-full items-center gap-2 rounded-md border px-2 text-left ${sel === i ? "border-accent bg-accent-soft" : "border-border hover:bg-surface-2"}`}
          >
            <span className="w-28 shrink-0 truncate font-mono text-[0.7rem] sm:w-44" style={{ paddingLeft: `${r.depth * 0.75}rem` }}>
              {r.name}
            </span>
            <span className="relative h-3 min-w-0 flex-1 rounded bg-surface-2">
              <span
                className={`absolute top-0 h-3 rounded ${r.depth === 0 ? "bg-muted/40" : "bg-accent"}`}
                style={{ left: `${(r.start / total) * 100}%`, width: `${Math.max((r.dur / total) * 100, 1)}%` }}
              />
            </span>
            <span className="w-14 shrink-0 text-right font-mono text-[0.7rem]">
              {r.dur}
              {sc.unit}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-3 rounded-lg border border-border p-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="font-mono text-sm font-semibold break-all">{run.name}</p>
          <span className="rounded bg-surface-2 px-1.5 text-[0.7rem]">{run.type}</span>
          <span className="text-xs text-muted">
            {run.dur}
            {sc.unit}
            {run.tokens !== undefined && ` · ${run.tokens.toLocaleString()} tokens`}
            {run.cost !== undefined && ` · $${run.cost.toFixed(4)}`}
          </span>
        </div>
        <p className="mt-2 text-xs font-semibold text-muted">Input</p>
        <pre className="mt-0.5 rounded bg-surface-2 p-2 font-mono text-[0.7rem] whitespace-pre-wrap break-all">{run.input}</pre>
        <p className="mt-2 text-xs font-semibold text-muted">Output</p>
        <pre className="mt-0.5 rounded bg-surface-2 p-2 font-mono text-[0.7rem] whitespace-pre-wrap break-all">{run.output}</pre>
      </div>

      <p className="mt-3 text-sm font-medium">Which run is the culprit?</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {Array.from(new Set(children.map((r) => r.name))).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setGuess(n)}
            className={`min-h-10 rounded-lg border px-3 font-mono text-[0.72rem] ${guess === n ? (correct ? "border-good bg-good-soft" : "border-bad bg-bad-soft") : "border-border hover:bg-surface-2"}`}
          >
            {n}
          </button>
        ))}
      </div>
      {guess !== null && (
        <p className={`mt-2 rounded-lg px-3 py-2 text-sm ${correct ? "bg-good-soft" : "bg-bad-soft"}`}>
          {correct ? sc.verdict : "Not quite. Compare durations, token counts and what each run actually received."}
        </p>
      )}
    </Widget>
  );
}

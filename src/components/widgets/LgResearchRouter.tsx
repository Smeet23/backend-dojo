"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Mode = "closed_book" | "hybrid" | "open_book";
type Topic = { label: string; mode: Mode; why: string; queries: string[]; dupRate: number };

const TOPICS: Topic[] = [
  { label: "How self-attention works", mode: "closed_book", why: "Evergreen concept; the model already knows it and it hasn't changed.", queries: [], dupRate: 0 },
  {
    label: "Open-source LLMs explained",
    mode: "hybrid",
    why: "The concept is stable, but useful examples (which models exist now) are recent.",
    queries: ["leading open-weight LLMs released this year", "open-weight LLM licenses comparison", "open vs proprietary LLM benchmark results"],
    dupRate: 0.2,
  },
  {
    label: "Top AI news this week",
    mode: "open_book",
    why: "Volatile; the whole post is recent facts. The time constraint goes into every query.",
    queries: ["major AI model releases this week", "AI company announcements this week", "AI research papers trending this week", "AI regulation news this week", "AI funding rounds this week"],
    dupRate: 0.35,
  },
  {
    label: "How ChatGPT evolved since 2022",
    mode: "hybrid",
    why: "History is partly known, but recent versions and features need checking.",
    queries: ["ChatGPT version releases timeline", "ChatGPT new features by year", "OpenAI ChatGPT announcements", "ChatGPT usage statistics growth"],
    dupRate: 0.3,
  },
];

const MODE_TONE: Record<Mode, string> = { closed_book: "border-good bg-good-soft", hybrid: "border-warn bg-warn-soft", open_book: "border-accent bg-accent-soft" };

export function LgResearchRouter() {
  const [i, setI] = useState(0);
  const [k, setK] = useState(5);
  const topic = TOPICS[i];
  const research = topic.mode !== "closed_book";
  const raw = topic.queries.length * k;
  const unique = Math.round(raw * (1 - topic.dupRate));

  return (
    <Widget title="Research router" hint="Pick a topic. The router classifies it, writes queries if needed, and the research node turns raw hits into de-duplicated evidence.">
      <div className="flex flex-wrap gap-2">
        {TOPICS.map((tp, j) => (
          <Pill key={tp.label} active={i === j} onClick={() => setI(j)}>
            {tp.label}
          </Pill>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">TavilySearch max_results:</span>
        {[2, 5, 10].map((v) => (
          <Pill key={v} active={k === v} onClick={() => setK(v)}>
            {v}
          </Pill>
        ))}
      </div>

      <div className={`mt-3 rounded-lg border p-3 text-sm ${MODE_TONE[topic.mode]}`}>
        <p className="font-mono text-xs break-words">
          RouterDecision(needs_research={research ? "True" : "False"}, mode=&quot;{topic.mode}&quot;)
        </p>
        <p className="mt-1 text-muted">{topic.why}</p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1 text-xs">
        {["router", research ? "research" : null, "orchestrator", "workers", "assemble"].filter(Boolean).map((node, j, arr) => (
          <span key={node} className="flex items-center gap-1">
            <span className={`rounded-md border px-2 py-1 font-mono ${node === "research" ? "border-accent bg-accent-soft" : "border-border bg-surface-2"}`}>{node}</span>
            {j < arr.length - 1 && <span className="text-muted">→</span>}
          </span>
        ))}
      </div>

      {research ? (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">queries ({topic.queries.length})</p>
            <ul className="mt-1 space-y-1 text-xs">
              {topic.queries.map((q) => (
                <li key={q} className="break-words rounded bg-surface-2 px-2 py-1 font-mono">{q}</li>
              ))}
            </ul>
          </div>
          <div className="min-w-0 space-y-2 text-sm">
            <div className="rounded-lg bg-surface-2 p-2"><p className="text-xs text-muted">raw results</p><p className="font-mono">{topic.queries.length} × {k} = {raw}</p></div>
            <div className="rounded-lg bg-surface-2 p-2"><p className="text-xs text-muted">after URL de-dup + junk filter</p><p className="font-mono">{unique} evidence items</p></div>
            {raw >= 40 && <p className="text-xs text-warn">That is a lot of snippets for one synthesizer prompt. Cap queries or max_results.</p>}
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">No searches, no evidence. The orchestrator plans from the model&apos;s own knowledge, and the run costs the same as stage one.</p>
      )}
    </Widget>
  );
}

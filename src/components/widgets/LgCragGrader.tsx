"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Preset = { label: string; question: string; docs: { title: string; score: number }[] };

const PRESETS: Preset[] = [
  {
    label: "In the books",
    question: "Explain the bias–variance trade-off",
    docs: [
      { title: "ch.4: bias, variance and model complexity", score: 0.9 },
      { title: "ch.5: generalisation error decomposition", score: 0.75 },
      { title: "ch.2: overfitting and underfitting", score: 0.5 },
      { title: "index page: B–C", score: 0.15 },
    ],
  },
  {
    label: "Not in the books",
    question: "What is a transformer in deep learning?",
    docs: [
      { title: "ch.6: multilayer perceptrons", score: 0.2 },
      { title: "ch.9: convolutional networks", score: 0.15 },
      { title: "ch.7: regularisation", score: 0.1 },
      { title: "index page: R–T", score: 0.05 },
    ],
  },
  {
    label: "Half covered",
    question: "Batch normalization vs layer normalization?",
    docs: [
      { title: "ch.8: batch normalization", score: 0.6 },
      { title: "ch.8: training deep nets", score: 0.45 },
      { title: "ch.11: optimisation tricks", score: 0.35 },
      { title: "ch.3: feature scaling", score: 0.2 },
    ],
  },
];

type Verdict = "CORRECT" | "INCORRECT" | "AMBIGUOUS";

export function LgCragGrader() {
  const [p, setP] = useState(0);
  const [scores, setScores] = useState(PRESETS[0].docs.map((d) => d.score));
  const [upper, setUpper] = useState(0.7);
  const [lower, setLower] = useState(0.3);
  const docs = PRESETS[p].docs;

  const good = scores.map((s, i) => ({ i, s })).filter((x) => x.s > lower);
  const verdict: Verdict = scores.some((s) => s > upper) ? "CORRECT" : good.length === 0 ? "INCORRECT" : "AMBIGUOUS";
  const tone = verdict === "CORRECT" ? "border-good bg-good-soft" : verdict === "INCORRECT" ? "border-bad bg-bad-soft" : "border-warn bg-warn-soft";
  const path = verdict === "CORRECT" ? ["retrieve", "evaluate", "refine", "generate"] : ["retrieve", "evaluate", "rewrite_query", "web_search", "refine", "generate"];
  const source = verdict === "CORRECT" ? `good_docs (${good.length} internal)` : verdict === "INCORRECT" ? "web_docs only" : `good_docs (${good.length}) + web_docs`;

  function choose(i: number) {
    setP(i);
    setScores(PRESETS[i].docs.map((d) => d.score));
  }

  return (
    <Widget title="CRAG retrieval evaluator" hint="Pick a question, then drag document scores or the thresholds. Watch the verdict, which documents survive, and the path through the graph.">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((pr, i) => (
          <Pill key={pr.label} active={p === i} onClick={() => choose(i)}>
            {pr.label}
          </Pill>
        ))}
      </div>
      <p className="mt-2 text-sm">
        <span className="text-muted">Question: </span>
        {PRESETS[p].question}
      </p>

      <ul className="mt-3 space-y-2">
        {docs.map((d, i) => {
          const s = scores[i];
          const kept = s > lower;
          return (
            <li key={d.title} className={`rounded-lg border p-2 ${kept ? "border-good" : "border-border"}`}>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="min-w-0 break-words">D{i + 1} · {d.title}</span>
                <span className={`rounded px-1.5 py-0.5 font-mono ${s > upper ? "bg-good-soft" : kept ? "bg-warn-soft" : "bg-bad-soft"}`}>
                  {s.toFixed(2)} {kept ? "kept" : "dropped"}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={s}
                aria-label={`Score for document ${i + 1}`}
                onChange={(e) => setScores((arr) => arr.map((v, j) => (j === i ? Number(e.target.value) : v)))}
                className="mt-1 h-10 w-full"
              />
            </li>
          );
        })}
      </ul>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="min-w-0 text-xs">
          <span className="text-muted">UPPER threshold: </span>
          <span className="font-mono">{upper.toFixed(2)}</span>
          <input type="range" min={0.4} max={0.95} step={0.05} value={upper} onChange={(e) => setUpper(Math.max(Number(e.target.value), lower + 0.05))} className="h-10 w-full" />
        </label>
        <label className="min-w-0 text-xs">
          <span className="text-muted">LOWER threshold: </span>
          <span className="font-mono">{lower.toFixed(2)}</span>
          <input type="range" min={0.05} max={0.6} step={0.05} value={lower} onChange={(e) => setLower(Math.min(Number(e.target.value), upper - 0.05))} className="h-10 w-full" />
        </label>
      </div>

      <div className={`mt-3 rounded-lg border p-3 text-sm ${tone}`}>
        <p className="font-semibold">Verdict: {verdict}</p>
        <p className="text-muted">
          {verdict === "CORRECT" && `D${scores.findIndex((s) => s > upper) + 1} scored above ${upper.toFixed(2)}. Retrieval worked.`}
          {verdict === "INCORRECT" && `No document scored above ${lower.toFixed(2)}. Retrieval is discarded and the web is searched.`}
          {verdict === "AMBIGUOUS" && `Some documents beat ${lower.toFixed(2)} but none beat ${upper.toFixed(2)}. Keep them and top up from the web.`}
        </p>
        <p className="mt-1 text-xs">
          <span className="text-muted">refine uses: </span>
          <span className="font-mono">{source}</span>
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1 text-xs">
        {path.map((n, i) => (
          <span key={n} className="flex items-center gap-1">
            <span className={`rounded-md border px-2 py-1 font-mono ${n === "rewrite_query" || n === "web_search" ? "border-accent bg-accent-soft" : "border-border bg-surface-2"}`}>{n}</span>
            {i < path.length - 1 && <span className="text-muted">→</span>}
          </span>
        ))}
      </div>
    </Widget>
  );
}

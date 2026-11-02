"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Strip = { text: string; strict: boolean; lenient: boolean; note: string };

const SENTENCES: Strip[] = [
  { text: "Gradient descent is an optimisation algorithm used to minimise a loss function.", strict: true, lenient: true, note: "Defines the term directly." },
  { text: "It iteratively updates parameters in the direction of the negative gradient.", strict: false, lenient: true, note: "Key mechanism, but \"It\" has no subject on its own." },
  { text: "The step size is controlled by the learning rate.", strict: true, lenient: true, note: "Relevant detail." },
  { text: "Neural networks are composed of layers of neurons with non-linear activations.", strict: false, lenient: false, note: "Next topic in the book; noise." },
  { text: "Convolutional networks are particularly effective for image tasks.", strict: false, lenient: false, note: "Unrelated; came along because of chunking." },
];

type Mode = "strict" | "lenient" | "pairs";

/** Pairs mode groups two sentences per strip; a strip is kept if either sentence is lenient-relevant. */
function strips(mode: Mode): { text: string; keep: boolean; note: string }[] {
  if (mode !== "pairs") return SENTENCES.map((s) => ({ text: s.text, keep: mode === "strict" ? s.strict : s.lenient, note: s.note }));
  const out = [];
  for (let i = 0; i < SENTENCES.length; i += 2) {
    const group = SENTENCES.slice(i, i + 2);
    out.push({ text: group.map((g) => g.text).join(" "), keep: group.some((g) => g.strict), note: group.some((g) => g.strict) ? "Contains a relevant sentence, so its neighbour keeps its context." : "Nothing relevant." });
  }
  return out;
}

export function LgStripFilter() {
  const [mode, setMode] = useState<Mode>("strict");
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const list = strips(mode).map((s) => ({ ...s, keep: overrides[s.text] ?? s.keep }));
  const kept = list.filter((s) => s.keep);
  const before = list.reduce((n, s) => n + s.text.length, 0);
  const after = kept.reduce((n, s) => n + s.text.length, 0);
  const lostMechanism = !kept.some((s) => s.text.includes("negative gradient"));

  return (
    <Widget title="Knowledge refinement" hint='Question: "What is gradient descent?" One retrieved chunk is split into strips and each strip is filtered. Tap a strip to override the filter.'>
      <div className="flex flex-wrap gap-2">
        <Pill active={mode === "strict"} onClick={() => { setMode("strict"); setOverrides({}); }}>1 sentence, strict filter</Pill>
        <Pill active={mode === "lenient"} onClick={() => { setMode("lenient"); setOverrides({}); }}>1 sentence, lenient filter</Pill>
        <Pill active={mode === "pairs"} onClick={() => { setMode("pairs"); setOverrides({}); }}>2-sentence strips</Pill>
      </div>

      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted">1. decompose → 2. filter</p>
      <ul className="mt-1 space-y-2">
        {list.map((s, i) => (
          <li key={s.text}>
            <button
              type="button"
              onClick={() => setOverrides((o) => ({ ...o, [s.text]: !s.keep }))}
              className={`min-h-10 w-full rounded-lg border p-2 text-left text-sm ${s.keep ? "border-good bg-good-soft" : "border-border bg-surface-2 text-muted"}`}
            >
              <span className="mr-1 font-mono text-xs">S{i + 1} {s.keep ? "keep" : "drop"}</span>
              <span className="break-words">{s.text}</span>
              <span className="mt-0.5 block text-xs text-muted">{s.note}</span>
            </button>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted">3. recompose → refined_context</p>
      <pre className="mt-1 whitespace-pre-wrap break-words rounded-lg bg-surface-2 p-2 text-[0.75rem]">{kept.map((s) => s.text).join("\n") || "(empty: nothing for the generator)"}</pre>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        <span className="rounded-md bg-surface-2 px-2 py-1">{before} → {after} chars ({before ? Math.round((1 - after / before) * 100) : 0}% removed)</span>
        {lostMechanism ? (
          <span className="rounded-md bg-bad-soft px-2 py-1">Lost the key sentence: the answer won&apos;t explain how it works</span>
        ) : (
          <span className="rounded-md bg-good-soft px-2 py-1">Core definition and mechanism kept</span>
        )}
      </div>
    </Widget>
  );
}

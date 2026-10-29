"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Verdict = "keep" | "fix" | "cut";

type Item = {
  draft: string;
  fixed: string;
  best: Verdict;
  why: string;
};

const ITEMS: Item[] = [
  {
    draft: "Read queries and candidate documents from the existing database; save one judgment per (query, document).",
    fixed: "",
    best: "keep",
    why: "Reuses the schema the agent already read, and one row per pair makes relabeling an overwrite, not a duplicate.",
  },
  {
    draft: "Add a 'current eval type' field above the buttons that shows which label is selected.",
    fixed: "Highlight the active Relevant / Not relevant button. No separate state.",
    best: "fix",
    why: "The example from the talk. A second concept for the same fact means extra state, routes and bugs. The button itself can show it.",
  },
  {
    draft: "Build a React frontend that talks to a REST API backend.",
    fixed: "FastHTML + MonsterUI, following .ruler/fasthtml-patterns.md.",
    best: "fix",
    why: "The agent fell back to the most common stack. Point it at your context files so you get code you can read and maintain.",
  },
  {
    draft: "List all candidate documents for the query in one long table with a label column.",
    fixed: "Show the query and one document at a time, rendered readably, with next / previous.",
    best: "fix",
    why: "400 rows of PDF and long-form text in a table is the spreadsheet problem again. One item per screen keeps attention on one call.",
  },
  {
    draft: "Add user accounts, roles and password reset.",
    fixed: "",
    best: "cut",
    why: "Not needed to get labels flowing for a small internal team. Every extra feature is more code to review before you can trust the tool.",
  },
  {
    draft: "Pre-label every document with an LLM; reviewers accept the suggestions in bulk.",
    fixed: "",
    best: "cut",
    why: "These labels are the ground truth you will judge retrieval (and any LLM judge) against. Bulk-accepting model guesses anchors reviewers and contaminates it.",
  },
  {
    draft: "Optional notes box saved with each judgment.",
    fixed: "",
    best: "keep",
    why: "Notes on borderline documents are where your relevance criteria get sharpened later.",
  },
];

const EXTRAS = [
  { key: "hotkeys", label: "Hotkeys", line: "Hotkeys: r relevant, n not relevant, j / k next / previous.", miss: "No hotkeys: 400 judgments by mouse is slow enough that people stop early." },
  { key: "progress", label: "Progress counter", line: "Show 'judged 124 of 400' for the current query.", miss: "No progress: reviewers can't see how far they are or pace a session." },
  { key: "save", label: "Save on every click", line: "Write each judgment to the database immediately.", miss: "Nothing says when labels are saved: a crash or refresh could lose a session." },
  { key: "test", label: "How to test, when to stop", line: "Test via the browser MCP: start the app, label, reload, check the DB and browser console. Stop when one query can be fully judged.", miss: "No test or stop instructions: the agent declares victory early, and you become its clipboard for browser errors." },
];

const VERDICTS: { v: Verdict; label: string }[] = [
  { v: "keep", label: "Keep" },
  { v: "fix", label: "Rewrite" },
  { v: "cut", label: "Cut" },
];

export function EvPlanReviewDesk() {
  const [choice, setChoice] = useState<(Verdict | null)[]>(ITEMS.map(() => null));
  const [extras, setExtras] = useState<Set<string>>(new Set());
  const [checked, setChecked] = useState(false);

  const pick = (i: number, v: Verdict) => {
    setChoice((prev) => prev.map((c, j) => (j === i ? v : c)));
    setChecked(false);
  };
  const toggleExtra = (k: string) =>
    setExtras((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  const planLines: string[] = [];
  ITEMS.forEach((it, i) => {
    const c = choice[i] ?? "keep";
    if (c === "cut") return;
    planLines.push(c === "fix" && it.fixed ? it.fixed : it.draft);
  });
  for (const e of EXTRAS) if (extras.has(e.key)) planLines.push(e.line);

  const decided = choice.filter(Boolean).length;
  const right = ITEMS.filter((it, i) => choice[i] === it.best).length;
  const missing = EXTRAS.filter((e) => !extras.has(e.key));

  return (
    <Widget
      title="Review the agent's plan"
      hint="The agent drafted plan.md for the relevance annotator (one query, about 400 documents to judge). Decide what to keep, rewrite or cut, add what's missing, then check your review."
    >
      <ol className="space-y-2">
        {ITEMS.map((it, i) => {
          const c = choice[i];
          const ok = checked && c === it.best;
          const bad = checked && c !== it.best;
          return (
            <li
              key={i}
              className={`rounded-lg border p-2 text-sm ${ok ? "border-good bg-good-soft" : bad ? "border-warn bg-warn-soft" : "border-border"}`}
            >
              <p className={`break-words ${c === "cut" ? "text-muted line-through" : ""}`}>
                <span className="font-mono text-xs text-muted">{i + 1}. </span>
                {it.draft}
              </p>
              {c === "fix" && (
                <p className="mt-1 break-words text-accent">
                  {it.fixed ? `Rewritten: ${it.fixed}` : "Nothing to rewrite here; this line already says what you want."}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                {VERDICTS.map(({ v, label }) => (
                  <Pill key={v} active={c === v} onClick={() => pick(i, v)}>
                    {label}
                  </Pill>
                ))}
              </div>
              {checked && (
                <p className="mt-2 text-xs">
                  <span className="font-semibold">Suggested: {VERDICTS.find((x) => x.v === it.best)?.label}.</span> {it.why}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">Missing from the draft? Add it</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {EXTRAS.map((e) => (
          <Pill key={e.key} active={extras.has(e.key)} onClick={() => toggleExtra(e.key)}>
            + {e.label}
          </Pill>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-border bg-surface-2 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">plan.md the agent will build from</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5 font-mono text-xs">
          {planLines.map((l) => (
            <li key={l} className="break-words">{l}</li>
          ))}
        </ul>
      </div>

      {missing.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {missing.map((e) => (
            <li key={e.key} className="rounded-md border border-warn bg-warn-soft px-2 py-1">{e.miss}</li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setChecked(true)}
          disabled={decided < ITEMS.length}
          className="min-h-9 rounded-full border border-accent px-4 text-sm font-semibold text-accent disabled:opacity-40"
        >
          Check my review
        </button>
        <span className="text-sm text-muted">
          {decided < ITEMS.length ? `${decided} of ${ITEMS.length} lines decided` : checked ? `${right} of ${ITEMS.length} match the suggested call` : "Ready to check"}
        </span>
      </div>
      {checked && (
        <p className="mt-2 text-sm text-muted">
          {right === ITEMS.length && missing.length === 0
            ? "Every line now says what you want. Each fix here cost one edited line; after generation it would have meant untangling code."
            : "Look at the highlighted lines. Every one you leave as drafted becomes code you'll have to review or undo later."}
        </p>
      )}
    </Widget>
  );
}

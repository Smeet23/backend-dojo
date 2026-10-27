"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

const STEPS = ["Parse request", "Pick tool", "Generate args", "Execute tool", "Use result", "Reply"];
const NOTES = [
  "misread who the caller is",
  "called send_email instead of check_calendar",
  "date as \"May 10th\", tool wants YYYY-MM-DD",
  "SQL filter returns 0 rows, no error",
  "ignored the slots the tool returned",
  "reply breaks tone rules",
];

/** Each trace lists the steps that are genuinely broken (root causes). Empty = success. */
const TRACES: number[][] = [
  [], [], [], [], [], [], [], [],
  [2], [2], [2], [2], [2], [2, 4],
  [3], [3], [3], [3, 5],
  [1], [1],
  [4], [4], [4],
  [0],
];

type Mode = "first" | "all";

function analyze(fixed: Set<number>) {
  const firstFail = TRACES.map((t) => {
    const live = t.filter((s) => !fixed.has(s));
    return live.length ? Math.min(...live) : -1;
  });
  const reached = STEPS.map((_, i) => firstFail.filter((f) => f === -1 || f >= i).length);
  const first = STEPS.map((_, i) => firstFail.filter((f) => f === i).length);
  // Once a step fails, every later step looks broken too (garbage in, garbage out).
  const looksFailed = STEPS.map((_, i) => firstFail.filter((f) => f !== -1 && f <= i).length);
  const success = firstFail.filter((f) => f === -1).length;
  return { reached, first, looksFailed, success };
}

export function EvAgentFailureFunnel() {
  const [mode, setMode] = useState<Mode>("first");
  const [fixed, setFixed] = useState<Set<number>>(new Set());
  const a = analyze(fixed);
  const counts = mode === "first" ? a.first : a.looksFailed;
  const max = Math.max(1, ...counts);
  const hot = a.first.indexOf(Math.max(...a.first));
  const total = TRACES.length;

  const toggleFix = (i: number) =>
    setFixed((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <Widget
      title="Agent failure funnel"
      hint={`${total} leasing-assistant traces. Each failed trace is attributed to the first step that went wrong. Switch the counting mode, then "fix" a step to see which failure surfaces next.`}
    >
      <div className="flex flex-wrap gap-2">
        <Pill active={mode === "first"} onClick={() => setMode("first")}>
          Count first failure only
        </Pill>
        <Pill active={mode === "all"} onClick={() => setMode("all")}>
          Count every step that looks broken
        </Pill>
      </div>

      <div className="mt-3 space-y-2">
        {STEPS.map((s, i) => {
          const isHot = mode === "first" && i === hot && a.first[i] > 0;
          return (
            <div key={s} className={`rounded-lg border p-2 ${isHot ? "border-bad bg-bad-soft" : "border-border"}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                <p className="text-sm font-medium">
                  {i + 1}. {s}
                  {fixed.has(i) && <span className="ml-2 text-xs text-good">fixed</span>}
                </p>
                <p className="font-mono text-xs text-muted">
                  reached {a.reached[i]}/{total}
                  {i > 0 && ` · from ${STEPS[i - 1]}`}
                </p>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-3 flex-1 overflow-hidden rounded bg-surface-2">
                  <div className={`h-full ${mode === "first" ? "bg-bad" : "bg-warn"}`} style={{ width: `${(counts[i] / max) * 100}%` }} />
                </div>
                <span className="w-6 text-right font-mono text-sm">{counts[i]}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted">e.g. {NOTES[i]}</p>
                <button
                  type="button"
                  onClick={() => toggleFix(i)}
                  className={`min-h-8 rounded-md border px-2 text-xs ${fixed.has(i) ? "border-good bg-good-soft" : "border-border"}`}
                >
                  {fixed.has(i) ? "Undo fix" : "Fix this step"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 rounded-lg bg-surface-2 p-3 text-sm">
        <p>
          End-to-end success: <span className="font-mono font-semibold">{a.success}/{total}</span> ({Math.round((a.success / total) * 100)}%)
        </p>
        <p className="mt-1 text-muted">
          {mode === "first"
            ? a.first[hot] > 0
              ? `Hotspot: ${a.first[hot]} traces first fail at "${STEPS[hot]}" (coming from "${STEPS[hot - 1] ?? "start"}"). Read those traces first.`
              : "No failures left in this sample. Time to read fresh traces."
            : "Counting every broken-looking step piles blame onto the final steps, which only failed because something upstream already went wrong."}
        </p>
      </div>
      <button type="button" onClick={() => setFixed(new Set())} className="mt-3 min-h-10 w-full rounded-lg border border-border px-3 text-sm">
        Undo all fixes
      </button>
    </Widget>
  );
}

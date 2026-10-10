"use client";

import { useState } from "react";
import { Widget } from "./Widget";

type Level = "LLD" | "HLD";
type Item = { text: string; answer: Level; why: string };

const ITEMS: Item[] = [
  {
    text: "Design a parking lot: classes for spots, tickets and payment, and how they interact",
    answer: "LLD",
    why: "The deliverable is a class model inside one program: entities, interfaces, patterns.",
  },
  {
    text: "Design a URL shortener serving 50,000 redirects per second",
    answer: "HLD",
    why: "The hard part is the system: storage choice, caching, key generation and scale.",
  },
  {
    text: "Make the payment module open for new providers without editing existing code",
    answer: "LLD",
    why: "This is the open/closed principle, solved with an interface and a strategy per provider.",
  },
  {
    text: "Keep chat messages ordered and delivered when users are offline",
    answer: "HLD",
    why: "Ordering and offline delivery span servers, queues and storage: a distributed systems problem.",
  },
  {
    text: "Choose between the observer and pub-sub style for in-app notifications inside one service",
    answer: "LLD",
    why: "A design pattern choice inside one codebase. The cross-service version would be HLD.",
  },
  {
    text: "Decide whether inventory should be CP or AP during a network partition",
    answer: "HLD",
    why: "CAP trade-offs are about replicated data across machines.",
  },
  {
    text: "Make an elevator controller thread-safe when many buttons are pressed at once",
    answer: "LLD",
    why: "Concurrency inside one process, with locks and state machines, is a classic LLD topic.",
  },
  {
    text: "Estimate storage for five years of uploaded photos and pick a sharding key",
    answer: "HLD",
    why: "Capacity estimation and partitioning are core HLD skills.",
  },
];

export function HldDesignLevelSorter() {
  const [picks, setPicks] = useState<Record<number, Level>>({});
  const answered = Object.keys(picks).length;
  const score = ITEMS.filter((it, i) => picks[i] === it.answer).length;

  return (
    <Widget title="LLD or HLD?" hint="Sort each interview prompt by the level of design it really tests.">
      <ul className="space-y-3">
        {ITEMS.map((it, i) => {
          const picked = picks[i];
          const right = picked === it.answer;
          return (
            <li key={it.text} className="rounded-lg border border-border bg-surface-2 p-3">
              <p className="text-sm">{it.text}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(["LLD", "HLD"] as Level[]).map((l) => {
                  const active = picked === l;
                  let cls = "border-border bg-surface hover:bg-surface-2";
                  if (active) cls = right ? "border-good bg-good-soft" : "border-bad bg-bad-soft";
                  return (
                    <button
                      key={l}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setPicks((p) => ({ ...p, [i]: l }))}
                      className={`min-h-10 min-w-16 rounded-lg border px-3 text-sm font-medium ${cls}`}
                    >
                      {l}
                    </button>
                  );
                })}
              </div>
              {picked && (
                <p className={`mt-2 text-xs ${right ? "text-good" : "text-bad"}`}>
                  {right ? "Right. " : `It's ${it.answer}. `}
                  <span className="text-muted">{it.why}</span>
                </p>
              )}
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted">
          {answered} of {ITEMS.length} answered · {score} correct
        </p>
        <button type="button" onClick={() => setPicks({})} className="min-h-10 rounded-lg border border-border px-3 text-sm">
          Reset
        </button>
      </div>
    </Widget>
  );
}

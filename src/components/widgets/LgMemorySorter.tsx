"use client";

import { useState } from "react";
import { Widget } from "./Widget";

type Kind = "semantic" | "episodic" | "procedural" | "skip";

const KIND_LABEL: Record<Kind, string> = {
  semantic: "Semantic",
  episodic: "Episodic",
  procedural: "Procedural",
  skip: "Don't store",
};

const ITEMS: { text: string; answer: Kind; why: string }[] = [
  { text: "\"I'm a backend engineer and I mostly write Python.\"", answer: "semantic", why: "A stable fact about the user. It will help in almost every future chat." },
  { text: "Yesterday the user rejected the Redis caching design because of cost.", answer: "episodic", why: "A past event and its outcome. Recalling it stops the agent re-proposing the same idea." },
  { text: "For this user, write SQL with window functions, not correlated subqueries.", answer: "procedural", why: "A rule about how to do a task, learned from past feedback." },
  { text: "\"lol ok thanks\"", answer: "skip", why: "Pure chat noise with no lasting value. Storing it only clutters memory." },
  { text: "The team's production database is Postgres 16.", answer: "semantic", why: "A fact about the system the user works on." },
  { text: "If the search tool times out, retry once with a shorter query.", answer: "procedural", why: "A strategy for behaving well. It shapes how the agent acts, not what it knows." },
  { text: "The last deploy failed because the API key had expired.", answer: "episodic", why: "Something that happened, with a lesson attached. It answers \"what went wrong last time?\"." },
  { text: "\"Can you reformat this paragraph?\" (pastes a paragraph)", answer: "skip", why: "A one-off task. The paragraph matters in this thread only, so short-term memory is enough." },
];

export function LgMemorySorter() {
  const [picks, setPicks] = useState<(Kind | null)[]>(ITEMS.map(() => null));
  const answered = picks.filter((p) => p !== null).length;
  const correct = picks.filter((p, i) => p === ITEMS[i].answer).length;

  return (
    <Widget title="Sort the memories" hint="An extractor sees these during conversations. Decide what kind of long-term memory each one is, or whether to drop it.">
      <ol className="space-y-3">
        {ITEMS.map((item, i) => {
          const pick = picks[i];
          const right = pick === item.answer;
          return (
            <li key={i} className="rounded-lg border border-border p-3">
              <p className="text-sm break-words">{item.text}</p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(Object.keys(KIND_LABEL) as Kind[]).map((k) => {
                  const chosen = pick === k;
                  const tone = chosen ? (right ? "border-good bg-good-soft" : "border-bad bg-bad-soft") : pick !== null && k === item.answer ? "border-good" : "border-border";
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setPicks((p) => p.map((v, j) => (j === i ? k : v)))}
                      className={`min-h-10 min-w-0 rounded-lg border px-2 text-xs hover:bg-surface-2 ${tone}`}
                    >
                      {KIND_LABEL[k]}
                    </button>
                  );
                })}
              </div>
              {pick !== null && (
                <p className={`mt-2 text-xs ${right ? "text-good" : "text-bad"}`}>
                  {right ? "Right. " : `Not quite: it's ${KIND_LABEL[item.answer].toLowerCase()}. `}
                  <span className="text-muted">{item.why}</span>
                </p>
              )}
            </li>
          );
        })}
      </ol>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm">
          Score: <span className="font-mono">{correct}</span> / {ITEMS.length}
          {answered < ITEMS.length && <span className="text-muted"> ({ITEMS.length - answered} left)</span>}
        </p>
        <button type="button" onClick={() => setPicks(ITEMS.map(() => null))} className="min-h-10 rounded-lg border border-border px-3 text-sm">
          Reset
        </button>
      </div>
    </Widget>
  );
}

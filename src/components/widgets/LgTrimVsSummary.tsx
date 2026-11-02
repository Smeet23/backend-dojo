"use client";

import { useState } from "react";
import { Widget } from "./Widget";

type Msg = { role: "human" | "ai" | "system"; text: string };

/** Each user turn, the reply, and the fact a summarizer would keep from it. */
const TURNS = [
  { user: "Hi, I'm Asha. I'm building a quiz app.", ai: "Nice, Asha! What stack?", fact: "User is Asha, building a quiz app" },
  { user: "My demo deadline is Friday.", ai: "Got it: Friday.", fact: "Demo deadline is Friday" },
  { user: "Postgres or SQLite for the MVP?", ai: "SQLite is fine for the MVP.", fact: "Chose SQLite for the MVP" },
  { user: "How should I add login?", ai: "Use sessions with an auth library.", fact: "Discussed session-based login" },
  { user: "And rate limiting?", ai: "A token bucket per user works well.", fact: "Discussed token-bucket rate limiting" },
  { user: "Remind me: my name and my deadline?", ai: "", fact: "" },
];

const KEEP = 4; // trimming: keep the last 4 stored messages plus the new one
const MAX_MESSAGES = 6; // summarizing: summarize when more than 6 messages are stored
const KEEP_LAST = 2;

type Snapshot = { sees: Msg[]; stored: number; summary: string[]; extraCalls: number; answer: string };

function answerFrom(sees: Msg[]) {
  const all = sees.map((m) => m.text).join(" ");
  const name = all.includes("Asha");
  const deadline = all.includes("Friday");
  if (name && deadline) return "You're Asha, and the demo is due Friday.";
  if (name) return "You're Asha. I don't know your deadline.";
  if (deadline) return "Your deadline is Friday, but I don't know your name.";
  return "Sorry, I don't know your name or deadline.";
}

function simulate(upTo: number) {
  // Trimming: state keeps everything; the model sees only the tail.
  let trimStore: Msg[] = [];
  let trimSnap: Snapshot = { sees: [], stored: 0, summary: [], extraCalls: 0, answer: "" };
  // Summarizing: rolling summary in state, old messages deleted.
  let sumStore: Msg[] = [];
  let summary: string[] = [];
  let extraCalls = 0;
  let sumSnap: Snapshot = trimSnap;

  for (let i = 0; i <= upTo; i++) {
    const t = TURNS[i];
    const user: Msg = { role: "human", text: t.user };

    const trimSees = [...trimStore.slice(-KEEP), user];
    const trimReply = t.ai || answerFrom(trimSees);
    trimStore = [...trimStore, user, { role: "ai", text: trimReply }];
    trimSnap = { sees: trimSees, stored: trimStore.length, summary: [], extraCalls: 0, answer: trimReply };

    const sumSees: Msg[] = [...(summary.length ? [{ role: "system" as const, text: `Summary: ${summary.join("; ")}` }] : []), ...sumStore, user];
    const sumReply = t.ai || answerFrom(sumSees);
    sumStore = [...sumStore, user, { role: "ai", text: sumReply }];
    if (sumStore.length > MAX_MESSAGES) {
      const old = sumStore.slice(0, -KEEP_LAST);
      const facts = TURNS.filter((x) => old.some((m) => m.text === x.user)).map((x) => x.fact).filter(Boolean);
      summary = [...summary, ...facts];
      sumStore = sumStore.slice(-KEEP_LAST);
      extraCalls += 1;
    }
    sumSnap = { sees: sumSees, stored: sumStore.length, summary: [...summary], extraCalls, answer: sumReply };
  }
  return { trim: trimSnap, sum: sumSnap };
}

function Column({ title, rule, snap, last }: { title: string; rule: string; snap: Snapshot; last: boolean }) {
  const good = !snap.answer.startsWith("Sorry") && !snap.answer.includes("don't know");
  return (
    <div className="min-w-0 rounded-lg border border-border p-3">
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-xs text-muted">{rule}</p>
      <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted">Model sees</p>
      <ol className="mt-1 space-y-1">
        {snap.sees.map((m, i) => (
          <li key={i} className={`rounded px-2 py-1 text-[0.75rem] break-words ${m.role === "system" ? "bg-good-soft" : m.role === "human" ? "bg-surface-2" : "border border-border"}`}>
            <span className="mr-1 font-mono text-[0.65rem] text-muted">{m.role}</span>
            {m.text}
          </li>
        ))}
      </ol>
      <div className={`mt-2 rounded px-2 py-1.5 text-sm ${last ? (good ? "bg-good-soft" : "bg-bad-soft") : "bg-surface-2"}`}>
        <span className="mr-1 font-mono text-[0.65rem] text-muted">reply</span>
        {snap.answer}
      </div>
      <p className="mt-2 text-xs text-muted">
        Stored messages: <span className="font-mono">{snap.stored}</span>
        {title.startsWith("Summ") && (
          <>
            {" "}· summarizer calls: <span className="font-mono">{snap.extraCalls}</span>
          </>
        )}
      </p>
    </div>
  );
}

export function LgTrimVsSummary() {
  const [turn, setTurn] = useState(0);
  const { trim, sum } = simulate(turn);
  const last = turn === TURNS.length - 1;

  return (
    <Widget title="Trimming vs summarizing" hint="Same conversation, two strategies. Step through the turns; the last turn asks for facts from the very beginning.">
      <p className="text-sm">
        Turn <span className="font-mono">{turn + 1}</span> / {TURNS.length}: <span className="font-medium">&quot;{TURNS[turn].user}&quot;</span>
      </p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Column title="Trimming" rule={`Model sees the last ${KEEP} stored messages + the new one. State keeps everything.`} snap={trim} last={last} />
        <Column title="Summarizing" rule={`When more than ${MAX_MESSAGES} messages are stored, summarize all but the last ${KEEP_LAST} and delete them.`} snap={sum} last={last} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => setTurn((t) => Math.max(0, t - 1))} disabled={turn === 0} className="min-h-10 rounded-lg border border-border px-3 text-sm disabled:opacity-40">
          Back
        </button>
        <button
          type="button"
          onClick={() => setTurn((t) => Math.min(TURNS.length - 1, t + 1))}
          disabled={last}
          className="min-h-10 flex-1 rounded-lg bg-accent px-3 text-sm font-medium text-white disabled:opacity-40 dark:text-bg"
        >
          Next turn
        </button>
        <button type="button" onClick={() => setTurn(0)} className="min-h-10 rounded-lg border border-border px-3 text-sm">
          Reset
        </button>
      </div>
    </Widget>
  );
}

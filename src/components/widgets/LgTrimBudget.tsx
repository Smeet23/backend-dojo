"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Role = "system" | "human" | "ai" | "tool";
type Msg = { role: Role; text: string; tokens: number };

const HISTORY: Msg[] = [
  { role: "system", text: "You are a friendly LangGraph tutor.", tokens: 10 },
  { role: "human", text: "Hi, I'm Asha. I'm learning LangGraph.", tokens: 14 },
  { role: "ai", text: "Welcome, Asha! Where would you like to start?", tokens: 15 },
  { role: "human", text: "What's the weather in Pune? Use the tool.", tokens: 14 },
  { role: "ai", text: "[tool call] get_weather(city=\"Pune\")", tokens: 18 },
  { role: "tool", text: "get_weather → 31°C, humid", tokens: 12 },
  { role: "ai", text: "It's 31°C and humid in Pune right now.", tokens: 14 },
  { role: "human", text: "Explain checkpointers.", tokens: 9 },
  { role: "ai", text: "A checkpointer saves the graph's state after every super-step, keyed by thread_id, so the next call can resume... (long answer)", tokens: 72 },
  { role: "human", text: "Thanks! What's my name?", tokens: 10 },
];

const ROLE_STYLE: Record<Role, string> = {
  system: "bg-good-soft",
  human: "bg-surface-2",
  ai: "bg-surface",
  tool: "bg-warn-soft",
};

function trim(maxTokens: number, startOnHuman: boolean, includeSystem: boolean) {
  const kept = new Set<number>();
  let budget = maxTokens;
  if (includeSystem && HISTORY[0].role === "system" && HISTORY[0].tokens <= budget) {
    kept.add(0);
    budget -= HISTORY[0].tokens;
  }
  // strategy="last": walk back from the newest message while it fits.
  const tail: number[] = [];
  for (let i = HISTORY.length - 1; i >= 0; i--) {
    if (i === 0 && kept.has(0)) break;
    if (HISTORY[i].tokens > budget) break;
    budget -= HISTORY[i].tokens;
    tail.unshift(i);
  }
  // start_on="human": drop leading messages until the window starts on a human message.
  if (startOnHuman) {
    while (tail.length && HISTORY[tail[0]].role !== "human") tail.shift();
  }
  tail.forEach((i) => kept.add(i));
  return kept;
}

export function LgTrimBudget() {
  const [maxTokens, setMaxTokens] = useState(120);
  const [startOnHuman, setStartOnHuman] = useState(true);
  const [includeSystem, setIncludeSystem] = useState(true);

  const kept = trim(maxTokens, startOnHuman, includeSystem);
  const total = HISTORY.reduce((n, m) => n + m.tokens, 0);
  const sent = HISTORY.filter((_, i) => kept.has(i));
  const sentTokens = sent.reduce((n, m) => n + m.tokens, 0);
  const firstNonSystem = sent.find((m) => m.role !== "system");
  const invalidStart = firstNonSystem && (firstNonSystem.role === "tool" || (firstNonSystem.role === "ai" && firstNonSystem.text.startsWith("[tool call]")));
  const knowsName = sent.some((m) => m.text.includes("Asha"));

  return (
    <Widget title="trim_messages against a token budget" hint="The thread stores all 10 messages. Move the budget and see which ones the model would actually receive on this call.">
      <label className="block text-sm">
        <span className="flex flex-wrap justify-between gap-2">
          <span>
            max_tokens = <span className="font-mono">{maxTokens}</span>
          </span>
          <span className="text-muted">full history ≈ {total} tokens</span>
        </span>
        <input
          type="range"
          min={20}
          max={200}
          step={5}
          value={maxTokens}
          onChange={(e) => setMaxTokens(Number(e.target.value))}
          className="mt-2 h-10 w-full accent-accent"
        />
      </label>

      <div className="mt-1 flex flex-wrap gap-2">
        <Pill active={startOnHuman} onClick={() => setStartOnHuman((v) => !v)}>
          start_on=&quot;human&quot;: {startOnHuman ? "on" : "off"}
        </Pill>
        <Pill active={includeSystem} onClick={() => setIncludeSystem((v) => !v)}>
          include_system: {includeSystem ? "on" : "off"}
        </Pill>
      </div>

      <ol className="mt-3 space-y-1">
        {HISTORY.map((m, i) => {
          const on = kept.has(i);
          return (
            <li
              key={i}
              className={`flex min-w-0 items-start gap-2 rounded-md border px-2 py-1.5 text-[0.78rem] ${on ? `border-accent ${ROLE_STYLE[m.role]}` : "border-dashed border-border opacity-45"}`}
            >
              <span className="w-12 shrink-0 font-mono text-[0.68rem] text-muted">{m.role}</span>
              <span className={`min-w-0 flex-1 break-words ${on ? "" : "line-through"}`}>{m.text}</span>
              <span className="shrink-0 font-mono text-[0.68rem] text-muted">{m.tokens}</span>
            </li>
          );
        })}
      </ol>

      <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
        <div className="min-w-0 rounded-lg bg-surface-2 p-2">
          <p className="text-xs text-muted">Sent to model</p>
          <p className="font-mono">
            {sent.length} msgs · {sentTokens} tok
          </p>
        </div>
        <div className={`min-w-0 rounded-lg p-2 ${knowsName ? "bg-good-soft" : "bg-bad-soft"}`}>
          <p className="text-xs text-muted">Answer to &quot;What&apos;s my name?&quot;</p>
          <p>{knowsName ? "\"You're Asha.\"" : "\"I don't know your name.\""}</p>
        </div>
        <div className={`min-w-0 rounded-lg p-2 ${invalidStart ? "bg-bad-soft" : "bg-good-soft"}`}>
          <p className="text-xs text-muted">History shape</p>
          <p>{invalidStart ? "Starts mid tool-call: API may reject it" : "Valid message sequence"}</p>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted">Stored in the checkpointer either way: all {HISTORY.length} messages. Trimming only shapes this one call.</p>
    </Widget>
  );
}

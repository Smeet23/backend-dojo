"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Mode = "stateless" | "buffer" | "longterm";
type Msg = { role: "system" | "user" | "ai"; text: string };

const MODE_LABEL: Record<Mode, string> = {
  stateless: "Latest message only",
  buffer: "Conversation buffer",
  longterm: "Buffer + long-term memory",
};

/** The scripted conversation. Turn 4 happens in a brand-new thread. */
const TURNS: { thread: "A" | "B"; user: string }[] = [
  { thread: "A", user: "Hi, I'm Asha. I only write Python." },
  { thread: "A", user: "Show me how to read a CSV file." },
  { thread: "A", user: "What's my name?" },
  { thread: "B", user: "New chat: what's my name, and which language do I use?" },
];

const LONG_TERM = ["User's name is Asha", "User writes Python"];
const WINDOW = 120; // a toy context window, in tokens

function tokens(text: string) {
  return Math.ceil(text.split(/\s+/).filter(Boolean).length * 1.3) + 3;
}

/** A deterministic stand-in for the model: it can only use what is in its input. */
function reply(input: Msg[], turn: number): string {
  const all = input.map((m) => m.text).join(" ");
  const knowsName = all.includes("Asha");
  const knowsPython = all.includes("Python");
  if (turn === 0) return "Nice to meet you, Asha! Python it is.";
  if (turn === 1) return knowsPython ? "In Python: use csv.DictReader(open('data.csv'))..." : "Sure! In Java you could use a BufferedReader...";
  if (turn === 2) return knowsName ? "Your name is Asha." : "Sorry, I don't know your name.";
  if (knowsName && knowsPython) return "You're Asha, and you write Python.";
  return "I don't know anything about you yet. This is a new conversation.";
}

function buildInputs(mode: Mode) {
  const history: Record<"A" | "B", Msg[]> = { A: [], B: [] };
  const steps: { input: Msg[]; out: string }[] = [];
  TURNS.forEach((t, i) => {
    const userMsg: Msg = { role: "user", text: t.user };
    let input: Msg[];
    if (mode === "stateless") input = [userMsg];
    else input = [...history[t.thread], userMsg];
    if (mode === "longterm" && t.thread === "B") {
      input = [{ role: "system", text: `Known about this user: ${LONG_TERM.join("; ")}` }, ...input];
    }
    const out = reply(input, i);
    history[t.thread] = [...history[t.thread], userMsg, { role: "ai", text: out }];
    steps.push({ input, out });
  });
  return steps;
}

export function LgContextBuilder() {
  const [mode, setMode] = useState<Mode>("buffer");
  const [step, setStep] = useState(0);
  const steps = buildInputs(mode);
  const current = steps[step];
  const used = current.input.reduce((n, m) => n + tokens(m.text), 0);
  const pct = Math.min(100, Math.round((used / WINDOW) * 100));
  const turn = TURNS[step];
  const good = !current.out.startsWith("Sorry") && !current.out.startsWith("I don't") && !current.out.includes("Java");

  return (
    <Widget title="What actually reaches the model" hint="The model is stateless. Pick a memory strategy, then step through the chat and watch the input your code sends on each call.">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(MODE_LABEL) as Mode[]).map((m) => (
          <Pill key={m} active={mode === m} onClick={() => setMode(m)}>
            {MODE_LABEL[m]}
          </Pill>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-full bg-surface-2 px-2.5 py-1 font-mono text-xs">
          Call {step + 1} of {TURNS.length}
        </span>
        <span className={`rounded-full px-2.5 py-1 font-mono text-xs ${turn.thread === "A" ? "bg-accent-soft" : "bg-warn-soft"}`}>
          thread {turn.thread}
        </span>
        {turn.thread === "B" && <span className="text-xs text-muted">The user opened a new chat.</span>}
      </div>

      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted">Input x sent to the model</p>
      <ol className="mt-1 space-y-1">
        {current.input.map((m, i) => (
          <li
            key={i}
            className={`rounded-md px-2 py-1.5 text-[0.8rem] break-words ${
              m.role === "system" ? "bg-good-soft" : m.role === "user" ? "bg-surface-2" : "border border-border"
            } ${i === current.input.length - 1 ? "border border-accent" : ""}`}
          >
            <span className="mr-1 font-mono text-[0.7rem] text-muted">{m.role}</span>
            {m.text}
          </li>
        ))}
      </ol>

      <div className="mt-3">
        <div className="flex flex-wrap justify-between gap-2 text-xs text-muted">
          <span>≈ {used} tokens in this call</span>
          <span>toy context window: {WINDOW}</span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2">
          <div className={`h-full ${pct > 80 ? "bg-warn" : "bg-accent"}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className={`mt-3 rounded-lg p-3 text-sm ${good ? "bg-good-soft" : "bg-bad-soft"}`}>
        <span className="mr-1 font-mono text-xs text-muted">model →</span>
        {current.out}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="min-h-10 rounded-lg border border-border px-3 text-sm disabled:opacity-40"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => setStep((s) => Math.min(TURNS.length - 1, s + 1))}
          disabled={step === TURNS.length - 1}
          className="min-h-10 flex-1 rounded-lg bg-accent px-3 text-sm font-medium text-white disabled:opacity-40 dark:text-bg"
        >
          Next call
        </button>
      </div>
      <p className="mt-2 text-xs text-muted">
        {mode === "stateless" && "Each call carries only the newest message, so nothing earlier exists for the model."}
        {mode === "buffer" && "The whole thread is resent every call: memory works inside thread A, but thread B starts empty."}
        {mode === "longterm" && "Thread B starts empty too, but facts saved from earlier chats are injected as a system message."}
      </p>
    </Widget>
  );
}

"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Mode = "none" | "memory" | "sqlite";
type Msg = { role: "human" | "ai"; text: string };
type Thread = "nitya-chat" | "arjun-chat";

const MODE_LABEL: Record<Mode, string> = {
  none: "No checkpointer",
  memory: "InMemorySaver",
  sqlite: "SqliteSaver",
};

const PROMPTS = ["Hi, I'm Nitya.", "What's my name?", "What is 10 + 100?", "Now multiply that by 2."];

/** A scripted "model" that can only use what's in the messages it is sent. */
function reply(prompt: string, context: Msg[]): string {
  const seen = context.map((m) => m.text).join(" ");
  if (prompt.startsWith("Hi")) return "Nice to meet you, Nitya! How can I help?";
  if (prompt.startsWith("What's my name")) return seen.includes("I'm Nitya") ? "Your name is Nitya." : "I don't know your name. You haven't told me in this conversation.";
  if (prompt.startsWith("What is 10")) return "10 + 100 = 110.";
  return seen.includes("= 110") ? "110 × 2 = 220." : "Multiply what? I don't see an earlier result.";
}

export function LgChatMemory() {
  const [mode, setMode] = useState<Mode>("none");
  const [thread, setThread] = useState<Thread>("nitya-chat");
  const [store, setStore] = useState<Record<Thread, Msg[]>>({ "nitya-chat": [], "arjun-chat": [] });
  const [screen, setScreen] = useState<Msg[]>([]);
  const [sent, setSent] = useState<Msg[]>([]);
  const [note, setNote] = useState("");

  function chooseMode(m: Mode) {
    setMode(m);
    setStore({ "nitya-chat": [], "arjun-chat": [] });
    setScreen([]);
    setSent([]);
    setNote("");
  }

  function send(prompt: string) {
    const human: Msg = { role: "human", text: prompt };
    // Without a checkpointer every invoke starts from an empty state.
    const prior = mode === "none" ? [] : store[thread];
    const context = [...prior, human];
    const ai: Msg = { role: "ai", text: reply(prompt, context) };
    setSent(context);
    if (mode !== "none") setStore((s) => ({ ...s, [thread]: [...context, ai] }));
    setScreen((s) => [...s, human, ai]);
    setNote("");
  }

  function switchThread(t: Thread) {
    setThread(t);
    setScreen(mode === "none" ? [] : store[t]);
    setSent([]);
    setNote(mode === "none" ? "" : `Loaded ${store[t].length} messages saved under thread_id="${t}".`);
  }

  function restart() {
    setScreen([]);
    setSent([]);
    if (mode === "memory") {
      setStore({ "nitya-chat": [], "arjun-chat": [] });
      setNote("Process restarted. InMemorySaver lived in RAM, so every thread is gone.");
    } else if (mode === "sqlite") {
      setScreen(store[thread]);
      setNote(`Process restarted. SqliteSaver reloaded thread "${thread}" from chat.db.`);
    } else {
      setNote("Process restarted. There was nothing saved anyway.");
    }
  }

  return (
    <Widget title="Why the chatbot forgets" hint="Send the messages in order, then switch the checkpointer and try again. The right panel shows exactly what the model receives on the last call.">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(MODE_LABEL) as Mode[]).map((m) => (
          <Pill key={m} active={mode === m} onClick={() => chooseMode(m)}>
            {MODE_LABEL[m]}
          </Pill>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">thread_id</span>
        {(["nitya-chat", "arjun-chat"] as Thread[]).map((t) => (
          <Pill key={t} active={thread === t} onClick={() => switchThread(t)}>
            {t}
          </Pill>
        ))}
        <button type="button" onClick={restart} className="min-h-10 rounded-lg border border-border px-3 text-sm hover:bg-surface-2">
          Restart Python process
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {PROMPTS.map((p) => (
          <button key={p} type="button" onClick={() => send(p)} className="min-h-10 rounded-lg border border-accent bg-accent-soft px-3 text-sm">
            {p}
          </button>
        ))}
      </div>

      {note && <p className="mt-3 rounded-lg bg-surface-2 p-2 text-sm">{note}</p>}

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="min-w-0 rounded-lg border border-border p-2">
          <p className="text-xs font-semibold text-muted">What the user sees</p>
          <ul className="mt-1 space-y-1">
            {screen.length === 0 && <li className="text-sm text-muted">No messages yet.</li>}
            {screen.map((m, i) => (
              <li key={i} className={`rounded-lg px-2 py-1 text-sm break-words ${m.role === "human" ? "bg-accent-soft" : "bg-surface-2"}`}>
                <span className="font-semibold">{m.role === "human" ? "You" : "Bot"}:</span> {m.text}
              </li>
            ))}
          </ul>
        </div>
        <div className="min-w-0 rounded-lg border border-border p-2">
          <p className="text-xs font-semibold text-muted">state[&quot;messages&quot;] sent to the model</p>
          <pre className="mt-1 whitespace-pre-wrap break-all font-mono text-[0.7rem]">
            {sent.length === 0 ? "—" : sent.map((m) => `${m.role === "human" ? "HumanMessage" : "AIMessage"}("${m.text}")`).join("\n")}
          </pre>
          <p className="mt-2 text-xs text-muted">
            {mode === "none" ? "Each invoke starts from an empty state: only the new message is sent." : `Earlier messages are loaded from the checkpoint for thread "${thread}", then add_messages appends the new one.`}
          </p>
        </div>
      </div>
    </Widget>
  );
}

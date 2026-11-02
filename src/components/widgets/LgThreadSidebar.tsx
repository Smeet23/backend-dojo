"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Msg = { role: "user" | "assistant"; text: string };
type State = {
  /** What the checkpointer holds: messages per thread id. */
  store: Record<string, Msg[]>;
  /** st.session_state["thread_id"]: where new messages are sent. */
  threadId: string;
  /** st.session_state["chat_threads"]. */
  chatThreads: string[];
  /** st.session_state["message_history"]: what the screen draws. */
  history: Msg[];
  /** Which thread the screen is actually showing. */
  screenThread: string;
  nextId: number;
  log: string[];
};

const IDS = ["3f2b8c1e", "a91c40d7", "c07d5e22", "e5b21f90", "18fd6a3b", "7c4e9d01", "b2a07f6c", "5e9c3b18"];
const PROMPTS = ["My name is Asha", "My name is Rahul", "How do I make idli?", "What's my name?"];

function reply(thread: Msg[]): string {
  const last = thread[thread.length - 1]?.text ?? "";
  if (last.startsWith("My name is ")) return `Nice to meet you, ${last.slice(11)}!`;
  if (last.startsWith("How do I make idli")) return "Soak rice and urad dal, grind, ferment overnight, then steam.";
  if (last === "What's my name?") {
    const said = [...thread].reverse().find((m) => m.role === "user" && m.text.startsWith("My name is "));
    return said ? `Your name is ${said.text.slice(11)}.` : "You haven't told me your name in this chat.";
  }
  return "OK.";
}

function initial(): State {
  const id = IDS[0];
  return { store: {}, threadId: id, chatThreads: [id], history: [], screenThread: id, nextId: 1, log: ["First run: thread_id generated and added to chat_threads"] };
}

export function LgThreadSidebar() {
  const [s, setS] = useState<State>(initial);
  const [switchBug, setSwitchBug] = useState(false);
  const [noList, setNoList] = useState(false);

  function newChat() {
    setS((p) => {
      const id = IDS[p.nextId % IDS.length] + (p.nextId >= IDS.length ? `-${p.nextId}` : "");
      return {
        ...p,
        threadId: id,
        chatThreads: noList ? [id] : [...p.chatThreads, id],
        history: [],
        screenThread: id,
        nextId: p.nextId + 1,
        log: [`reset_chat(): new thread ${id}, history cleared${noList ? " (no list: older ids forgotten)" : ""}`, ...p.log].slice(0, 6),
      };
    });
  }

  function openThread(id: string) {
    setS((p) => {
      const loaded = p.store[id] ?? [];
      return {
        ...p,
        threadId: switchBug ? p.threadId : id,
        history: loaded,
        screenThread: id,
        log: [
          switchBug
            ? `Loaded ${id} on screen, but thread_id still ${p.threadId} (bug)`
            : `thread_id = ${id}; get_state() returned ${loaded.length} messages`,
          ...p.log,
        ].slice(0, 6),
      };
    });
  }

  function send(text: string) {
    setS((p) => {
      const backend = [...(p.store[p.threadId] ?? []), { role: "user" as const, text }];
      const answer: Msg = { role: "assistant", text: reply(backend) };
      return {
        ...p,
        store: { ...p.store, [p.threadId]: [...backend, answer] },
        history: [...p.history, { role: "user", text }, answer],
        log: [`stream() with thread_id ${p.threadId}`, ...p.log].slice(0, 6),
      };
    });
  }

  const mismatch = s.threadId !== s.screenThread;
  const sidebar = [...s.chatThreads].reverse();

  return (
    <Widget title="Thread sidebar" hint="Start chats, switch between them and ask “What's my name?”. Then flip a bug on and watch screen and backend disagree.">
      <div className="flex flex-wrap gap-2">
        <Pill active={switchBug} onClick={() => setSwitchBug((b) => !b)}>
          Bug: forget to set thread_id on switch
        </Pill>
        <Pill
          active={noList}
          onClick={() => {
            setNoList((b) => !b);
            setS(initial());
          }}
        >
          Bug: no chat_threads list
        </Pill>
        <button type="button" onClick={() => setS(initial())} className="min-h-10 rounded-lg border border-border px-3 text-sm hover:bg-surface-2">
          Reset
        </button>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[11rem_1fr]">
        <div className="min-w-0 rounded-lg border border-border bg-surface-2 p-2">
          <p className="text-xs font-semibold">LangGraph Chatbot</p>
          <button type="button" onClick={newChat} className="mt-2 min-h-10 w-full rounded-lg bg-accent px-3 text-sm font-medium text-white dark:text-bg">
            New chat
          </button>
          <p className="mt-3 text-xs font-semibold text-muted">My conversations</p>
          <ul className="mt-1 space-y-1">
            {sidebar.map((id) => {
              const first = s.store[id]?.find((m) => m.role === "user")?.text;
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => openThread(id)}
                    className={`min-h-10 w-full rounded-md border px-2 text-left text-xs ${id === s.screenThread ? "border-accent bg-accent-soft" : "border-border bg-surface hover:bg-bg"}`}
                  >
                    <span className="block truncate font-mono">{id}</span>
                    <span className="block truncate text-muted">{first ?? "empty"}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="min-w-0 rounded-lg border border-border p-2">
          <div className="min-h-32 space-y-1.5">
            {s.history.length === 0 && <p className="text-sm text-muted">Empty chat. Pick a message below.</p>}
            {s.history.map((m, i) => (
              <p key={i} className={`rounded-lg px-2 py-1 text-sm break-words ${m.role === "user" ? "ml-6 bg-accent-soft" : "mr-6 bg-surface-2"}`}>
                <span className="text-xs text-muted">{m.role}: </span>
                {m.text}
              </p>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {PROMPTS.map((p) => (
              <button key={p} type="button" onClick={() => send(p)} className="min-h-10 rounded-lg border border-border px-3 text-xs hover:bg-surface-2">
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {mismatch && (
        <p className="mt-3 rounded-lg bg-bad-soft px-3 py-2 text-sm">
          The screen shows <span className="font-mono">{s.screenThread}</span>, but new messages go to{" "}
          <span className="font-mono">{s.threadId}</span>.
        </p>
      )}

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="min-w-0 rounded-lg bg-surface-2 p-2">
          <p className="text-xs font-semibold text-accent">st.session_state</p>
          <pre className="mt-1 overflow-x-auto font-mono text-[0.7rem] whitespace-pre-wrap break-all">
            {`thread_id: ${s.threadId}\nchat_threads: [${s.chatThreads.join(", ")}]\nmessage_history: ${s.history.length} messages`}
          </pre>
        </div>
        <div className="min-w-0 rounded-lg bg-surface-2 p-2">
          <p className="text-xs font-semibold text-accent">Checkpointer (InMemorySaver)</p>
          {Object.keys(s.store).length === 0 && <p className="mt-1 text-xs text-muted">No checkpoints yet.</p>}
          <ul className="mt-1 space-y-0.5 font-mono text-[0.7rem]">
            {Object.entries(s.store).map(([id, msgs]) => (
              <li key={id} className={`break-all ${s.chatThreads.includes(id) ? "" : "text-warn"}`}>
                {id}: {msgs.length} msgs{s.chatThreads.includes(id) ? "" : " (unreachable from sidebar)"}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <ol className="mt-3 space-y-1">
        {s.log.map((l, i) => (
          <li key={i} className="rounded bg-surface-2 px-2 py-1 font-mono text-[0.7rem] break-all">
            {l}
          </li>
        ))}
      </ol>
    </Widget>
  );
}

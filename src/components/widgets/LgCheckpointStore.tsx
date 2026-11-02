"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Saver = "memory" | "sqlite";
type Row = { thread: string; step: number; source: "input" | "loop"; messages: number; id: number };

const THREADS = ["thread-1", "thread-2", "thread-3"];

export function LgCheckpointStore() {
  const [saver, setSaver] = useState<Saver>("memory");
  const [rows, setRows] = useState<Row[]>([]);
  const [thread, setThread] = useState("thread-1");
  const [restarts, setRestarts] = useState(0);
  const [note, setNote] = useState("Send a message to create checkpoints.");
  const [seq, setSeq] = useState(1);

  function send() {
    const mine = rows.filter((r) => r.thread === thread);
    const last = mine[mine.length - 1];
    const step = last ? last.step + 1 : -1;
    const msgs = last ? last.messages : 0;
    const added: Row[] = [
      { thread, step, source: "input", messages: msgs, id: seq },
      { thread, step: step + 1, source: "loop", messages: msgs + 1, id: seq + 1 },
      { thread, step: step + 2, source: "loop", messages: msgs + 2, id: seq + 2 },
    ];
    setRows((r) => [...r, ...added]);
    setSeq((n) => n + 3);
    setNote(`invoke() on ${thread} wrote 3 checkpoints (steps ${step}, ${step + 1}, ${step + 2}). The thread now holds ${msgs + 2} messages.`);
  }

  function restart() {
    setRestarts((n) => n + 1);
    if (saver === "memory") {
      setRows([]);
      setNote("Process restarted. InMemorySaver's dictionary died with it: every thread is gone.");
    } else {
      setNote("Process restarted. chatbot.db is still on disk, so every checkpoint is still there.");
    }
  }

  function chooseSaver(s: Saver) {
    setSaver(s);
    setRows([]);
    setSeq(1);
    setNote(s === "memory" ? "Using InMemorySaver: checkpoints live in RAM." : "Using SqliteSaver(sqlite3.connect(\"chatbot.db\", check_same_thread=False)).");
  }

  // checkpointer.list(None) yields newest first; dict.fromkeys keeps first-seen order.
  const newestFirst = [...rows].sort((a, b) => b.id - a.id);
  const unique = Array.from(new Set(newestFirst.map((r) => r.thread)));
  const sidebar = [...unique].reverse();

  return (
    <Widget title="Where checkpoints live" hint="Pick a saver, send messages on a few threads, then restart the app.">
      <div className="flex flex-wrap gap-2">
        <Pill active={saver === "memory"} onClick={() => chooseSaver("memory")}>
          InMemorySaver
        </Pill>
        <Pill active={saver === "sqlite"} onClick={() => chooseSaver("sqlite")}>
          SqliteSaver (chatbot.db)
        </Pill>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">thread_id:</span>
        {THREADS.map((t) => (
          <Pill key={t} active={thread === t} onClick={() => setThread(t)}>
            {t}
          </Pill>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={send} className="min-h-10 flex-1 rounded-lg bg-accent px-3 text-sm font-medium text-white dark:text-bg">
          Send a message
        </button>
        <button type="button" onClick={restart} className="min-h-10 rounded-lg border border-border px-3 text-sm hover:bg-surface-2">
          Restart the app
        </button>
      </div>

      <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${note.includes("gone") ? "bg-bad-soft" : note.includes("still") ? "bg-good-soft" : "bg-surface-2"}`}>{note}</p>

      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_12rem]">
        <div className="min-w-0 overflow-x-auto rounded-lg border border-border">
          <p className="border-b border-border bg-surface-2 px-2 py-1 text-xs font-semibold">
            {saver === "memory" ? "RAM (dict inside the process)" : "chatbot.db › checkpoints"} · {rows.length} rows
          </p>
          <table className="w-full text-left font-mono text-[0.7rem]">
            <thead>
              <tr className="text-muted">
                <th className="px-2 py-1 font-normal">thread_id</th>
                <th className="px-2 py-1 font-normal">step</th>
                <th className="px-2 py-1 font-normal">source</th>
                <th className="px-2 py-1 font-normal">msgs</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-2 py-2 text-muted">empty</td>
                </tr>
              )}
              {rows.slice(-12).map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-2 py-0.5">{r.thread}</td>
                  <td className="px-2 py-0.5">{r.step}</td>
                  <td className="px-2 py-0.5">{r.source}</td>
                  <td className="px-2 py-0.5">{r.messages}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 12 && <p className="px-2 py-1 text-[0.7rem] text-muted">showing the latest 12 rows</p>}
        </div>

        <div className="min-w-0 space-y-3">
          <div className="rounded-lg bg-surface-2 p-2">
            <p className="text-xs font-semibold text-accent">retrieve_all_threads()</p>
            <p className="mt-1 font-mono text-[0.7rem] break-all">[{sidebar.map((t) => `"${t}"`).join(", ")}]</p>
          </div>
          <div className="rounded-lg border border-border p-2">
            <p className="text-xs font-semibold">Sidebar after startup</p>
            {unique.length === 0 ? (
              <p className="mt-1 text-xs text-muted">No conversations</p>
            ) : (
              <ul className="mt-1 space-y-1">
                {unique.map((t) => (
                  <li key={t} className="rounded bg-surface-2 px-2 py-1 font-mono text-[0.7rem]">
                    {t} · {rows.filter((r) => r.thread === t).at(-1)?.messages} msgs
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="text-xs text-muted">Restarts so far: {restarts}</p>
        </div>
      </div>
    </Widget>
  );
}

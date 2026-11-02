"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Turn = { id: number; thread: "A" | "B"; text: string; inputTokens: number; outputTokens: number; latency: number };

const SCRIPT: { thread: "A" | "B"; text: string }[] = [
  { thread: "A", text: "Hi, I'm Asha" },
  { thread: "A", text: "Suggest a biryani recipe" },
  { thread: "B", text: "Explain Python decorators" },
  { thread: "A", text: "Make it vegetarian" },
  { thread: "B", text: "Show an example with arguments" },
  { thread: "A", text: "How long does it take?" },
];

const THREAD_ID: Record<"A" | "B", string> = { A: "3f2b8c1e…", B: "a91c40d7…" };

export function LgTraceExplorer() {
  const [sent, setSent] = useState(2);
  const [withMetadata, setWithMetadata] = useState(true);
  const [view, setView] = useState<"traces" | "threads">("traces");
  const [open, setOpen] = useState<number | null>(null);

  // Input tokens grow per thread because the whole history is sent each turn.
  const turns: Turn[] = [];
  const history: Record<"A" | "B", number> = { A: 0, B: 0 };
  SCRIPT.slice(0, sent).forEach((s, i) => {
    const out = 120 + ((i * 37) % 90);
    const input = 40 + history[s.thread];
    turns.push({ id: i + 1, thread: s.thread, text: s.text, inputTokens: input, outputTokens: out, latency: 1.1 + ((i * 3) % 7) / 10 });
    history[s.thread] += input - history[s.thread] + out + 15;
  });
  const newestFirst = [...turns].reverse();
  const selected = turns.find((t) => t.id === open) ?? null;

  function row(t: Turn) {
    return (
      <button
        key={t.id}
        type="button"
        onClick={() => setOpen(open === t.id ? null : t.id)}
        className={`flex min-h-10 w-full flex-wrap items-center gap-x-2 rounded-md border px-2 py-1 text-left text-xs ${open === t.id ? "border-accent bg-accent-soft" : "border-border hover:bg-surface-2"}`}
      >
        <span className="font-mono">{withMetadata ? "chat_turn" : "LangGraph"}</span>
        <span className="min-w-0 flex-1 truncate text-muted">“{t.text}”</span>
        <span className="font-mono text-[0.7rem]">{t.inputTokens} in</span>
      </button>
    );
  }

  return (
    <Widget title="Traces vs threads" hint="Send turns in two conversations, then compare the flat trace list with the Threads view. Toggle the metadata to see what LangSmith needs.">
      <div className="flex flex-wrap gap-2">
        <Pill active={withMetadata} onClick={() => setWithMetadata((m) => !m)}>
          metadata.thread_id + run_name: {withMetadata ? "on" : "off"}
        </Pill>
        <button
          type="button"
          disabled={sent >= SCRIPT.length}
          onClick={() => setSent((n) => Math.min(n + 1, SCRIPT.length))}
          className="min-h-10 rounded-lg bg-accent px-3 text-sm font-medium text-white disabled:opacity-50 dark:text-bg"
        >
          Send next turn ({sent}/{SCRIPT.length})
        </button>
        <button type="button" onClick={() => { setSent(2); setOpen(null); }} className="min-h-10 rounded-lg border border-border px-3 text-sm hover:bg-surface-2">
          Reset
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Pill active={view === "traces"} onClick={() => setView("traces")}>
          Traces (flat list)
        </Pill>
        <Pill active={view === "threads"} onClick={() => setView("threads")}>
          Threads
        </Pill>
      </div>

      <div className="mt-3 space-y-1">
        {view === "traces" && newestFirst.map(row)}
        {view === "threads" && !withMetadata && (
          <p className="rounded-lg bg-warn-soft px-3 py-2 text-sm">No threads. The traces carry no thread_id or session_id in their metadata, so LangSmith can&apos;t group them.</p>
        )}
        {view === "threads" &&
          withMetadata &&
          (["A", "B"] as const)
            .filter((th) => turns.some((t) => t.thread === th))
            .map((th) => (
              <div key={th} className="rounded-lg border border-border p-2">
                <p className="text-xs font-semibold">
                  Thread <span className="font-mono">{THREAD_ID[th]}</span> · {turns.filter((t) => t.thread === th).length} turns
                </p>
                <div className="mt-1 space-y-1">{turns.filter((t) => t.thread === th).map(row)}</div>
              </div>
            ))}
      </div>

      {selected && (
        <div className="mt-3 rounded-lg bg-surface-2 p-3">
          <p className="text-xs font-semibold text-accent">Run tree</p>
          <pre className="mt-1 overflow-x-auto font-mono text-[0.7rem] whitespace-pre-wrap break-all">
            {`${withMetadata ? "chat_turn" : "LangGraph"}   ${selected.latency.toFixed(1)}s\n└── chat_node\n    └── ChatOpenAI   ${selected.inputTokens} in / ${selected.outputTokens} out tokens\n\nmetadata: ${withMetadata ? `{ thread_id: "${THREAD_ID[selected.thread]}" }` : "{}"}`}
          </pre>
          <p className="mt-2 text-xs text-muted">Input tokens grow with every turn in the same conversation, because the whole history is sent each time.</p>
        </div>
      )}
    </Widget>
  );
}

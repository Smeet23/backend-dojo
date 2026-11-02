"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Mode = "invoke" | "values" | "updates" | "messages" | "custom";
type Chunk = { t: number; repr: string; ui?: string; node?: "rewrite_query" | "answer" };

const Q = "when did dark mode ship";
const QUERY_TOKENS = ["dark", " mode", " release", " date"];
const ANSWER_TOKENS = ["Dark", " mode", " shipped", " in", " v2.4", ",", " on", " 3", " March", "."];
const ANSWER = ANSWER_TOKENS.join("");
const QUERY = QUERY_TOKENS.join("");

/** Timeline (ms) of a run where rewrite_query takes ~400 ms and answer streams ~1.2 s. */
function chunksFor(mode: Mode): Chunk[] {
  switch (mode) {
    case "invoke":
      return [{ t: 1650, repr: `{'messages': [Human('${Q}'), AI('${ANSWER}')], 'query': '${QUERY}'}`, ui: ANSWER }];
    case "values":
      return [
        { t: 0, repr: `{'messages': [Human('${Q}')]}` },
        { t: 420, repr: `{'messages': [Human(...)], 'query': '${QUERY}'}` },
        { t: 1650, repr: `{'messages': [Human(...), AI('${ANSWER}')], 'query': '${QUERY}'}`, ui: ANSWER },
      ];
    case "updates":
      return [
        { t: 420, repr: `{'rewrite_query': {'query': '${QUERY}'}}` },
        { t: 1650, repr: `{'answer': {'messages': [AI('${ANSWER}')]}}`, ui: ANSWER },
      ];
    case "messages": {
      const out: Chunk[] = [];
      QUERY_TOKENS.forEach((tok, i) => out.push({ t: 120 + i * 70, repr: `(AIMessageChunk('${tok}'), {'langgraph_node': 'rewrite_query', ...})`, ui: tok, node: "rewrite_query" }));
      ANSWER_TOKENS.forEach((tok, i) => out.push({ t: 520 + i * 110, repr: `(AIMessageChunk('${tok}'), {'langgraph_node': 'answer', ...})`, ui: tok, node: "answer" }));
      return out;
    }
    case "custom":
      return [
        { t: 10, repr: `{'status': 'Rewriting your question…'}`, ui: "Rewriting your question…" },
        { t: 430, repr: `{'status': 'Searching the changelog…'}`, ui: "Searching the changelog…" },
        { t: 520, repr: `{'status': 'Writing the answer…'}`, ui: "Writing the answer…" },
      ];
  }
}

const MODE_NOTE: Record<Mode, string> = {
  invoke: "No streaming: nothing at all until the whole run finishes.",
  values: "The full state after each super-step (the first chunk is the input). Good for dashboards; too coarse for typing.",
  updates: "Only what each node returned, keyed by node name. Good for progress like 'rewrite_query done'.",
  messages: "LLM tokens as they're generated, from every node that calls a model. Filter on metadata to pick one.",
  custom: "Whatever your nodes send with get_stream_writer(): progress messages, partial results.",
};

export function LgStreamModes() {
  const [mode, setMode] = useState<Mode>("messages");
  const [filter, setFilter] = useState(false);
  const [shown, setShown] = useState(0);

  const all = chunksFor(mode);
  const chunks = mode === "messages" && filter ? all.filter((c) => c.node === "answer") : all;
  const visible = chunks.slice(0, shown);
  const firstUi = chunks.find((c) => c.ui);
  const screen =
    mode === "custom" ? (visible.length ? visible[visible.length - 1].ui ?? "" : "") : visible.map((c) => c.ui ?? "").join("");

  const pick = (m: Mode) => { setMode(m); setShown(0); };

  return (
    <Widget title="Compare stream modes" hint={`Graph: START → rewrite_query (LLM) → answer (LLM) → END. The user asks "${Q}". Step through the chunks each mode yields.`}>
      <div className="flex flex-wrap gap-2">
        {(["invoke", "values", "updates", "messages", "custom"] as Mode[]).map((m) => (
          <Pill key={m} active={mode === m} onClick={() => pick(m)}>
            {m === "invoke" ? "invoke()" : `stream_mode="${m}"`}
          </Pill>
        ))}
      </div>
      {mode === "messages" && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Pill active={filter} onClick={() => { setFilter((f) => !f); setShown(0); }}>
            Filter: metadata[&quot;langgraph_node&quot;] == &quot;answer&quot;: {filter ? "on" : "off"}
          </Pill>
        </div>
      )}
      <p className="mt-2 text-sm text-muted">{MODE_NOTE[mode]}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={shown >= chunks.length} onClick={() => setShown((s) => s + 1)} className="min-h-10 flex-1 rounded-lg bg-accent px-3 text-sm font-medium text-white disabled:opacity-50 dark:text-bg">
          Next chunk ({shown}/{chunks.length})
        </button>
        <button type="button" onClick={() => setShown(chunks.length)} className="min-h-10 rounded-lg border border-border px-3 text-sm hover:bg-surface-2">All</button>
        <button type="button" onClick={() => setShown(0)} className="min-h-10 rounded-lg border border-border px-3 text-sm hover:bg-surface-2">Reset</button>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="min-w-0 rounded-lg border border-border p-2">
          <p className="text-xs font-semibold text-muted">for chunk in graph.stream(...): print(chunk)</p>
          <ol className="mt-1 space-y-1">
            {visible.map((c, i) => (
              <li key={i} className={`rounded px-2 py-1 font-mono text-[0.68rem] break-all ${c.node === "rewrite_query" ? "bg-warn-soft" : "bg-surface-2"}`}>
                <span className="text-muted">t={c.t}ms </span>
                {c.repr}
              </li>
            ))}
          </ol>
        </div>
        <div className="min-w-0 rounded-lg border border-border p-2">
          <p className="text-xs font-semibold text-muted">What the chat bubble shows</p>
          <p className="mt-1 min-h-10 rounded-lg bg-surface-2 p-2 text-sm break-words">{screen || <span className="text-muted">(blank)</span>}</p>
          <p className="mt-2 text-xs text-muted">
            First visible text at {firstUi ? `${firstUi.t} ms` : "never"}
            {mode === "messages" && !filter ? ". Notice the rewritten query leaking into the answer." : "."}
          </p>
        </div>
      </div>
    </Widget>
  );
}

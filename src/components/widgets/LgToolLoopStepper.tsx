"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Kind = "human" | "ai" | "call" | "tool";
type Msg = { kind: Kind; text: string };
type Step = { node: "chat_node" | "tools"; route: string; adds: Msg[]; note: string };

type QueryId = "hi" | "mul" | "stock";

const QUERIES: Record<QueryId, { label: string; text: string }> = {
  hi: { label: "Small talk", text: "hi" },
  mul: { label: "One tool", text: "What is 2 times 3?" },
  stock: { label: "Two tools", text: "Apple's price, and the cost of 15 shares?" },
};

const PRICE_JSON = '{"symbol": "AAPL", "price": "229.10", "volume": "41230900", "change": "+1.32", ...}';

function plan(q: QueryId, loop: boolean): Step[] {
  if (q === "hi") {
    return [{ node: "chat_node", route: "END", adds: [{ kind: "ai", text: "Hello! How can I help?" }], note: "No tool calls, so tools_condition returns END." }];
  }
  if (q === "mul") {
    const steps: Step[] = [
      { node: "chat_node", route: "tools", adds: [{ kind: "call", text: "calculator(first_num=2, second_num=3, operation='mul')" }], note: "The model asks for a tool. It doesn't run it." },
      { node: "tools", route: loop ? "chat_node" : "END", adds: [{ kind: "tool", text: '{"first_num": 2, "second_num": 3, "operation": "mul", "result": 6}' }], note: "ToolNode runs the calculator and appends a ToolMessage." },
    ];
    if (loop) steps.push({ node: "chat_node", route: "END", adds: [{ kind: "ai", text: "2 × 3 = 6." }], note: "The model reads the result and answers in plain text." });
    return steps;
  }
  const steps: Step[] = [
    { node: "chat_node", route: "tools", adds: [{ kind: "call", text: "get_stock_price(symbol='AAPL')" }], note: "It needs the price before it can multiply, so it asks for that first." },
    { node: "tools", route: loop ? "chat_node" : "END", adds: [{ kind: "tool", text: PRICE_JSON }], note: "ToolNode calls the stock API." },
  ];
  if (loop) {
    steps.push(
      { node: "chat_node", route: "tools", adds: [{ kind: "call", text: "calculator(first_num=229.10, second_num=15, operation='mul')" }], note: "With the price in its history, the model chains a second tool." },
      { node: "tools", route: "chat_node", adds: [{ kind: "tool", text: '{"result": 3436.5}' }], note: "Second tool result goes back to the model too." },
      { node: "chat_node", route: "END", adds: [{ kind: "ai", text: "Apple is at $229.10, so 15 shares cost about $3,436.50." }], note: "Everything needed is in state. Plain answer, so END." },
    );
  }
  return steps;
}

const KIND_STYLE: Record<Kind, string> = {
  human: "bg-surface-2",
  ai: "bg-good-soft",
  call: "bg-accent-soft",
  tool: "bg-warn-soft",
};
const KIND_LABEL: Record<Kind, string> = {
  human: "HumanMessage",
  ai: "AIMessage",
  call: "AIMessage.tool_calls",
  tool: "ToolMessage",
};

export function LgToolLoopStepper() {
  const [q, setQ] = useState<QueryId>("stock");
  const [loop, setLoop] = useState(false);
  const [pos, setPos] = useState(0);

  const steps = plan(q, loop);
  const done = pos >= steps.length;
  const shown = steps.slice(0, pos);
  const messages: Msg[] = [{ kind: "human", text: QUERIES[q].text }, ...shown.flatMap((s) => s.adds)];
  const current = shown[shown.length - 1];
  const last = messages[messages.length - 1];
  const userSees = done ? last : null;

  function reset(nq: QueryId, nl: boolean) {
    setQ(nq);
    setLoop(nl);
    setPos(0);
  }

  return (
    <Widget title="The tool-calling loop" hint="Pick a question, then step through the graph. Try the two-tool question with the back edge off, then on.">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(QUERIES) as QueryId[]).map((id) => (
          <Pill key={id} active={q === id} onClick={() => reset(id, loop)}>
            {QUERIES[id].label}
          </Pill>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Pill active={loop} onClick={() => reset(q, !loop)}>
          Edge tools → chat_node: {loop ? "on" : "off"}
        </Pill>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1 font-mono text-xs">
        {["START", "chat_node", "tools", "END"].map((n) => {
          const active = (n === "START" && pos === 0) || (current && !done && current.node === n) || (done && n === "END");
          return (
            <span key={n} className={`rounded-md border px-2 py-1 ${active ? "border-accent bg-accent text-white dark:text-bg" : "border-border"}`}>
              {n}
            </span>
          );
        })}
        <span className="text-muted">{loop ? "(tools loops back)" : "(tools goes to END)"}</span>
      </div>

      {current && (
        <p className="mt-2 text-sm">
          <span className="font-mono text-xs text-muted">{current.node} → {current.route}:</span> {current.note}
        </p>
      )}

      <ol className="mt-3 space-y-1">
        {messages.map((m, i) => (
          <li key={i} className={`rounded-lg px-2 py-1.5 text-[0.78rem] ${KIND_STYLE[m.kind]}`}>
            <span className="font-mono text-[0.68rem] text-muted">{KIND_LABEL[m.kind]}</span>
            <p className="font-mono break-all">{m.text}</p>
          </li>
        ))}
      </ol>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={done}
          onClick={() => setPos((p) => p + 1)}
          className="min-h-10 flex-1 rounded-lg bg-accent px-3 text-sm font-medium text-white disabled:opacity-40 dark:text-bg"
        >
          {pos === 0 ? "Run chat_node" : done ? "Finished" : `Run ${steps[pos].node}`}
        </button>
        <button type="button" onClick={() => setPos(0)} className="min-h-10 rounded-lg border border-border px-3 text-sm">
          Reset
        </button>
      </div>

      {userSees && (
        <div className={`mt-3 rounded-lg p-3 text-sm ${userSees.kind === "ai" ? "bg-good-soft" : "bg-bad-soft"}`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">What the user sees</p>
          <p className="mt-1 break-all font-mono text-[0.78rem]">{userSees.text}</p>
          {userSees.kind === "tool" && (
            <p className="mt-1 text-xs">
              Raw tool output{q === "stock" ? ", and the cost of 15 shares was never computed" : ""}. The model never saw the result. Turn the back edge on.
            </p>
          )}
        </div>
      )}
    </Widget>
  );
}

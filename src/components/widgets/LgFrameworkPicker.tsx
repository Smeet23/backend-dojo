"use client";

import { useState } from "react";
import { Widget } from "./Widget";

type Req = { id: string; label: string; needsGraph: boolean; why: string };

const REQS: Req[] = [
  { id: "prompt", label: "Prompt in, answer out (summarise, translate, classify)", needsGraph: false, why: "A single LCEL chain does this." },
  { id: "multistep", label: "Fixed multi-step pipeline (report, then summary)", needsGraph: false, why: "Chains pipe one step's output into the next." },
  { id: "rag", label: "Basic RAG over your documents", needsGraph: false, why: "Retriever → prompt → model is a straight line." },
  { id: "branch", label: "Choose the next step based on a result", needsGraph: true, why: "Conditional edges route on state." },
  { id: "loop", label: "Repeat until a condition holds (revise until approved)", needsGraph: true, why: "Edges can point backwards; no hand-written while loops." },
  { id: "state", label: "Many fields of workflow state that steps read and update", needsGraph: true, why: "A typed state object flows through every node." },
  { id: "hitl", label: "Pause for a human for hours or days", needsGraph: true, why: "interrupt() plus a checkpointer frees the process while waiting." },
  { id: "events", label: "Resume when an external event arrives", needsGraph: true, why: "Resume the thread from its saved checkpoint." },
  { id: "crash", label: "Survive a crash mid-run without redoing work", needsGraph: true, why: "Checkpoints after every step; resume from the last one." },
  { id: "multi", label: "Several agents or reusable sub-workflows", needsGraph: true, why: "Subgraphs: a compiled graph used as a node." },
];

export function LgFrameworkPicker() {
  const [picked, setPicked] = useState<Set<string>>(new Set(["rag"]));
  const chosen = REQS.filter((r) => picked.has(r.id));
  const graphReasons = chosen.filter((r) => r.needsGraph);
  const verdict = chosen.length === 0 ? null : graphReasons.length ? "LangGraph (still using LangChain components inside the nodes)" : "LangChain chains are enough";

  function toggle(id: string) {
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  return (
    <Widget title="Chain or graph?" hint="Tick what your application needs.">
      <ul className="space-y-1">
        {REQS.map((r) => (
          <li key={r.id}>
            <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-border px-2 py-1 text-sm hover:bg-surface-2">
              <input type="checkbox" checked={picked.has(r.id)} onChange={() => toggle(r.id)} className="h-4 w-4 shrink-0 accent-accent" />
              <span className="min-w-0">{r.label}</span>
            </label>
          </li>
        ))}
      </ul>
      <div className={`mt-3 rounded-lg p-3 text-sm ${verdict ? (graphReasons.length ? "bg-accent-soft" : "bg-good-soft") : "bg-surface-2"}`}>
        <p className="font-semibold">{verdict ?? "Pick at least one requirement."}</p>
        {graphReasons.length > 0 && (
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[0.82rem]">
            {graphReasons.map((r) => (
              <li key={r.id}>{r.why}</li>
            ))}
          </ul>
        )}
        {verdict && graphReasons.length === 0 && <p className="mt-1 text-[0.82rem]">{chosen.map((r) => r.why).join(" ")}</p>}
      </div>
    </Widget>
  );
}

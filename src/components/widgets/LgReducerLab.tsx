"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Topology = "parallel" | "sequential";
type Reducer = "none" | "add";
type Style = "partial" | "whole";

/** Three graders, each producing one score. Parallel order is how LangGraph applies them (not the order they finished). */
const GRADERS = [
  { node: "evaluate_language", score: 7 },
  { node: "evaluate_analysis", score: 8 },
  { node: "evaluate_clarity", score: 6 },
];
const PARALLEL_APPLY_ORDER = ["evaluate_analysis", "evaluate_clarity", "evaluate_language"];

type Outcome = {
  steps: { label: string; detail: string }[];
  result: string;
  tone: "good" | "warn" | "bad";
  verdict: string;
};

function simulate(topology: Topology, reducer: Reducer, style: Style): Outcome {
  const declaration = reducer === "add" ? "Annotated[list[int], operator.add]" : "list[int]";
  if (topology === "parallel") {
    const steps = GRADERS.map((g) => ({
      label: g.node,
      detail: style === "partial" ? `return {"scores": [${g.score}]}` : `return {**state, "scores": state["scores"] + [${g.score}]}`,
    }));
    if (style === "whole") {
      return {
        steps,
        result: "InvalidUpdateError: At key 'essay': Can receive only one value per step.",
        tone: "bad",
        verdict: "Every branch sent back the whole state, so three nodes 'wrote' essay in the same super-step. essay has no reducer, so LangGraph refuses to guess. Return only the keys you changed.",
      };
    }
    if (reducer === "none") {
      return {
        steps,
        result: "InvalidUpdateError: At key 'scores': Can receive only one value per step. Use an Annotated key to handle multiple values.",
        tone: "bad",
        verdict: `scores is a plain ${declaration}. Three writes landed in one super-step and the default channel holds one value, so the run stops. It does not silently keep one of them.`,
      };
    }
    const order = PARALLEL_APPLY_ORDER.map((n) => GRADERS.find((g) => g.node === n)!.score);
    return {
      steps,
      result: `scores = [] + [${order[0]}] + [${order[1]}] + [${order[2]}] = [${order.join(", ")}]`,
      tone: "good",
      verdict: "operator.add folds each update into the list. All three scores survive. The order is deterministic but is not the order you wrote the edges in, so never read scores[0] as 'language'.",
    };
  }
  // sequential: language -> analysis -> clarity
  let scores: number[] = [];
  const steps: { label: string; detail: string }[] = [];
  for (const g of GRADERS) {
    const returned = style === "partial" ? [g.score] : [...scores, g.score];
    const before = scores;
    scores = reducer === "add" ? [...scores, ...returned] : returned;
    steps.push({
      label: g.node,
      detail: `returns scores=[${returned.join(", ")}] → ${reducer === "add" ? `[${before.join(", ")}] + [${returned.join(", ")}]` : "replace"} = [${scores.join(", ")}]`,
    });
  }
  const text = `scores = [${scores.join(", ")}]`;
  if (reducer === "none" && style === "partial") {
    return { steps, result: text, tone: "warn", verdict: "No error, and two scores are gone. Without a reducer each write replaces the last one. Sequential graphs fail silently here." };
  }
  if (reducer === "add" && style === "whole") {
    return { steps, result: text, tone: "warn", verdict: "Duplicates! Each node returned the whole list it had already seen, and the reducer appended all of it again. With a reducer, return only the new items." };
  }
  if (reducer === "none" && style === "whole") {
    return { steps, result: text, tone: "warn", verdict: "Correct by accident: each node rebuilt the full list itself. It works in a straight line but crashes the moment these nodes run in parallel." };
  }
  return { steps, result: text, tone: "good", verdict: "Each node returns only its new score and the reducer appends it. This is the version that keeps working if you later make the graders parallel." };
}

export function LgReducerLab() {
  const [topology, setTopology] = useState<Topology>("parallel");
  const [reducer, setReducer] = useState<Reducer>("none");
  const [style, setStyle] = useState<Style>("partial");
  const out = simulate(topology, reducer, style);

  return (
    <Widget title="Reducer lab" hint="Three graders each score an essay and write to the same scores key. Change the wiring, the reducer and what the nodes return, and see what ends up in state.">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-20 text-xs font-semibold text-muted">Edges</span>
          <Pill active={topology === "parallel"} onClick={() => setTopology("parallel")}>Parallel fan-out</Pill>
          <Pill active={topology === "sequential"} onClick={() => setTopology("sequential")}>Sequential chain</Pill>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-20 text-xs font-semibold text-muted">Reducer</span>
          <Pill active={reducer === "none"} onClick={() => setReducer("none")}>None (overwrite)</Pill>
          <Pill active={reducer === "add"} onClick={() => setReducer("add")}>operator.add</Pill>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-20 text-xs font-semibold text-muted">Nodes return</span>
          <Pill active={style === "partial"} onClick={() => setStyle("partial")}>Only new keys</Pill>
          <Pill active={style === "whole"} onClick={() => setStyle("whole")}>Whole state</Pill>
        </div>
      </div>

      <pre className="mt-3 overflow-x-auto rounded-lg bg-surface-2 p-3 font-mono text-[0.72rem]">{`class EssayState(TypedDict):
    essay: str
    scores: ${reducer === "add" ? "Annotated[list[int], operator.add]" : "list[int]"}`}</pre>

      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted">
        {topology === "parallel" ? "Super-step 1: all three run together" : "Three super-steps, one node each"}
      </p>
      <ul className="mt-1 space-y-1">
        {out.steps.map((s) => (
          <li key={s.label} className="rounded-lg border border-border p-2">
            <p className="font-mono text-[0.75rem] font-semibold">{s.label}</p>
            <p className="font-mono text-[0.72rem] break-all text-muted">{s.detail}</p>
          </li>
        ))}
      </ul>

      <div className={`mt-3 rounded-lg p-3 ${out.tone === "good" ? "bg-good-soft" : out.tone === "warn" ? "bg-warn-soft" : "bg-bad-soft"}`}>
        <p className="font-mono text-[0.75rem] font-semibold break-words">{out.result}</p>
        <p className="mt-1 text-sm">{out.verdict}</p>
      </div>
    </Widget>
  );
}

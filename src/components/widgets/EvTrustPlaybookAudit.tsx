"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Practice = { key: string; part: number; label: string; next: string };

const PARTS = ["Strategy and visibility", "Right evaluator per component", "Insight", "Close the loop"];

/** In playbook order: the first unchecked practice is the next action. */
const PRACTICES: Practice[] = [
  { key: "trace", part: 0, label: "Every agent step is traced", next: "Instrument the agent so each step (tool choice, search, use of results, reply) is its own span. Until then every other number is a guess." },
  { key: "onepager", part: 0, label: "One-pager of scenarios and edge cases", next: "Write one page: the scenarios the agent must handle, the expected behavior in each, and the edge cases. Use it with the PRD to guide synthetic data." },
  { key: "dataset", part: 0, label: "Golden dataset (real or synthetic)", next: "Build a seed dataset from real traffic if you have it, otherwise generate it from the one-pager and PRD." },
  { key: "coverage", part: 0, label: "Coverage checked against the PRD", next: "Tag each example with a scenario from the PRD and list scenarios with too few examples. Fill those gaps before trusting any aggregate score." },
  { key: "northstar", part: 0, label: "One North Star metric with an agreed threshold", next: "Pick one primary metric and agree a threshold with product and business owners, based on what one error costs." },
  { key: "code", part: 1, label: "Code checks for objective outputs", next: "Replace judges with code wherever outputs are objective: schemas, numbers with ground truth, code that can run." },
  { key: "judges", part: 1, label: "Binary judges aligned with experts, with a target", next: "Make each judge one criterion, pass or fail with a critique. Set a minimum alignment with expert labels and treat missing it as a gate." },
  { key: "trajectory", part: 1, label: "Evals for planning, trajectory and multi-turn", next: "Add step-level evals: was the plan sensible, was the tool-call sequence right, did the conversation hold together across turns?" },
  { key: "errors", part: 2, label: "Regular error analysis by experts and developers", next: "Schedule error analysis: experts review input, output and context; developers review the full trace. Count failure modes." },
  { key: "adversarial", part: 2, label: "Adversarial and security cases in the dataset", next: "Add prompt injection, data extraction and abuse attempts to the golden dataset next to normal scenarios." },
  { key: "monitor", part: 3, label: "Production alerts on the same metrics", next: "Run the North Star and key sub-metrics on production traces and alert when they drop." },
  { key: "feedback", part: 3, label: "Explicit and implicit feedback joined to traces", next: "Log thumbs up or down plus implicit signals (re-asking, copying the answer out) as events linked to traces." },
  { key: "flywheel", part: 3, label: "New production failures flow into the dataset", next: "Cluster production failures and negative feedback, and add the cases the golden dataset lacks." },
];

type Agent = { name: string; desc: string; live: boolean; costly: boolean; has: string[] };

const AGENTS: Agent[] = [
  { name: "Trip planner", desc: "Prototype that books travel. Demoed to leadership, checked by eyeballing final answers.", live: false, costly: true, has: ["onepager"] },
  { name: "Support chatbot", desc: "Live for two months. Has a dataset, judges and a dashboard that looks healthy.", live: true, costly: true, has: ["trace", "onepager", "dataset", "northstar", "code", "judges", "monitor"] },
  { name: "Coding helper", desc: "Internal IDE agent. Developers fix its mistakes in seconds.", live: true, costly: false, has: ["trace", "dataset", "code", "monitor", "feedback"] },
  { name: "Sales outreach", desc: "Pre-launch, mature eval setup built from the team's cookbooks.", live: false, costly: true, has: ["trace", "onepager", "dataset", "coverage", "northstar", "code", "judges", "trajectory", "errors"] },
];

export function EvTrustPlaybookAudit() {
  const [agentIdx, setAgentIdx] = useState(1);
  const [has, setHas] = useState<Set<string>>(new Set(AGENTS[1].has));
  const agent = AGENTS[agentIdx];

  const pick = (i: number) => {
    setAgentIdx(i);
    setHas(new Set(AGENTS[i].has));
  };
  const toggle = (k: string) =>
    setHas((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const firstGap = PRACTICES.find((p) => !has.has(p.key));
  const score = PRACTICES.filter((p) => has.has(p.key)).length;

  const warnings: string[] = [];
  if (!has.has("trace") && has.size > 0)
    warnings.push("Practices without tracing: scores and reviews exist, but nobody can see which step failed.");
  if (has.has("judges") && !has.has("errors"))
    warnings.push("Judges without error analysis: they may be measuring criteria nobody showed are the real failures.");
  if (agent.live && !has.has("feedback"))
    warnings.push("Live without feedback capture: the hardest piece to retrofit, and every week without it is lost signal.");
  if (has.has("monitor") && !has.has("northstar"))
    warnings.push("Alerts without a North Star threshold: what drop should page someone?");

  return (
    <Widget title="Trust playbook audit" hint="Choose an example agent, then toggle practices to match your own. The first gap in playbook order is your next action.">
      <div className="flex flex-wrap gap-2">
        {AGENTS.map((a, i) => (
          <Pill key={a.name} active={i === agentIdx} onClick={() => pick(i)}>
            {a.name}
          </Pill>
        ))}
      </div>
      <p className="mt-2 text-sm text-muted">
        {agent.desc} <span className="font-medium">{agent.live ? "In production." : "Not launched."}</span>{" "}
        Cost of an error: <span className="font-medium">{agent.costly ? "high" : "low"}</span>, so the North Star bar should be{" "}
        {agent.costly ? "strict" : "more forgiving"}.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {PARTS.map((part, pi) => {
          const items = PRACTICES.filter((p) => p.part === pi);
          const done = items.filter((p) => has.has(p.key)).length;
          return (
            <div key={part} className="rounded-lg border border-border bg-surface-2 p-3">
              <p className="flex justify-between text-xs font-semibold uppercase tracking-wide text-muted">
                <span>{part}</span>
                <span className={done === items.length ? "text-good" : ""}>
                  {done}/{items.length}
                </span>
              </p>
              <ul className="mt-2 space-y-1.5">
                {items.map((p) => (
                  <li key={p.key}>
                    <label className="flex cursor-pointer items-start gap-2 text-sm">
                      <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-accent" checked={has.has(p.key)} onChange={() => toggle(p.key)} />
                      <span className={firstGap?.key === p.key ? "font-semibold text-accent" : ""}>{p.label}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden>
        <div className="h-full bg-accent transition-all" style={{ width: `${(score / PRACTICES.length) * 100}%` }} />
      </div>
      <p className="mt-1 text-xs text-muted">
        {score} of {PRACTICES.length} practices in place
      </p>

      <div className="mt-3 space-y-2 text-sm">
        {firstGap ? (
          <div className="rounded-lg border border-accent bg-accent-soft p-3">
            <p className="font-semibold">
              Next action ({PARTS[firstGap.part].toLowerCase()}): {firstGap.label.toLowerCase()}
            </p>
            <p className="mt-1">{firstGap.next}</p>
          </div>
        ) : (
          <p className="rounded-lg border border-good bg-good-soft p-3">
            Every practice is in place. Keep revisiting the threshold and whether the North Star still tracks the business outcome.
          </p>
        )}
        {warnings.map((w) => (
          <p key={w} className="rounded-lg border border-warn bg-warn-soft p-3">
            {w}
          </p>
        ))}
      </div>
    </Widget>
  );
}

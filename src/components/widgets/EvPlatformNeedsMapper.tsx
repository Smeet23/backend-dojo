"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Level = "shown" | "stated" | "gap";
type Col = "Braintrust" | "Phoenix" | "LangSmith" | "DIY";
type Cell = [Level, string];
type Need = { id: string; label: string; concept: string; hard?: boolean; cells: Record<Col, Cell> };

const COLS: Col[] = ["Braintrust", "Phoenix", "LangSmith", "DIY"];

const NEEDS: Need[] = [
  {
    id: "self-host",
    label: "Traces can't leave our network",
    concept: "Deployment model. This is a constraint: settle it before comparing features.",
    hard: true,
    cells: {
      Braintrust: ["stated", "Self-hosted and hybrid ('remote evals') on paid plans; free tier is cloud."],
      Phoenix: ["shown", "Open source; runs in a notebook, on a laptop, as a sidecar or a central server."],
      LangSmith: ["gap", "Tutorial showed the cloud product only; check the enterprise self-hosted offer."],
      DIY: ["shown", "Your notebook and your database; nothing leaves by construction."],
    },
  },
  {
    id: "offline",
    label: "Mostly offline experiments on a dataset",
    concept: "Datasets, experiments, run comparison, metadata on runs.",
    cells: {
      Braintrust: ["shown", "Eval(data, task, scores); grouped by department; filtered to regressions; 76% to 85.45%."],
      Phoenix: ["shown", "run_experiment with a 'has results' check; filtered score = 0 into traces; versioned datasets."],
      LangSmith: ["shown", "evaluate() loop or pytest/Vitest with per-example assertions; repetitions per example."],
      DIY: ["shown", "A loop and pandas works; you build run history and diffs yourself."],
    },
  },
  {
    id: "annotation",
    label: "Domain experts label lots of traces",
    concept: "Annotation workflow: queues, hotkeys, per-annotator labels, domain-specific views.",
    cells: {
      Braintrust: ["shown", "Project-level review scores (comment, is_good), tags for review state, review page."],
      Phoenix: ["shown", "Hotkeys, notes plus structured labels, who-said-what for each annotator."],
      LangSmith: ["shown", "Annotation queues with instructions and 'add to dataset'; rules fill them."],
      DIY: ["shown", "Lesson 8: a custom UI shows exactly what reviewers need; often built on a platform API."],
    },
  },
  {
    id: "prod",
    label: "Monitor production traffic",
    concept: "Online evaluators with sampling and filters, automations, dashboards.",
    cells: {
      Braintrust: ["shown", "Monitor view (cost, latency, scores); online scores can target spans, e.g. thumbs-down only."],
      Phoenix: ["stated", "Same tracing in production via sidecar or central server; online evals not demoed."],
      LangSmith: ["shown", "Sampled rules, automations to queues, per-project dashboards grouped by model."],
      DIY: ["gap", "Sampling jobs, storage and dashboards are real engineering work."],
    },
  },
  {
    id: "langchain",
    label: "We build on LangChain / LangGraph",
    concept: "Instrumentation: how much code it takes to get good spans.",
    cells: {
      Braintrust: ["stated", "Framework-agnostic SDK; LangChain not shown."],
      Phoenix: ["shown", "OpenInference instrumentor for LangGraph and others; auto_instrument=True."],
      LangSmith: ["shown", "Native integration; threads for human-in-the-loop agents; in-the-loop checks as LangGraph nodes."],
      DIY: ["gap", "You write the callbacks and span storage yourself."],
    },
  },
  {
    id: "judges",
    label: "Build and align LLM judges",
    concept: "Labeled examples, judge playground, judge reasoning, human vs judge disagreement.",
    cells: {
      Braintrust: ["stated", "Shown in the homework walkthrough (lesson 11), not in this tutorial."],
      Phoenix: ["shown", "Judge labels logged next to human ones; judge calls are traced with their prompt."],
      LangSmith: ["shown", "Align Evals: label binary, iterate the judge prompt until it matches."],
      DIY: ["shown", "Lessons 4 and 5 are notebooks; you still need a test split either way."],
    },
  },
  {
    id: "portable",
    label: "Avoid vendor lock-in",
    concept: "Open standards and exportable assets: OTel spans, JSONL datasets, plain scorer functions.",
    cells: {
      Braintrust: ["stated", "Scorers are plain functions; BTQL exports queries as code; tracing uses its SDK."],
      Phoenix: ["shown", "Everything open source and built on OpenTelemetry."],
      LangSmith: ["stated", "Accepts OTel; open-source openevals and agentevals libraries."],
      DIY: ["shown", "Nothing to migrate, but nothing maintained for you."],
    },
  },
];

const TONE: Record<Level, string> = {
  shown: "border-good bg-good-soft",
  stated: "border-warn bg-warn-soft",
  gap: "border-border bg-surface-2",
};
const TAG: Record<Level, string> = { shown: "Shown", stated: "Mentioned only", gap: "Not shown / work for you" };

export function EvPlatformNeedsMapper() {
  const [picked, setPicked] = useState<string[]>(["offline", "annotation"]);
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const needs = NEEDS.filter((n) => picked.includes(n.id));
  const shownCount = (c: Col) => needs.filter((n) => n.cells[c][0] === "shown").length;
  const blocked = needs.some((n) => n.hard);

  return (
    <Widget
      title="Which features do I need?"
      hint="Pick your situation. See the concept that matters and what each tutorial actually demonstrated."
    >
      <div className="flex flex-wrap gap-2">
        {NEEDS.map((n) => (
          <Pill key={n.id} active={picked.includes(n.id)} onClick={() => toggle(n.id)}>
            {n.label}
          </Pill>
        ))}
      </div>

      {needs.length === 0 && <p className="mt-4 text-sm text-muted">Pick at least one need.</p>}

      <div className="mt-4 space-y-4">
        {needs.map((n) => (
          <div key={n.id} className="rounded-lg border border-border p-3">
            <p className="text-sm font-semibold">{n.label}</p>
            <p className="mt-0.5 text-xs text-muted">{n.concept}</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {COLS.map((c) => {
                const [lvl, note] = n.cells[c];
                return (
                  <div key={c} className={`rounded-md border p-2 text-xs ${TONE[lvl]}`}>
                    <p className="font-semibold">
                      {c === "DIY" ? "Notebook + custom UI" : c} <span className="font-normal text-muted">· {TAG[lvl]}</span>
                    </p>
                    <p className="mt-0.5 leading-snug">{note}</p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {needs.length > 0 && (
        <div className="mt-4 rounded-lg border border-border bg-surface-2 p-3 text-sm">
          <p className="font-semibold">Demonstrated in the tutorials, for your picks</p>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
            {COLS.map((c) => (
              <p key={c} className="text-xs">
                <span className="text-accent">{c === "DIY" ? "DIY" : c}</span>: {shownCount(c)} of {needs.length}
              </p>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">
            {blocked
              ? "You picked a hard constraint. Filter on deployment first; feature counts only matter among options that survive it."
              : "These counts reflect what a one-hour demo chose to show, not product limits. Use them to decide what to test in a trial, on your own traces."}
          </p>
        </div>
      )}
    </Widget>
  );
}

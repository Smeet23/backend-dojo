"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Level = 0 | 1 | 2 | 3;
/** Who carries the step: the human, both, or the assistant. */
type Load = "human" | "shared" | "assistant";

const LEVELS = ["Plain LLM chatbot", "RAG chatbot", "Tool-augmented chatbot", "Agentic system"] as const;

const LEVEL_NOTE: Record<Level, string> = {
  0: "A general-purpose model answering whatever you type. It knows the world in general, nothing about your company.",
  1: "Same model, now grounded in your company's documents: past JDs, the hiring playbook, salary bands, templates.",
  2: "Now it can also call APIs: job boards, a resume parser, your calendar, email, the HR system.",
  3: "Give it the goal once. It plans, executes, watches for problems, adapts, and only checks in for approvals.",
};

type Step = { name: string; cells: [string, string, string, string]; load: [Load, Load, Load, Load] };

const STEPS: Step[] = [
  {
    name: "Draft the JD",
    cells: [
      "You ask for a JD; you get a generic one that could belong to any company.",
      "You ask; it pulls your stack, salary band and tone from past JDs.",
      "Same as RAG: drafting needs knowledge, not tools.",
      "Starts here on its own as step 1 of its plan, then asks you to review the draft.",
    ],
    load: ["shared", "shared", "shared", "assistant"],
  },
  {
    name: "Post the job",
    cells: [
      "Suggests popular job boards. You copy-paste the JD onto each one.",
      "Names the boards that worked for you before. You still post by hand.",
      "Posts through the job-board APIs when you tell it to.",
      "Posts through the APIs as the next step of its plan.",
    ],
    load: ["human", "human", "shared", "assistant"],
  },
  {
    name: "Watch applications",
    cells: [
      "You keep checking. If numbers are low, you have to notice and ask what to do.",
      "You notice the problem; it suggests fixes from the playbook.",
      "You ask it to check the count; it calls the API. You still have to think to ask.",
      "Checks on its own schedule, spots 'only 2 applicants', proposes a wider JD and a boosted post.",
    ],
    load: ["human", "human", "shared", "assistant"],
  },
  {
    name: "Shortlist",
    cells: [
      "Gives generic screening advice. You read every resume.",
      "Gives screening criteria from your past hires. You still read every resume.",
      "Downloads and parses resumes, scores them against the JD.",
      "Parses and scores without being asked, then reports strong, partial and weak matches.",
    ],
    load: ["human", "human", "shared", "assistant"],
  },
  {
    name: "Schedule interviews",
    cells: [
      "Drafts an invite email. You check your calendar and send it.",
      "Drafts it in your company's template. You send it.",
      "Checks your calendar, proposes Friday, sends invites when you say so.",
      "Proposes Friday, sends invites on your OK, and reminds you on the day.",
    ],
    load: ["human", "shared", "assistant", "assistant"],
  },
  {
    name: "Offer and onboarding",
    cells: [
      "Drafts an offer letter. You send it, chase the reply, and run onboarding.",
      "Drafts the offer in house style. Everything else is still on you.",
      "Sends the offer and triggers onboarding in the HR system when told.",
      "Sends after your approval, tracks the reply, and kicks off onboarding when it's accepted.",
    ],
    load: ["human", "shared", "assistant", "assistant"],
  },
];

const PROBLEMS: { label: string; fixedAt: Level }[] = [
  { label: "Gives company-specific advice", fixedAt: 1 },
  { label: "Takes actions in other systems", fixedAt: 2 },
  { label: "Proactive (acts without being asked)", fixedAt: 3 },
  { label: "Remembers context across days", fixedAt: 3 },
  { label: "Adapts when something goes wrong", fixedAt: 3 },
];

const LOAD_STYLE: Record<Load, string> = {
  human: "bg-bad-soft",
  shared: "bg-warn-soft",
  assistant: "bg-good-soft",
};
const LOAD_LABEL: Record<Load, string> = { human: "you do it", shared: "shared", assistant: "assistant does it" };

export function LgAssistantLadder() {
  const [level, setLevel] = useState<Level>(0);
  const humanLoad = STEPS.reduce((n, s) => n + (s.load[level] === "human" ? 2 : s.load[level] === "shared" ? 1 : 0), 0);
  const maxLoad = STEPS.length * 2;
  const pct = Math.round((humanLoad / maxLoad) * 100);

  return (
    <Widget title="From chatbot to agent" hint="The same hiring task at four levels of capability. Pick a level and see who carries each step.">
      <div className="flex flex-wrap gap-2">
        {LEVELS.map((name, i) => (
          <Pill key={name} active={level === i} onClick={() => setLevel(i as Level)}>
            {i + 1}. {name}
          </Pill>
        ))}
      </div>
      <p className="mt-3 text-sm text-muted">{LEVEL_NOTE[level]}</p>

      <ul className="mt-3 space-y-2">
        {STEPS.map((s) => (
          <li key={s.name} className={`rounded-lg p-2 text-sm ${LOAD_STYLE[s.load[level]]}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-2">
              <span className="font-semibold">{s.name}</span>
              <span className="text-xs text-muted">{LOAD_LABEL[s.load[level]]}</span>
            </div>
            <p className="mt-0.5">{s.cells[level]}</p>
          </li>
        ))}
      </ul>

      <div className="mt-4">
        <div className="flex flex-wrap justify-between text-xs text-muted">
          <span>Work left for the human recruiter</span>
          <span className="font-mono">{pct}%</span>
        </div>
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-surface-2">
          <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {PROBLEMS.map((p) => {
          const solved = level >= p.fixedAt;
          return (
            <div key={p.label} className={`min-w-0 rounded-lg border p-2 text-sm ${solved ? "border-border bg-good-soft" : "border-border bg-surface-2"}`}>
              <span className="mr-1 font-mono">{solved ? "yes" : "no"}</span>
              {p.label}
              {!solved && <span className="block text-xs text-muted">arrives at level {p.fixedAt + 1}</span>}
            </div>
          );
        })}
      </div>
    </Widget>
  );
}

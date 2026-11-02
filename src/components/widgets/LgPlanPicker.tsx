"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Constraints = { tightBudget: boolean; urgent: boolean; remoteOnly: boolean; fullTime: boolean; jobBoardTool: boolean };

type Plan = {
  name: string;
  steps: string;
  tool: "job board API" | "email" | "marketplace API";
  cost: number; // 0 cheap .. 2 expensive
  speed: number; // 0 slow .. 2 fast
  remoteReach: number; // 0 poor .. 2 strong
  risk: number; // 0 low .. 2 high
  fullTime: boolean;
};

const PLANS: Plan[] = [
  { name: "A. Job portals", steps: "Draft JD → post on job boards → monitor → screen", tool: "job board API", cost: 0, speed: 1, remoteReach: 2, risk: 1, fullTime: true },
  { name: "B. Referrals + agency", steps: "Email staff for referrals → brief a recruiting agency", tool: "email", cost: 2, speed: 2, remoteReach: 1, risk: 0, fullTime: true },
  { name: "C. Freelance marketplace", steps: "Post a project brief → screen portfolios → short contract", tool: "marketplace API", cost: 1, speed: 2, remoteReach: 2, risk: 1, fullTime: false },
];

const TOGGLES: { key: keyof Constraints; label: string }[] = [
  { key: "tightBudget", label: "Tight budget" },
  { key: "urgent", label: "Urgent" },
  { key: "remoteOnly", label: "Remote only" },
  { key: "fullTime", label: "Must be full-time" },
  { key: "jobBoardTool", label: "Job board tool installed" },
];

function evaluate(p: Plan, c: Constraints): { rejected?: string; score: number; notes: string[] } {
  if (p.tool === "job board API" && !c.jobBoardTool) return { rejected: "needs the job board API, which the agent doesn't have", score: 0, notes: [] };
  if (c.fullTime && !p.fullTime) return { rejected: "violates the goal: a freelancer isn't a full-time hire", score: 0, notes: [] };
  const notes: string[] = [];
  const costPts = (2 - p.cost) * (c.tightBudget ? 2 : 1);
  notes.push(`cost +${costPts}`);
  const speedPts = p.speed * (c.urgent ? 2 : 1);
  notes.push(`speed +${speedPts}`);
  const remotePts = c.remoteOnly ? p.remoteReach * 2 : 0;
  if (c.remoteOnly) notes.push(`remote fit +${remotePts}`);
  const riskPts = 2 - p.risk;
  notes.push(`low risk +${riskPts}`);
  return { score: costPts + speedPts + remotePts + riskPts, notes };
}

export function LgPlanPicker() {
  const [c, setC] = useState<Constraints>({ tightBudget: true, urgent: false, remoteOnly: true, fullTime: true, jobBoardTool: true });
  const results = PLANS.map((p) => ({ plan: p, ...evaluate(p, c) }));
  const viable = results.filter((r) => !r.rejected);
  const best = viable.length ? viable.reduce((a, b) => (b.score > a.score ? b : a)) : null;

  return (
    <Widget title="Plan, evaluate, select" hint="The agent drafted three plans for the same goal. Change the constraints and tools and see which plan survives evaluation.">
      <div className="flex flex-wrap gap-2">
        {TOGGLES.map((t) => (
          <Pill key={t.key} active={c[t.key]} onClick={() => setC((s) => ({ ...s, [t.key]: !s[t.key] }))}>
            {t.label}
          </Pill>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {results.map((r) => {
          const chosen = best?.plan.name === r.plan.name;
          return (
            <div
              key={r.plan.name}
              className={`min-w-0 rounded-lg border p-3 text-sm ${r.rejected ? "border-border bg-bad-soft" : chosen ? "border-accent bg-good-soft" : "border-border bg-surface-2"}`}
            >
              <p className="font-semibold">{r.plan.name}</p>
              <p className="mt-1 text-xs text-muted">{r.plan.steps}</p>
              <p className="mt-1 text-xs">Needs: {r.plan.tool}</p>
              {r.rejected ? (
                <p className="mt-2 text-xs font-medium">Rejected: {r.rejected}</p>
              ) : (
                <>
                  <p className="mt-2 font-mono text-xs break-words">{r.notes.join(" · ")}</p>
                  <p className="mt-1 font-mono text-sm">score {r.score}{chosen ? "  ← selected" : ""}</p>
                </>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-sm text-muted">
        {best
          ? `Selected ${best.plan.name}. A real agent would ask the LLM to weigh these criteria, or follow a preset policy, or ask the human to pick.`
          : "No plan survives. A good agent stops and escalates to the human instead of improvising."}
      </p>
    </Widget>
  );
}

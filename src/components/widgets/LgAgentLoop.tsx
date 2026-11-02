"use client";

import { useMemo, useState } from "react";
import { Pill, Widget } from "./Widget";

type Phase = "Perceive" | "Plan" | "Act" | "Observe" | "Reason" | "Adapt" | "Ask human" | "Done";
type Component = "Brain" | "Orchestrator" | "Tools" | "Memory" | "Supervisor";
type Tone = "neutral" | "good" | "warn" | "bad";
type Entry = { phase: Phase; text: string; parts: Component[]; remember?: string; tone?: Tone; goal?: string };

type Settings = { lowApplicants: boolean; calendarDown: boolean; goalChange: boolean; approvals: boolean };

const COMPONENTS: Component[] = ["Brain", "Orchestrator", "Tools", "Memory", "Supervisor"];
const GOAL = "Hire a remote backend engineer, 2-4 years";

function buildScript(s: Settings): Entry[] {
  const e: Entry[] = [];
  e.push({ phase: "Perceive", text: `Goal received: "${GOAL}". Constraints: remote, 2-4 years, our stack.`, parts: ["Brain", "Memory"], remember: "Goal + constraints stored" });
  e.push({ phase: "Plan", text: "Drafted two candidate plans (job portals vs referrals + agency). Picked job portals: cheaper, and the job-board tool is available.", parts: ["Brain"], remember: "Plan: JD → post → monitor → screen → interview → offer → onboard" });
  e.push({ phase: "Act", text: "Drafting the JD from past JDs and salary bands in the company docs (RAG).", parts: ["Orchestrator", "Tools"], remember: "JD v1 drafted" });
  e.push({ phase: "Ask human", text: "\"Here's the JD. Any changes?\" Recruiter approves.", parts: ["Supervisor"], tone: "warn" });
  e.push({ phase: "Act", text: "Posting on the two boards that worked best before (job-board APIs).", parts: ["Orchestrator", "Tools"], remember: "Posted on 2 boards" });

  if (s.lowApplicants) {
    e.push({ phase: "Observe", text: "Day 7: checked the boards. 2 applications.", parts: ["Tools"], remember: "Day 7: 2 applicants" });
    e.push({ phase: "Reason", text: "2 is far below the usual ~15 for this role. Waiting longer is unlikely to fix it.", parts: ["Brain"] });
    e.push({ phase: "Adapt", text: "Re-planned: widen the title to full-stack and boost the post for $200.", parts: ["Brain", "Orchestrator"], remember: "Plan changed: JD v2 + boost" });
    if (s.approvals) {
      e.push({ phase: "Ask human", text: "\"Boosting costs $200. OK?\" Recruiter approves.", parts: ["Supervisor"], tone: "warn" });
    } else {
      e.push({ phase: "Act", text: "No approval rule for spending, so it boosted on its own and picked $900 \"to be safe\".", parts: ["Tools"], tone: "bad" });
    }
    e.push({ phase: "Act", text: "Edited the posting and started the boost.", parts: ["Orchestrator", "Tools"], remember: "JD v2 live, boost running" });
    e.push({ phase: "Observe", text: "Day 10: 11 applications.", parts: ["Tools"], remember: "Day 10: 11 applicants" });
  } else {
    e.push({ phase: "Observe", text: "Day 7: checked the boards. 14 applications, on target.", parts: ["Tools"], remember: "Day 7: 14 applicants" });
  }

  if (s.goalChange) {
    e.push({ phase: "Perceive", text: "Recruiter: \"Change of plan. It's a 3-month project, find a freelancer instead.\"", parts: ["Brain", "Memory"], goal: "Find a backend freelancer for a 3-month project", remember: "Goal changed: freelancer" });
    e.push({ phase: "Adapt", text: "Dropped the remaining full-time steps. New plan: freelance marketplace → screen portfolios → short contract.", parts: ["Brain", "Orchestrator"], remember: "Plan replaced" });
    e.push({ phase: "Act", text: "Closed the job posts and published the project on a freelance marketplace.", parts: ["Tools"], remember: "Freelance brief posted" });
    e.push({ phase: "Done", text: "Continues on the new plan. Same loop, different goal.", parts: ["Orchestrator"], tone: "good" });
    return e;
  }

  e.push({ phase: "Act", text: "Parsed every resume and scored it against the JD: 2 strong, 3 partial, rest weak.", parts: ["Tools", "Brain"], remember: "Shortlist: 2 strong" });
  e.push({ phase: "Ask human", text: "\"Schedule the 2 strong candidates?\" Recruiter says yes.", parts: ["Supervisor"], tone: "warn" });
  if (s.calendarDown) {
    e.push({ phase: "Observe", text: "Calendar API returned 503 twice.", parts: ["Tools"], tone: "bad" });
    e.push({ phase: "Adapt", text: "Can't read availability. Fallback: ask the recruiter directly instead of waiting on the API.", parts: ["Brain", "Orchestrator"] });
    e.push({ phase: "Ask human", text: "\"When are you free this week?\" Recruiter: \"Friday 3 pm.\"", parts: ["Supervisor"], tone: "warn", remember: "Recruiter free Fri 3 pm (asked directly)" });
  } else {
    e.push({ phase: "Act", text: "Checked the calendar: recruiter is free Friday 3 pm.", parts: ["Tools"], remember: "Recruiter free Fri 3 pm" });
  }
  e.push({ phase: "Act", text: "Sent invites to both candidates and the recruiter.", parts: ["Tools"], remember: "Interviews booked Fri" });
  e.push({ phase: "Act", text: "Interview day: sent a reminder and a question doc built from past interviews.", parts: ["Tools", "Brain"] });
  if (s.approvals) {
    e.push({ phase: "Ask human", text: "\"Here's the offer letter for the chosen candidate. Send it?\" Recruiter approves.", parts: ["Supervisor"], tone: "warn" });
  } else {
    e.push({ phase: "Act", text: "Sent the offer as soon as interview notes came in, at the top of the band, without a human check.", parts: ["Tools"], tone: "bad" });
  }
  e.push({ phase: "Observe", text: "Candidate accepted.", parts: ["Tools"], remember: "Offer accepted" });
  e.push({ phase: "Act", text: "Welcome email, IT access request, laptop provisioning via the HR system.", parts: ["Tools"], remember: "Onboarding started" });
  e.push({ phase: "Done", text: "Goal met. The run ends.", parts: ["Orchestrator"], tone: "good" });
  return e;
}

const PHASE_STYLE: Record<Tone, string> = {
  neutral: "bg-surface-2",
  good: "bg-good-soft",
  warn: "bg-warn-soft",
  bad: "bg-bad-soft",
};

const TOGGLES: { key: keyof Settings; label: string }[] = [
  { key: "lowApplicants", label: "Few applicants" },
  { key: "calendarDown", label: "Calendar API down" },
  { key: "goalChange", label: "Goal changes midway" },
  { key: "approvals", label: "Approval rules" },
];

export function LgAgentLoop() {
  const [settings, setSettings] = useState<Settings>({ lowApplicants: true, calendarDown: false, goalChange: false, approvals: true });
  const [shown, setShown] = useState(1);
  const script = useMemo(() => buildScript(settings), [settings]);
  const visible = script.slice(0, shown);
  const current = visible[visible.length - 1];
  const memory = visible.filter((v) => v.remember).map((v) => v.remember as string);
  const goal = [...visible].reverse().find((v) => v.goal)?.goal ?? GOAL;
  const finished = shown >= script.length;

  function toggle(key: keyof Settings) {
    setSettings((s) => ({ ...s, [key]: !s[key] }));
    setShown(1);
  }

  return (
    <Widget title="The agent loop" hint="Switch on events, then step through the hiring agent. Watch which component is working and what it remembers.">
      <div className="flex flex-wrap gap-2">
        {TOGGLES.map((t) => (
          <Pill key={t.key} active={settings[t.key]} onClick={() => toggle(t.key)}>
            {t.label}: {settings[t.key] ? "on" : "off"}
          </Pill>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {COMPONENTS.map((c) => {
          const active = current?.parts.includes(c) || (c === "Memory" && !!current?.remember);
          return (
            <div key={c} className={`min-w-0 rounded-lg border p-2 text-center text-xs font-semibold ${active ? "border-accent bg-accent-soft text-accent" : "border-border text-muted"}`}>
              {c}
            </div>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-5">
        <ol className="min-w-0 space-y-1 sm:col-span-3">
          {visible.map((v, i) => (
            <li key={i} className={`rounded px-2 py-1 text-[0.8rem] ${PHASE_STYLE[v.tone ?? "neutral"]} ${i === visible.length - 1 ? "ring-1 ring-accent" : ""}`}>
              <span className="mr-1 font-mono text-[0.7rem] font-semibold uppercase text-accent">{v.phase}</span>
              {v.text}
            </li>
          ))}
        </ol>
        <div className="min-w-0 rounded-lg border border-border bg-surface-2 p-2 text-[0.78rem] sm:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Context in memory</p>
          <p className="mt-1 break-words"><span className="font-semibold">Goal:</span> {goal}</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {memory.map((m, i) => (
              <li key={i} className="break-words">{m}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={finished} onClick={() => setShown((n) => Math.min(n + 1, script.length))} className="min-h-10 flex-1 rounded-lg bg-accent px-3 text-sm font-medium text-white disabled:opacity-50 dark:text-bg">
          {finished ? "Run finished" : `Next step (${shown}/${script.length})`}
        </button>
        <button type="button" onClick={() => setShown(script.length)} className="min-h-10 rounded-lg border border-border px-3 text-sm">
          Show all
        </button>
        <button type="button" onClick={() => setShown(1)} className="min-h-10 rounded-lg border border-border px-3 text-sm">
          Reset
        </button>
      </div>
    </Widget>
  );
}

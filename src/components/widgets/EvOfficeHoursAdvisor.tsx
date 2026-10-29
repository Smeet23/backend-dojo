"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Branch = { label: string; advice: string; avoid: string; link: { text: string; href: string } };
type Situation = { id: string; title: string; ask: string; branches: Branch[] };

const L = (slug: string, text: string) => ({ text, href: `/courses/ai-evals/${slug}` });

const SITUATIONS: Situation[] = [
  {
    id: "nodata",
    title: "No production data yet",
    ask: "Do you have any real users at all (pilots, testers, colleagues)?",
    branches: [
      {
        label: "A few",
        advice: "Use their real queries as seeds. Have an LLM perturb them into variations, and put a handful of real examples in the generation prompt.",
        avoid: "Generating everything from your imagination when real queries are within reach.",
        link: L("error-analysis#create-a-starting-dataset", "Create a starting dataset"),
      },
      {
        label: "None",
        advice: "Generate from dimensions and tuples for your priority personas and features only. Keep adding dimensions; when new ones stop revealing new failure modes, that is a ship signal. Then get pilot users fast.",
        avoid: "Trying to cover every persona and feature synthetically. It delays launch and still misses reality.",
        link: L("error-analysis#iterate-until-saturation", "Iterate until saturation"),
      },
    ],
  },
  {
    id: "long",
    title: "Traces are too long to read",
    ask: "How long is a typical trace?",
    branches: [
      {
        label: "A few steps",
        advice: "Read the first input and the final output. If the outcome is fine, move on. If not, read from the top until the first error, write the open code, stop.",
        avoid: "Annotating every step of every trace.",
        link: L("collaborative-evaluation#what-counts-as-a-trace", "What counts as a trace"),
      },
      {
        label: "30+ turns",
        advice: "Pre-screen: one trace per spreadsheet row, ask a reasoning model which traces most likely contain a failure, and read those first. Summarize messages if they don't fit.",
        avoid: "Letting the model's ranking replace your own reading. It prioritizes; you judge.",
        link: L("human-review-interfaces#selecting-traces-from-the-firehose", "Selecting traces from the firehose"),
      },
      {
        label: "Weeks long",
        advice: "Segment sessions into tractable chunks and sample by signals: negative feedback, outlier length or tool counts.",
        avoid: "Random sampling of month-long sessions, which mostly surfaces uneventful stretches.",
        link: L("human-review-interfaces#selecting-traces-from-the-firehose", "Selecting traces from the firehose"),
      },
    ],
  },
  {
    id: "judge",
    title: "My judge disagrees with me",
    ask: "What does the disagreement look like?",
    branches: [
      {
        label: "Scattered misses",
        advice: "Collect the disagreements with your critiques, ask an LLM to propose judge-prompt edits, and verify each edit on dev yourself. Write open codes clearly enough for an LLM to use.",
        avoid: "Chasing perfect agreement. Its cost is unbounded.",
        link: L("trusting-your-judge#refining-the-judge-in-practice", "Refining the judge in practice"),
      },
      {
        label: "TNR stuck low",
        advice: "Try a stronger judge model, then split the criterion into narrower judges, then add more labeled edge cases.",
        avoid: "Reporting agreement or accuracy alone, which hides a judge that passes everything.",
        link: L("automated-evaluators#the-refinement-loop", "The refinement loop"),
      },
      {
        label: "Want it automated",
        advice: "Use a reasoning model to rank likely failures and suggest edits, with you in the loop. It works for objective criteria like spelling.",
        avoid: "Letting a model iterate the judge unsupervised on subjective criteria. It cannot infer taste you never wrote down.",
        link: L("trusting-your-judge", "Trusting your judge"),
      },
    ],
  },
  {
    id: "score",
    title: "Stakeholders want a single score",
    ask: "Who is in the room?",
    branches: [
      {
        label: "Non-technical",
        advice: "Show one global error rate: traces where any judge flagged any failure. Keep the validation story (human labels, TPR and TNR) ready for questions.",
        avoid: "Confidence intervals and per-judge tables on the slide.",
        link: L("trusting-your-judge#estimating-the-true-success-rate", "Estimating the true success rate"),
      },
      {
        label: "One failure is hot",
        advice: "Give the failure everyone worries about its own headline number next to the global rate. Frame targets as resource trade-offs: 95% can still deliver value.",
        avoid: "Burying the hot topic inside a composite, or promising zero.",
        link: L("ci-cd-and-monitoring#the-continuous-improvement-flywheel", "The continuous improvement flywheel"),
      },
      {
        label: "Data scientists",
        advice: "Report per-failure-mode prevalence, corrected for judge bias, with intervals.",
        avoid: "Raw judge pass rates presented as truth.",
        link: L("trusting-your-judge#python-correction-plus-bootstrap", "Correction plus bootstrap"),
      },
    ],
  },
  {
    id: "kappa",
    title: "Annotators keep disagreeing",
    ask: "What seems to be the cause?",
    branches: [
      {
        label: "Vague rubric",
        advice: "Run an alignment session on the disagreements and sharpen the pass and fail definitions, then label a fresh batch.",
        avoid: "Arguing to win individual labels.",
        link: L("collaborative-evaluation#alignment-sessions", "Alignment sessions"),
      },
      {
        label: "Labelers lack context",
        advice: "Reorganize: one benevolent dictator per product line, region or language, labeling only what they know.",
        avoid: "Everyone labeling everything, or outsourcing labels to non-experts.",
        link: L("collaborative-evaluation#the-benevolent-dictator", "The benevolent dictator"),
      },
      {
        label: "Kappa already decent",
        advice: "Accept the remaining noise and move on to building judges.",
        avoid: "Treating agreement as a score to maximize.",
        link: L("collaborative-evaluation#measuring-agreement", "Measuring agreement"),
      },
    ],
  },
  {
    id: "whack",
    title: "Fixing one thing breaks another",
    ask: "Are the instructions already clear and complete?",
    branches: [
      {
        label: "Not sure",
        advice: "Check for specification gaps first, then split the task into sub-agents or separate calls so one prompt isn't juggling conflicting goals.",
        avoid: "Rewriting the whole prompt after every failure (whack-a-mole).",
        link: L("improvement-and-cost#structural-changes", "Structural changes"),
      },
      {
        label: "Yes, still fails",
        advice: "It is a generalization problem: try a stronger model or more test-time compute, and fine-tune only at a real plateau with serving infrastructure in place.",
        avoid: "Fine-tuning first. Newer models often overtake a fine-tune within months.",
        link: L("improvement-and-cost#heavier-fixes", "Heavier fixes"),
      },
    ],
  },
  {
    id: "agents",
    title: "Multi-agent system: where to start?",
    ask: "Have you done error analysis on whole traces yet?",
    branches: [
      {
        label: "Not yet",
        advice: "Treat the whole system as one unit. Do error analysis on end-to-end traces, then trace each failure mode back to the agent or handoff behind it.",
        avoid: "Building separate evals for each agent before any system-level analysis.",
        link: L("rag-and-agents#debugging-agents-and-multi-step-pipelines", "Debugging agents"),
      },
      {
        label: "Yes",
        advice: "Decompose or add a dedicated sub-agent only where the biggest failure sits, and confirm with evals that the extra complexity pays off.",
        avoid: "Searching the cross product of every agent design up front.",
        link: L("homework-agent-failures", "Failure transition heatmaps"),
      },
    ],
  },
  {
    id: "sell",
    title: "Management won't give us the time",
    ask: "What is the objection?",
    branches: [
      {
        label: "Cost and time",
        advice: "Bake evals into feature estimates, count the bugs error analysis finds, and show leadership the failure taxonomy.",
        avoid: "Pitching evals as a separate research project.",
        link: L("error-analysis#label-every-trace-and-count", "Label every trace and count"),
      },
      {
        label: "Privacy",
        advice: "Propose a small trained team under a data agreement, with a fixed retention window (for example, purge after 30 days).",
        avoid: "Giving up on reading traces altogether.",
        link: L("collaborative-evaluation#what-counts-as-a-trace", "What counts as a trace"),
      },
    ],
  },
];

export function EvOfficeHoursAdvisor() {
  const [sid, setSid] = useState(SITUATIONS[0].id);
  const [picks, setPicks] = useState<Record<string, number>>({});
  const s = SITUATIONS.find((x) => x.id === sid) ?? SITUATIONS[0];
  const bi = picks[s.id] ?? 0;
  const b = s.branches[bi];

  return (
    <Widget title="What should I do?" hint="Pick the situation you're in, answer one question, and see what the instructors recommended.">
      <label className="block text-xs font-semibold uppercase tracking-wide text-muted" htmlFor="ev-oh1-situation">
        Situation
      </label>
      <select
        id="ev-oh1-situation"
        value={sid}
        onChange={(e) => setSid(e.target.value)}
        className="mt-1 min-h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm"
      >
        {SITUATIONS.map((x) => (
          <option key={x.id} value={x.id}>
            {x.title}
          </option>
        ))}
      </select>

      <p className="mt-4 text-sm font-medium">{s.ask}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {s.branches.map((br, k) => (
          <Pill key={br.label} active={k === bi} onClick={() => setPicks((p) => ({ ...p, [s.id]: k }))}>
            {br.label}
          </Pill>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        <div className="rounded-lg border border-good bg-good-soft p-3 text-sm leading-relaxed">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Do this</p>
          <p className="mt-1">{b.advice}</p>
        </div>
        <div className="rounded-lg border border-warn bg-warn-soft p-3 text-sm leading-relaxed">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Avoid</p>
          <p className="mt-1">{b.avoid}</p>
        </div>
        <p className="text-sm">
          <span className="text-muted">Go deeper: </span>
          <a href={b.link.href} className="font-medium text-accent underline underline-offset-2">
            {b.link.text}
          </a>
        </p>
      </div>

      <p className="mt-4 text-xs text-muted">
        {SITUATIONS.length} situations from the first four office hours. Notice how often the answer changes with one detail: that
        &quot;it depends&quot; is the point.
      </p>
    </Widget>
  );
}

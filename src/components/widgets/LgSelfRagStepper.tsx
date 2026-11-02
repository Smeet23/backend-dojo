"use client";

import { useMemo, useState } from "react";
import { Pill, Widget } from "./Widget";

type Support = "fully_supported" | "partially_supported" | "no_support";
type Round = { query: string; retrieved: number; relevant: number; answer: string; support: Support[]; revised: string[]; useful: boolean };
type Scenario = { label: string; question: string; retrieve: boolean; direct?: string; rounds: Round[] };

const SCENARIOS: Scenario[] = [
  { label: "General question", question: "What is a paid leave?", retrieve: false, direct: "Paid leave is time off work during which an employee still receives their normal pay.", rounds: [] },
  {
    label: "In the docs",
    question: "Who is the CEO of NexaAI?",
    retrieve: true,
    rounds: [{ query: "Who is the CEO of NexaAI?", retrieved: 4, relevant: 1, answer: "The CEO of NexaAI is Aarav Mehta.", support: ["fully_supported"], revised: [], useful: true }],
  },
  {
    label: "Embellished answer",
    question: "Describe NexaAI's company culture.",
    retrieve: true,
    rounds: [
      {
        query: "Describe NexaAI's company culture.",
        retrieved: 4,
        relevant: 2,
        answer: "NexaAI has a vibrant, flexible culture with hackathons and a strong work-life balance, built on its values of innovation and integrity.",
        support: ["partially_supported", "partially_supported", "fully_supported"],
        revised: ["NexaAI's culture is built on innovation and integrity, with a flexible work style.", "NexaAI's culture is built on its core values: innovation, integrity and customer focus."],
        useful: true,
      },
    ],
  },
  {
    label: "Not in the docs",
    question: "What is NexaAI's refund policy?",
    retrieve: true,
    rounds: [{ query: "What is NexaAI's refund policy?", retrieved: 4, relevant: 0, answer: "", support: [], revised: [], useful: false }],
  },
  {
    label: "Invented fact",
    question: "Does NexaAI offer a free trial, and how long is it?",
    retrieve: true,
    rounds: [
      {
        query: "Does NexaAI offer a free trial, and how long is it?",
        retrieved: 4,
        relevant: 2,
        answer: "Yes, NexaAI plans include a 14-day free trial.",
        support: ["no_support", "partially_supported", "fully_supported"],
        revised: ["NexaAI offers several pricing plans, likely with a trial period.", "The documents list NexaAI's pricing plans but do not mention a free trial."],
        useful: false,
      },
      {
        query: "NexaAI free trial evaluation period pricing plans subscription",
        retrieved: 4,
        relevant: 1,
        answer: "NexaAI's Starter plan is billed monthly; a free trial is not described.",
        support: ["fully_supported"],
        revised: [],
        useful: false,
      },
      {
        query: "NexaAI trial demo onboarding sign-up offer",
        retrieved: 4,
        relevant: 1,
        answer: "The documents describe onboarding support but no free trial.",
        support: ["fully_supported"],
        revised: [],
        useful: false,
      },
    ],
  },
];

type Snap = { need_retrieval: string; retrieval_query: string; relevant_docs: string; issup: string; retries: number; isuse: string; rewrite_tries: number; answer: string };
type Step = { node: string; note: string; tone: "good" | "warn" | "bad" | "neutral"; snap: Snap };

function simulate(sc: Scenario, maxRetries: number, maxRewrites: number): Step[] {
  const s: Snap = { need_retrieval: "-", retrieval_query: sc.question, relevant_docs: "-", issup: "-", retries: 0, isuse: "-", rewrite_tries: 0, answer: "-" };
  const steps: Step[] = [];
  const push = (node: string, note: string, tone: Step["tone"] = "neutral") => steps.push({ node, note, tone, snap: { ...s } });

  s.need_retrieval = String(sc.retrieve);
  push("decide_retrieval", sc.retrieve ? "Needs company facts → retrieve." : "General knowledge is enough → answer directly.", sc.retrieve ? "neutral" : "good");
  if (!sc.retrieve) {
    s.answer = sc.direct ?? "";
    push("generate_direct", "Answered from parametric knowledge. No graders on this path.", "good");
    push("END", "Two nodes, one cheap answer.", "good");
    return steps;
  }
  for (let r = 0; ; r++) {
    const round = sc.rounds[Math.min(r, sc.rounds.length - 1)];
    s.retrieval_query = round.query;
    push("retrieve", `Fetched ${round.retrieved} chunks for "${round.query}".`);
    s.relevant_docs = `${round.relevant} of ${round.retrieved}`;
    if (round.relevant === 0) {
      push("is_relevant", "No chunk actually answers the question.", "bad");
      s.answer = "No answer found in the company documents.";
      push("no_answer_found", "Honest refusal instead of an invented answer.", "warn");
      push("END", "", "neutral");
      return steps;
    }
    push("is_relevant", `${round.relevant} relevant; the rest are same-topic noise.`, "good");
    s.answer = round.answer;
    push("generate_from_context", "Answer written from the relevant chunks only.");
    let k = 0;
    for (;;) {
      const verdict = round.support[Math.min(k, round.support.length - 1)];
      s.issup = verdict;
      if (verdict === "fully_supported") {
        push("is_sup", "Every claim is in the context.", "good");
        break;
      }
      if (s.retries >= maxRetries) {
        push("is_sup", `${verdict}, and retries (${s.retries}) reached MAX_RETRIES=${maxRetries}.`, "bad");
        s.answer = "No answer found in the company documents.";
        push("no_answer_found", "Revise budget spent; refuse rather than ship an ungrounded answer.", "warn");
        push("END", "", "neutral");
        return steps;
      }
      push("is_sup", `${verdict}: some claims aren't in the context.`, "warn");
      s.retries += 1;
      s.answer = round.revised[Math.min(k, round.revised.length - 1)] ?? s.answer;
      push("revise_answer", "Strip unsupported claims, add nothing new. Back to is_sup.", "neutral");
      k++;
    }
    s.isuse = round.useful ? "useful" : "not_useful";
    if (round.useful) {
      push("is_use", "Grounded and answers the question.", "good");
      push("END", "Done.", "good");
      return steps;
    }
    if (s.rewrite_tries >= maxRewrites) {
      push("is_use", `Grounded but not useful, and rewrite_tries (${s.rewrite_tries}) reached MAX_REWRITES=${maxRewrites}.`, "bad");
      s.answer = "No answer found in the company documents.";
      push("no_answer_found", "Retrieval budget spent. The information isn't in the documents.", "warn");
      push("END", "", "neutral");
      return steps;
    }
    push("is_use", "Grounded but doesn't answer the question → try different evidence.", "warn");
    s.rewrite_tries += 1;
    s.retries = 0;
    s.retrieval_query = sc.rounds[Math.min(r + 1, sc.rounds.length - 1)].query;
    push("rewrite_question", "New retrieval_query; question unchanged; retries reset to 0.", "neutral");
  }
}

const TONE = { good: "border-good bg-good-soft", warn: "border-warn bg-warn-soft", bad: "border-bad bg-bad-soft", neutral: "border-border bg-surface-2" };

export function LgSelfRagStepper() {
  const [sc, setSc] = useState(4);
  const [maxRetries, setMaxRetries] = useState(3);
  const [maxRewrites, setMaxRewrites] = useState(2);
  const [i, setI] = useState(0);
  const steps = useMemo(() => simulate(SCENARIOS[sc], maxRetries, maxRewrites), [sc, maxRetries, maxRewrites]);
  const cur = steps[Math.min(i, steps.length - 1)];
  const llmCalls = steps.slice(0, i + 1).reduce((n, x) => {
    if (["retrieve", "END", "no_answer_found"].includes(x.node)) return n;
    if (x.node === "is_relevant") return n + Number(x.snap.relevant_docs.split(" of ")[1] ?? 1);
    return n + 1;
  }, 0);

  const reset = (fn: () => void) => {
    fn();
    setI(0);
  };

  return (
    <Widget title="Self-RAG decision stepper" hint="Pick a question and the loop budgets, then step through the graph. Watch the counters and where each run ends.">
      <div className="flex flex-wrap gap-2">
        {SCENARIOS.map((x, j) => (
          <Pill key={x.label} active={sc === j} onClick={() => reset(() => setSc(j))}>
            {x.label}
          </Pill>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">MAX_RETRIES:</span>
        {[1, 2, 3].map((v) => (
          <Pill key={v} active={maxRetries === v} onClick={() => reset(() => setMaxRetries(v))}>{v}</Pill>
        ))}
        <span className="ml-2 text-xs text-muted">MAX_REWRITES:</span>
        {[0, 1, 2].map((v) => (
          <Pill key={v} active={maxRewrites === v} onClick={() => reset(() => setMaxRewrites(v))}>{v}</Pill>
        ))}
      </div>
      <p className="mt-2 text-sm"><span className="text-muted">Question: </span>{SCENARIOS[sc].question}</p>

      <div className="mt-3 flex flex-wrap gap-1">
        {steps.map((st, j) => (
          <button
            key={j}
            type="button"
            onClick={() => setI(j)}
            className={`min-h-10 rounded-md border px-2 font-mono text-[0.68rem] ${j === i ? "border-accent bg-accent text-white dark:text-bg" : j < i ? TONE[st.tone] : "border-border bg-surface text-muted"}`}
          >
            {st.node}
          </button>
        ))}
      </div>

      <div className={`mt-3 rounded-lg border p-3 text-sm ${TONE[cur.tone]}`}>
        <p className="font-mono font-semibold">{cur.node}</p>
        {cur.note && <p className="text-muted">{cur.note}</p>}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        {(
          [
            ["need_retrieval", cur.snap.need_retrieval],
            ["relevant_docs", cur.snap.relevant_docs],
            ["issup", cur.snap.issup],
            ["isuse", cur.snap.isuse],
            ["retries", `${cur.snap.retries} / ${maxRetries}`],
            ["rewrite_tries", `${cur.snap.rewrite_tries} / ${maxRewrites}`],
            ["model calls so far", String(llmCalls)],
            ["step", `${i + 1} / ${steps.length}`],
          ] as const
        ).map(([k, v]) => (
          <div key={k} className="min-w-0 rounded-lg bg-surface-2 p-2">
            <p className="text-muted">{k}</p>
            <p className="break-words font-mono">{v}</p>
          </div>
        ))}
      </div>
      <div className="mt-2 rounded-lg bg-surface-2 p-2 text-xs">
        <p className="text-muted">retrieval_query</p>
        <p className="break-words font-mono">{cur.snap.retrieval_query}</p>
        <p className="mt-1 text-muted">answer</p>
        <p className="break-words">{cur.snap.answer}</p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => setI((x) => Math.max(0, x - 1))} disabled={i === 0} className="min-h-10 rounded-lg border border-border px-3 text-sm disabled:opacity-40">
          Back
        </button>
        <button type="button" onClick={() => setI((x) => Math.min(steps.length - 1, x + 1))} disabled={i >= steps.length - 1} className="min-h-10 flex-1 rounded-lg bg-accent px-3 text-sm font-medium text-white disabled:opacity-40 dark:text-bg">
          Next step
        </button>
        <button type="button" onClick={() => setI(steps.length - 1)} className="min-h-10 rounded-lg border border-border px-3 text-sm">
          Jump to end
        </button>
      </div>
    </Widget>
  );
}

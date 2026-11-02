"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

const CONTEXT = [
  "C1: All full-time employees are entitled to 24 paid leaves per calendar year.",
  "C2: Employees may take different types of leave, including sick leave and casual leave.",
  "C3: Leave approval is managed through the HR portal.",
];

type Claim = { text: string; source: string | null; why: string };
type Answer = { label: string; text: string; claims: Claim[] };

const ANSWERS: Answer[] = [
  {
    label: "Answer A",
    text: "All full-time employees get 24 paid leaves per calendar year.",
    claims: [{ text: "24 paid leaves per calendar year for full-time staff", source: "C1", why: "Stated word for word." }],
  },
  {
    label: "Answer B",
    text: "Employees get 24 leaves a year, which include sick and casual leave, managed through the HR portal.",
    claims: [
      { text: "24 leaves per year", source: "C1", why: "Stated." },
      { text: "the 24 include sick and casual leave", source: null, why: "C1 and C2 are separate facts; the context never says one contains the other. Invented link." },
      { text: "managed through the HR portal", source: "C3", why: "Stated." },
    ],
  },
  {
    label: "Answer C",
    text: "Employees are entitled to 30 paid leaves per year with carry-forward benefits.",
    claims: [
      { text: "30 paid leaves per year", source: null, why: "Contradicts C1 (24)." },
      { text: "carry-forward benefits", source: null, why: "Not mentioned anywhere." },
    ],
  },
  {
    label: "Answer D",
    text: "Employees can take sick and casual leave, and requests go through the HR portal.",
    claims: [
      { text: "sick and casual leave exist", source: "C2", why: "Stated." },
      { text: "requests go through the HR portal", source: "C3", why: "Stated." },
    ],
  },
];

export function LgSupportCheck() {
  const [i, setI] = useState(1);
  const a = ANSWERS[i];
  const supported = a.claims.filter((c) => c.source).length;
  const verdict = supported === a.claims.length ? "fully_supported" : supported === 0 ? "no_support" : "partially_supported";
  const tone = verdict === "fully_supported" ? "border-good bg-good-soft" : verdict === "no_support" ? "border-bad bg-bad-soft" : "border-warn bg-warn-soft";
  const useful = i !== 3;

  return (
    <Widget title="IsSup: claim-by-claim support" hint='Question: "How many paid leaves do employees get per year?" Pick an answer and see which claims the context supports.'>
      <div className="rounded-lg bg-surface-2 p-2 text-xs">
        {CONTEXT.map((c) => (
          <p key={c} className="break-words">{c}</p>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {ANSWERS.map((x, j) => (
          <Pill key={x.label} active={i === j} onClick={() => setI(j)}>
            {x.label}
          </Pill>
        ))}
      </div>
      <p className="mt-2 break-words text-sm italic">&ldquo;{a.text}&rdquo;</p>

      <ul className="mt-3 space-y-2">
        {a.claims.map((c) => (
          <li key={c.text} className={`rounded-lg border p-2 text-sm ${c.source ? "border-good" : "border-bad"}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="min-w-0 break-words">{c.text}</span>
              <span className={`rounded px-1.5 py-0.5 font-mono text-xs ${c.source ? "bg-good-soft" : "bg-bad-soft"}`}>{c.source ?? "unsupported"}</span>
            </div>
            <p className="mt-0.5 text-xs text-muted">{c.why}</p>
          </li>
        ))}
      </ul>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className={`min-w-0 rounded-lg border p-2 text-sm ${tone}`}>
          <p className="text-xs text-muted">is_sup</p>
          <p className="font-mono">{verdict}</p>
          <p className="text-xs text-muted">{verdict === "fully_supported" ? "→ is_use" : "→ revise_answer (if retries remain)"}</p>
        </div>
        <div className={`min-w-0 rounded-lg border p-2 text-sm ${verdict !== "fully_supported" ? "border-border" : useful ? "border-good bg-good-soft" : "border-warn bg-warn-soft"}`}>
          <p className="text-xs text-muted">is_use</p>
          <p className="font-mono">{verdict !== "fully_supported" ? "not reached yet" : useful ? "useful" : "not_useful"}</p>
          <p className="text-xs text-muted">{verdict !== "fully_supported" ? "Support is checked first." : useful ? "Answers the question → END" : "Grounded, but never says how many → rewrite_question"}</p>
        </div>
      </div>
    </Widget>
  );
}

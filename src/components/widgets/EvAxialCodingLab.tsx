"use client";

import { useState } from "react";
import { Widget } from "./Widget";

const TRACES_READ = 30;

const CATEGORIES = [
  "Scheduling and rescheduling",
  "Handoff and escalation",
  "Invented or wrong facts",
  "Poor handling of tool errors",
  "Caller status misidentified",
  "Channel formatting",
  "Not an assistant failure",
] as const;
type Category = (typeof CATEGORIES)[number];
const DROP: Category = "Not an assistant failure";

type Note = { id: string; text: string; suggested: Category; why?: string };

const NOTES: Note[] = [
  { id: "t03", text: "Asked to move Thursday tour to Friday; booked a second tour and left the first one in place.", suggested: "Scheduling and rescheduling" },
  { id: "t05", text: "Text-confirmation tool returned an error; agent said 'I've sent you a confirmation' twice anyway.", suggested: "Poor handling of tool errors" },
  { id: "t07", text: "Caller asked for a representative twice; agent kept asking qualifying questions instead of transferring.", suggested: "Handoff and escalation" },
  { id: "t08", text: "Said unit A11 is available. No tool output mentions A11.", suggested: "Invented or wrong facts" },
  { id: "t10", text: "Offered tour slots at 9am and 10am today; the call happened at 2pm.", suggested: "Scheduling and rescheduling" },
  { id: "t11", text: "Caller's message was full of typos and abbreviations.", suggested: DROP, why: "That describes the input, not something the assistant did wrong." },
  { id: "t12", text: "Caller said 'my apartment's heater is out'; agent offered to book a tour.", suggested: "Caller status misidentified" },
  { id: "t14", text: "Sent a markdown bullet list with **bold** headers in an SMS reply.", suggested: "Channel formatting" },
  { id: "t15", text: "Told caller parking is free; property info says permit only.", suggested: "Invented or wrong facts" },
  { id: "t17", text: "Caller wanted 3:30; agent booked 3:00 and confirmed it as 3:30.", suggested: "Scheduling and rescheduling" },
  { id: "t19", text: "Billing dispute should go to staff per prompt; agent tried to resolve it itself.", suggested: "Handoff and escalation" },
  { id: "t21", text: "Transfer tool timed out; agent ended the call without telling the caller.", suggested: "Poor handling of tool errors", why: "It looks like a handoff issue, but the transfer was attempted. The first failure is how the agent reacted to the tool error." },
  { id: "t23", text: "Caller outside the building; agent implied it would unlock the door.", suggested: "Invented or wrong facts", why: "The agent claimed a capability it does not have, which is a fabricated fact about itself." },
  { id: "t24", text: "Booked a tour on Sunday, when the leasing office is closed.", suggested: "Scheduling and rescheduling" },
  { id: "t26", text: "Read the date aloud as 'zero three slash one four' on a voice call.", suggested: "Channel formatting" },
  { id: "t28", text: "Treated a current resident asking about renewal as a new prospect and pitched move-in specials.", suggested: "Caller status misidentified" },
];

export function EvAxialCodingLab() {
  const [assign, setAssign] = useState<Record<string, Category | "">>({});
  const [checked, setChecked] = useState(false);

  const done = NOTES.filter((n) => assign[n.id]).length;
  const counts = CATEGORIES.filter((c) => c !== DROP)
    .map((c) => ({ c, n: NOTES.filter((x) => assign[x.id] === c).length }))
    .filter((r) => r.n > 0)
    .sort((a, b) => b.n - a.n);
  const max = Math.max(1, ...counts.map((r) => r.n));
  const agree = NOTES.filter((n) => assign[n.id] === n.suggested).length;

  const fillSuggested = () => {
    setAssign(Object.fromEntries(NOTES.map((n) => [n.id, n.suggested])));
    setChecked(true);
  };

  return (
    <Widget
      title="Open codes to failure taxonomy"
      hint={`Open codes written while reading ${TRACES_READ} leasing-assistant traces (traces that looked fine got no note). Put each note in a failure mode, then read the counts table.`}
    >
      <ul className="space-y-2">
        {NOTES.map((n) => {
          const a = assign[n.id] ?? "";
          const tone = checked && a ? (a === n.suggested ? "border-good bg-good-soft" : "border-warn bg-warn-soft") : "border-border bg-surface";
          return (
            <li key={n.id} className={`rounded-lg border p-2 ${tone}`}>
              <p className="text-sm break-words">
                <span className="mr-1 font-mono text-[0.7rem] text-muted">{n.id}</span>
                {n.text}
              </p>
              <select
                aria-label={`Failure mode for ${n.id}`}
                value={a}
                onChange={(e) => setAssign((s) => ({ ...s, [n.id]: e.target.value as Category }))}
                className="mt-1.5 min-h-9 w-full rounded-md border border-border bg-surface-2 px-2 text-sm"
              >
                <option value="">Choose a failure mode...</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {checked && a && a !== n.suggested && (
                <p className="mt-1 text-xs">
                  Suggested: <strong>{n.suggested}</strong>. {n.why ?? ""}
                </p>
              )}
              {checked && a === n.suggested && n.why && <p className="mt-1 text-xs text-muted">{n.why}</p>}
            </li>
          );
        })}
      </ul>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setChecked(true)} className="min-h-10 rounded-lg bg-accent px-2 text-sm font-medium text-white dark:text-bg">
          Compare with suggested
        </button>
        <button type="button" onClick={fillSuggested} className="min-h-10 rounded-lg border border-border px-2 text-sm">
          Fill in suggested
        </button>
      </div>
      <button
        type="button"
        onClick={() => {
          setAssign({});
          setChecked(false);
        }}
        className="mt-2 min-h-10 w-full rounded-lg border border-border px-3 text-sm"
      >
        Reset
      </button>
      {checked && <p className="mt-2 text-sm">You agree with the suggested grouping on {agree} of {NOTES.length} notes. Disagreement on borderline notes is normal: tighten the definitions until the call is obvious.</p>}

      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">
        Failure counts ({done}/{NOTES.length} notes assigned)
      </p>
      {counts.length === 0 ? (
        <p className="mt-1 text-sm text-muted">Assign some notes to see the table.</p>
      ) : (
        <table className="mt-1 w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="py-1 font-normal">Failure mode</th>
              <th className="py-1 text-right font-normal">Traces</th>
              <th className="py-1 text-right font-normal">Rate</th>
            </tr>
          </thead>
          <tbody>
            {counts.map((r, i) => (
              <tr key={r.c} className="border-t border-border align-top">
                <td className="py-1.5 pr-2">
                  <span className={i === 0 ? "font-semibold" : ""}>{r.c}</span>
                  <div className="mt-1 h-1.5 rounded bg-surface-2">
                    <div className="h-1.5 rounded bg-accent" style={{ width: `${(r.n / max) * 100}%` }} />
                  </div>
                </td>
                <td className="py-1.5 text-right font-mono">{r.n}</td>
                <td className="py-1.5 text-right font-mono">{Math.round((r.n / TRACES_READ) * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {counts.length > 0 && <p className="mt-2 text-xs text-muted">Rate = traces with this failure / {TRACES_READ} traces read. The top row is where to look first, weighted by how much each failure hurts the business.</p>}
    </Widget>
  );
}

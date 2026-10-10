"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Level = 0 | 1 | 2 | 3;
const LEVELS: { id: Level; label: string }[] = [
  { id: 0, label: "Read uncommitted" },
  { id: 1, label: "Read committed" },
  { id: 2, label: "Repeatable read" },
  { id: 3, label: "Serializable" },
];

/** A result per isolation level, indexed by Level. */
type PerLevel = [string, string, string, string];

type Step = { who: "T1" | "T2"; sql: string; result?: PerLevel };

type Scenario = {
  id: string;
  label: string;
  setup: string;
  steps: Step[];
  /** Did the anomaly happen at each level? */
  happens: [boolean, boolean, boolean, boolean];
  verdict: PerLevel;
};

const same = (s: string): PerLevel => [s, s, s, s];

const SCENARIOS: Scenario[] = [
  {
    id: "dirty",
    label: "Dirty read",
    setup: "accounts: id 1, balance 100",
    steps: [
      { who: "T2", sql: "BEGIN;\nUPDATE accounts SET balance = 0 WHERE id = 1;", result: same("Row changed, not committed") },
      {
        who: "T1",
        sql: "SELECT balance FROM accounts WHERE id = 1;",
        result: ["→ 0 (T2's uncommitted value)", "→ 100 (last committed version)", "→ 100 (last committed version)", "→ 100 (last committed version)"],
      },
      { who: "T2", sql: "ROLLBACK;", result: same("The 0 never existed") },
      {
        who: "T1",
        sql: "-- blocks the card because balance looked like 0",
        result: ["Card blocked for no reason", "Decision used 100: correct", "Decision used 100: correct", "Decision used 100: correct"],
      },
    ],
    happens: [true, false, false, false],
    verdict: [
      "Dirty read: T1 acted on data that was rolled back.",
      "Prevented: readers only see committed data.",
      "Prevented.",
      "Prevented.",
    ],
  },
  {
    id: "nonrepeat",
    label: "Non-repeatable read",
    setup: "products: id 7, price 100",
    steps: [
      { who: "T1", sql: "BEGIN;\nSELECT price FROM products WHERE id = 7;", result: same("→ 100") },
      { who: "T2", sql: "UPDATE products SET price = 120 WHERE id = 7;\nCOMMIT;", result: same("Committed") },
      {
        who: "T1",
        sql: "SELECT price FROM products WHERE id = 7;",
        result: ["→ 120", "→ 120 (new statement, new snapshot)", "→ 100 (same snapshot as the first read)", "→ 100 (same snapshot as the first read)"],
      },
    ],
    happens: [true, true, false, false],
    verdict: [
      "Non-repeatable read: same row, two answers in one transaction.",
      "Non-repeatable read: each statement sees the latest commits.",
      "Prevented: the whole transaction reads one snapshot.",
      "Prevented.",
    ],
  },
  {
    id: "phantom",
    label: "Phantom read",
    setup: "bookings: none for room 7 on Friday",
    steps: [
      { who: "T1", sql: "BEGIN;\nSELECT COUNT(*) FROM bookings\nWHERE room = 7 AND day = 'Fri';", result: same("→ 0") },
      { who: "T2", sql: "INSERT INTO bookings (room, day) VALUES (7, 'Fri');\nCOMMIT;", result: same("Committed") },
      {
        who: "T1",
        sql: "SELECT COUNT(*) FROM bookings\nWHERE room = 7 AND day = 'Fri';",
        result: [
          "→ 1",
          "→ 1",
          "→ 1 allowed by the standard; 0 in Postgres and InnoDB snapshot reads",
          "→ 0, or the insert waits on a range lock",
        ],
      },
    ],
    happens: [true, true, true, false],
    verdict: [
      "Phantom: a new row appeared in the range.",
      "Phantom: a new row appeared in the range.",
      "The standard permits phantoms here. Snapshot-based databases hide them, but see write skew.",
      "Prevented: the range is protected (predicate or range locks, or SSI).",
    ],
  },
  {
    id: "skew",
    label: "Write skew",
    setup: "doctors: Alice and Bob on call. Rule: at least one must stay on call.",
    steps: [
      { who: "T1", sql: "BEGIN;\nSELECT COUNT(*) FROM doctors WHERE on_call;", result: same("→ 2, so Alice may leave") },
      { who: "T2", sql: "BEGIN;\nSELECT COUNT(*) FROM doctors WHERE on_call;", result: same("→ 2, so Bob may leave") },
      { who: "T1", sql: "UPDATE doctors SET on_call = false\nWHERE name = 'Alice';\nCOMMIT;", result: same("Committed") },
      {
        who: "T2",
        sql: "UPDATE doctors SET on_call = false\nWHERE name = 'Bob';\nCOMMIT;",
        result: [
          "Committed",
          "Committed",
          "Committed (different row, so no write conflict)",
          "ERROR: could not serialize access. T2 retries, sees 1 on call, refuses",
        ],
      },
    ],
    happens: [true, true, true, false],
    verdict: [
      "Write skew: nobody is on call.",
      "Write skew: nobody is on call.",
      "Write skew: snapshot isolation sees no conflict, because each transaction wrote a different row.",
      "Prevented: one transaction is aborted and retried.",
    ],
  },
];

export function HldIsolationAnomalyLab() {
  const [sid, setSid] = useState("dirty");
  const [level, setLevel] = useState<Level>(1);
  const [step, setStep] = useState(0);
  const sc = SCENARIOS.find((s) => s.id === sid) ?? SCENARIOS[0];
  const done = step >= sc.steps.length;

  return (
    <Widget
      title="Isolation level vs anomaly"
      hint="Pick an anomaly and an isolation level, then step through the two transactions. Switch the level and replay."
    >
      <div className="flex flex-wrap gap-2">
        {SCENARIOS.map((s) => (
          <Pill key={s.id} active={sid === s.id} onClick={() => { setSid(s.id); setStep(0); }}>
            {s.label}
          </Pill>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {LEVELS.map((l) => (
          <Pill key={l.id} active={level === l.id} onClick={() => { setLevel(l.id); setStep(0); }}>
            {l.label}
          </Pill>
        ))}
      </div>

      <p className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-sm text-muted">Start: {sc.setup}</p>

      <ol className="mt-3 space-y-2">
        {sc.steps.slice(0, step).map((st, i) => (
          <li
            key={i}
            className={`rounded-lg border border-border p-3 text-sm ${st.who === "T1" ? "bg-accent-soft sm:mr-8" : "bg-bg sm:ml-8"}`}
          >
            <p className="text-xs font-semibold text-accent">{st.who}</p>
            <pre className="mt-1 whitespace-pre-wrap break-all font-mono text-xs">{st.sql}</pre>
            {st.result && <p className="mt-1 text-sm font-medium">{st.result[level]}</p>}
          </li>
        ))}
      </ol>

      {done && (
        <div className={`mt-3 rounded-lg border p-3 text-sm ${sc.happens[level] ? "border-bad bg-bad-soft" : "border-good bg-good-soft"}`}>
          {sc.verdict[level]}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setStep((s) => Math.min(s + 1, sc.steps.length))}
          disabled={done}
          className="min-h-10 rounded-lg bg-accent px-4 text-sm font-medium text-white disabled:opacity-40 dark:text-bg"
        >
          Next step ({step}/{sc.steps.length})
        </button>
        <button type="button" onClick={() => setStep(0)} className="min-h-10 rounded-lg border border-border px-4 text-sm hover:bg-surface-2">
          Reset
        </button>
      </div>
    </Widget>
  );
}

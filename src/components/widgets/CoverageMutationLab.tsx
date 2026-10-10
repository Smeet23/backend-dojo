"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

/** shippingFee(total, country): flat 5, free from 50 (inclusive), +10 outside India. */
type Fee = (total: number, country: string) => number;

const SOURCE = [
  "function shippingFee(total, country) {",
  "  let fee = 5;",
  "  if (total >= 50) {",
  "    fee = 0;",
  "  }",
  "  if (country !== \"IN\") {",
  "    fee += 10;",
  "  }",
  "  return fee;",
  "}",
];
/** Source line indexes that count as executable statements. */
const EXEC_LINES = [1, 2, 3, 5, 6, 8];

const original: Fee = (t, c) => {
  let fee = 5;
  if (t >= 50) fee = 0;
  if (c !== "IN") fee += 10;
  return fee;
};

type Mutant = { id: string; change: string; fn: Fee };
const MUTANTS: Mutant[] = [
  { id: "M1", change: "total >= 50  →  total > 50", fn: (t, c) => { let f = 5; if (t > 50) f = 0; if (c !== "IN") f += 10; return f; } },
  { id: "M2", change: "fee = 0  →  fee = 1", fn: (t, c) => { let f = 5; if (t >= 50) f = 1; if (c !== "IN") f += 10; return f; } },
  { id: "M3", change: "country !== \"IN\"  →  country === \"IN\"", fn: (t, c) => { let f = 5; if (t >= 50) f = 0; if (c === "IN") f += 10; return f; } },
  { id: "M4", change: "fee += 10  →  fee -= 10", fn: (t, c) => { let f = 5; if (t >= 50) f = 0; if (c !== "IN") f -= 10; return f; } },
  { id: "M5", change: "let fee = 5  →  let fee = 0", fn: (t, c) => { let f = 0; if (t >= 50) f = 0; if (c !== "IN") f += 10; return f; } },
  { id: "M6", change: "if (total >= 50)  →  if (true)", fn: (t, c) => { let f = 5; f = 0; void t; if (c !== "IN") f += 10; return f; } },
  { id: "M7", change: "return fee  →  return 0", fn: () => 0 },
];

type Test = { id: string; code: string; total: number; country: string; expect: number | null };
const TESTS: Test[] = [
  { id: "A", code: "shippingFee(60, \"US\")  // runs, asserts nothing", total: 60, country: "US", expect: null },
  { id: "B", code: "expect(shippingFee(20, \"IN\")).toBe(5)", total: 20, country: "IN", expect: 5 },
  { id: "C", code: "expect(shippingFee(50, \"IN\")).toBe(0)", total: 50, country: "IN", expect: 0 },
  { id: "D", code: "expect(shippingFee(20, \"US\")).toBe(15)", total: 20, country: "US", expect: 15 },
];

function executed(t: Test): Set<number> {
  const lines = new Set([1, 2, 5, 8]);
  if (t.total >= 50) lines.add(3);
  if (t.country !== "IN") lines.add(6);
  return lines;
}

function branches(t: Test): string[] {
  return [t.total >= 50 ? "if1:true" : "if1:false", t.country !== "IN" ? "if2:true" : "if2:false"];
}

const pct = (n: number, d: number) => (d === 0 ? 0 : Math.round((n / d) * 100));

export function CoverageMutationLab() {
  const [on, setOn] = useState<Record<string, boolean>>({ A: true, B: false, C: false, D: false });
  const active = TESTS.filter((t) => on[t.id]);

  const ranLines = new Set<number>();
  const ranBranches = new Set<string>();
  for (const t of active) {
    executed(t).forEach((l) => ranLines.add(l));
    branches(t).forEach((b) => ranBranches.add(b));
  }
  const lineCov = pct(ranLines.size, EXEC_LINES.length);
  const branchCov = pct(ranBranches.size, 4);

  const results = MUTANTS.map((m) => {
    const killer = active.find((t) => t.expect !== null && m.fn(t.total, t.country) !== t.expect);
    return { ...m, killedBy: killer?.id ?? null };
  });
  const killed = results.filter((r) => r.killedBy).length;
  const allPassOriginal = active.every((t) => t.expect === null || original(t.total, t.country) === t.expect);

  return (
    <Widget
      title="Coverage vs mutation score"
      hint="Business rule: free shipping from 50 (inclusive), +10 outside India. Toggle tests and compare the numbers."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <pre className="overflow-x-auto rounded-lg bg-surface-2 p-3 font-mono text-[0.75rem] leading-6">
          {SOURCE.map((line, idx) => {
            const exec = EXEC_LINES.includes(idx);
            const ran = ranLines.has(idx);
            const cls = !exec ? "" : ran ? "bg-good-soft" : "bg-bad-soft";
            return (
              <div key={idx} className={`px-1 ${cls}`}>
                {line || " "}
              </div>
            );
          })}
        </pre>

        <div className="space-y-2 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Test suite</p>
          {TESTS.map((t) => (
            <label key={t.id} className="flex min-h-10 cursor-pointer items-start gap-2 rounded-lg border border-border px-2 py-2">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 shrink-0"
                checked={on[t.id]}
                onChange={() => setOn((s) => ({ ...s, [t.id]: !s[t.id] }))}
              />
              <span className="break-all font-mono text-[0.75rem]">
                {t.id}: {t.code}
              </span>
            </label>
          ))}
          <div className="flex flex-wrap gap-2 pt-1">
            <Pill active={false} onClick={() => setOn({ A: true, B: false, C: false, D: false })}>Only A</Pill>
            <Pill active={false} onClick={() => setOn({ A: true, B: true, C: false, D: true })}>A + B + D</Pill>
            <Pill active={false} onClick={() => setOn({ A: true, B: true, C: true, D: true })}>All</Pill>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
        <Stat label="Line coverage" value={`${lineCov}%`} good={lineCov === 100} />
        <Stat label="Branch coverage" value={`${branchCov}%`} good={branchCov === 100} />
        <Stat label="Mutation score" value={`${pct(killed, MUTANTS.length)}% (${killed}/${MUTANTS.length})`} good={killed === MUTANTS.length} />
      </div>
      {!allPassOriginal && <p className="mt-2 text-sm text-bad">A test fails on the original code.</p>}

      <ul className="mt-3 space-y-1 text-sm">
        {results.map((r) => (
          <li
            key={r.id}
            className={`flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-1.5 ${r.killedBy ? "bg-good-soft" : "bg-bad-soft"}`}
          >
            <span className="break-all font-mono text-[0.75rem]">
              {r.id}: {r.change}
            </span>
            <span className="text-xs font-semibold">{r.killedBy ? `killed by ${r.killedBy}` : "survived"}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-muted">
        Notice that test A alone reaches 100% line coverage and kills nothing. Mutant M1 is a real bug: an order of exactly 50 gets
        charged. Only the boundary test C catches it.
      </p>
    </Widget>
  );
}

function Stat({ label, value, good }: { label: string; value: string; good: boolean }) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${good ? "border-good bg-good-soft" : "border-border bg-surface-2"}`}>
      <p className="text-xs text-muted">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

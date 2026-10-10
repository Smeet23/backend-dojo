"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type User = { id: number; name: string; email: string };

const USERS: User[] = [
  { id: 1, name: "Alice", email: "alice@notes.dev" },
  { id: 2, name: "Bob", email: "bob@notes.dev" },
  { id: 3, name: "Seán O'Brien", email: "o'brien@notes.dev" },
];

const INPUTS = [
  { label: "Normal email", value: "alice@notes.dev" },
  { label: "Honest apostrophe", value: "o'brien@notes.dev" },
  { label: "Attack input", value: "' OR '1'='1' --" },
];

type Mode = "concat" | "param";

type Result = { sql: string; params?: string; outcome: "rows" | "syntax"; rows: User[]; note: string };

/**
 * A tiny model of how the database reads the final query.
 * Concatenation: the input becomes part of the SQL text, so quotes change the grammar.
 * Parameterized: the input is only ever compared as a whole string value.
 */
function run(mode: Mode, input: string): Result {
  if (mode === "param") {
    return {
      sql: "SELECT * FROM users WHERE email = $1",
      params: JSON.stringify([input]),
      outcome: "rows",
      rows: USERS.filter((u) => u.email === input),
      note: "The value fills the slot as plain data. Quotes inside it are just characters.",
    };
  }

  const sql = `SELECT * FROM users WHERE email = '${input}'`;
  if (input.includes("OR '1'='1'")) {
    return {
      sql,
      outcome: "rows",
      rows: USERS,
      note: "The quote closed your string, OR '1'='1' is always true, and -- commented out the rest. Every row leaks.",
    };
  }
  const quotes = (input.match(/'/g) ?? []).length;
  if (quotes % 2 === 1) {
    return {
      sql,
      outcome: "syntax",
      rows: [],
      note: "The apostrophe ended the string early, leaving broken SQL. A real customer just can't log in.",
    };
  }
  return { sql, outcome: "rows", rows: USERS.filter((u) => u.email === input), note: "Works on the happy path, which is why the bug goes unnoticed." };
}

export function SqlInjectionLab() {
  const [mode, setMode] = useState<Mode>("concat");
  const [input, setInput] = useState(INPUTS[0].value);
  const r = run(mode, input);
  const leaked = r.rows.length > 1;

  return (
    <Widget title="SQL injection lab" hint="Pick an input and a query style. Watch what the database actually receives.">
      <div className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-16 text-muted">Input</span>
          {INPUTS.map((i) => (
            <Pill key={i.label} active={input === i.value} onClick={() => setInput(i.value)}>{i.label}</Pill>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-16 text-muted">Query</span>
          <Pill active={mode === "concat"} onClick={() => setMode("concat")}>String concatenation</Pill>
          <Pill active={mode === "param"} onClick={() => setMode("param")}>Parameterized</Pill>
        </div>
      </div>

      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted">Email field contains</p>
      <pre className="mt-1 whitespace-pre-wrap break-all rounded-lg bg-surface-2 px-3 py-2 font-mono text-[0.8rem]">{input}</pre>

      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted">Database receives</p>
      <pre className="mt-1 whitespace-pre-wrap break-all rounded-lg border border-border px-3 py-2 font-mono text-[0.8rem] leading-6">
        {r.sql}
        {r.params && `\nparams: ${r.params}`}
      </pre>

      <div
        className={`mt-3 rounded-lg px-3 py-2 text-sm ${
          r.outcome === "syntax" ? "bg-warn-soft" : leaked ? "bg-bad-soft" : "bg-good-soft"
        }`}
      >
        <p className="font-semibold">
          {r.outcome === "syntax" ? "Syntax error" : leaked ? `${r.rows.length} rows returned` : `${r.rows.length} row${r.rows.length === 1 ? "" : "s"} returned`}
        </p>
        {r.rows.length > 0 && (
          <ul className="mt-1 font-mono text-[0.75rem]">
            {r.rows.map((u) => (
              <li key={u.id} className="break-all">{u.id} · {u.name} · {u.email}</li>
            ))}
          </ul>
        )}
        <p className="mt-1">{r.note}</p>
      </div>
    </Widget>
  );
}

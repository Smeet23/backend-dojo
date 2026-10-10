"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type SerializeCase = { label: string; source: string; make: () => unknown; note: string; ok: boolean };

const SERIALIZE: SerializeCase[] = [
  {
    label: "Plain note",
    source: `{ id: 7, title: "Groceries", pinned: true, tags: ["home"], folder: null }`,
    make: () => ({ id: 7, title: "Groceries", pinned: true, tags: ["home"], folder: null }),
    note: "Strings, numbers, booleans, arrays, objects and null all survive the round trip unchanged.",
    ok: true,
  },
  {
    label: "Date",
    source: `{ id: 7, createdAt: new Date("2026-03-01T09:30:00Z") }`,
    make: () => ({ id: 7, createdAt: new Date("2026-03-01T09:30:00Z") }),
    note: "JSON has no date type. The Date becomes an ISO-8601 string, and parsing gives you back a string, not a Date. Convert it explicitly.",
    ok: false,
  },
  {
    label: "undefined + function",
    source: `{ id: 7, archivedAt: undefined, toString() { return "x" } }`,
    make: () => ({ id: 7, archivedAt: undefined, toString() { return "x"; } }),
    note: "Keys with undefined or function values are silently dropped. If the receiver needs to know a field is empty, send null.",
    ok: false,
  },
  {
    label: "NaN / Infinity",
    source: `{ price: NaN, discount: Infinity }`,
    make: () => ({ price: NaN, discount: Infinity }),
    note: "JSON numbers can't be NaN or Infinity; they become null. A bad calculation turns into a missing value on the other side.",
    ok: false,
  },
  {
    label: "Map and Set",
    source: `{ tags: new Set(["a", "b"]), meta: new Map([["k", 1]]) }`,
    make: () => ({ tags: new Set(["a", "b"]), meta: new Map([["k", 1]]) }),
    note: "Map and Set have no own enumerable properties, so they serialize as {}. Convert to arrays or plain objects first.",
    ok: false,
  },
];

const PARSE_PRESETS: { label: string; text: string }[] = [
  { label: "Valid", text: `{\n  "id": 7,\n  "title": "Groceries",\n  "tags": ["home"]\n}` },
  { label: "Single quotes", text: `{ 'id': 7, 'title': 'Groceries' }` },
  { label: "Unquoted key", text: `{ id: 7, "title": "Groceries" }` },
  { label: "Trailing comma", text: `{ "id": 7, "title": "Groceries", }` },
  { label: "Comment", text: `{\n  // the note id\n  "id": 7\n}` },
  { label: "Huge ID", text: `{ "orderId": 9007199254740993 }` },
  { label: "Top-level array", text: `[1, 2, 3]` },
];

/** A JS-flavoured rendering of a value, so strings and Dates look different. */
export function show(v: unknown, indent = ""): string {
  if (v === null) return "null";
  if (v instanceof Date) return `Date(${v.toISOString()})`;
  if (typeof v === "string") return JSON.stringify(v);
  if (typeof v !== "object") return String(v);
  const next = indent + "  ";
  if (Array.isArray(v)) return `[${v.map((x) => show(x, next)).join(", ")}]`;
  const entries = Object.entries(v as Record<string, unknown>);
  if (!entries.length) return "{}";
  return `{\n${entries.map(([k, x]) => `${next}${k}: ${show(x, next)}  // ${x === null ? "null" : typeof x}`).join("\n")}\n${indent}}`;
}

export function JsonRoundTrip() {
  const [mode, setMode] = useState<"serialize" | "parse">("serialize");
  const [caseIdx, setCaseIdx] = useState(1);
  const [text, setText] = useState(PARSE_PRESETS[0].text);

  const c = SERIALIZE[caseIdx];
  const wire = JSON.stringify(c.make(), null, 2);
  const back = JSON.parse(wire) as unknown;

  let parsed: { ok: true; value: unknown } | { ok: false; error: string };
  try {
    parsed = { ok: true, value: JSON.parse(text) as unknown };
  } catch (e) {
    parsed = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
  const bigNumber = /(^|[^\d.])-?\d{16,}/.test(text);

  return (
    <Widget title="JSON round trip" hint="See what survives serialization, and what a strict JSON parser rejects.">
      <div className="flex flex-wrap gap-2">
        <Pill active={mode === "serialize"} onClick={() => setMode("serialize")}>Object → JSON → object</Pill>
        <Pill active={mode === "parse"} onClick={() => setMode("parse")}>Parse JSON text</Pill>
      </div>

      {mode === "serialize" ? (
        <div className="mt-4 space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            {SERIALIZE.map((s, i) => <Pill key={s.label} active={caseIdx === i} onClick={() => setCaseIdx(i)}>{s.label}</Pill>)}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Pane title="1 · In memory (TypeScript)" body={c.source} />
            <Pane title="2 · On the wire (JSON)" body={wire} />
            <Pane title="3 · After JSON.parse" body={show(back)} />
          </div>
          <p className={`rounded-lg px-3 py-2 ${c.ok ? "bg-good-soft" : "bg-warn-soft"}`}>{c.note}</p>
        </div>
      ) : (
        <div className="mt-4 space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            {PARSE_PRESETS.map((p) => <Pill key={p.label} active={text === p.text} onClick={() => setText(p.text)}>{p.label}</Pill>)}
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            spellCheck={false}
            aria-label="JSON text"
            className="w-full rounded-lg border border-border bg-muted p-3 font-mono text-[0.78rem]"
          />
          {parsed.ok ? (
            <div className="rounded-lg bg-good-soft p-3">
              <p className="font-semibold">Valid JSON → server returns 2xx</p>
              <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all font-mono text-[0.75rem]">{show(parsed.value)}</pre>
              {bigNumber && (
                <p className="mt-2 font-medium text-bad">
                  Precision lost: integers above 2^53 − 1 can&apos;t be represented exactly as a JavaScript number. Send large IDs as strings.
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-lg bg-bad-soft p-3">
              <p className="font-semibold">Invalid JSON → server should return 400 Bad Request</p>
              <p className="mt-1 break-words font-mono text-[0.75rem]">{parsed.error}</p>
            </div>
          )}
        </div>
      )}
    </Widget>
  );
}

function Pane({ title, body }: { title: string; body: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-border">
      <p className="border-b border-border bg-muted px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <pre className="overflow-x-auto whitespace-pre-wrap break-all p-3 font-mono text-[0.75rem] leading-5">{body}</pre>
    </div>
  );
}

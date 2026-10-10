"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

const LEVELS = ["debug", "info", "warn", "error", "fatal"] as const;
type Level = (typeof LEVELS)[number];

type Event = {
  ts: string;
  level: Level;
  msg: string;
  /** Free-text console wording, phrased inconsistently like real hand-written logs. */
  text: string;
  fields: Record<string, string | number>;
};

const EVENTS: Event[] = [
  { ts: "14:01:58", level: "info", msg: "server started", text: "server listening on :8080", fields: { port: 8080 } },
  { ts: "14:02:03", level: "debug", msg: "cache lookup", text: "cache miss for notes list, uid=81", fields: { user_id: 81, key: "notes:81" } },
  { ts: "14:02:04", level: "info", msg: "note created", text: "User 81 created note n_42", fields: { user_id: 81, note_id: "n_42", request_id: "req_a1" } },
  { ts: "14:02:07", level: "warn", msg: "login failed", text: "bad password for account 17", fields: { user_id: 17, reason: "wrong_password", request_id: "req_b7" } },
  { ts: "14:02:09", level: "debug", msg: "sql", text: "INSERT INTO notes ... (12ms)", fields: { duration_ms: 12, request_id: "req_c3" } },
  { ts: "14:02:11", level: "error", msg: "create note failed", text: "could not save note for user #81: connection refused", fields: { user_id: 81, error: "connection refused", request_id: "req_c3" } },
  { ts: "14:02:12", level: "error", msg: "create note failed", text: "save failed (customer=81) db timeout", fields: { user_id: 81, error: "db timeout", request_id: "req_d9" } },
  { ts: "14:02:15", level: "error", msg: "export failed", text: "export job crashed for 18", fields: { user_id: 18, error: "out of memory", request_id: "req_e2" } },
  { ts: "14:02:20", level: "fatal", msg: "config missing", text: "PAYMENT_KEY not set, exiting", fields: { var: "PAYMENT_KEY" } },
];

const TONE: Record<Level, string> = {
  debug: "text-muted-foreground",
  info: "text-primary",
  warn: "text-warn",
  error: "text-bad",
  fatal: "text-bad font-bold",
};

type Query = "none" | "user81";

/** Naive text search: what grep would match for "user 81". */
function grepMatches(e: Event) {
  return /user 81/i.test(e.text);
}

function fieldMatches(e: Event) {
  return e.fields.user_id === 81 && (e.level === "error" || e.level === "fatal");
}

export function LogLevelExplorer() {
  const [min, setMin] = useState<Level>("debug");
  const [format, setFormat] = useState<"console" | "json">("console");
  const [query, setQuery] = useState<Query>("none");

  const visible = EVENTS.filter((e) => LEVELS.indexOf(e.level) >= LEVELS.indexOf(min));
  const truth = visible.filter(fieldMatches).length;
  const found = query === "none" ? visible : visible.filter((e) => (format === "json" ? fieldMatches(e) : grepMatches(e) && (e.level === "error" || e.level === "fatal")));

  return (
    <Widget title="Log explorer" hint="Change the minimum level and format, then try finding every error for user 81.">
      <div className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-24 text-muted-foreground">Min level</span>
          {LEVELS.map((l) => (
            <Pill key={l} active={min === l} onClick={() => setMin(l)}>{l.toUpperCase()}</Pill>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-24 text-muted-foreground">Format</span>
          <Pill active={format === "console"} onClick={() => setFormat("console")}>Console (dev)</Pill>
          <Pill active={format === "json"} onClick={() => setFormat("json")}>JSON (prod)</Pill>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-24 text-muted-foreground">Search</span>
          <Pill active={query === "none"} onClick={() => setQuery("none")}>Show all</Pill>
          <Pill active={query === "user81"} onClick={() => setQuery("user81")}>Errors for user 81</Pill>
        </div>
      </div>

      {query === "user81" && (
        <div className={`mt-3 rounded-lg px-3 py-2 text-sm ${found.length === truth ? "bg-good-soft" : "bg-warn-soft"}`}>
          {format === "json" ? (
            <>
              Query <code className="font-mono">level &gt;= error AND user_id = 81</code> found <strong>{found.length}</strong> of {truth}.
              Fields make the search exact.
            </>
          ) : (
            <>
              <code className="font-mono">grep -i &quot;user 81&quot;</code> on error lines found <strong>{found.length}</strong> of {truth}.
              The other messages say &quot;#81&quot; or &quot;customer=81&quot;, so free text misses them.
            </>
          )}
          {truth === 0 && " (Your minimum level is hiding every error.)"}
        </div>
      )}

      <div className="mt-3 rounded-lg border border-border bg-muted p-3">
        {found.length === 0 && <p className="text-sm text-muted-foreground">No lines.</p>}
        <ul className="space-y-1.5">
          {found.map((e, i) => (
            <li key={i} className="font-mono text-[0.75rem] leading-5">
              {format === "console" ? (
                <span className="whitespace-pre-wrap break-all">
                  <span className="text-muted-foreground">{e.ts} </span>
                  <span className={TONE[e.level]}>{e.level.toUpperCase().padEnd(5)} </span>
                  {e.text}
                </span>
              ) : (
                <span className="whitespace-pre-wrap break-all">
                  {JSON.stringify({ ts: `2026-10-10T${e.ts}Z`, level: e.level, msg: e.msg, ...e.fields })}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {visible.length} of {EVENTS.length} events pass the {min.toUpperCase()} threshold.
        {min === "info" && " This is the usual production setting: DEBUG noise is gone, business events stay."}
        {min === "debug" && " Everything is printed, which is what you want on a laptop."}
      </p>
    </Widget>
  );
}

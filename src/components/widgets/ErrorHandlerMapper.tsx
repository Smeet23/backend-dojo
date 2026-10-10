"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Layer = "Handler" | "Service" | "Repository";

type Case = {
  label: string;
  request: string;
  layer: Layer;
  raw: string;
  status: string;
  body: string;
  rawLeak: string;
};

const LAYERS: Layer[] = ["Handler", "Service", "Repository"];

const CASES: Case[] = [
  {
    label: "Title too long",
    request: 'POST /books  { "title": "<700 chars>" }',
    layer: "Handler",
    raw: "ValidationError: title must be at most 500 characters",
    status: "400 Bad Request",
    body: '{ "message": "Invalid input", "errors": [{ "field": "title", "message": "must be at most 500 characters" }] }',
    rawLeak: '{ "error": "ValidationError at BookSchema.parse (handlers/books.ts:41)" }',
  },
  {
    label: "Duplicate title",
    request: 'POST /books  { "title": "Dune" }',
    layer: "Repository",
    raw: 'pg error 23505: duplicate key value violates unique constraint "books_title_key"',
    status: "409 Conflict",
    body: '{ "message": "A book with this title already exists" }',
    rawLeak: '{ "error": "duplicate key value violates unique constraint \\"books_title_key\\"" }',
  },
  {
    label: "Book not found",
    request: "GET /books/123",
    layer: "Repository",
    raw: "sql: no rows in result set",
    status: "404 Not Found",
    body: '{ "message": "Book 123 not found" }',
    rawLeak: '{ "error": "sql: no rows in result set" }',
  },
  {
    label: "Unknown author",
    request: 'POST /books  { "title": "Emma", "author_id": 999 }',
    layer: "Repository",
    raw: 'pg error 23503: insert on table "books" violates foreign key constraint "books_author_id_fkey"',
    status: "422 Unprocessable Content",
    body: '{ "message": "Author 999 does not exist" }',
    rawLeak: '{ "error": "insert on table \\"books\\" violates foreign key constraint \\"books_author_id_fkey\\"" }',
  },
  {
    label: "Typo in SQL",
    request: "GET /books?sort=rating",
    layer: "Repository",
    raw: 'pg error 42P01: relation "book_ratngs" does not exist',
    status: "500 Internal Server Error",
    body: '{ "message": "Internal server error", "request_id": "req_8f2c" }',
    rawLeak: '{ "error": "relation \\"book_ratngs\\" does not exist", "query": "SELECT b.*, r.avg FROM books b JOIN book_ratngs r ..." }',
  },
];

export function ErrorHandlerMapper() {
  const [idx, setIdx] = useState(1);
  const [globalHandler, setGlobalHandler] = useState(true);
  const c = CASES[idx];
  const status = globalHandler ? c.status : "500 Internal Server Error";
  const body = globalHandler ? c.body : c.rawLeak;
  const good = globalHandler;

  return (
    <Widget title="Global error handler" hint="Pick a failing request. Then switch the global handler off and see what the client gets instead.">
      <div className="flex flex-wrap gap-2">
        {CASES.map((x, i) => (
          <Pill key={x.label} active={idx === i} onClick={() => setIdx(i)}>
            {x.label}
          </Pill>
        ))}
      </div>
      <p className="mt-3 rounded-lg bg-surface-2 px-3 py-2 font-mono text-[0.8rem] break-all">{c.request}</p>

      <div className="mt-3 flex flex-wrap items-center gap-1 text-sm">
        {LAYERS.map((l, i) => (
          <span key={l} className="flex items-center gap-1">
            <span className={`rounded-md border px-2 py-1 ${l === c.layer ? "border-bad bg-bad-soft font-semibold" : "border-border"}`}>{l}</span>
            {i < LAYERS.length - 1 && <span className="text-muted">→</span>}
          </span>
        ))}
        <span className="text-muted">→ DB</span>
      </div>
      <p className="mt-2 text-xs text-muted">Error raised in the {c.layer.toLowerCase()} and bubbled up unchanged:</p>
      <pre className="mt-1 whitespace-pre-wrap break-all rounded-lg bg-surface-2 px-3 py-2 font-mono text-[0.75rem]">{c.raw}</pre>

      <div className="mt-3 flex flex-wrap gap-2">
        <Pill active={globalHandler} onClick={() => setGlobalHandler(true)}>Global handler on</Pill>
        <Pill active={!globalHandler} onClick={() => setGlobalHandler(false)}>Off (raw error passed through)</Pill>
      </div>
      <div className={`mt-3 rounded-lg border p-3 ${good ? "border-good bg-good-soft" : "border-bad bg-bad-soft"}`}>
        <p className="font-mono text-sm font-semibold">{status}</p>
        <pre className="mt-1 whitespace-pre-wrap break-all font-mono text-[0.75rem]">{body}</pre>
        <p className="mt-2 text-sm">
          {good
            ? c.status.startsWith("500")
              ? "Unrecognized error: the client gets a generic message and a request id; the details go to the logs."
              : "The handler recognized the error type and wrote a clear, safe message."
            : "Every failure looks like a 500, the client can't tell what to fix, and table and constraint names leak to attackers."}
        </p>
      </div>
    </Widget>
  );
}

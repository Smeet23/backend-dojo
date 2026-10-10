"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Note = { id: number; title: string };
type Method = "GET" | "POST" | "PUT" | "DELETE";

const START: Note[] = [{ id: 1, title: "Groceries" }];

const describe: Record<Method, string> = {
  GET: "GET /notes/1",
  POST: 'POST /notes  { "title": "Ideas" }',
  PUT: 'PUT /notes/1  { "title": "Shopping" }',
  DELETE: "DELETE /notes/1",
};

function apply(notes: Note[], method: Method): { notes: Note[]; status: string } {
  switch (method) {
    case "GET":
      return { notes, status: notes.some((n) => n.id === 1) ? "200 OK" : "404 Not Found" };
    case "POST": {
      const id = Math.max(0, ...notes.map((n) => n.id)) + 1;
      return { notes: [...notes, { id, title: "Ideas" }], status: "201 Created" };
    }
    case "PUT":
      return {
        notes: notes.some((n) => n.id === 1) ? notes.map((n) => (n.id === 1 ? { ...n, title: "Shopping" } : n)) : [{ id: 1, title: "Shopping" }, ...notes],
        status: "200 OK",
      };
    case "DELETE":
      return notes.some((n) => n.id === 1) ? { notes: notes.filter((n) => n.id !== 1), status: "204 No Content" } : { notes, status: "404 Not Found" };
  }
}

export function IdempotencyLab() {
  const [method, setMethod] = useState<Method>("POST");
  const [notes, setNotes] = useState<Note[]>(START);
  const [sent, setSent] = useState<string[]>([]);

  function send() {
    const result = apply(notes, method);
    setNotes(result.notes);
    setSent((s) => [`${method} → ${result.status}`, ...s].slice(0, 5));
  }

  return (
    <Widget title="Idempotency lab" hint="Pick a method and press Send several times. Does the server state keep changing?">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(describe) as Method[]).map((m) => (
          <Pill key={m} active={method === m} onClick={() => setMethod(m)}>{m}</Pill>
        ))}
      </div>
      <p className="mt-3 rounded-lg bg-muted px-3 py-2 font-mono text-[0.8rem]">{describe[method]}</p>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={send} className="min-h-10 flex-1 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground">
          Send
        </button>
        <button type="button" onClick={() => { setNotes(START); setSent([]); }} className="min-h-10 rounded-lg border border-border px-3 text-sm">
          Reset
        </button>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Server state</p>
          <ul className="mt-1 space-y-1 text-sm">
            {notes.length === 0 && <li className="text-muted-foreground">(no notes)</li>}
            {notes.map((n) => (
              <li key={n.id} className="rounded-md bg-muted px-2 py-1 font-mono text-[0.8rem]">#{n.id} {n.title}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Responses</p>
          <ul className="mt-1 space-y-1 font-mono text-[0.8rem]">
            {sent.map((s, i) => <li key={sent.length - i}>{s}</li>)}
          </ul>
        </div>
      </div>
    </Widget>
  );
}

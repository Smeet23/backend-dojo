"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Part = { text: string; key?: string };
type Line = Part[];

const explain: Record<string, { name: string; body: string }> = {
  method: { name: "Method", body: "The intent of the request. POST means \"create something\"." },
  path: { name: "Resource path", body: "Which resource on the server you're talking about." },
  version: { name: "HTTP version", body: "HTTP/1.1 is still the most common on the wire." },
  host: { name: "Host header", body: "Which domain the request is for. One server can host many domains." },
  header: { name: "Header", body: "Key–value metadata about the message — like the label on a parcel. Read without opening the body." },
  auth: { name: "Authorization header", body: "Credentials (here a Bearer token). HTTP is stateless, so this goes on every request." },
  ctype: { name: "Content-Type (representation header)", body: "Describes the body's format so the receiver knows how to parse it." },
  blank: { name: "Blank line", body: "Marks the end of headers. Everything after it is the body." },
  body: { name: "Body", body: "The actual data. GET requests usually have none; POST/PUT/PATCH usually do." },
  status: { name: "Status code + text", body: "The outcome in one number. 201 = a new resource was created." },
  location: { name: "Location header", body: "Where the newly created resource lives." },
};

const request: Line[] = [
  [{ text: "POST", key: "method" }, { text: " " }, { text: "/api/folders", key: "path" }, { text: " " }, { text: "HTTP/1.1", key: "version" }],
  [{ text: "Host: api.notes.dev", key: "host" }],
  [{ text: "Authorization: Bearer eyJhbGci…", key: "auth" }],
  [{ text: "Content-Type: application/json", key: "ctype" }],
  [{ text: "Accept: application/json", key: "header" }],
  [{ text: "⏎", key: "blank" }],
  [{ text: '{ "name": "Work" }', key: "body" }],
];

const response: Line[] = [
  [{ text: "HTTP/1.1", key: "version" }, { text: " " }, { text: "201 Created", key: "status" }],
  [{ text: "Content-Type: application/json", key: "ctype" }],
  [{ text: "Location: /api/folders/42", key: "location" }],
  [{ text: "Cache-Control: no-store", key: "header" }],
  [{ text: "⏎", key: "blank" }],
  [{ text: '{ "id": 42, "name": "Work" }', key: "body" }],
];

export function MessageAnatomy() {
  const [tab, setTab] = useState<"request" | "response">("request");
  const [selected, setSelected] = useState<string>("method");
  const lines = tab === "request" ? request : response;
  const info = explain[selected];

  return (
    <Widget title="Anatomy of an HTTP message" hint="Tap any part of the message to see what it is.">
      <div className="mb-3 flex gap-2">
        <Pill active={tab === "request"} onClick={() => { setTab("request"); setSelected("method"); }}>Request</Pill>
        <Pill active={tab === "response"} onClick={() => { setTab("response"); setSelected("status"); }}>Response</Pill>
      </div>
      <pre className="overflow-x-auto rounded-lg border border-border bg-muted p-3 font-mono text-[0.8rem] leading-7">
        {lines.map((line, i) => (
          <div key={i}>
            {line.map((part, j) =>
              part.key ? (
                <button
                  key={j}
                  type="button"
                  onClick={() => setSelected(part.key!)}
                  className={`rounded px-0.5 transition-colors ${
                    selected === part.key ? "bg-primary text-primary-foreground" : "hover:bg-primary/10"
                  } ${part.key === "blank" ? "text-muted-foreground" : ""}`}
                >
                  {part.text}
                </button>
              ) : (
                <span key={j}>{part.text}</span>
              ),
            )}
          </div>
        ))}
      </pre>
      {info && (
        <div className="mt-3 rounded-lg bg-primary/10 px-3 py-2 text-sm" aria-live="polite">
          <span className="font-semibold">{info.name}:</span> {info.body}
        </div>
      )}
    </Widget>
  );
}

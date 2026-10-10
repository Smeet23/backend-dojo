"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Code = { code: number; name: string; when: string; example: string };

const codes: Code[] = [
  { code: 100, name: "Continue", when: "Server accepted the headers; client may send a large body.", example: "Big upload checks first before sending gigabytes." },
  { code: 101, name: "Switching Protocols", when: "Upgrading the connection to another protocol.", example: "HTTP → WebSocket handshake." },
  { code: 200, name: "OK", when: "Generic success, usually with a body.", example: "GET /notes/7 returns the note." },
  { code: 201, name: "Created", when: "A new resource was created.", example: "POST /notes creates note 8." },
  { code: 204, name: "No Content", when: "Success, nothing to send back.", example: "DELETE /notes/7, or a CORS preflight." },
  { code: 301, name: "Moved Permanently", when: "Resource has a new URL forever; clients should update.", example: "/user renamed to /person." },
  { code: 302, name: "Found (temporary redirect)", when: "Go elsewhere for now, keep using the old URL.", example: "Campaign landing page for a weekend." },
  { code: 304, name: "Not Modified", when: "Your cached copy is still valid; no body sent.", example: "If-None-Match ETag still matches." },
  { code: 400, name: "Bad Request", when: "The request data is invalid or malformed.", example: "Email field contains a phone number." },
  { code: 401, name: "Unauthorized", when: "Not authenticated: missing, expired or invalid credentials.", example: "JWT expired → client logs the user out." },
  { code: 403, name: "Forbidden", when: "Authenticated, but not allowed to do this.", example: "User A tries to delete user B's note." },
  { code: 404, name: "Not Found", when: "Resource doesn't exist (wrong URL or deleted).", example: "GET /notes/9999." },
  { code: 405, name: "Method Not Allowed", when: "Route exists but not for this method.", example: "PUT to a GET/POST-only route." },
  { code: 409, name: "Conflict", when: "Clashes with the current state of the resource.", example: "Folder name must be unique and already exists." },
  { code: 429, name: "Too Many Requests", when: "Client exceeded a rate limit.", example: "More than 60 requests/minute." },
  { code: 500, name: "Internal Server Error", when: "Unexpected, unhandled failure on the server.", example: "Uncaught exception. Don't leak details." },
  { code: 501, name: "Not Implemented", when: "Server doesn't support this functionality (yet).", example: "Planned feature not built." },
  { code: 502, name: "Bad Gateway", when: "A proxy got an invalid response from upstream.", example: "Nginx can't make sense of your app's reply." },
  { code: 503, name: "Service Unavailable", when: "Temporarily overloaded or in maintenance; retry later.", example: "Deploy/maintenance window." },
  { code: 504, name: "Gateway Timeout", when: "A proxy got no response from upstream in time.", example: "Nginx waits, your app never answers." },
];

const groups = [
  { prefix: 1, label: "1xx Info" },
  { prefix: 2, label: "2xx Success" },
  { prefix: 3, label: "3xx Redirect" },
  { prefix: 4, label: "4xx Client error" },
  { prefix: 5, label: "5xx Server error" },
];

const tone: Record<number, string> = {
  1: "bg-surface-2",
  2: "bg-good-soft text-good",
  3: "bg-accent-soft text-accent",
  4: "bg-warn-soft text-warn",
  5: "bg-bad-soft text-bad",
};

export function StatusCodeFinder() {
  const [group, setGroup] = useState(4);
  const [open, setOpen] = useState<number | null>(401);
  const list = codes.filter((c) => Math.floor(c.code / 100) === group);

  return (
    <Widget title="Status code explorer" hint="Pick a class, then tap a code to see when to use it.">
      <div className="mb-3 flex flex-wrap gap-2">
        {groups.map((g) => (
          <Pill key={g.prefix} active={group === g.prefix} onClick={() => { setGroup(g.prefix); setOpen(null); }}>
            {g.label}
          </Pill>
        ))}
      </div>
      <ul className="space-y-2">
        {list.map((c) => (
          <li key={c.code}>
            <button
              type="button"
              onClick={() => setOpen(open === c.code ? null : c.code)}
              aria-expanded={open === c.code}
              className="flex w-full items-center gap-3 rounded-lg border border-border px-3 py-2 text-left hover:bg-surface-2"
            >
              <span className={`rounded-md px-2 py-0.5 font-mono text-sm font-semibold ${tone[group]}`}>{c.code}</span>
              <span className="text-sm font-medium">{c.name}</span>
            </button>
            {open === c.code && (
              <div className="mt-1 rounded-lg bg-surface-2 px-3 py-2 text-sm">
                <p><span className="font-semibold">When:</span> {c.when}</p>
                <p className="mt-1 text-muted"><span className="font-semibold text-text">Example:</span> {c.example}</p>
              </div>
            )}
          </li>
        ))}
      </ul>
    </Widget>
  );
}

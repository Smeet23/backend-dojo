"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

const METHODS = ["GET", "POST", "PATCH", "DELETE"] as const;
type Method = (typeof METHODS)[number];

type Route = { method: Method; pattern: string; handler: string };

const BASE: Route[] = [
  { method: "GET", pattern: "/api/v1/notes", handler: "listNotes" },
  { method: "POST", pattern: "/api/v1/notes", handler: "createNote" },
  { method: "GET", pattern: "/api/v1/notes/search", handler: "searchNotes" },
  { method: "GET", pattern: "/api/v1/notes/:id", handler: "getNote" },
  { method: "PATCH", pattern: "/api/v1/notes/:id", handler: "updateNote" },
  { method: "DELETE", pattern: "/api/v1/notes/:id", handler: "deleteNote" },
  { method: "GET", pattern: "/api/v1/users/:userId/notes", handler: "listUserNotes" },
  { method: "GET", pattern: "/api/v1/users/:userId/notes/:noteId", handler: "getUserNote" },
  { method: "GET", pattern: "/api/v2/notes", handler: "listNotesV2" },
];

const PRESETS: { method: Method; url: string }[] = [
  { method: "GET", url: "/api/v1/notes/42" },
  { method: "GET", url: "/api/v1/notes?page=2&limit=20&sort=-updatedAt" },
  { method: "GET", url: "/api/v1/notes/search?q=shopping%20list" },
  { method: "GET", url: "/api/v1/users/7/notes/99" },
  { method: "DELETE", url: "/api/v1/notes" },
  { method: "GET", url: "/api/v3/notes" },
];

type RowState = "match" | "wrong-method" | "no-path" | "unchecked";

/** Match a path against a pattern like /a/:id/b. Returns params or null. */
export function matchPath(pattern: string, path: string): Record<string, string> | null {
  const p = pattern.split("/").filter(Boolean);
  const s = path.split("/").filter(Boolean);
  if (p.length !== s.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(":")) {
      let v = s[i];
      try { v = decodeURIComponent(v); } catch { /* keep raw */ }
      params[p[i].slice(1)] = v;
    } else if (p[i] !== s[i]) return null;
  }
  return params;
}

export function RouteMatcher() {
  const [method, setMethod] = useState<Method>("GET");
  const [url, setUrl] = useState("/api/v1/notes/42");
  const [dynamicFirst, setDynamicFirst] = useState(false);

  const routes = dynamicFirst ? [BASE[0], BASE[1], BASE[3], BASE[2], ...BASE.slice(4)] : BASE;

  const trimmed = url.trim();
  const qi = trimmed.indexOf("?");
  const path = (qi === -1 ? trimmed : trimmed.slice(0, qi)) || "/";
  const query: [string, string][] = [];
  new URLSearchParams(qi === -1 ? "" : trimmed.slice(qi + 1)).forEach((v, k) => query.push([k, v]));

  const rows: RowState[] = [];
  let hit: { route: Route; params: Record<string, string> } | null = null;
  const allowed: Method[] = [];
  for (const r of routes) {
    if (hit) { rows.push("unchecked"); continue; }
    const params = matchPath(r.pattern, path);
    if (!params) { rows.push("no-path"); continue; }
    if (r.method !== method) { rows.push("wrong-method"); allowed.push(r.method); continue; }
    rows.push("match");
    hit = { route: r, params };
  }

  const status = hit ? "200 OK" : allowed.length ? "405 Method Not Allowed" : "404 Not Found";

  const rowStyle: Record<RowState, string> = {
    match: "border-good bg-good-soft",
    "wrong-method": "border-warn bg-warn-soft",
    "no-path": "border-border opacity-60",
    unchecked: "border-border opacity-30",
  };
  const rowLabel: Record<RowState, string> = {
    match: "match",
    "wrong-method": "path ok, method differs",
    "no-path": "path differs",
    unchecked: "not checked",
  };

  return (
    <Widget title="Route matcher" hint="Pick a method, type a URL, and watch the router walk its table top to bottom.">
      <div className="space-y-3 text-sm">
        <div className="flex flex-wrap gap-2">
          {METHODS.map((m) => <Pill key={m} active={method === m} onClick={() => setMethod(m)}>{m}</Pill>)}
        </div>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          spellCheck={false}
          aria-label="Request URL"
          className="min-h-10 w-full rounded-lg border border-border bg-muted px-3 font-mono text-[0.8rem]"
        />
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.method + p.url}
              type="button"
              onClick={() => { setMethod(p.method); setUrl(p.url); }}
              className="min-h-10 max-w-full truncate rounded-lg border border-border px-2 font-mono text-[0.72rem] hover:bg-muted"
            >
              {p.method} {p.url}
            </button>
          ))}
        </div>
        <label className="flex min-h-10 items-center gap-2">
          <input type="checkbox" checked={dynamicFirst} onChange={(e) => setDynamicFirst(e.target.checked)} className="h-4 w-4" />
          <span>Bug: register <code>/notes/:id</code> before <code>/notes/search</code></span>
        </label>
      </div>

      <ol className="mt-4 space-y-1.5">
        {routes.map((r, i) => (
          <li key={r.method + r.pattern} className={`flex flex-wrap items-center justify-between gap-x-3 rounded-lg border px-3 py-1.5 font-mono text-[0.75rem] ${rowStyle[rows[i]]}`}>
            <span className="break-all"><strong>{r.method}</strong> {r.pattern}</span>
            <span className="text-muted-foreground">{rowLabel[rows[i]]}</span>
          </li>
        ))}
        <li className={`flex flex-wrap items-center justify-between gap-x-3 rounded-lg border px-3 py-1.5 font-mono text-[0.75rem] ${!hit && !allowed.length ? "border-bad bg-bad-soft" : "border-border opacity-30"}`}>
          <span><strong>ALL</strong> {"/* (catch-all, registered last)"}</span>
          <span className="text-muted-foreground">{!hit && !allowed.length ? "fallback" : "not reached"}</span>
        </li>
      </ol>

      <div className={`mt-4 rounded-lg p-3 text-sm ${hit ? "bg-good-soft" : allowed.length ? "bg-warn-soft" : "bg-bad-soft"}`}>
        <p className="font-semibold">{status}{hit && <> → <code>{hit.route.handler}()</code></>}</p>
        {!hit && allowed.length > 0 && <p className="mt-1">The path exists, just not for {method}. Send <code>Allow: {allowed.join(", ")}</code>.</p>}
        {!hit && !allowed.length && <p className="mt-1">No route matched, so the catch-all answers with a clear JSON error.</p>}
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all font-mono text-[0.75rem] leading-5">
{`params = ${JSON.stringify(hit?.params ?? {})}
query  = ${JSON.stringify(Object.fromEntries(query))}`}
        </pre>
        {hit && Object.keys(hit.params).length > 0 && (
          <p className="mt-1 text-muted-foreground">Every value is a string, even &quot;42&quot;. Convert and validate before using it.</p>
        )}
        {dynamicFirst && hit?.route.pattern === "/api/v1/notes/:id" && hit.params.id === "search" && (
          <p className="mt-1 font-medium">Oops: &quot;search&quot; was captured as a note id. Register static routes before dynamic ones.</p>
        )}
      </div>
    </Widget>
  );
}

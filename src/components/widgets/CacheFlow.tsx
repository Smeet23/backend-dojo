"use client";

import { useState } from "react";
import { Widget } from "./Widget";

type Entry = { request: string[]; response: string[]; note: string; tone: "good" | "neutral" | "accent" };

function etagFor(version: number) {
  return `"v${version}-${(version * 7919).toString(16)}"`;
}

export function CacheFlow() {
  const [serverVersion, setServerVersion] = useState(1);
  const [cached, setCached] = useState<{ etag: string } | null>(null);
  const [log, setLog] = useState<Entry[]>([]);
  const [bytes, setBytes] = useState(0);

  function fetchResource() {
    const etag = etagFor(serverVersion);
    const request = ["GET /api/profile", ...(cached ? [`If-None-Match: ${cached.etag}`] : [])];
    let entry: Entry;
    if (cached && cached.etag === etag) {
      entry = { request, response: ["304 Not Modified", "(no body)"], note: "ETag matches → reuse the cached copy. Almost no bytes transferred.", tone: "good" };
    } else {
      entry = {
        request,
        response: ["200 OK", `ETag: ${etag}`, "Cache-Control: max-age=10", "{ …full profile, 48 KB… }"],
        note: cached ? "ETag changed → server sends the new version." : "First fetch → full response, browser stores it with its ETag.",
        tone: cached ? "accent" : "neutral",
      };
      setCached({ etag });
      setBytes((b) => b + 48);
    }
    setLog((l) => [entry, ...l].slice(0, 6));
  }

  function updateResource() {
    setServerVersion((v) => v + 1);
    setLog((l) => [{ request: ["PATCH /api/profile", '{ "name": "Smeet" }'], response: ["200 OK"], note: "Resource changed on the server → it now has a new ETag.", tone: "accent" as const }, ...l].slice(0, 6));
  }

  return (
    <Widget title="Conditional GET with ETags" hint="Fetch a few times, update the resource, then fetch again.">
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg bg-muted p-2">
          <p className="text-xs text-muted-foreground">Browser cache</p>
          <p className="truncate font-mono">{cached ? cached.etag : "empty"}</p>
        </div>
        <div className="rounded-lg bg-muted p-2">
          <p className="text-xs text-muted-foreground">Server ETag</p>
          <p className="truncate font-mono">{etagFor(serverVersion)}</p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={fetchResource} className="min-h-10 flex-1 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground">
          Fetch profile
        </button>
        <button type="button" onClick={updateResource} className="min-h-10 flex-1 rounded-lg border border-border px-3 text-sm">
          Update profile
        </button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Body bytes downloaded so far: {bytes} KB</p>
      <ol className="mt-3 space-y-2">
        {log.map((e, i) => (
          <li
            key={log.length - i}
            className={`rounded-lg border p-3 text-sm ${e.tone === "good" ? "border-good bg-good-soft" : e.tone === "accent" ? "border-primary bg-primary/10" : "border-border"}`}
          >
            <div className="grid gap-2 sm:grid-cols-2">
              <pre className="whitespace-pre-wrap break-all font-mono text-[0.75rem] leading-5">→ {e.request.join("\n  ")}</pre>
              <pre className="whitespace-pre-wrap break-all font-mono text-[0.75rem] leading-5">← {e.response.join("\n  ")}</pre>
            </div>
            <p className="mt-1">{e.note}</p>
          </li>
        ))}
      </ol>
    </Widget>
  );
}

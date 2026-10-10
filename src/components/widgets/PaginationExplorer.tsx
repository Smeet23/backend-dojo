"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Mode = "offset" | "cursor";

/** Tasks newest first, as ORDER BY created_at DESC returns them. */
const START = Array.from({ length: 12 }, (_, i) => 12 - i);

type Fetch = { request: string; sql: string; items: number[]; meta: string };

export function PaginationExplorer() {
  const [mode, setMode] = useState<Mode>("offset");
  const [limit, setLimit] = useState(4);
  const [table, setTable] = useState<number[]>(START);
  const [fetches, setFetches] = useState<Fetch[]>([]);

  const seen = fetches.flatMap((f) => f.items);
  const lastSeen = seen.length ? seen[seen.length - 1] : null;
  const page = fetches.length + 1;
  const totalPages = Math.ceil(table.length / limit);
  const exhausted = mode === "offset" ? fetches.length > 0 && page > totalPages : fetches.length > 0 && (lastSeen === null || !table.some((id) => id < lastSeen));

  function reset(nextMode = mode, nextLimit = limit) {
    setMode(nextMode);
    setLimit(nextLimit);
    setTable(START);
    setFetches([]);
  }

  function next() {
    if (mode === "offset") {
      const offset = (page - 1) * limit;
      const items = table.slice(offset, offset + limit);
      setFetches((f) => [
        ...f,
        {
          request: `GET /tasks?page=${page}&limit=${limit}`,
          sql: `ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
          items,
          meta: `total ${table.length}, page ${page} of ${totalPages}`,
        },
      ]);
    } else {
      // Cursor compares values, not positions: "older than the last task I saw".
      const rest = lastSeen === null ? table : table.filter((id) => id < lastSeen);
      const items = rest.slice(0, limit);
      const end = rest.length <= limit;
      setFetches((f) => [
        ...f,
        {
          request: lastSeen === null ? `GET /tasks?limit=${limit}` : `GET /tasks?limit=${limit}&cursor=<task ${lastSeen}>`,
          sql: lastSeen === null ? `ORDER BY created_at DESC LIMIT ${limit}` : `WHERE created_at < <task ${lastSeen}'s> ORDER BY created_at DESC LIMIT ${limit}`,
          items,
          meta: end ? "nextCursor: null (end)" : `nextCursor: <task ${items[items.length - 1]}>`,
        },
      ]);
    }
  }

  function insert() {
    setTable((t) => [Math.max(...t) + 1, ...t]);
  }

  function removeTop() {
    // Delete the newest task the user has already seen (if any), shifting everything up.
    const victim = seen.find((id) => table.includes(id));
    if (victim !== undefined) setTable((t) => t.filter((id) => id !== victim));
  }

  const counts = new Map<number, number>();
  seen.forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1));
  const dupes = [...counts.values()].filter((c) => c > 1).length;
  const skipped = START.filter((id) => table.includes(id) && !counts.has(id) && exhausted).length;

  return (
    <Widget title="Pagination explorer" hint="Scroll a task feed page by page. Between pages, add or delete a task and compare offset with cursor pagination.">
      <div className="space-y-2 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-16 text-muted-foreground">Mode</span>
          <Pill active={mode === "offset"} onClick={() => reset("offset")}>Offset (page + limit)</Pill>
          <Pill active={mode === "cursor"} onClick={() => reset("cursor")}>Cursor</Pill>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-16 text-muted-foreground">Limit</span>
          {[3, 4, 5].map((n) => <Pill key={n} active={limit === n} onClick={() => reset(mode, n)}>{n}</Pill>)}
        </div>
      </div>

      <div className="mt-3 rounded-lg bg-muted p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Table (newest first)</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {table.map((id) => (
            <span key={id} className={`rounded-md border px-2 py-1 font-mono text-xs ${START.includes(id) ? "border-border bg-card" : "border-primary bg-primary/10"}`}>
              task {id}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={next}
          disabled={exhausted}
          className="min-h-10 flex-1 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-40"
        >
          {exhausted ? "No more pages" : fetches.length ? "Load next page" : "Load first page"}
        </button>
        <button type="button" onClick={insert} disabled={!fetches.length} className="min-h-10 rounded-lg border border-border px-3 text-sm disabled:opacity-40">
          + New task created
        </button>
        <button type="button" onClick={removeTop} disabled={!fetches.length} className="min-h-10 rounded-lg border border-border px-3 text-sm disabled:opacity-40">
          − Delete a seen task
        </button>
        <button type="button" onClick={() => reset()} className="min-h-10 rounded-lg border border-border px-3 text-sm">
          Reset
        </button>
      </div>

      <ol className="mt-3 space-y-2">
        {fetches.map((f, i) => (
          <li key={i} className="rounded-lg border border-border p-3 text-sm">
            <p className="break-all font-mono text-[0.78rem] font-semibold">{f.request}</p>
            <p className="mt-0.5 break-all font-mono text-[0.72rem] text-muted-foreground">{f.sql}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {f.items.map((id) => (
                <span key={id} className={`rounded-md px-2 py-1 font-mono text-xs ${(counts.get(id) ?? 0) > 1 ? "bg-bad-soft" : "bg-good-soft"}`}>
                  task {id}
                </span>
              ))}
              {f.items.length === 0 && <span className="text-xs text-muted-foreground">(empty page)</span>}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{f.meta}</p>
          </li>
        ))}
      </ol>

      {(dupes > 0 || skipped > 0) && (
        <p className="mt-3 rounded-lg bg-bad-soft px-3 py-2 text-sm">
          {dupes > 0 && <>The user saw {dupes} task(s) twice. </>}
          {skipped > 0 && <>{skipped} existing task(s) were never shown. </>}
          Offsets count positions, and positions shifted between requests.
        </p>
      )}
      {mode === "cursor" && fetches.length > 1 && dupes === 0 && (
        <p className="mt-3 rounded-lg bg-good-soft px-3 py-2 text-sm">
          The cursor says &quot;after this task&quot;, so inserts and deletes elsewhere don&apos;t shift the next page. New tasks appear on the next refresh from the top.
        </p>
      )}
    </Widget>
  );
}

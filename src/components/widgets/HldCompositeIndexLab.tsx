"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Col = "user_id" | "status" | "created_at" | "total";

type Query = {
  id: string;
  label: string;
  sql: string;
  eq: Col[];
  range?: Col;
  orderBy?: Col;
  limit?: number;
  /** Columns the SELECT list needs. "*" means every column, so no index can cover it. */
  select: Col[] | "*";
};

type Index = { id: string; key: Col[]; include: Col[] };

const N = 1_000_000;
/** Fraction of rows matched by each filter in the queries below. */
const SEL: Record<Col, number> = { user_id: 1 / 10_000, status: 0.1, created_at: 0.1, total: 1 };

const QUERIES: Query[] = [
  {
    id: "q1",
    label: "User's pending orders this month",
    sql: "SELECT COUNT(*) FROM orders\nWHERE user_id = 42 AND status = 'pending'\n  AND created_at > now() - interval '30 days';",
    eq: ["user_id", "status"],
    range: "created_at",
    select: [],
  },
  {
    id: "q2",
    label: "User's 20 latest orders",
    sql: "SELECT created_at, total FROM orders\nWHERE user_id = 42\nORDER BY created_at DESC LIMIT 20;",
    eq: ["user_id"],
    orderBy: "created_at",
    limit: 20,
    select: ["created_at", "total"],
  },
  {
    id: "q3",
    label: "All pending orders this month",
    sql: "SELECT COUNT(*) FROM orders\nWHERE status = 'pending'\n  AND created_at > now() - interval '30 days';",
    eq: ["status"],
    range: "created_at",
    select: [],
  },
  {
    id: "q4",
    label: "Every order this month",
    sql: "SELECT * FROM orders\nWHERE created_at > now() - interval '30 days';",
    eq: [],
    range: "created_at",
    select: "*",
  },
];

const INDEXES: Index[] = [
  { id: "a", key: ["user_id", "status", "created_at"], include: [] },
  { id: "b", key: ["user_id", "created_at", "status"], include: [] },
  { id: "c", key: ["status", "created_at"], include: [] },
  { id: "d", key: ["created_at"], include: [] },
  { id: "e", key: ["user_id", "created_at"], include: ["total"] },
];

function indexLabel(ix: Index) {
  return `(${ix.key.join(", ")})${ix.include.length ? ` INCLUDE (${ix.include.join(", ")})` : ""}`;
}

type Analysis = {
  seek: Col[];
  rangeSeek: boolean;
  orderFromIndex: boolean;
  inIndexFilter: Col[];
  tableFilter: Col[];
  usable: boolean;
  covering: boolean;
  examined: number;
  tableFetches: number;
  needsSort: boolean;
};

function analyse(q: Query, ix: Index): Analysis {
  const seek: Col[] = [];
  let rangeSeek = false;
  let orderFromIndex = false;
  for (const col of ix.key) {
    if (q.eq.includes(col)) {
      seek.push(col);
      continue;
    }
    if (q.range === col) {
      seek.push(col);
      rangeSeek = true;
    } else if (q.orderBy === col) {
      orderFromIndex = true;
    }
    break;
  }
  // If the range column is also the ORDER BY column and we seeked on it, order comes for free too.
  if (rangeSeek && q.orderBy === q.range) orderFromIndex = true;

  const filters: Col[] = [...q.eq, ...(q.range ? [q.range] : [])];
  const allIx = [...ix.key, ...ix.include];
  const leftover = filters.filter((c) => !seek.includes(c));
  const inIndexFilter = leftover.filter((c) => allIx.includes(c));
  const tableFilter = leftover.filter((c) => !allIx.includes(c));
  const usable = seek.length > 0 || orderFromIndex;

  const needed = new Set<Col>([...filters, ...(q.orderBy ? [q.orderBy] : [])]);
  const covering = q.select !== "*" && [...needed, ...q.select].every((c) => allIx.includes(c));

  const returned = Math.round(filters.reduce((acc, c) => acc * SEL[c], N));
  let examined = usable ? Math.round(seek.reduce((acc, c) => acc * SEL[c], N)) : N;
  const needsSort = !!q.orderBy && !orderFromIndex;
  if (q.limit && !needsSort && tableFilter.length === 0) examined = Math.min(examined, q.limit);
  const afterIndexFilter = usable ? Math.round(inIndexFilter.reduce((acc, c) => acc * SEL[c], examined)) : N;
  const tableFetches = covering ? 0 : usable ? afterIndexFilter : N;

  return { seek, rangeSeek, orderFromIndex, inIndexFilter, tableFilter, usable, covering, examined, tableFetches, needsSort: needsSort && returned > 0 };
}

const fmt = (n: number) => n.toLocaleString("en-US");

export function HldCompositeIndexLab() {
  const [qid, setQid] = useState("q1");
  const [ixid, setIxid] = useState("a");
  const q = QUERIES.find((x) => x.id === qid) ?? QUERIES[0];
  const ix = INDEXES.find((x) => x.id === ixid) ?? INDEXES[0];
  const a = analyse(q, ix);

  const verdict = !a.usable
    ? { tone: "border-bad bg-bad-soft", text: "Not a leftmost prefix. The index can't narrow the search, so expect a sequential scan." }
    : a.examined > N * 0.05 && !a.covering
      ? { tone: "border-warn bg-warn-soft", text: "Usable, but it matches a big slice of the table. The planner may still prefer a scan or a bitmap scan." }
      : a.inIndexFilter.length || a.tableFilter.length || a.needsSort
        ? { tone: "border-warn bg-warn-soft", text: "Usable, but with wasted work after the seek." }
        : { tone: "border-good bg-good-soft", text: "Tight fit: the seek lands exactly on the rows the query wants." };

  return (
    <Widget
      title="Composite index fit"
      hint="orders has 1,000,000 rows, 10,000 users, 10% of orders are pending, 10% are from the last 30 days. Pick a query and an index."
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Query</p>
      <div className="mt-1 flex flex-wrap gap-2">
        {QUERIES.map((x) => (
          <Pill key={x.id} active={qid === x.id} onClick={() => setQid(x.id)}>
            {x.label}
          </Pill>
        ))}
      </div>
      <pre className="mt-2 overflow-x-auto rounded-lg bg-surface-2 p-3 text-xs">{q.sql}</pre>

      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">Index on orders</p>
      <div className="mt-1 flex flex-wrap gap-2">
        {INDEXES.map((x) => (
          <Pill key={x.id} active={ixid === x.id} onClick={() => setIxid(x.id)}>
            <span className="font-mono text-xs">{indexLabel(x)}</span>
          </Pill>
        ))}
      </div>

      <div className={`mt-4 rounded-lg border p-3 text-sm ${verdict.tone}`}>{verdict.text}</div>

      <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <div className="min-w-0 rounded-lg border border-border bg-bg p-3">
          <p className="text-xs text-muted">Seek uses</p>
          <p className="font-mono text-xs">{a.seek.length ? a.seek.join(" → ") + (a.rangeSeek ? " (range)" : "") : "nothing"}</p>
          <p className="mt-2 text-xs text-muted">Checked row by row after the seek</p>
          <p className="font-mono text-xs">
            {[...a.inIndexFilter.map((c) => `${c} (from index)`), ...a.tableFilter.map((c) => `${c} (from table)`)].join(", ") || "nothing"}
          </p>
          <p className="mt-2 text-xs text-muted">ORDER BY</p>
          <p className="text-xs">{!q.orderBy ? "none" : a.needsSort ? "extra sort step needed" : "already in index order, no sort"}</p>
        </div>
        <div className="min-w-0 rounded-lg border border-border bg-bg p-3">
          <p className="text-xs text-muted">Index entries examined</p>
          <p className="text-lg font-semibold">{a.usable ? fmt(a.examined) : "n/a"}</p>
          <p className="mt-2 text-xs text-muted">Random jumps to the table</p>
          <p className={`text-lg font-semibold ${a.tableFetches === 0 ? "text-good" : a.tableFetches > 1000 ? "text-bad" : ""}`}>
            {a.usable ? fmt(a.tableFetches) : `${fmt(N)} rows scanned`}
          </p>
          <p className="mt-2 text-xs">{a.covering ? "Covering: index-only scan" : "Not covering"}</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted">
        Numbers are estimates from the stated fractions, the same way a planner estimates from statistics.
      </p>
    </Widget>
  );
}

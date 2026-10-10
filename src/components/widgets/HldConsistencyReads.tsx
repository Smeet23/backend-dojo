"use client";

import { useMemo, useState } from "react";
import { Pill, Widget } from "./Widget";

type Level = "eventual" | "ryw" | "monotonic" | "strong";
type Node = "Leader" | "F1" | "F2";

const LEVELS: [Level, string][] = [
  ["eventual", "Eventual"],
  ["ryw", "Read-your-writes"],
  ["monotonic", "Monotonic reads"],
  ["strong", "Strong"],
];

/** When each node has applied Alice's write (made on the leader at t=0). */
const APPLIED: Record<Node, number> = { Leader: 0, F1: 1, F2: 5 };
const COST: Record<Node, number> = { Leader: 80, F1: 4, F2: 4 }; // ms: leader is in another region

const READS: { t: number; who: "Alice" | "Carol"; node: Node }[] = [
  { t: 0.5, who: "Alice", node: "F1" },
  { t: 2, who: "Carol", node: "F1" },
  { t: 3, who: "Carol", node: "F2" },
  { t: 4, who: "Alice", node: "F2" },
  { t: 6, who: "Carol", node: "F2" },
];

const OLD = "Sam";
const NEW = "Samantha";

function run(level: Level) {
  const seen: Record<string, number> = { Alice: -1, Carol: -1 }; // highest version each user has observed (0 old, 1 new)
  const wrote: Record<string, boolean> = { Alice: true, Carol: false };
  return READS.map((r) => {
    let node: Node = r.node;
    let note = "";
    const has = (n: Node) => (r.t >= APPLIED[n] ? 1 : 0);

    if (level === "strong") {
      node = "Leader";
      note = "Every read goes to the leader (or a quorum).";
    } else if (level === "ryw" && wrote[r.who] && has(node) === 0) {
      node = "Leader";
      note = `${r.who} wrote recently, and ${r.node} hasn't caught up: routed to the leader.`;
    } else if (level === "monotonic" && has(node) < seen[r.who]) {
      node = has("F1") >= seen[r.who] ? "F1" : "Leader";
      note = `${r.node} is behind what ${r.who} already saw: routed to ${node}.`;
    }

    const version = has(node);
    seen[r.who] = Math.max(seen[r.who], version);
    const stale = version === 0;
    let problem = "";
    if (stale && r.who === "Alice") problem = "Alice can't see her own edit";
    if (stale && r.who === "Carol") problem = "Carol saw the new name, now sees the old one";
    return { ...r, served: node, value: version ? NEW : OLD, stale, note, problem, ms: COST[node] };
  });
}

export function HldConsistencyReads() {
  const [level, setLevel] = useState<Level>("eventual");
  const rows = useMemo(() => run(level), [level]);
  const total = rows.reduce((s, r) => s + r.ms, 0);
  const problems = rows.filter((r) => r.problem).length;

  return (
    <Widget
      title="Consistency levels"
      hint={`At t=0 Alice renames her profile from "${OLD}" to "${NEW}" on the leader. Follower F1 applies it at t=1, F2 at t=5. Pick a guarantee and watch the reads.`}
    >
      <div className="flex flex-wrap gap-2">
        {LEVELS.map(([l, label]) => (
          <Pill key={l} active={level === l} onClick={() => setLevel(l)}>
            {label}
          </Pill>
        ))}
      </div>

      <ul className="mt-3 space-y-2">
        {rows.map((r) => (
          <li
            key={`${r.t}-${r.who}`}
            className={`rounded-lg border p-2 text-sm ${r.problem ? "border-bad bg-bad-soft" : r.stale ? "border-warn bg-warn-soft" : "border-border bg-surface-2"}`}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span>
                <span className="font-mono text-xs text-muted">t={r.t}</span> {r.who} reads via {r.node}
              </span>
              <span className="font-mono text-xs">
                served by {r.served} · {r.ms} ms
              </span>
            </div>
            <p className="mt-1">
              Sees <span className="font-semibold">&quot;{r.value}&quot;</span>
              {r.problem && <span className="text-bad"> · {r.problem}</span>}
            </p>
            {r.note && <p className="mt-0.5 text-xs text-muted">{r.note}</p>}
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <span className="rounded-full bg-surface-2 px-3 py-1">Total read latency: {total} ms</span>
        <span className={`rounded-full px-3 py-1 ${problems ? "bg-bad-soft" : "bg-good-soft"}`}>Anomalies users notice: {problems}</span>
      </div>
      <p className="mt-2 text-xs text-muted">
        Red reads are the anomalies a user would notice. Each guarantee removes some of them, and the latency total shows what that costs.
      </p>
    </Widget>
  );
}

"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Check = { id: string; name: string; kind: "code" | "judge"; sec: number; usd: number };

const CHECKS: Check[] = [
  { id: "schema", name: "Tool args match schema", kind: "code", sec: 0.005, usd: 0 },
  { id: "email", name: "Recipient email exists", kind: "code", sec: 0.02, usd: 0 },
  { id: "json", name: "Answer parses as JSON", kind: "code", sec: 0.001, usd: 0 },
  { id: "fact", name: "Factual consistency vs listing", kind: "judge", sec: 2.5, usd: 0.004 },
  { id: "tone", name: "Tone matches persona", kind: "judge", sec: 2.5, usd: 0.004 },
  { id: "loc", name: "Location handled correctly", kind: "judge", sec: 2.5, usd: 0.004 },
];

const PIPE_SEC = 4;
const PIPE_USD = 0.003;
const COMMITS_PER_DAY = 30;
const MERGES_PER_DAY = 6;

function fmtTime(s: number) {
  if (s < 60) return `${Math.round(s)} s`;
  const m = s / 60;
  return m < 60 ? `${m.toFixed(1)} min` : `${(m / 60).toFixed(1)} h`;
}

function runCost(n: number, repeats: number, checks: Check[]) {
  const runs = n * repeats;
  return runs * (PIPE_USD + checks.reduce((a, c) => a + c.usd, 0));
}

function runTime(n: number, repeats: number, workers: number, checks: Check[]) {
  // Checks for one example run in parallel, so the slowest one sets the pace.
  const perExample = PIPE_SEC + Math.max(0, ...checks.map((c) => c.sec));
  return Math.ceil((n * repeats) / workers) * perExample;
}

export function EvCicdSuiteBuilder() {
  const [on, setOn] = useState<Set<string>>(() => new Set(["schema", "email", "fact"]));
  const [n, setN] = useState(120);
  const [repeats, setRepeats] = useState(1);
  const [workers, setWorkers] = useState(8);
  const [judgesOnMerge, setJudgesOnMerge] = useState(false);

  const active = CHECKS.filter((c) => on.has(c.id));
  const code = active.filter((c) => c.kind === "code");
  const judges = active.filter((c) => c.kind === "judge");
  const commitChecks = judgesOnMerge ? code : active;

  const commitTime = runTime(n, repeats, workers, commitChecks);
  const commitCost = runCost(n, repeats, commitChecks);
  const mergeCost = judgesOnMerge ? runCost(n, repeats, active) : 0;
  const daily = commitCost * COMMITS_PER_DAY + mergeCost * MERGES_PER_DAY;
  const judgeCalls = n * repeats * judges.length;

  const toggle = (id: string) =>
    setOn((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const notes: string[] = [];
  if (commitTime > 600) notes.push("Over 10 minutes per commit: people start skipping or batching changes. Add workers, trim examples, or move judges to the pre-merge run.");
  if (judges.length === 0) notes.push("No judges: tone and factual consistency are unchecked. Code checks can't see meaning.");
  if (judges.length === 3) notes.push("Every subjective check is a judge. Keep judges for the few failure modes code truly can't catch.");
  if (judges.length > 0 && repeats === 1) notes.push("One run per example: a nondeterministic output can fail the build by chance. Consider re-running failures before blocking a merge.");
  if (n < 50) notes.push("Under 50 examples: hard to cover core features, past failures and edge cases at once.");

  return (
    <Widget
      title="CI suite builder"
      hint={`Each example runs the pipeline (${PIPE_SEC} s, $${PIPE_USD}). Code checks take milliseconds and cost nothing; each judge adds a ~2.5 s, $0.004 call. Assumes ${COMMITS_PER_DAY} commits and ${MERGES_PER_DAY} merges a day.`}
    >
      <p className="text-xs font-semibold text-muted">Checks</p>
      <div className="mt-1 flex flex-wrap gap-2">
        {CHECKS.map((c) => (
          <Pill key={c.id} active={on.has(c.id)} onClick={() => toggle(c.id)}>
            {c.kind === "code" ? "Code: " : "Judge: "}
            {c.name}
          </Pill>
        ))}
      </div>

      <label className="mt-4 block text-sm">
        Golden examples per run: <span className="font-mono">{n}</span>
        <input type="range" min={20} max={400} step={10} value={n} onChange={(e) => setN(Number(e.target.value))} className="mt-1 w-full accent-accent" />
      </label>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold text-muted">Runs per example</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {[1, 3].map((r) => (
              <Pill key={r} active={repeats === r} onClick={() => setRepeats(r)}>
                {r}×
              </Pill>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted">Parallel workers</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {[1, 8, 32].map((w) => (
              <Pill key={w} active={workers === w} onClick={() => setWorkers(w)}>
                {w}
              </Pill>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs font-semibold text-muted">When judges run</p>
      <div className="mt-1 flex flex-wrap gap-2">
        <Pill active={!judgesOnMerge} onClick={() => setJudgesOnMerge(false)}>
          Every commit
        </Pill>
        <Pill active={judgesOnMerge} onClick={() => setJudgesOnMerge(true)}>
          Only before merge
        </Pill>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Wait per commit", fmtTime(commitTime)],
          ["Cost per commit", `$${commitCost.toFixed(2)}`],
          ["Judge calls per full run", judgeCalls.toLocaleString()],
          ["CI spend per day", `$${daily.toFixed(2)}`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg border border-border bg-surface-2 p-2">
            <p className="text-[0.7rem] text-muted">{k}</p>
            <p className="font-mono text-sm font-semibold">{v}</p>
          </div>
        ))}
      </div>

      <p className="mt-2 text-xs text-muted">
        Covers {active.length} failure mode{active.length === 1 ? "" : "s"}: {code.length} with code, {judges.length} with judges.
      </p>

      {notes.length > 0 && (
        <ul className="mt-3 space-y-1">
          {notes.map((t) => (
            <li key={t} className="rounded-md bg-warn-soft px-2 py-1 text-xs">
              {t}
            </li>
          ))}
        </ul>
      )}
    </Widget>
  );
}

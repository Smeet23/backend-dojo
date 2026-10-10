"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

const MB = 1024 * 1024;
const GB = 1024 * MB;
const MAX_PARTS = 10_000;

const FILE_SIZES = [
  { label: "2 GB video", bytes: 2 * GB },
  { label: "60 GB footage", bytes: 60 * GB },
  { label: "250 GB dump", bytes: 250 * GB },
];

type Strategy = "fixed5" | "dynamic16";

/** Part size and count for a file, plus where a fixed size would blow the 10,000-part cap. */
export function planParts(fileSize: number, strategy: Strategy) {
  const size = strategy === "fixed5" ? 5 * MB : Math.max(16 * MB, Math.ceil(fileSize / MAX_PARTS));
  const parts = Math.ceil(fileSize / size);
  const ok = parts <= MAX_PARTS;
  return { size, parts, ok, wastedBytes: ok ? 0 : MAX_PARTS * size };
}

function human(bytes: number) {
  if (bytes >= GB) return `${(bytes / GB).toFixed(bytes % GB === 0 ? 0 : 1)} GB`;
  return `${(bytes / MB).toFixed(bytes % MB === 0 ? 0 : 1)} MB`;
}

type Status = "waiting" | "flight" | "done" | "failed";

const SIM_PARTS = 32;
const SIM_PART_MB = 16;
const FLAKY_PART = 6; // part 7 fails on its first attempt

function startState(): Status[] {
  return Array.from({ length: SIM_PARTS }, () => "waiting" as Status);
}

/** One round: in-flight parts finish (or fail), then free slots are refilled, retries first. */
export function tick(statuses: Status[], attempts: number[], concurrency: number, flaky: boolean) {
  const next = [...statuses];
  const tries = [...attempts];
  const events: string[] = [];
  const retry = statuses.map((s, i) => (s === "failed" ? i : -1)).filter((i) => i >= 0);

  statuses.forEach((s, i) => {
    if (s !== "flight") return;
    if (flaky && i === FLAKY_PART && tries[i] === 1) {
      next[i] = "failed";
      events.push(`part ${i + 1} failed (network blip)`);
    } else {
      next[i] = "done";
    }
  });

  let inFlight = next.filter((s) => s === "flight").length;
  const queue = [...retry, ...next.map((s, i) => (s === "waiting" ? i : -1)).filter((i) => i >= 0)];
  for (const i of queue) {
    if (inFlight >= concurrency) break;
    next[i] = "flight";
    tries[i] += 1;
    inFlight += 1;
    if (retry.includes(i)) events.push(`retrying only part ${i + 1} (${SIM_PART_MB} MB)`);
  }
  return { next, tries, events };
}

const CELL: Record<Status, string> = {
  waiting: "bg-surface-2 border-border",
  flight: "bg-accent-soft border-accent animate-pulse",
  done: "bg-good-soft border-good",
  failed: "bg-bad-soft border-bad",
};

export function MultipartUploadSim() {
  const [fileIdx, setFileIdx] = useState(1);
  const [strategy, setStrategy] = useState<Strategy>("fixed5");
  const plan = planParts(FILE_SIZES[fileIdx].bytes, strategy);

  const [concurrency, setConcurrency] = useState(5);
  const [flaky, setFlaky] = useState(true);
  const [statuses, setStatuses] = useState<Status[]>(startState);
  const [attempts, setAttempts] = useState<number[]>(() => Array(SIM_PARTS).fill(0));
  const [rounds, setRounds] = useState(0);
  const [log, setLog] = useState<string[]>([]);

  const done = statuses.filter((s) => s === "done").length;
  const finished = done === SIM_PARTS;
  const sentMb = attempts.reduce((a, b) => a + b, 0) * SIM_PART_MB;

  function reset() {
    setStatuses(startState());
    setAttempts(Array(SIM_PARTS).fill(0));
    setRounds(0);
    setLog([]);
  }

  function step() {
    if (finished) return;
    const r = tick(statuses, attempts, concurrency, flaky);
    setStatuses(r.next);
    setAttempts(r.tries);
    setRounds((n) => n + 1);
    if (r.events.length) setLog((l) => [`Round ${rounds + 1}: ${r.events.join("; ")}`, ...l].slice(0, 4));
  }

  function runAll() {
    let s = statuses, a = attempts, n = rounds;
    const lines: string[] = [];
    while (s.some((x) => x !== "done") && n < 200) {
      const r = tick(s, a, concurrency, flaky);
      s = r.next; a = r.tries; n += 1;
      if (r.events.length) lines.unshift(`Round ${n}: ${r.events.join("; ")}`);
    }
    setStatuses(s); setAttempts(a); setRounds(n);
    setLog((l) => [...lines, ...l].slice(0, 4));
  }

  return (
    <Widget title="Multipart upload planner" hint="First pick a part-size strategy and see if it fits the 10,000-part cap. Then upload a file part by part.">
      <div className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-20 text-muted">File</span>
          {FILE_SIZES.map((f, i) => <Pill key={f.label} active={fileIdx === i} onClick={() => setFileIdx(i)}>{f.label}</Pill>)}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-20 text-muted">Part size</span>
          <Pill active={strategy === "fixed5"} onClick={() => setStrategy("fixed5")}>Fixed 5 MB</Pill>
          <Pill active={strategy === "dynamic16"} onClick={() => setStrategy("dynamic16")}>max(16 MB, size / 10,000)</Pill>
        </div>
      </div>
      <div className={`mt-3 rounded-lg px-3 py-2 text-sm ${plan.ok ? "bg-good-soft" : "bg-bad-soft"}`}>
        <strong>{human(plan.size)}</strong> parts × <strong>{plan.parts.toLocaleString("en-US")}</strong> parts.{" "}
        {plan.ok
          ? "Fits under the 10,000-part cap."
          : `Over the cap: part 10,001 is rejected after ${human(plan.wastedBytes)} has already been uploaded.`}
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <p className="text-sm font-medium">Upload simulation: 512 MB file, {SIM_PARTS} parts of {SIM_PART_MB} MB</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="w-20 text-muted">Parallel</span>
          {[1, 5].map((c) => <Pill key={c} active={concurrency === c} onClick={() => { setConcurrency(c); reset(); }}>{c} at a time</Pill>)}
          <Pill active={flaky} onClick={() => { setFlaky(!flaky); reset(); }}>{flaky ? "Flaky network: on" : "Flaky network: off"}</Pill>
        </div>

        <div className="mt-3 grid grid-cols-8 gap-1.5">
          {statuses.map((s, i) => (
            <div key={i} title={`Part ${i + 1}: ${s}`} className={`flex h-8 items-center justify-center rounded border text-[0.7rem] font-mono ${CELL[s]}`}>
              {i + 1}
            </div>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          <span>grey: waiting</span><span>blue: in flight</span><span>green: done (ETag kept)</span><span>red: failed</span>
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full bg-accent transition-all" style={{ width: `${(done / SIM_PARTS) * 100}%` }} />
        </div>
        <p className="mt-1 text-sm text-muted">
          {done}/{SIM_PARTS} parts · round {rounds} · {sentMb} MB sent for a 512 MB file
        </p>

        {log.length > 0 && (
          <pre className="mt-2 whitespace-pre-wrap break-all rounded-lg bg-surface-2 px-3 py-2 font-mono text-[0.75rem] leading-5">{log.join("\n")}</pre>
        )}
        {finished && (
          <pre className="mt-2 whitespace-pre-wrap break-all rounded-lg border border-good bg-good-soft px-3 py-2 font-mono text-[0.75rem] leading-5">
            {`POST /uploads/complete\n{ "uploadId": "VXBs…", "parts": [ { "partNumber": 1, "ETag": "\\"a9…\\"" }, … ${SIM_PARTS} parts ] }\n-> API calls CompleteMultipartUpload (metadata only, instant), then HeadObject`}
          </pre>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={reset} className="min-h-10 rounded-lg border border-border px-4 text-sm">Reset</button>
          <button type="button" onClick={runAll} disabled={finished} className="min-h-10 rounded-lg border border-border px-4 text-sm disabled:opacity-40">Run to end</button>
          <button type="button" onClick={step} disabled={finished} className="min-h-10 flex-1 rounded-lg bg-accent px-4 text-sm font-medium text-white disabled:opacity-40 dark:text-bg">
            {finished ? "All parts uploaded" : "Next round"}
          </button>
        </div>
      </div>
    </Widget>
  );
}

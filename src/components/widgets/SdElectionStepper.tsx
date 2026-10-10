"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Algo = "bully" | "ring";
type Step = { text: string; msgs: number; involved: number[]; backedOff: number[]; leader: number | null };

const IDS = [1, 2, 3, 4, 5, 6];
/** Logical ring order. Deliberately not sorted: the ring is a list of neighbours, not a ranking. */
const RING = [1, 3, 6, 4, 2, 5];

function bullySteps(alive: number[], detector: number): Step[] {
  const steps: Step[] = [];
  const backedOff: number[] = [];
  const queue = [detector];
  const started = new Set<number>();
  let winner: number | null = null;
  while (queue.length && winner === null) {
    queue.sort((a, b) => a - b);
    const x = queue.shift()!;
    if (started.has(x)) continue;
    started.add(x);
    const higher = IDS.filter((i) => i > x);
    const higherAlive = higher.filter((i) => alive.includes(i));
    if (higher.length === 0 || higherAlive.length === 0) {
      const sent = higher.length;
      if (sent) {
        steps.push({
          text: `${x} sends ELECTION to ${higher.join(", ")}. ${higher.length === 1 ? "No reply" : "No replies"} before the timeout, so ${x} is the highest live node.`,
          msgs: sent,
          involved: [x, ...higher],
          backedOff: [...backedOff],
          leader: null,
        });
      }
      winner = x;
      break;
    }
    const silent = higher.filter((i) => !alive.includes(i));
    steps.push({
      text: `${x} sends ELECTION to ${higher.join(", ")}. ${higherAlive.join(", ")} ${higherAlive.length === 1 ? "replies" : "reply"} OK${silent.length ? `; ${silent.join(", ")} ${silent.length === 1 ? "stays" : "stay"} silent` : ""}. ${x} backs off.`,
      msgs: higher.length + higherAlive.length,
      involved: [x, ...higher],
      backedOff: [...backedOff, x],
      leader: null,
    });
    backedOff.push(x);
    for (const h of higherAlive) if (!started.has(h)) queue.push(h);
  }
  if (winner !== null) {
    const others = alive.filter((i) => i !== winner);
    steps.push({
      text: `${winner} broadcasts COORDINATOR to ${others.join(", ")}. Everyone now follows ${winner}.`,
      msgs: others.length,
      involved: [winner, ...others],
      backedOff: [...backedOff],
      leader: winner,
    });
  }
  return steps;
}

function nextAlive(from: number, alive: number[]): number {
  const idx = RING.indexOf(from);
  for (let k = 1; k <= RING.length; k++) {
    const cand = RING[(idx + k) % RING.length];
    if (alive.includes(cand)) return cand;
  }
  return from;
}

function ringSteps(alive: number[], detector: number): Step[] {
  const steps: Step[] = [];
  let best = detector;
  let cur = detector;
  let guard = 0;
  // Election pass: carry the highest id seen so far around the ring.
  do {
    const nxt = nextAlive(cur, alive);
    const skipped = RING.slice(RING.indexOf(cur) + 1).concat(RING.slice(0, RING.indexOf(cur) + 1));
    const dead = skipped.slice(0, skipped.indexOf(nxt)).filter((i) => !alive.includes(i));
    if (nxt === detector) {
      steps.push({
        text: `${cur} passes ELECTION(${best}) to ${nxt}${dead.length ? ` (skipping dead ${dead.join(", ")})` : ""}. The message is back where it started: ${best} is the highest live id.`,
        msgs: 1,
        involved: [cur, nxt],
        backedOff: [],
        leader: null,
      });
      break;
    }
    const prev = best;
    best = Math.max(best, nxt);
    steps.push({
      text: `${cur} passes ELECTION(${prev}) to ${nxt}${dead.length ? ` (skipping dead ${dead.join(", ")})` : ""}. ${nxt > prev ? `${nxt} is higher, so it forwards ELECTION(${nxt}).` : `${nxt} is lower, so it forwards ELECTION(${prev}) unchanged.`}`,
      msgs: 1,
      involved: [cur, nxt],
      backedOff: [],
      leader: null,
    });
    cur = nxt;
  } while (++guard < 20);
  // Coordinator pass: one more lap announcing the winner.
  const lap: number[] = [];
  let c = detector;
  do {
    lap.push(c);
    c = nextAlive(c, alive);
  } while (c !== detector && lap.length < 10);
  steps.push({
    text: `COORDINATOR(${best}) travels one full lap (${[...lap, detector].join(" → ")}), one hop per message. Everyone now follows ${best}.`,
    msgs: lap.length,
    involved: lap,
    backedOff: [],
    leader: best,
  });
  return steps;
}

export function SdElectionStepper() {
  const [algo, setAlgo] = useState<Algo>("bully");
  const [dead, setDead] = useState<number[]>([6]);
  const [detector, setDetector] = useState(2);
  const [shown, setShown] = useState(0);

  const alive = IDS.filter((i) => !dead.includes(i));
  const validDetector = alive.includes(detector) ? detector : alive[0];
  const steps = algo === "bully" ? bullySteps(alive, validDetector) : ringSteps(alive, validDetector);
  const visible = steps.slice(0, shown);
  const current = visible[visible.length - 1];
  const totalMsgs = visible.reduce((s, x) => s + x.msgs, 0);
  const done = shown >= steps.length;
  const leader = current?.leader ?? null;
  const oldLeader = Math.max(...IDS);

  function reset() {
    setShown(0);
  }
  function toggleDead(id: number) {
    setDead((d) => {
      if (d.includes(id)) return d.filter((x) => x !== id);
      if (IDS.length - d.length <= 2) return d;
      return [...d, id];
    });
    reset();
  }

  return (
    <Widget
      title="Leader election stepper"
      hint="Leader 6 has stopped sending heartbeats. Pick the algorithm, crash more nodes, choose who notices first, then step through the messages."
    >
      <div className="flex flex-wrap gap-2">
        <Pill active={algo === "bully"} onClick={() => { setAlgo("bully"); reset(); }}>Bully</Pill>
        <Pill active={algo === "ring"} onClick={() => { setAlgo("ring"); reset(); }}>Ring</Pill>
      </div>

      <p className="mt-3 text-xs text-muted">Tap a node to crash or revive it.</p>
      <div className="mt-1 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {IDS.map((id) => {
          const isDead = dead.includes(id);
          const isLeader = leader === id;
          const involved = current?.involved.includes(id);
          const backed = current?.backedOff.includes(id);
          const tone = isDead
            ? "border-border bg-bad-soft text-muted line-through"
            : isLeader
              ? "border-accent bg-accent text-white dark:text-bg"
              : involved
                ? "border-accent bg-accent-soft"
                : "border-border bg-surface";
          return (
            <button key={id} type="button" onClick={() => toggleDead(id)} className={`min-h-14 min-w-0 rounded-lg border p-1 text-center ${tone}`}>
              <span className="block font-mono text-lg">{id}</span>
              <span className="block text-[0.65rem]">
                {isDead ? "crashed" : isLeader ? "leader" : backed ? "backed off" : id === validDetector ? "noticed" : "alive"}
              </span>
            </button>
          );
        })}
      </div>
      {algo === "ring" && (
        <p className="mt-2 text-xs text-muted break-words">Logical ring: {RING.join(" → ")} → {RING[0]}. Each node knows the full membership, so it can skip dead neighbours.</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">Who notices first:</span>
        {alive.filter((i) => i !== oldLeader || dead.includes(oldLeader)).map((id) => (
          <Pill key={id} active={validDetector === id} onClick={() => { setDetector(id); reset(); }}>
            {id}
          </Pill>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={done} onClick={() => setShown((s) => s + 1)} className="min-h-10 flex-1 rounded-lg bg-accent px-3 text-sm font-medium text-white disabled:opacity-50 dark:text-bg">
          Next message round
        </button>
        <button type="button" disabled={done} onClick={() => setShown(steps.length)} className="min-h-10 rounded-lg border border-border px-3 text-sm disabled:opacity-50">
          Run to end
        </button>
        <button type="button" onClick={reset} className="min-h-10 rounded-lg border border-border px-3 text-sm">
          Reset
        </button>
      </div>

      <ol className="mt-3 space-y-1">
        {visible.map((s, i) => (
          <li key={i} className={`rounded px-2 py-1 text-[0.78rem] break-words ${s.leader ? "bg-good-soft" : "bg-surface-2"}`}>
            <span className="font-mono text-muted">+{s.msgs} msg · </span>
            {s.text}
          </li>
        ))}
      </ol>

      <div className="mt-3 grid grid-cols-2 gap-2 text-center text-sm">
        <div className="rounded-lg bg-surface-2 p-2">
          <p className="text-xs text-muted">Messages so far</p>
          <p className="font-mono">{totalMsgs}</p>
        </div>
        <div className={`rounded-lg p-2 ${done ? "bg-good-soft" : "bg-warn-soft"}`}>
          <p className="text-xs text-muted">Leader</p>
          <p className="font-mono">{done && leader ? leader : "none yet"}</p>
        </div>
      </div>
    </Widget>
  );
}

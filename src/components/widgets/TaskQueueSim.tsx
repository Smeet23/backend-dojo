"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Provider = "up" | "down" | "crash";
type Task = { id: number; attempt: number; readyAt: number; hiddenUntil?: number };
type LogLine = { t: number; text: string; tone: "good" | "warn" | "bad" | "neutral" };

const MAX_RETRIES = 3;
const VISIBILITY_TIMEOUT = 2;

const providerLabel: Record<Provider, string> = {
  up: "Provider healthy",
  down: "Provider down",
  crash: "Worker crashes",
};

export function TaskQueueSim() {
  const [clock, setClock] = useState(0);
  const [nextId, setNextId] = useState(1);
  const [queue, setQueue] = useState<Task[]>([]);
  const [done, setDone] = useState<number[]>([]);
  const [dlq, setDlq] = useState<number[]>([]);
  const [provider, setProvider] = useState<Provider>("up");
  const [log, setLog] = useState<LogLine[]>([]);

  function addLog(lines: LogLine[]) {
    setLog((l) => [...lines.reverse(), ...l].slice(0, 8));
  }

  function enqueue() {
    setQueue((q) => [...q, { id: nextId, attempt: 0, readyAt: clock }]);
    addLog([{ t: clock, text: `Signup → enqueued email #${nextId}, API returned 201`, tone: "neutral" }]);
    setNextId((n) => n + 1);
  }

  function tick() {
    const t = clock + 1;
    const lines: LogLine[] = [];
    let q = queue.map((task) => {
      if (task.hiddenUntil !== undefined && task.hiddenUntil <= t) {
        lines.push({ t, text: `Visibility timeout: #${task.id} never acked, visible again`, tone: "warn" });
        return { ...task, hiddenUntil: undefined, readyAt: t };
      }
      return task;
    });
    const pick = q.find((task) => task.hiddenUntil === undefined && task.readyAt <= t);
    if (pick) {
      const attempt = pick.attempt + 1;
      if (provider === "up") {
        q = q.filter((task) => task.id !== pick.id);
        setDone((d) => [...d, pick.id]);
        lines.push({ t, text: `Worker ran #${pick.id} (attempt ${attempt}) → ack, deleted`, tone: "good" });
      } else if (provider === "crash") {
        q = q.map((task) => (task.id === pick.id ? { ...task, attempt, hiddenUntil: t + VISIBILITY_TIMEOUT } : task));
        lines.push({ t, text: `Worker took #${pick.id} and crashed. No ack; hidden until t=${t + VISIBILITY_TIMEOUT}`, tone: "bad" });
      } else if (attempt > MAX_RETRIES) {
        q = q.filter((task) => task.id !== pick.id);
        setDlq((d) => [...d, pick.id]);
        lines.push({ t, text: `#${pick.id} failed attempt ${attempt}. Retries used up → dead-letter queue`, tone: "bad" });
      } else {
        const delay = 2 ** (attempt - 1);
        q = q.map((task) => (task.id === pick.id ? { ...task, attempt, readyAt: t + delay } : task));
        lines.push({ t, text: `#${pick.id} failed (503). Retry ${attempt}/${MAX_RETRIES} in ${delay} min`, tone: "warn" });
      }
    } else {
      lines.push({ t, text: "Worker idle: nothing ready", tone: "neutral" });
    }
    setQueue(q);
    setClock(t);
    addLog(lines);
  }

  function reset() {
    setClock(0);
    setNextId(1);
    setQueue([]);
    setDone([]);
    setDlq([]);
    setLog([]);
    setProvider("up");
  }

  function status(task: Task) {
    if (task.hiddenUntil !== undefined) return { text: `in flight, hidden until t=${task.hiddenUntil}`, cls: "border-bad bg-bad-soft" };
    if (task.readyAt > clock) return { text: `retry at t=${task.readyAt}`, cls: "border-warn bg-warn-soft" };
    return { text: "ready", cls: "border-border bg-muted" };
  }

  return (
    <Widget
      title="Task queue simulator"
      hint="Enqueue a few emails, then step the clock. Break the provider or crash the worker and watch retries, backoff and the dead-letter queue."
    >
      <div className="flex flex-wrap gap-2">
        {(Object.keys(providerLabel) as Provider[]).map((p) => (
          <Pill key={p} active={provider === p} onClick={() => setProvider(p)}>
            {providerLabel[p]}
          </Pill>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={enqueue} className="min-h-10 flex-1 rounded-lg border border-border px-3 text-sm">
          Sign up a user
        </button>
        <button type="button" onClick={tick} className="min-h-10 flex-1 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground">
          Step 1 minute
        </button>
        <button type="button" onClick={reset} className="min-h-10 rounded-lg border border-border px-3 text-sm">
          Reset
        </button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Clock: t={clock} min · max retries {MAX_RETRIES} · backoff 1, 2, 4 min · visibility timeout {VISIBILITY_TIMEOUT} min
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Queue</p>
          <ul className="mt-1 space-y-1">
            {queue.length === 0 && <li className="text-sm text-muted-foreground">(empty)</li>}
            {queue.map((task) => {
              const s = status(task);
              return (
                <li key={task.id} className={`rounded-md border px-2 py-1 text-[0.8rem] ${s.cls}`}>
                  <span className="font-mono">email #{task.id}</span> · {s.text}
                </li>
              );
            })}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Delivered</p>
          <p className="mt-1 text-sm">{done.length === 0 ? <span className="text-muted-foreground">(none)</span> : done.map((id) => `#${id}`).join(", ")}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dead-letter queue</p>
          <p className="mt-1 text-sm">{dlq.length === 0 ? <span className="text-muted-foreground">(none)</span> : dlq.map((id) => `#${id}`).join(", ")}</p>
        </div>
      </div>
      <ol className="mt-3 space-y-1">
        {log.map((line, i) => (
          <li
            key={`${log.length - i}-${line.t}`}
            className={`rounded-md px-2 py-1 text-[0.8rem] ${
              line.tone === "good" ? "bg-good-soft" : line.tone === "warn" ? "bg-warn-soft" : line.tone === "bad" ? "bg-bad-soft" : "bg-muted"
            }`}
          >
            <span className="font-mono text-muted-foreground">t={line.t}</span> {line.text}
          </li>
        ))}
      </ol>
    </Widget>
  );
}

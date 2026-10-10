"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

/** Every limiter allows on average 5 requests per 10 seconds (0.5/s). */
const LIMIT = 5;
const WINDOW = 10;
const RATE = LIMIT / WINDOW;

type Verdict = { ok: boolean; note?: string };
type Algo = { id: string; name: string; blurb: string; run: (times: number[]) => Verdict[] };

const ALGOS: Algo[] = [
  {
    id: "fixed",
    name: "Fixed window",
    blurb: "Counter per 10 s block (0–9, 10–19, …). Cheap, but allows 2× the limit across a boundary.",
    run: (times) => {
      const counts = new Map<number, number>();
      return times.map((t) => {
        const w = Math.floor(t / WINDOW);
        const c = counts.get(w) ?? 0;
        if (c < LIMIT) {
          counts.set(w, c + 1);
          return { ok: true };
        }
        return { ok: false };
      });
    },
  },
  {
    id: "log",
    name: "Sliding log",
    blurb: "Stores every accepted timestamp; counts those in the last 10 s. Exact, but memory grows with traffic.",
    run: (times) => {
      const log: number[] = [];
      return times.map((t) => {
        const inWindow = log.filter((x) => x > t - WINDOW).length;
        if (inWindow < LIMIT) {
          log.push(t);
          return { ok: true };
        }
        return { ok: false };
      });
    },
  },
  {
    id: "counter",
    name: "Sliding counter",
    blurb: "Two counters: previous window weighted by overlap + current window. Nearly exact, O(1) memory.",
    run: (times) => {
      const counts = new Map<number, number>();
      return times.map((t) => {
        const w = Math.floor(t / WINDOW);
        const prev = counts.get(w - 1) ?? 0;
        const cur = counts.get(w) ?? 0;
        const overlap = 1 - (t - w * WINDOW) / WINDOW;
        const estimate = prev * overlap + cur;
        if (estimate < LIMIT) {
          counts.set(w, cur + 1);
          return { ok: true, note: `est ${estimate.toFixed(1)}` };
        }
        return { ok: false, note: `est ${estimate.toFixed(1)}` };
      });
    },
  },
  {
    id: "token",
    name: "Token bucket",
    blurb: "Holds up to 5 tokens, refills 0.5/s. Bursts up to 5 after idle time, then the refill rate.",
    run: (times) => {
      let tokens = LIMIT;
      let last = times[0] ?? 0;
      return times.map((t) => {
        tokens = Math.min(LIMIT, tokens + (t - last) * RATE);
        last = t;
        if (tokens >= 1) {
          tokens -= 1;
          return { ok: true, note: `${tokens.toFixed(1)} left` };
        }
        return { ok: false, note: `${tokens.toFixed(1)} left` };
      });
    },
  },
  {
    id: "leaky",
    name: "Leaky bucket",
    blurb: "Queue of 5; one request leaves every 2 s. Output is perfectly smooth; bursts wait instead of passing.",
    run: (times) => {
      let lastStart = -Infinity;
      let queue: number[] = []; // start times of requests still waiting
      return times.map((t) => {
        queue = queue.filter((s) => s > t);
        if (queue.length >= LIMIT) return { ok: false };
        const start = Math.max(t, lastStart + 1 / RATE);
        lastStart = start;
        if (start > t) queue.push(start);
        return { ok: true, note: start > t ? `waits ${start - t}s` : "now" };
      });
    },
  },
];

const PRESETS: { label: string; times: number[]; now: number }[] = [
  { label: "Burst at a window boundary", times: [9, 9, 9, 9, 9, 10, 10, 10, 10, 10], now: 10 },
  { label: "Idle, then a burst of 8", times: [30, 30, 30, 30, 30, 30, 30, 30], now: 30 },
  { label: "Steady, one every 2 s", times: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18], now: 18 },
];

export function SdRateLimiterCompare() {
  const [times, setTimes] = useState<number[]>(PRESETS[0].times);
  const [now, setNow] = useState(PRESETS[0].now);
  const [preset, setPreset] = useState(0);

  const send = (n: number) => {
    setPreset(-1);
    setTimes((ts) => [...ts, ...Array.from({ length: n }, () => now)].slice(-24));
  };

  return (
    <Widget title="Five limiters, same traffic" hint="Every limiter allows 5 requests per 10 s on average. Load a pattern or send your own requests and compare who gets through.">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p, i) => (
          <Pill
            key={p.label}
            active={preset === i}
            onClick={() => {
              setPreset(i);
              setTimes(p.times);
              setNow(p.now);
            }}
          >
            {p.label}
          </Pill>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="rounded bg-surface-2 px-2 py-1 font-mono text-sm">t = {now}s</span>
        <button type="button" onClick={() => send(1)} className="min-h-10 rounded-lg bg-accent px-3 text-sm font-medium text-white dark:text-bg">
          Send 1
        </button>
        <button type="button" onClick={() => send(3)} className="min-h-10 rounded-lg border border-border px-3 text-sm">
          Send 3
        </button>
        <button type="button" onClick={() => setNow((t) => t + 1)} className="min-h-10 rounded-lg border border-border px-3 text-sm">
          +1 s
        </button>
        <button type="button" onClick={() => setNow((t) => t + 5)} className="min-h-10 rounded-lg border border-border px-3 text-sm">
          +5 s
        </button>
        <button
          type="button"
          onClick={() => {
            setPreset(-1);
            setTimes([]);
            setNow(0);
          }}
          className="min-h-10 rounded-lg border border-border px-3 text-sm"
        >
          Clear
        </button>
      </div>

      <div className="mt-3 space-y-3">
        {ALGOS.map((a) => {
          const verdicts = a.run(times);
          const allowed = verdicts.filter((v) => v.ok).length;
          return (
            <div key={a.id} className="min-w-0 rounded-lg border border-border p-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-semibold">{a.name}</p>
                <p className="font-mono text-xs">
                  {allowed}/{times.length} allowed
                </p>
              </div>
              <p className="text-xs text-muted">{a.blurb}</p>
              <ol className="mt-2 flex flex-wrap gap-1">
                {verdicts.map((v, i) => (
                  <li
                    key={i}
                    title={v.note}
                    className={`rounded px-1.5 py-0.5 font-mono text-[0.68rem] ${v.ok ? (v.note?.startsWith("waits") ? "bg-warn-soft" : "bg-good-soft") : "bg-bad-soft line-through"}`}
                  >
                    t{times[i]}
                    {v.note?.startsWith("waits") ? ` +${v.note.slice(6)}` : ""}
                  </li>
                ))}
                {times.length === 0 && <li className="text-xs text-muted">No requests yet.</li>}
              </ol>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted">Green: allowed now. Amber: accepted but queued (leaky bucket). Struck through: rejected with 429.</p>
    </Widget>
  );
}

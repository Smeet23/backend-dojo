"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

const RATES = [1_000, 100_000, 1_000_000] as const;
const WINDOWS = [1, 5, 30] as const;
/** Roughly what one hot row can absorb when every write contends for the same lock. */
const HOT_ROW_LIMIT = 500;

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 ? 1 : 0)}k`;
  return n < 10 ? n.toFixed(n % 1 ? 2 : 0) : Math.round(n).toString();
}

export function SdLikeBatcher() {
  const [perMin, setPerMin] = useState<(typeof RATES)[number]>(100_000);
  const [mode, setMode] = useState<"naive" | "batched">("naive");
  const [windowS, setWindowS] = useState<(typeof WINDOWS)[number]>(5);
  const [aggregators, setAggregators] = useState(4);

  const perSec = perMin / 60;
  // Likes table: one insert per like either way (relationship rows), spread across shards.
  const relationInserts = perSec;
  // Counter row: naive = one UPDATE per like on the same row; batched = one UPDATE per aggregator per window.
  const counterWrites = mode === "naive" ? perSec : aggregators / windowS;
  const overloaded = counterWrites > HOT_ROW_LIMIT;
  const staleness = mode === "naive" ? 0 : windowS;
  const perFlush = mode === "batched" ? Math.round((perSec * windowS) / aggregators) : 1;

  return (
    <Widget title="Counting likes on a viral reel" hint="One reel is going viral. Compare a counter updated per like with an aggregator that sums in memory and flushes.">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Likes per minute</p>
      <div className="mt-1 flex flex-wrap gap-2">
        {RATES.map((r) => (
          <Pill key={r} active={perMin === r} onClick={() => setPerMin(r)}>
            {fmt(r)}/min
          </Pill>
        ))}
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted">Counter strategy</p>
      <div className="mt-1 flex flex-wrap gap-2">
        <Pill active={mode === "naive"} onClick={() => setMode("naive")}>
          UPDATE per like
        </Pill>
        <Pill active={mode === "batched"} onClick={() => setMode("batched")}>
          Kafka + aggregator
        </Pill>
      </div>
      {mode === "batched" && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted">Flush every</span>
          {WINDOWS.map((w) => (
            <Pill key={w} active={windowS === w} onClick={() => setWindowS(w)}>
              {w}s
            </Pill>
          ))}
          <span className="text-xs text-muted">Aggregators</span>
          <button type="button" onClick={() => setAggregators((a) => Math.max(1, a - 1))} className="min-h-10 min-w-10 rounded-lg border border-border">
            −
          </button>
          <span className="font-mono text-sm">{aggregators}</span>
          <button type="button" onClick={() => setAggregators((a) => Math.min(16, a + 1))} className="min-h-10 min-w-10 rounded-lg border border-border">
            +
          </button>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
        <div className="min-w-0 rounded-lg bg-surface-2 p-3">
          <p className="text-xs text-muted">Likes-table inserts/s</p>
          <p className="font-mono text-lg">{fmt(relationInserts)}</p>
          <p className="text-xs text-muted">(reel_id, user_id) rows, spread over shards. Unavoidable.</p>
        </div>
        <div className={`min-w-0 rounded-lg p-3 ${overloaded ? "bg-bad-soft" : "bg-good-soft"}`}>
          <p className="text-xs text-muted">Writes/s on the one counter row</p>
          <p className="font-mono text-lg">{fmt(counterWrites)}</p>
          <p className="text-xs text-muted">{overloaded ? "Every write queues for the same row lock. Latency explodes." : mode === "batched" ? `Each flush adds about ${fmt(perFlush)} likes in one statement.` : "Fine at this rate."}</p>
        </div>
        <div className="min-w-0 rounded-lg bg-surface-2 p-3">
          <p className="text-xs text-muted">How stale the shown count is</p>
          <p className="font-mono text-lg">{staleness ? `≤ ${staleness}s` : "0s"}</p>
          <p className="text-xs text-muted">Nobody notices a like count that is a few seconds behind.</p>
        </div>
      </div>
      <pre className="mt-3 overflow-x-auto rounded bg-surface-2 p-2 font-mono text-[0.72rem]">
        {mode === "naive"
          ? "UPDATE reel_stats SET likes = likes + 1 WHERE reel_id = 7123;  -- per like"
          : `UPDATE reel_stats SET likes = likes + ${fmt(perFlush)} WHERE reel_id = 7123;  -- per flush\nSET reel:7123:likes <new total>  -- refresh Redis`}
      </pre>
    </Widget>
  );
}

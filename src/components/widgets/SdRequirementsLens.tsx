"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

const DAU = [
  { label: "1k", value: 1_000 },
  { label: "100k", value: 100_000 },
  { label: "1M", value: 1_000_000 },
  { label: "10M", value: 10_000_000 },
  { label: "100M", value: 100_000_000 },
];
const REQS = [10, 50, 200];
const MIX = [
  { label: "Read-heavy (100:1)", reads: 100, writes: 1 },
  { label: "Mixed (10:1)", reads: 10, writes: 1 },
  { label: "Write-heavy (1:1)", reads: 1, writes: 1 },
];
const PEAK_FACTOR = 3;

type Rec = { text: string; why: string; tone: "good" | "warn" | "neutral" };

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n < 10 ? n.toFixed(1) : String(Math.round(n));
}

function recommend(peak: number, readPeak: number, writePeak: number, global: boolean, dau: number): Rec[] {
  const recs: Rec[] = [];
  if (peak < 300) {
    recs.push({ text: "One app server + one database (a monolith)", why: "A single modest server comfortably handles a few hundred requests per second. Add backups, not complexity.", tone: "good" });
  } else {
    recs.push({ text: "Several stateless app servers behind a load balancer", why: "Peak traffic is beyond what one box should carry, and one box is a single point of failure.", tone: "neutral" });
  }
  if (readPeak > 1000) recs.push({ text: "Cache (Redis) in front of the database", why: "Thousands of reads per second, mostly for the same hot data: serve them from memory.", tone: "neutral" });
  if (readPeak > 5000) recs.push({ text: "Read replicas", why: "Even with a cache, misses alone can exceed what one database serves comfortably.", tone: "neutral" });
  if (writePeak > 3000) recs.push({ text: "Shard the database", why: "A single primary tops out at a few thousand writes per second; replicas don't help with writes.", tone: "warn" });
  if (writePeak > 500) recs.push({ text: "Queue for slow side-effects", why: "Emails, thumbnails and analytics shouldn't make the user wait. Hand them to background workers.", tone: "neutral" });
  if (global) recs.push({ text: "CDN, and app servers in more than one region", why: "A round trip across the world costs 150 to 300 ms. Static files from the edge, dynamic requests from a nearby region.", tone: "neutral" });
  if (dau >= 10_000_000) recs.push({ text: "Consider splitting into services", why: "At this scale many teams work on the product; independent deploys start to pay for the extra complexity.", tone: "warn" });
  else recs.push({ text: "Keep it a monolith", why: "Microservices add network hops and operational load. Nothing here forces that yet.", tone: "good" });
  return recs;
}

export function SdRequirementsLens() {
  const [dau, setDau] = useState(1_000_000);
  const [reqs, setReqs] = useState(50);
  const [mix, setMix] = useState(0);
  const [global, setGlobal] = useState(false);

  const perDay = dau * reqs;
  const avg = perDay / 86_400;
  const peak = avg * PEAK_FACTOR;
  const m = MIX[mix];
  const readPeak = (peak * m.reads) / (m.reads + m.writes);
  const writePeak = (peak * m.writes) / (m.reads + m.writes);
  const recs = recommend(peak, readPeak, writePeak, global, dau);

  return (
    <Widget title="Requirements first" hint="Answer the clarifying questions. The numbers, and the architecture they justify, update as you go.">
      <div className="space-y-3 text-sm">
        <div>
          <p className="mb-1 text-xs font-semibold text-muted">Daily active users</p>
          <div className="flex flex-wrap gap-2">
            {DAU.map((d) => (
              <Pill key={d.label} active={dau === d.value} onClick={() => setDau(d.value)}>{d.label}</Pill>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold text-muted">Requests per user per day</p>
          <div className="flex flex-wrap gap-2">
            {REQS.map((r) => (
              <Pill key={r} active={reqs === r} onClick={() => setReqs(r)}>{r}</Pill>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold text-muted">Read to write ratio</p>
          <div className="flex flex-wrap gap-2">
            {MIX.map((x, i) => (
              <Pill key={x.label} active={mix === i} onClick={() => setMix(i)}>{x.label}</Pill>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold text-muted">Where are the users?</p>
          <div className="flex flex-wrap gap-2">
            <Pill active={!global} onClick={() => setGlobal(false)}>One country</Pill>
            <Pill active={global} onClick={() => setGlobal(true)}>Worldwide</Pill>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-center text-sm sm:grid-cols-4">
        <div className="min-w-0 rounded-lg bg-surface-2 p-2"><p className="text-xs text-muted">Average</p><p className="font-mono">{fmt(avg)} req/s</p></div>
        <div className="min-w-0 rounded-lg bg-accent-soft p-2"><p className="text-xs text-muted">Peak (×{PEAK_FACTOR})</p><p className="font-mono">{fmt(peak)} req/s</p></div>
        <div className="min-w-0 rounded-lg bg-surface-2 p-2"><p className="text-xs text-muted">Peak reads</p><p className="font-mono">{fmt(readPeak)}/s</p></div>
        <div className="min-w-0 rounded-lg bg-surface-2 p-2"><p className="text-xs text-muted">Peak writes</p><p className="font-mono">{fmt(writePeak)}/s</p></div>
      </div>
      <p className="mt-2 text-xs text-muted break-words">
        {fmt(dau)} users × {reqs} requests = {fmt(perDay)} per day ÷ 86,400 seconds. Peak assumed at {PEAK_FACTOR}× the average.
      </p>

      <ul className="mt-3 space-y-2">
        {recs.map((r) => (
          <li key={r.text} className={`rounded-lg p-2 text-sm ${r.tone === "good" ? "bg-good-soft" : r.tone === "warn" ? "bg-warn-soft" : "bg-surface-2"}`}>
            <p className="font-medium">{r.text}</p>
            <p className="text-xs text-muted">{r.why}</p>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted">Thresholds are rough rules of thumb for discussion, not hard limits.</p>
    </Widget>
  );
}

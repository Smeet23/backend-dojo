"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

const DAU = [1e6, 10e6, 100e6, 500e6];
const WRITES = [1, 2, 10, 50];
const RATIO = [1, 10, 100];
const SIZE = [200, 1_000, 100_000, 2_000_000];
const YEARS = [1, 5, 10];
const PEAK = [2, 3, 5];
const SECONDS_PER_DAY = 86_400;

function count(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(0);
}

function bytes(n: number): string {
  const units = ["B", "KB", "MB", "GB", "TB", "PB", "EB"];
  let i = 0;
  let v = n;
  while (v >= 1000 && i < units.length - 1) {
    v /= 1000;
    i++;
  }
  return `${v >= 100 ? v.toFixed(0) : v.toFixed(1)} ${units[i]}`;
}

function Row<T extends number>({ label, values, value, set, fmt }: { label: string; values: T[]; value: T; set: (v: T) => void; fmt: (v: T) => string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted">{label}</p>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {values.map((v) => (
          <Pill key={v} active={v === value} onClick={() => set(v)}>
            {fmt(v)}
          </Pill>
        ))}
      </div>
    </div>
  );
}

export function HldEstimator() {
  const [dau, setDau] = useState(100e6);
  const [writes, setWrites] = useState(2);
  const [ratio, setRatio] = useState(10);
  const [size, setSize] = useState(1_000);
  const [years, setYears] = useState(5);
  const [peak, setPeak] = useState(3);

  const writesPerDay = dau * writes;
  const readsPerDay = writesPerDay * ratio;
  const wQps = writesPerDay / SECONDS_PER_DAY;
  const rQps = readsPerDay / SECONDS_PER_DAY;
  const peakQps = (wQps + rQps) * peak;
  const storagePerDay = writesPerDay * size;
  const storageTotal = storagePerDay * 365 * years;
  const ingress = wQps * size;
  const egress = rQps * size;
  const cache = readsPerDay * size * 0.2;
  const servers = Math.max(1, Math.ceil(peakQps / 1_000));

  const rows: { k: string; v: string; math: string; tone?: "warn" | "bad" }[] = [
    { k: "Write QPS (avg)", v: count(wQps), math: `${count(writesPerDay)} writes/day ÷ 86,400 s` },
    { k: "Read QPS (avg)", v: count(rQps), math: `${count(readsPerDay)} reads/day ÷ 86,400 s` },
    { k: "Peak QPS", v: count(peakQps), math: `(write + read) × ${peak}`, tone: peakQps > 1e6 ? "warn" : undefined },
    { k: "New storage per day", v: bytes(storagePerDay), math: `${count(writesPerDay)} × ${bytes(size)}` },
    { k: `Storage for ${years} yr`, v: bytes(storageTotal), math: `per day × 365 × ${years} (×3 more with replication)`, tone: storageTotal > 1e15 ? "bad" : storageTotal > 1e13 ? "warn" : undefined },
    { k: "Ingress bandwidth", v: `${bytes(ingress)}/s`, math: "write QPS × object size" },
    { k: "Egress bandwidth", v: `${bytes(egress)}/s`, math: "read QPS × object size", tone: egress > 1e10 ? "bad" : egress > 1e9 ? "warn" : undefined },
    { k: "Cache (20% of daily reads)", v: bytes(cache), math: "reads/day × size × 0.2 (an upper bound)" },
    { k: "App servers at 1K QPS each", v: count(servers), math: "peak QPS ÷ 1,000" },
  ];

  return (
    <Widget title="Capacity estimator" hint="Pick assumptions. Every number below is derived the same way you would on a whiteboard.">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Row label="Daily active users" values={DAU} value={dau} set={setDau} fmt={count} />
        <Row label="Writes per user per day" values={WRITES} value={writes} set={setWrites} fmt={(v) => `${v}`} />
        <Row label="Reads per write" values={RATIO} value={ratio} set={setRatio} fmt={(v) => `${v}:1`} />
        <Row label="Object size" values={SIZE} value={size} set={setSize} fmt={bytes} />
        <Row label="Retention" values={YEARS} value={years} set={setYears} fmt={(v) => `${v} yr`} />
        <Row label="Peak / average" values={PEAK} value={peak} set={setPeak} fmt={(v) => `${v}×`} />
      </div>
      <ul className="mt-4 space-y-1.5">
        {rows.map((r) => (
          <li
            key={r.k}
            className={`flex flex-wrap items-baseline justify-between gap-x-3 rounded-lg px-3 py-2 ${r.tone === "bad" ? "bg-bad-soft" : r.tone === "warn" ? "bg-warn-soft" : "bg-surface-2"}`}
          >
            <span className="text-sm font-medium">{r.k}</span>
            <span className="font-mono text-sm font-semibold">{r.v}</span>
            <span className="w-full text-xs text-muted break-words">{r.math}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted">
        Units are decimal (1 KB = 1,000 B), which is close enough for estimates. Yellow and red rows are the ones that will shape the design: a sharded store, a CDN, or a dedicated cache tier.
      </p>
    </Widget>
  );
}

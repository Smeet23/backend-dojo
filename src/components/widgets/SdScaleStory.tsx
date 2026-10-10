"use client";

import { useState } from "react";
import { Widget } from "./Widget";

type Stage = {
  load: string;
  symptom: string;
  options: string[];
  answer: string;
  why: string;
  adds: string;
};

const STAGES: Stage[] = [
  {
    load: "10k users / day",
    symptom: "The single server's CPU sits at 95% at lunchtime and pages time out.",
    options: ["Upgrade to a bigger machine", "Shard the database", "Add a CDN", "Add a message queue"],
    answer: "Upgrade to a bigger machine",
    why: "At this size, vertical scaling is the cheapest fix: no code changes, just more CPU and RAM.",
    adds: "Bigger server",
  },
  {
    load: "1M users / day",
    symptom: "The biggest affordable machine is maxed out, and a kernel patch reboot took the whole site down.",
    options: ["Add more servers behind a load balancer", "Buy an even bigger server", "Add read replicas", "Add Redis"],
    answer: "Add more servers behind a load balancer",
    why: "Vertical scaling has hit its ceiling and is a single point of failure. Scale out, and let a load balancer spread requests and skip dead servers.",
    adds: "Load balancer + app servers",
  },
  {
    load: "Users in Asia and Europe",
    symptom: "Users in Singapore wait 2 s for images and scripts served from Virginia.",
    options: ["Serve static files from a CDN", "Add more app servers in Virginia", "Use a layer 4 load balancer", "Shard by country"],
    answer: "Serve static files from a CDN",
    why: "The delay is distance, not capacity. Edge servers near the users serve cached copies of static files.",
    adds: "CDN",
  },
  {
    load: "Product pages read 50k×/s",
    symptom: "Database CPU is pinned running the same product queries over and over.",
    options: ["Cache hot data in Redis", "Add more app servers", "Switch to write-back", "Add a CDN for the API"],
    answer: "Cache hot data in Redis",
    why: "The same rarely-changing rows are read repeatedly. An in-memory cache answers most of them without touching the database.",
    adds: "Redis cache",
  },
  {
    load: "Read-heavy, 1000:1",
    symptom: "Cache misses alone are more than one database can serve, though writes are light.",
    options: ["Add read replicas", "Shard the database", "Add a queue", "Bigger load balancer"],
    answer: "Add read replicas",
    why: "Reads dominate and writes are light, so copies that serve reads fix it. Sharding is for when writes or data size outgrow one primary.",
    adds: "Primary + read replicas",
  },
  {
    load: "10 TB, 20k writes/s",
    symptom: "The primary's disk is nearly full and it can't keep up with writes. Every replica has the same problem.",
    options: ["Shard the database", "Add more replicas", "Increase the cache TTL", "Add a CDN"],
    answer: "Shard the database",
    why: "Replicas copy everything and still send all writes to one primary. Splitting data across shards spreads both storage and writes.",
    adds: "Shards (each replicated)",
  },
  {
    load: "Photo uploads",
    symptom: "Uploads take 3 s because resizing, thumbnails and emails run inside the request.",
    options: ["Push the work onto a queue for workers", "Add more replicas", "Use sticky sessions", "Cache the uploads in Redis"],
    answer: "Push the work onto a queue for workers",
    why: "None of that work needs to finish before the user gets a response. Queue it and let workers handle it in the background.",
    adds: "Queue + workers",
  },
  {
    load: "Millions of photos",
    symptom: "Database backups take all night because image bytes are stored in a BLOB column.",
    options: ["Move files to object storage, keep URLs in the DB", "Shard the image table", "Compress the database", "Add a bigger disk"],
    answer: "Move files to object storage, keep URLs in the DB",
    why: "Databases are for structured, queryable data. Object storage is cheap and durable for files, and the CDN serves from it.",
    adds: "Object storage",
  },
];

export function SdScaleStory() {
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [mistakes, setMistakes] = useState(0);

  const done = step >= STAGES.length;
  const stage = STAGES[Math.min(step, STAGES.length - 1)];
  const built = ["Client", "DNS", "Server + DB", ...STAGES.slice(0, step).map((s) => s.adds)];
  const correct = picked === stage.answer;

  function choose(o: string) {
    if (picked === stage.answer) return;
    setPicked(o);
    if (o !== stage.answer) setMistakes((m) => m + 1);
  }

  function next() {
    setStep((s) => s + 1);
    setPicked(null);
  }

  function reset() {
    setStep(0);
    setPicked(null);
    setMistakes(0);
  }

  return (
    <Widget title="Break it, then fix it" hint="Traffic keeps growing. At each stage, read the symptom and pick the component that fixes it.">
      <div className="flex flex-wrap gap-1.5">
        {built.map((b, i) => (
          <span key={`${b}-${i}`} className={`rounded-md border px-2 py-1 text-xs ${i >= 3 ? "border-accent bg-accent-soft" : "border-border bg-surface-2"}`}>
            {b}
          </span>
        ))}
      </div>

      {done ? (
        <div className="mt-4 rounded-lg bg-good-soft p-3 text-sm">
          <p className="font-medium">Production architecture reached.</p>
          <p className="mt-1 text-muted">Wrong picks along the way: {mistakes}. Every component above is there because something broke without it.</p>
          <button type="button" onClick={reset} className="mt-3 min-h-10 rounded-lg border border-border bg-surface px-3 text-sm">
            Start over
          </button>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Stage {step + 1} of {STAGES.length} · {stage.load}
          </p>
          <p className="mt-1 rounded-lg bg-warn-soft p-2 text-sm">{stage.symptom}</p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {stage.options.map((o) => {
              const state = picked === o ? (o === stage.answer ? "bg-good-soft border-good" : "bg-bad-soft border-bad") : "border-border bg-surface hover:bg-surface-2";
              return (
                <button key={o} type="button" onClick={() => choose(o)} className={`min-h-10 min-w-0 rounded-lg border px-3 py-2 text-left text-sm ${state}`}>
                  {o}
                </button>
              );
            })}
          </div>
          {picked && (
            <p className={`mt-3 rounded-lg p-2 text-sm ${correct ? "bg-good-soft" : "bg-bad-soft"}`}>
              {correct ? stage.why : "That doesn't address this symptom. Look at what's actually running out, then try again."}
            </p>
          )}
          {correct && (
            <button type="button" onClick={next} className="mt-3 min-h-10 w-full rounded-lg bg-accent px-3 text-sm font-medium text-white dark:text-bg">
              {step + 1 < STAGES.length ? "Grow traffic →" : "Finish"}
            </button>
          )}
        </div>
      )}
    </Widget>
  );
}

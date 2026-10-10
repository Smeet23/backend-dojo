"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Outcome = "ready" | "blocked" | "failed";
type Step = { actor: string; title: string; detail: string; status: string; event?: string; tone?: "good" | "warn" | "bad" };

const BASE: Step[] = [
  {
    actor: "Client → Upload API",
    title: "Start an upload session",
    detail: "Auth token checked. A Snowflake-style id is minted (timestamp + region/worker + sequence). The API returns the reel id plus pre-signed URLs for each 8 MB part.",
    status: "INIT",
  },
  {
    actor: "Upload API → Metadata DB",
    title: "Write the metadata row",
    detail: "reel_id, creator_id, duration, visibility, created_at. INIT means: the reel exists logically, but it isn't playable and can't appear in any feed.",
    status: "INIT",
  },
  {
    actor: "Client → Object storage",
    title: "Upload the raw file directly",
    detail: "Parts go straight to the bucket (multipart upload), so no app server touches the video bytes. A failed part is retried on its own.",
    status: "INIT",
  },
  {
    actor: "Object storage → Upload API",
    title: "Upload complete",
    detail: "The storage layer confirms all parts are stored (replicated across racks). The API flips the row and publishes an event keyed by reel_id.",
    status: "UPLOADED",
    event: "reel.uploaded {reel_id: 7123…, raw: s3://raw/7123.mp4}",
  },
  {
    actor: "Transcode worker",
    title: "Pull the event, fetch the raw file",
    detail: "Workers in a consumer group pull from the partition that owns this reel_id. The row moves to PROCESSING.",
    status: "PROCESSING",
  },
  {
    actor: "Transcode worker",
    title: "Transcode and segment",
    detail: "An FFmpeg-style pipeline produces a bitrate ladder (240p, 360p, 480p, 720p, 1080p), cuts each rendition into 2-second segments and writes HLS/DASH manifests. A moderation model scores frames and audio in parallel.",
    status: "PROCESSING",
  },
];

const ENDINGS: Record<Outcome, Step[]> = {
  ready: [
    {
      actor: "Transcode worker → Metadata DB",
      title: "Mark ready",
      detail: "Segments and manifest are in the processed bucket. The row becomes READY: playable and eligible for feeds.",
      status: "READY",
      event: "reel.ready {reel_id: 7123…, manifest: /v/7123/master.m3u8}",
      tone: "good",
    },
    {
      actor: "Storage replication + CDN",
      title: "Replicate and fan out",
      detail: "Copies are synchronous inside the region and asynchronous to other regions. CDNs pull segments on first request. Consumers of reel.ready notify followers and index the reel for recommendations.",
      status: "READY",
      tone: "good",
    },
  ],
  blocked: [
    {
      actor: "Moderation → Metadata DB",
      title: "Policy violation",
      detail: "The reel is BLOCKED. Segments may exist, but the feed and playback services refuse anything that isn't READY, so nobody can watch it.",
      status: "BLOCKED",
      event: "reel.blocked {reel_id: 7123…, reason: policy}",
      tone: "bad",
    },
  ],
  failed: [
    {
      actor: "Transcode worker",
      title: "Worker crashed mid-transcode",
      detail: "The event was never acknowledged, so it's redelivered to another worker. Transcoding is idempotent (same input, same output paths), so a retry is safe. After N failures the event goes to a dead-letter queue and the row becomes FAILED.",
      status: "FAILED",
      event: "reel.uploaded → retried 3× → DLQ",
      tone: "warn",
    },
  ],
};

const STATUS_TONE: Record<string, string> = {
  INIT: "bg-surface-2",
  UPLOADED: "bg-accent-soft",
  PROCESSING: "bg-warn-soft",
  READY: "bg-good-soft",
  BLOCKED: "bg-bad-soft",
  FAILED: "bg-bad-soft",
};

export function SdReelPipeline() {
  const [outcome, setOutcome] = useState<Outcome>("ready");
  const [i, setI] = useState(0);
  const steps = [...BASE, ...ENDINGS[outcome]];
  const step = steps[Math.min(i, steps.length - 1)];
  const playable = step.status === "READY";

  return (
    <Widget title="Reel upload pipeline" hint="Step through one upload. Pick how processing ends and watch the status column and events change.">
      <div className="flex flex-wrap gap-2">
        {(["ready", "blocked", "failed"] as Outcome[]).map((o) => (
          <Pill
            key={o}
            active={outcome === o}
            onClick={() => {
              setOutcome(o);
              setI(0);
            }}
          >
            {o === "ready" ? "Happy path" : o === "blocked" ? "Moderation blocks it" : "Worker crashes"}
          </Pill>
        ))}
      </div>

      <ol className="mt-3 flex flex-wrap gap-1">
        {steps.map((s, k) => (
          <li key={k}>
            <button
              type="button"
              onClick={() => setI(k)}
              className={`min-h-10 min-w-10 rounded-md border text-xs font-mono ${k === i ? "border-accent bg-accent text-white dark:text-bg" : k < i ? "border-accent bg-accent-soft" : "border-border"}`}
              aria-label={`Step ${k + 1}: ${s.title}`}
            >
              {k + 1}
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="min-w-0 rounded-lg border border-border p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{step.actor}</p>
          <p className="mt-1 font-semibold">{step.title}</p>
          <p className="mt-1 text-sm text-muted">{step.detail}</p>
          {step.event && (
            <pre className="mt-2 rounded bg-surface-2 p-2 font-mono text-[0.72rem] whitespace-pre-wrap break-all">Kafka: {step.event}</pre>
          )}
        </div>
        <div className="min-w-0 rounded-lg border border-border p-3 text-sm sm:w-48">
          <p className="text-xs text-muted">reels.status</p>
          <p className={`mt-1 rounded px-2 py-1 font-mono font-semibold ${STATUS_TONE[step.status]}`}>{step.status}</p>
          <p className="mt-2 text-xs text-muted">Playable / in feeds</p>
          <p className={`mt-1 rounded px-2 py-1 text-xs ${playable ? "bg-good-soft" : "bg-surface-2"}`}>{playable ? "yes" : "no"}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => setI((x) => Math.max(0, x - 1))} disabled={i === 0} className="min-h-10 rounded-lg border border-border px-3 text-sm disabled:opacity-40">
          Back
        </button>
        <button
          type="button"
          onClick={() => setI((x) => Math.min(steps.length - 1, x + 1))}
          disabled={i >= steps.length - 1}
          className="min-h-10 flex-1 rounded-lg bg-accent px-3 text-sm font-medium text-white disabled:opacity-40 dark:text-bg"
        >
          Next step
        </button>
      </div>
    </Widget>
  );
}

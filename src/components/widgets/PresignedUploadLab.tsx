"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Pill, Widget } from "./Widget";

type Actor = "Browser" | "API" | "Database" | "Bucket";
type Step = { from: Actor; to: Actor; title: string; lines: string[]; tone?: "good" | "bad" | "warn" };

type Mode = "put" | "post";
type FileChoice = "avatar" | "video";
type Target = "own" | "other";
type Timing = "fresh" | "late";

const MAX = 5 * 1024 * 1024;
const FILES: Record<FileChoice, { name: string; bytes: number; type: string; label: string }> = {
  avatar: { name: "holiday.png", bytes: 415_000, type: "image/png", label: "415 KB photo" },
  video: { name: "trip.mp4", bytes: 314_000_000, type: "video/mp4", label: "300 MB video" },
};

const OWN_PREFIX = "t_81/u_42/";
const OTHER_PREFIX = "t_81/u_7/";
const KEY = `${OWN_PREFIX}9f3c2a.png`;

function fmt(bytes: number) {
  return bytes >= 1_000_000 ? `${Math.round(bytes / 1_000_000)} MB` : `${Math.round(bytes / 1000)} KB`;
}

/** Builds the full two-phase upload trace for the chosen conditions. */
export function uploadTrace(mode: Mode, fileChoice: FileChoice, target: Target, timing: Timing, completes: boolean): Step[] {
  const file = FILES[fileChoice];
  const steps: Step[] = [
    { from: "Browser", to: "API", title: "Ask to upload", lines: ["POST /uploads", `{ "name": "${file.name}", "size": ${file.bytes}, "type": "${file.type}" }`] },
    {
      from: "API",
      to: "Database",
      title: "Record intent",
      lines: ["Auth OK. Server generates the key itself.", `INSERT uploads (id='up_5', key='${KEY}', max_bytes=${MAX}, status='pending')`],
    },
    {
      from: "API",
      to: "Browser",
      title: mode === "post" ? "Presigned POST (URL + signed policy)" : "Presigned PUT URL",
      lines:
        mode === "post"
          ? ["url: https://notes-uploads.s3.amazonaws.com/", `fields: key=${KEY}, policy=…, x-amz-signature=…`, `policy: content-length-range 1024..${MAX}, Content-Type image/*, key starts-with ${OWN_PREFIX}`, "expires in 5 minutes"]
          : [`https://notes-uploads.s3.amazonaws.com/${KEY}`, "  ?X-Amz-Expires=300&X-Amz-Signature=5d1f…", "Signed: method PUT, bucket, key, expiry. Not size."],
    },
  ];

  const sentKey = target === "own" ? KEY : `${OTHER_PREFIX}9f3c2a.png`;
  const upload: Step = {
    from: "Browser",
    to: "Bucket",
    title: "Upload directly to the bucket",
    lines: [mode === "post" ? `POST / (form: key=${sentKey}, file LAST)` : `PUT /${sentKey}`, `${fmt(file.bytes)} of ${file.type}`, "Bytes never touch your API."],
  };
  steps.push(upload);

  const pendingForever: Step = {
    from: "Database",
    to: "Database",
    title: "Row stays pending",
    lines: ["Nightly job: pending rows older than 24 h -> status='expired'.", "Lifecycle rule removes any leftover bytes."],
    tone: "warn",
  };

  if (timing === "late") {
    steps.push({ from: "Bucket", to: "Browser", title: "403 Forbidden", lines: ["Request has expired.", "The signature included the expiry time, so it can't be extended."], tone: "bad" });
    steps.push(pendingForever);
    return steps;
  }
  if (target === "other") {
    steps.push(
      mode === "post"
        ? { from: "Bucket", to: "Browser", title: "403 Forbidden", lines: [`Policy condition failed: ["starts-with", "$key", "${OWN_PREFIX}"]`, "Nothing stored."], tone: "bad" }
        : { from: "Bucket", to: "Browser", title: "403 Forbidden", lines: ["SignatureDoesNotMatch: the key is part of the signed string.", "Changing even one character breaks it. Nothing stored."], tone: "bad" },
    );
    steps.push(pendingForever);
    return steps;
  }
  if (mode === "post" && file.bytes > MAX) {
    steps.push({ from: "Bucket", to: "Browser", title: "400 EntityTooLarge", lines: [`${fmt(file.bytes)} exceeds content-length-range max ${fmt(MAX)}.`, "Rejected by the storage service. Nothing stored."], tone: "bad" });
    steps.push(pendingForever);
    return steps;
  }
  steps.push({
    from: "Bucket",
    to: "Browser",
    title: "200 OK",
    lines: [`Stored ${fmt(file.bytes)} at ${KEY}`, ...(file.bytes > MAX ? ["Nothing checked the size: a PUT URL is an unlimited write."] : [])],
    tone: file.bytes > MAX ? "warn" : "good",
  });

  if (!completes) {
    steps.push({ from: "Browser", to: "Browser", title: "Tab closed", lines: ["The completion call never happens."], tone: "warn" });
    steps.push(pendingForever);
    return steps;
  }

  steps.push({ from: "Browser", to: "API", title: "Complete", lines: ["POST /uploads/up_5/complete", "(upload ID only, never the key)"] });
  steps.push({ from: "API", to: "Bucket", title: "Verify with HeadObject", lines: [`HEAD /${KEY}`, `-> 200, Content-Length: ${file.bytes}, Content-Type: ${file.type}`] });
  if (file.bytes > MAX || !file.type.startsWith("image/")) {
    steps.push({
      from: "API",
      to: "Database",
      title: "Reject",
      lines: [`${fmt(file.bytes)} ${file.type} breaks the promised limits.`, "DELETE the object, mark row 'rejected', return 422."],
      tone: "bad",
    });
    return steps;
  }
  steps.push({ from: "API", to: "Database", title: "Mark ready", lines: ["UPDATE uploads SET status='ready' WHERE id='up_5'", "Profile picture now points at this key."], tone: "good" });
  return steps;
}

export function PresignedUploadLab() {
  const [mode, setMode] = useState<Mode>("post");
  const [fileChoice, setFileChoice] = useState<FileChoice>("avatar");
  const [target, setTarget] = useState<Target>("own");
  const [timing, setTiming] = useState<Timing>("fresh");
  const [completes, setCompletes] = useState(true);
  const [step, setStep] = useState(0);

  const steps = useMemo(() => uploadTrace(mode, fileChoice, target, timing, completes), [mode, fileChoice, target, timing, completes]);
  const current = Math.min(step, steps.length - 1);
  const pick = <T,>(set: (v: T) => void) => (v: T) => { set(v); setStep(0); };

  const row = (label: string, children: ReactNode) => (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-24 text-muted">{label}</span>
      {children}
    </div>
  );

  return (
    <Widget title="Two-phase presigned upload" hint="An avatar upload in the notes app. Change the conditions, then step through what each party does.">
      <div className="space-y-3 text-sm">
        {row("Signing", <>
          <Pill active={mode === "post"} onClick={() => pick(setMode)("post")}>POST + policy</Pill>
          <Pill active={mode === "put"} onClick={() => pick(setMode)("put")}>Plain PUT URL</Pill>
        </>)}
        {row("File", (Object.keys(FILES) as FileChoice[]).map((f) => (
          <Pill key={f} active={fileChoice === f} onClick={() => pick(setFileChoice)(f)}>{FILES[f].label}</Pill>
        )))}
        {row("Key sent", <>
          <Pill active={target === "own"} onClick={() => pick(setTarget)("own")}>Own prefix</Pill>
          <Pill active={target === "other"} onClick={() => pick(setTarget)("other")}>Another user&apos;s</Pill>
        </>)}
        {row("Timing", <>
          <Pill active={timing === "fresh"} onClick={() => pick(setTiming)("fresh")}>Within 5 min</Pill>
          <Pill active={timing === "late"} onClick={() => pick(setTiming)("late")}>After expiry</Pill>
        </>)}
        {row("Client", <>
          <Pill active={completes} onClick={() => pick(setCompletes)(true)}>Calls complete</Pill>
          <Pill active={!completes} onClick={() => pick(setCompletes)(false)}>Closes the tab</Pill>
        </>)}
      </div>

      <ol className="mt-4 space-y-2">
        {steps.slice(0, current + 1).map((s, i) => (
          <li
            key={i}
            className={`rounded-lg border p-3 text-sm ${
              s.tone === "good" ? "border-good bg-good-soft" : s.tone === "bad" ? "border-bad bg-bad-soft" : s.tone === "warn" ? "border-warn bg-warn-soft" : "border-border bg-surface-2"
            }`}
          >
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
              {s.from === s.to ? s.from : `${s.from} → ${s.to}`} · {s.title}
            </p>
            <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-[0.78rem] leading-6">{s.lines.join("\n")}</pre>
          </li>
        ))}
      </ol>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => setStep(0)} className="min-h-10 rounded-lg border border-border px-4 text-sm">Restart</button>
        <button
          type="button"
          onClick={() => setStep(current + 1)}
          disabled={current >= steps.length - 1}
          className="min-h-10 flex-1 rounded-lg bg-accent px-4 text-sm font-medium text-white disabled:opacity-40 dark:text-bg"
        >
          {current >= steps.length - 1 ? "Done" : `Next step (${current + 1}/${steps.length})`}
        </button>
      </div>
    </Widget>
  );
}

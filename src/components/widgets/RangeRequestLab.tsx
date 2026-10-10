"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

const SIZE = 415_032; // bytes in holiday.png
const PNG_MAGIC = "89 50 4E 47 0D 0A 1A 0A";

const PRESETS: { label: string; range: string | null; why: string }[] = [
  { label: "No Range", range: null, why: "A normal download of the whole object." },
  { label: "First 8 bytes", range: "bytes=0-7", why: "Read the magic number to check the real file type without downloading it." },
  { label: "First 100 bytes", range: "bytes=0-99", why: "Ranges are inclusive: 0-99 is exactly 100 bytes." },
  { label: "Resume from 400,000", range: "bytes=400000-", why: "A download died at byte 400,000; ask only for the rest." },
  { label: "Last 500 bytes", range: "bytes=-500", why: "A suffix range: the final 500 bytes, handy for trailers and indexes at the end of a file." },
  { label: "Past the end", range: "bytes=500000-600000", why: "The start is beyond the object's size, so nothing can be returned." },
];

type Result = { status: string; headers: string[]; body: string; tone: "good" | "bad" };

/** How an object store answers a GET with an optional single byte range. */
export function answerRange(range: string | null, size: number): Result {
  if (!range) {
    return { status: "200 OK", headers: [`Content-Length: ${size}`, "Accept-Ranges: bytes"], body: `(all ${size.toLocaleString("en-US")} bytes)`, tone: "good" };
  }
  const m = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!m || (m[1] === "" && m[2] === "")) return { status: "416 Range Not Satisfiable", headers: [`Content-Range: bytes */${size}`], body: "(malformed range)", tone: "bad" };
  let start: number;
  let end: number;
  if (m[1] === "") {
    start = Math.max(0, size - Number(m[2]));
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  if (start >= size || start > end) {
    return { status: "416 Range Not Satisfiable", headers: [`Content-Range: bytes */${size}`], body: "(no bytes)", tone: "bad" };
  }
  const len = end - start + 1;
  const body = start === 0 && len === 8 ? `${PNG_MAGIC}   ← ".PNG...." signature` : `(${len.toLocaleString("en-US")} bytes)`;
  return { status: "206 Partial Content", headers: [`Content-Range: bytes ${start}-${end}/${size}`, `Content-Length: ${len}`], body, tone: "good" };
}

export function RangeRequestLab() {
  const [idx, setIdx] = useState(1);
  const preset = PRESETS[idx];
  const res = answerRange(preset.range, SIZE);

  return (
    <Widget title="Range request lab" hint={`holiday.png is ${SIZE.toLocaleString("en-US")} bytes. Pick a Range header and read the response.`}>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p, i) => <Pill key={p.label} active={idx === i} onClick={() => setIdx(i)}>{p.label}</Pill>)}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Request</p>
          <pre className="whitespace-pre-wrap break-all font-mono text-[0.78rem] leading-6">
            {["GET /t_81/u_42/9f3c2a.png HTTP/1.1", "Host: notes-uploads.s3.amazonaws.com", ...(preset.range ? [`Range: ${preset.range}`] : [])].join("\n")}
          </pre>
        </div>
        <div className={`rounded-lg border p-3 ${res.tone === "good" ? "border-good bg-good-soft" : "border-bad bg-bad-soft"}`}>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Response</p>
          <pre className="whitespace-pre-wrap break-all font-mono text-[0.78rem] leading-6">
            {[`HTTP/1.1 ${res.status}`, ...res.headers, "", res.body].join("\n")}
          </pre>
        </div>
      </div>
      <p className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-sm">{preset.why}</p>
    </Widget>
  );
}

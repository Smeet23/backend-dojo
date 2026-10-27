"use client";

import { useState, type KeyboardEvent } from "react";
import { Pill, Widget } from "./Widget";

type Verdict = "pass" | "fail" | "defer";
type Turn = { role: "user" | "agent" | "tool"; text: string };
type Trace = { id: string; channel: string; turns: Turn[]; bookings: string[]; truth: "pass" | "fail"; why: string };

const TAGS = ["Claimed action not taken", "Contradicts tool output", "Wrong format for channel"];

const TRACES: Trace[] = [
  {
    id: "tr_4812", channel: "SMS", bookings: ["Sat 2:00 PM tour, unit 3B (new)"], truth: "pass",
    why: "The tool confirmed the slot and the reply says exactly that, briefly, as a text should.",
    turns: [
      { role: "user", text: "can i see a 1 bed this saturday around 2" },
      { role: "tool", text: 'schedule_tour(date="Sat", time="14:00") -> {"status":"confirmed","unit":"3B"}' },
      { role: "agent", text: "You're booked for Saturday at 2 PM to see unit 3B. See you then!" },
    ],
  },
  {
    id: "tr_4813", channel: "Email", bookings: ["Thu 11:00 AM tour (unchanged)"], truth: "fail",
    why: "The agent says the tour moved, but no tool was called and the booking is still Thursday. Only visible with the bookings on screen.",
    turns: [
      { role: "user", text: "Hi, could we move my Thursday tour to Friday morning instead? Thanks, Dana" },
      { role: "agent", text: "Hi Dana, done! Your tour is now Friday at 10 AM. Let us know if anything else comes up." },
    ],
  },
  {
    id: "tr_4814", channel: "Web chat", bookings: [], truth: "fail",
    why: "The tool returned $2,150 and the agent quoted $1,950. Easy to miss when the tool result is buried mid-blob.",
    turns: [
      { role: "user", text: "How much is a 2 bedroom right now?" },
      { role: "tool", text: 'check_apartment_availability(beds=2) -> [{"unit":"5A","rent":2150,"available":"Nov 1"}]' },
      { role: "agent", text: "Our 2-bedroom in unit 5A is $1,950 a month and available November 1." },
    ],
  },
  {
    id: "tr_4815", channel: "SMS", bookings: [], truth: "fail",
    why: "Markdown headings and bullets arrive as literal symbols in a text message. Rendering it as an SMS makes this obvious.",
    turns: [
      { role: "user", text: "what amenities do u have" },
      { role: "agent", text: "## Amenities\n* **Pool** (open 8-10)\n* **Gym** (24/7)\n* **Dog park**" },
    ],
  },
  {
    id: "tr_4816", channel: "Voice", bookings: [], truth: "pass",
    why: "An active leak is an emergency; policy says hand off to a human, which the agent did.",
    turns: [
      { role: "user", text: "There's water coming through my ceiling in 2C, it's getting worse." },
      { role: "tool", text: 'transfer_call(reason="emergency maintenance") -> {"status":"transferred"}' },
      { role: "agent", text: "I'm connecting you to our on-call maintenance team right now." },
    ],
  },
];

type Label = { v: Verdict | null; note: string; tags: string[] };
const empty = (): Label[] => TRACES.map(() => ({ v: null, note: "", tags: [] }));

export function EvReviewInterfaceDemo() {
  const [mode, setMode] = useState<"raw" | "ui">("raw");
  const [labels, setLabels] = useState({ raw: empty(), ui: empty() });
  const [i, setI] = useState(0);
  const cur = labels[mode];
  const set = (k: number, patch: Partial<Label>) =>
    setLabels((p) => ({ ...p, [mode]: p[mode].map((l, j) => (j === k ? { ...l, ...patch } : l)) }));
  const score = (m: "raw" | "ui") => labels[m].filter((l, k) => l.v === TRACES[k].truth).length;
  const done = cur.filter((l) => l.v).length;

  const toggleTag = (t: string) =>
    set(i, { tags: cur[i].tags.includes(t) ? cur[i].tags.filter((x) => x !== t) : [...cur[i].tags, t] });

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (mode !== "ui" || (e.target as HTMLElement).tagName === "TEXTAREA") return;
    const k = e.key.toLowerCase();
    const v = ({ p: "pass", f: "fail", d: "defer" } as const)[k as "p" | "f" | "d"];
    if (v) set(i, { v });
    else if (k === "j") setI((x) => Math.min(TRACES.length - 1, x + 1));
    else if (k === "k") setI((x) => Math.max(0, x - 1));
    else if (["1", "2", "3"].includes(k)) toggleTag(TAGS[Number(k) - 1]);
    else return;
    e.preventDefault();
  };

  return (
    <Widget title="Same traces, two interfaces" hint="Grade all five as raw rows, then switch views and grade again. Compare how many you get right.">
      <div className="flex flex-wrap items-center gap-2">
        <Pill active={mode === "raw"} onClick={() => setMode("raw")}>Spreadsheet rows</Pill>
        <Pill active={mode === "ui"} onClick={() => setMode("ui")}>Review UI</Pill>
        <span className="ml-auto text-xs text-muted">Correct: rows {score("raw")}/5 · UI {score("ui")}/5</span>
      </div>

      {mode === "raw" ? (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-muted">Bookings live in the CRM, a different window. You don&apos;t have it open.</p>
          {TRACES.map((t, k) => (
            <div key={t.id} className="grid gap-2 rounded border border-border p-2 sm:grid-cols-[1fr_auto]">
              <pre className="max-h-20 overflow-auto whitespace-pre-wrap break-all bg-surface-2 p-1 font-mono text-[10px] leading-tight">
                {JSON.stringify({ id: t.id, ch: t.channel, sys: "You are Ava, a leasing assistant for... (2,400 words)", msgs: t.turns })}
              </pre>
              <select
                value={cur[k].v ?? ""}
                onChange={(e) => set(k, { v: (e.target.value || null) as Verdict | null })}
                className="h-9 rounded border border-border bg-surface px-2 text-sm"
                aria-label={`Label for ${t.id}`}
              >
                <option value="">label...</option>
                <option value="pass">pass</option>
                <option value="fail">fail</option>
              </select>
            </div>
          ))}
        </div>
      ) : (
        <div tabIndex={0} onKeyDown={onKey} className="mt-3 rounded-lg outline-none focus:ring-2 focus:ring-accent">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Trace {i + 1} of 5 · {TRACES[i].id} · <span className="rounded bg-accent-soft px-1.5 text-accent">{TRACES[i].channel}</span></span>
            <span>{done} labeled</span>
          </div>
          <div className="mt-1 h-1.5 rounded bg-surface-2"><div className="h-1.5 rounded bg-accent" style={{ width: `${(done / 5) * 100}%` }} /></div>
          <p className="mt-2 text-xs text-muted">Click here, then use keys: p pass, f fail, d defer, j/k next/prev, 1-3 tags.</p>
          <details className="mt-2 text-xs text-muted"><summary className="cursor-pointer">System prompt (collapsed)</summary>You are Ava, a leasing assistant... never invent prices; confirm changes only after a tool succeeds; plain text for SMS.</details>

          <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_11rem]">
            <div className="space-y-2">
              {TRACES[i].turns.map((t, k) =>
                t.role === "tool" ? (
                  <details key={k} className="rounded border border-border px-2 py-1 font-mono text-[11px] text-muted">
                    <summary className="cursor-pointer">tool: {t.text.split("(")[0]}</summary>
                    <span className="break-all">{t.text}</span>
                  </details>
                ) : (
                  <p key={k} className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${t.role === "user" ? "bg-surface-2" : "ml-auto bg-accent-soft"}`}>{t.text}</p>
                ),
              )}
            </div>
            <div className="rounded border border-border p-2 text-xs">
              <p className="font-semibold">Bookings for this caller</p>
              {TRACES[i].bookings.length ? TRACES[i].bookings.map((b) => <p key={b} className="mt-1">{b}</p>) : <p className="mt-1 text-muted">None</p>}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {(["pass", "fail", "defer"] as const).map((v) => (
              <Pill key={v} active={cur[i].v === v} onClick={() => set(i, { v })}>{v} ({v[0]})</Pill>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {TAGS.map((t, k) => (
              <button key={t} type="button" onClick={() => toggleTag(t)} className={`rounded border px-2 py-1 text-xs ${cur[i].tags.includes(t) ? "border-bad bg-bad-soft" : "border-border"}`}>{k + 1} · {t}</button>
            ))}
          </div>
          <textarea value={cur[i].note} onChange={(e) => set(i, { note: e.target.value })} placeholder="Open code: what went wrong?" rows={2} className="mt-2 w-full rounded border border-border bg-surface p-2 text-sm" />
          {cur[i].v && cur[i].v !== "defer" && (
            <p className={`mt-2 rounded p-2 text-sm ${cur[i].v === TRACES[i].truth ? "bg-good-soft" : "bg-bad-soft"}`}>
              Reference: <b>{TRACES[i].truth}</b>. {TRACES[i].why}
            </p>
          )}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button type="button" disabled={i === 0} onClick={() => setI(i - 1)} className="min-h-10 rounded-lg border border-border text-sm disabled:opacity-40">Previous (k)</button>
            <button type="button" disabled={i === 4} onClick={() => setI(i + 1)} className="min-h-10 rounded-lg border border-border text-sm disabled:opacity-40">Next (j)</button>
          </div>
        </div>
      )}
    </Widget>
  );
}

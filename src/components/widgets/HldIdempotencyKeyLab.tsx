"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Mode = "none" | "check" | "atomic";
type Scenario = "retry" | "concurrent" | "mismatch" | "expired";
type Tone = "good" | "warn" | "bad" | "neutral";
type Line = { who: string; text: string; tone: Tone };
type Result = { lines: Line[]; charges: number; expected: number; verdict: string; ok: boolean };

const MODES: { id: Mode; label: string }[] = [
  { id: "none", label: "No key" },
  { id: "check", label: "Key: check, then insert" },
  { id: "atomic", label: "Key: atomic claim + hash + TTL 24h" },
];

const SCENARIOS: { id: Scenario; label: string; story: string }[] = [
  { id: "retry", label: "Lost response, retry", story: "Request A succeeds but the response is lost. 3 s later the client retries with the same key." },
  { id: "concurrent", label: "Double-click", story: "Two identical requests with the same key arrive within a millisecond of each other." },
  { id: "mismatch", label: "Same key, new amount", story: "A buggy client reuses key K for a second, different payment of ₹5,000." },
  { id: "expired", label: "Retry after 2 days", story: "An app reopened two days later retries the original payment with key K." },
];

const L = (who: string, text: string, tone: Tone = "neutral"): Line => ({ who, text, tone });

function run(mode: Mode, sc: Scenario): Result {
  const lines: Line[] = [];
  let charges = 0;
  const charge = (who: string, amt = "₹2,000") => {
    charges += 1;
    lines.push(L(who, `charge card ${amt} → ch_${90 + charges}`, charges > 1 && sc !== "mismatch" && sc !== "expired" ? "bad" : "neutral"));
  };

  if (mode === "none") {
    if (sc === "concurrent") {
      lines.push(L("A", "POST /payments (no key)"), L("B", "POST /payments (no key)"));
      charge("A");
      charge("B");
    } else {
      lines.push(L("A", "POST /payments (no key)"));
      charge("A");
      lines.push(L("A", "201 Created, response lost", "warn"));
      lines.push(L("B", sc === "mismatch" ? "POST /payments ₹5,000 (no key)" : "POST /payments retry (no key)"));
      charge("B", sc === "mismatch" ? "₹5,000" : "₹2,000");
    }
    lines.push(L("server", "can't tell a retry from a new payment", "warn"));
  } else if (sc === "concurrent") {
    lines.push(L("A", "POST, key K"), L("B", "POST, key K"));
    if (mode === "check") {
      lines.push(L("A", "SELECT K → not found"), L("B", "SELECT K → not found", "warn"));
      charge("A");
      charge("B");
      lines.push(L("A", "INSERT K completed"), L("B", "INSERT K → unique violation, but the card was already charged", "bad"));
    } else {
      lines.push(L("A", "INSERT K in_progress → ok, A owns K", "good"), L("B", "INSERT K → conflict, status in_progress", "warn"));
      lines.push(L("B", "409 Conflict: request in progress, retry shortly", "warn"));
      charge("A");
      lines.push(L("A", "TX: payment p_77 + K completed → 201", "good"));
      lines.push(L("B", "retry → K completed → replay 201 p_77", "good"));
    }
  } else {
    lines.push(L("A", "POST ₹2,000, key K"));
    lines.push(L("A", mode === "check" ? "SELECT K → not found" : "INSERT K in_progress → ok", "neutral"));
    charge("A");
    lines.push(L("A", "TX: payment p_77 + K completed → 201, response lost", "warn"));
    if (sc === "retry") {
      lines.push(L("B", "POST ₹2,000, key K (3 s later)"));
      lines.push(L("B", "K completed → replay stored 201 { id: p_77 }", "good"));
    } else if (sc === "mismatch") {
      lines.push(L("B", "POST ₹5,000, key K"));
      if (mode === "check") lines.push(L("B", "K found → replay 201 p_77 for a ₹5,000 request (wrong payment returned)", "bad"));
      else lines.push(L("B", "request hash differs → 422 key reused with a different body", "good"));
    } else {
      lines.push(L("B", "POST ₹2,000, key K (48 h later)"));
      lines.push(L("B", "K deleted by TTL (24 h) → treated as new", "bad"));
      charge("B");
    }
  }

  const expected = sc === "mismatch" && mode === "none" ? 2 : 1;
  let ok = charges === expected;
  let verdict = ok ? "Customer charged exactly once." : `Customer charged ${charges} times.`;
  if (sc === "mismatch") {
    if (mode === "none") verdict = "Two charges, but the second really was a new payment; without keys you can't tell either way.";
    if (mode === "check") { ok = false; verdict = "No double charge, but the client was told a ₹5,000 payment succeeded when it never ran."; }
    if (mode === "atomic") verdict = "Key misuse caught and rejected loudly with 422.";
  }
  if (sc === "expired" && mode !== "none") verdict = "Double charge: the TTL was shorter than the client's retry window. Size the TTL to the longest realistic retry.";
  return { lines, charges, expected, verdict, ok };
}

const toneClass: Record<Tone, string> = { good: "bg-good-soft", warn: "bg-warn-soft", bad: "bg-bad-soft", neutral: "bg-surface-2" };

export function HldIdempotencyKeyLab() {
  const [mode, setMode] = useState<Mode>("atomic");
  const [sc, setSc] = useState<Scenario>("retry");
  const r = run(mode, sc);

  return (
    <Widget title="Idempotency key server" hint="Pick how the server handles keys, then a duplicate scenario. Watch the card charges.">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Server</p>
      <div className="mt-1 flex flex-wrap gap-2">
        {MODES.map((m) => (
          <Pill key={m.id} active={mode === m.id} onClick={() => setMode(m.id)}>{m.label}</Pill>
        ))}
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted">Scenario</p>
      <div className="mt-1 flex flex-wrap gap-2">
        {SCENARIOS.map((s) => (
          <Pill key={s.id} active={sc === s.id} onClick={() => setSc(s.id)}>{s.label}</Pill>
        ))}
      </div>
      <p className="mt-2 text-sm text-muted">{SCENARIOS.find((s) => s.id === sc)?.story}</p>

      <ol className="mt-3 space-y-1">
        {r.lines.map((l, i) => (
          <li key={i} className={`flex gap-2 rounded px-2 py-1 text-[0.75rem] ${toneClass[l.tone]}`}>
            <span className="w-12 shrink-0 font-mono font-semibold">{l.who}</span>
            <span className="min-w-0 break-words font-mono">{l.text}</span>
          </li>
        ))}
      </ol>

      <div className={`mt-3 rounded-lg p-3 text-sm ${r.ok ? "bg-good-soft" : "bg-bad-soft"}`}>
        <p className="font-semibold">Card charges: {r.charges}</p>
        <p>{r.verdict}</p>
      </div>
    </Widget>
  );
}

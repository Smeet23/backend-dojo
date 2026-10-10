"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const SAMPLE_IDS = [1, 61, 62, 3843, 125_000, 56_800_235_583, 3_521_614_606_207];
const LENGTHS = [5, 6, 7, 8];
const PER_DAY = 100_000_000;

type Step = { n: number; q: number; r: number };

function encodeSteps(id: number): { code: string; steps: Step[] } {
  if (id === 0) return { code: "0", steps: [] };
  const steps: Step[] = [];
  let n = id;
  let code = "";
  while (n > 0) {
    const q = Math.floor(n / 62);
    const r = n % 62;
    steps.push({ n, q, r });
    code = ALPHABET[r] + code;
    n = q;
  }
  return { code, steps };
}

/** Bijective scramble on [0, 62^7): multiply by a constant coprime to 62, mod 62^7. */
function scramble(id: number): number {
  const space = BigInt(62) ** BigInt(7);
  const mult = BigInt(2_654_435_761);
  return Number((BigInt(id) * mult) % space);
}

function pad7(code: string): string {
  return code.padStart(7, "0");
}

function human(n: number): string {
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)} trillion`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} billion`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} million`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)} thousand`;
  return n.toFixed(0);
}

export function HldBase62Lab() {
  const [id, setId] = useState(125_000);
  const [scrambled, setScrambled] = useState(false);
  const [len, setLen] = useState(7);

  const { code, steps } = encodeSteps(id);
  const seq = [1000, 1001, 1002, 1003, 1004];
  const space = 62 ** len;
  const years = space / PER_DAY / 365;
  const birthday = 1.1774 * Math.sqrt(space);

  return (
    <Widget title="Base62 short codes" hint="Encode a counter value, see why sequential codes leak, and check how far a code length gets you.">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">1 · Encode an id</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {SAMPLE_IDS.map((s) => (
          <Pill key={s} active={id === s} onClick={() => setId(s)}>
            {s.toLocaleString("en-US")}
          </Pill>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={() => setId((x) => x + 1)} className="min-h-10 rounded-lg border border-border px-3 text-sm hover:bg-surface-2">
          id + 1
        </button>
        <button type="button" onClick={() => setId((x) => Math.max(1, x - 1))} className="min-h-10 rounded-lg border border-border px-3 text-sm hover:bg-surface-2">
          id − 1
        </button>
      </div>
      <pre className="mt-3 overflow-x-auto rounded-lg bg-surface-2 p-3 font-mono text-[0.72rem] leading-relaxed">
        {steps.map((s) => `${s.n.toLocaleString("en-US")} ÷ 62 = ${s.q.toLocaleString("en-US")} remainder ${s.r} → '${ALPHABET[s.r]}'`).join("\n")}
        {"\n"}Read remainders bottom-up → {code}
      </pre>
      <p className="mt-2 text-sm">
        id <span className="font-mono">{id.toLocaleString("en-US")}</span> → short code{" "}
        <span className="rounded bg-accent-soft px-1.5 py-0.5 font-mono font-semibold text-accent">{code}</span>{" "}
        <span className="text-muted">({code.length} chars)</span>
      </p>

      <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted">2 · Sequential vs scrambled</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Pill active={!scrambled} onClick={() => setScrambled(false)}>Plain counter</Pill>
        <Pill active={scrambled} onClick={() => setScrambled(true)}>Scrambled (bijective)</Pill>
      </div>
      <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
        {seq.map((n) => {
          const c = scrambled ? pad7(encodeSteps(scramble(n)).code) : encodeSteps(n).code;
          return (
            <li key={n} className="min-w-0 rounded bg-surface-2 px-2 py-1 font-mono text-[0.75rem] break-all">
              id {n} → sho.rt/{c}
            </li>
          );
        })}
      </ul>
      <p className={`mt-2 rounded-lg p-2 text-sm ${scrambled ? "bg-good-soft" : "bg-warn-soft"}`}>
        {scrambled
          ? "Multiplying by a constant coprime to 62, mod 62^7, is a one-to-one mapping: still collision-free, but neighbours no longer look alike, so nobody can walk your links by incrementing a code."
          : "Consecutive ids give consecutive codes. Anyone can guess the next link and count how many you create per day."}
      </p>

      <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted">3 · How long should the code be</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {LENGTHS.map((l) => (
          <Pill key={l} active={len === l} onClick={() => setLen(l)}>
            {l} chars
          </Pill>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
        <div className="min-w-0 rounded-lg bg-surface-2 p-2">
          <p className="text-xs text-muted">Keyspace 62^{len}</p>
          <p className="font-mono break-words">{human(space)}</p>
        </div>
        <div className={`min-w-0 rounded-lg p-2 ${years >= 10 ? "bg-good-soft" : "bg-bad-soft"}`}>
          <p className="text-xs text-muted">Lasts at 100M new URLs/day</p>
          <p className="font-mono">{years < 1 ? `${Math.round(years * 365)} days` : `${years.toFixed(1)} years`}</p>
        </div>
        <div className="min-w-0 rounded-lg bg-warn-soft p-2">
          <p className="text-xs text-muted">Random codes: 50% chance of a collision after</p>
          <p className="font-mono break-words">{human(birthday)} URLs</p>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted">
        The last box is the birthday bound, about 1.18 × √keyspace. Hash-and-truncate codes collide far sooner than the keyspace suggests, which is why that approach must check the database and retry.
      </p>
    </Widget>
  );
}

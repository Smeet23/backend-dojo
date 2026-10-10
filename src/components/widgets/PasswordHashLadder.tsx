"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

/** Toy, deterministic hash for display only (FNV-1a, 64 hex-ish chars). Not real cryptography. */
function toyHash(input: string): string {
  let out = "";
  let h = 0x811c9dc5;
  for (let round = 0; round < 4; round++) {
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i) + round;
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    out += h.toString(16).padStart(8, "0");
  }
  return out;
}

const USERS = [
  { email: "alice@shop.dev", password: "123456", salt: "q8Zr2LwX" },
  { email: "bob@shop.dev", password: "123456", salt: "Hn4vT0aE" },
  { email: "carol@shop.dev", password: "plum-orbit-candle-91", salt: "c3Yp7KsM" },
];

type Stage = 0 | 1 | 2 | 3;

const STAGES: { label: string; column: string; verdict: string; tone: "bad" | "warn" | "good" }[] = [
  {
    label: "Plain text",
    column: "password",
    verdict: "A leaked table is a list of working passwords. Reused ones unlock users' other accounts too.",
    tone: "bad",
  },
  {
    label: "Fast hash",
    column: "sha256(password)",
    verdict: "Alice and Bob have identical hashes, and 123456 is in every precomputed rainbow table. Both cracked instantly.",
    tone: "bad",
  },
  {
    label: "Salt + fast hash",
    column: "salt, sha256(salt + password)",
    verdict: "Every hash is unique, so rainbow tables miss. But a GPU still tries billions of guesses per second per user: 123456 falls immediately, and most short passwords within days.",
    tone: "warn",
  },
  {
    label: "Salt + slow hash",
    column: "argon2id(password) (salt and cost embedded)",
    verdict: "Each guess now costs ~250 ms of compute and lots of memory. The attacker gets a few guesses per second instead of billions. Only the very weakest passwords are at risk, and strong ones are out of reach.",
    tone: "good",
  },
];

function stored(stage: Stage, u: (typeof USERS)[number]): string {
  switch (stage) {
    case 0:
      return u.password;
    case 1:
      return toyHash(u.password);
    case 2:
      return `${u.salt} | ${toyHash(u.salt + u.password)}`;
    case 3:
      return `$argon2id$v=19$m=65536,t=3,p=1$${u.salt}$${toyHash("argon" + u.salt + u.password).slice(0, 22)}`;
  }
}

const GUESS_RATE = ["instant", "~10,000,000,000 / s", "~10,000,000,000 / s per user", "~4 / s per core"];

export function PasswordHashLadder() {
  const [stage, setStage] = useState<Stage>(0);
  const s = STAGES[stage];
  const rows = USERS.map((u) => stored(stage, u));
  const duplicate = rows[0] === rows[1];

  return (
    <Widget title="Password storage ladder" hint="Your users table has just leaked. Climb the ladder and see what the attacker gets at each step.">
      <div className="flex flex-wrap gap-2">
        {STAGES.map((st, i) => (
          <Pill key={st.label} active={stage === i} onClick={() => setStage(i as Stage)}>
            {i + 1}. {st.label}
          </Pill>
        ))}
      </div>

      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">Stored column: {s.column}</p>
      <ul className="mt-2 space-y-2">
        {USERS.map((u, i) => (
          <li
            key={u.email}
            className={`rounded-lg border p-2.5 ${duplicate && i < 2 ? "border-bad" : "border-border"} bg-surface-2`}
          >
            <p className="text-xs text-muted">{u.email}</p>
            <p className="mt-0.5 whitespace-pre-wrap break-all font-mono text-[0.75rem]">{rows[i]}</p>
          </li>
        ))}
      </ul>
      {duplicate && stage > 0 && <p className="mt-2 text-xs text-bad">Same input, same hash: identical rows give away shared passwords.</p>}

      <div className={`mt-3 rounded-lg px-3 py-2 text-sm ${s.tone === "bad" ? "bg-bad-soft" : s.tone === "warn" ? "bg-warn-soft" : "bg-good-soft"}`}>
        <p><span className="font-semibold">Attacker guess rate:</span> {GUESS_RATE[stage]}</p>
        <p className="mt-1">{s.verdict}</p>
      </div>
      <p className="mt-2 text-xs text-muted">Hash strings are illustrative, not real SHA-256 or Argon2 output.</p>
    </Widget>
  );
}

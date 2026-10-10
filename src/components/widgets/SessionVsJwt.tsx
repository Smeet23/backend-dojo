"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Strategy = "session" | "jwt" | "hybrid";

const LABEL: Record<Strategy, string> = {
  session: "Session ID + Redis",
  jwt: "Stateless JWT (15 min)",
  hybrid: "JWT + denylist",
};

const FACTS: Record<Strategy, { lookup: string; revoke: string; scale: string }> = {
  session: {
    lookup: "Yes: one Redis read per request",
    revoke: "Instant: delete the session row",
    scale: "Every server needs the shared session store",
  },
  jwt: {
    lookup: "None: verify signature with the key",
    revoke: "Not possible until exp (or rotate the key, logging everyone out)",
    scale: "Any server with the key can verify",
  },
  hybrid: {
    lookup: "Yes: one denylist read per request",
    revoke: "Instant: add the token id to the denylist",
    scale: "Back to needing a shared store",
  },
};

/** Attacker replays a stolen credential at these minutes; the user reports the theft at minute 5. */
const ATTEMPTS = [2, 6, 12, 16];
const REVOKED_AT = 5;
const TTL = 15;

export function outcome(strategy: Strategy, minute: number, revoked: boolean): "200" | "401" {
  const afterRevoke = revoked && minute >= REVOKED_AT;
  if (strategy === "session") return afterRevoke ? "401" : "200";
  if (strategy === "hybrid") return afterRevoke || minute >= TTL ? "401" : "200";
  return minute >= TTL ? "401" : "200";
}

export function SessionVsJwt() {
  const [strategy, setStrategy] = useState<Strategy>("session");
  const [revoked, setRevoked] = useState(true);
  const f = FACTS[strategy];

  return (
    <Widget
      title="Stolen credential drill"
      hint="An attacker copies Asha's credential at minute 0. She reports it at minute 5 and support hits Log out everywhere. What does each design let through?"
    >
      <div className="flex flex-wrap gap-2">
        {(Object.keys(LABEL) as Strategy[]).map((s) => (
          <Pill key={s} active={strategy === s} onClick={() => setStrategy(s)}>{LABEL[s]}</Pill>
        ))}
      </div>
      <label className="mt-3 flex min-h-10 items-center gap-2 text-sm">
        <input type="checkbox" checked={revoked} onChange={(e) => setRevoked(e.target.checked)} className="h-4 w-4" />
        Support revokes access at minute {REVOKED_AT}
      </label>

      <ol className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {ATTEMPTS.map((m) => {
          const r = outcome(strategy, m, revoked);
          return (
            <li key={m} className={`rounded-lg border p-3 text-sm ${r === "200" ? "border-bad bg-bad-soft" : "border-good bg-good-soft"}`}>
              <p className="text-xs text-muted">Attacker, minute {m}</p>
              <p className="font-mono font-semibold">{r === "200" ? "200 OK" : "401"}</p>
              <p className="text-xs">{r === "200" ? "Got in" : "Blocked"}</p>
            </li>
          );
        })}
      </ol>

      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
        <div className="rounded-lg bg-surface-2 p-3"><dt className="text-xs font-semibold uppercase text-muted">Lookup per request</dt><dd>{f.lookup}</dd></div>
        <div className="rounded-lg bg-surface-2 p-3"><dt className="text-xs font-semibold uppercase text-muted">Revocation</dt><dd>{f.revoke}</dd></div>
        <div className="rounded-lg bg-surface-2 p-3"><dt className="text-xs font-semibold uppercase text-muted">Scaling</dt><dd>{f.scale}</dd></div>
      </dl>
      {strategy === "hybrid" && (
        <p className="mt-3 rounded-lg bg-warn-soft px-3 py-2 text-sm">
          Revocation works again, but every request now hits a store, which was the cost JWTs were meant to avoid. Short-lived access tokens plus revocable refresh tokens are the usual middle ground.
        </p>
      )}
    </Widget>
  );
}

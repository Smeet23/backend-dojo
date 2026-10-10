"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Store = "memory" | "sticky" | "shared";
type Tone = "good" | "bad" | "warn" | "neutral";
type Line = { text: string; tone: Tone };

const SERVERS = ["web-1", "web-2", "web-3"];

const STORE_LABEL: Record<Store, string> = {
  memory: "Session in server memory",
  sticky: "Sticky sessions",
  shared: "Shared session store",
};

type State = {
  rr: number;
  up: boolean[];
  mem: boolean[]; // which server holds the session in memory
  pinned: number | null; // sticky cookie target
  shared: boolean; // session present in the shared store
  served: number[]; // requests served per server
  log: Line[];
};

const fresh = (): State => ({ rr: 0, up: [true, true, true], mem: [false, false, false], pinned: null, shared: false, served: [0, 0, 0], log: [] });

/** Round robin over healthy servers. */
function nextUp(s: State): { idx: number; rr: number } | null {
  for (let k = 0; k < SERVERS.length; k++) {
    const idx = (s.rr + k) % SERVERS.length;
    if (s.up[idx]) return { idx, rr: idx + 1 };
  }
  return null;
}

function route(s: State, store: Store): { idx: number; rr: number; why: string } | null {
  if (store === "sticky" && s.pinned !== null && s.up[s.pinned]) {
    return { idx: s.pinned, rr: s.rr, why: "cookie pins you to it" };
  }
  const n = nextUp(s);
  if (!n) return null;
  return { ...n, why: store === "sticky" && s.pinned !== null ? "your pinned server is down, so round robin" : "round robin" };
}

function act(s: State, store: Store, kind: "login" | "request"): State {
  const r = route(s, store);
  if (!r) return { ...s, log: [{ text: "Every server is down. 503.", tone: "bad" as Tone }, ...s.log].slice(0, 10) };
  const name = SERVERS[r.idx];
  const served = s.served.map((v, i) => (i === r.idx ? v + 1 : v));
  const base = { ...s, rr: r.rr, served };
  if (kind === "login") {
    if (store === "shared") {
      return { ...base, shared: true, log: [{ text: `POST /login -> ${name} (${r.why}). Session written to Redis; cookie holds only the session id.`, tone: "good" as Tone }, ...s.log].slice(0, 10) };
    }
    const mem = s.mem.map((v, i) => v || i === r.idx);
    return {
      ...base,
      mem,
      pinned: store === "sticky" ? r.idx : s.pinned,
      log: [{ text: `POST /login -> ${name} (${r.why}). Session stored in ${name}'s memory${store === "sticky" ? `; LB sets a cookie pinning you to ${name}` : ""}.`, tone: "good" as Tone }, ...s.log].slice(0, 10),
    };
  }
  const ok = store === "shared" ? s.shared : s.mem[r.idx];
  const text = ok
    ? `GET /cart -> ${name} (${r.why}). Session found: logged in.`
    : `GET /cart -> ${name} (${r.why}). No session here: redirected to login.`;
  return { ...base, log: [{ text, tone: (ok ? "good" : "bad") as Tone }, ...s.log].slice(0, 10) };
}

function toggleServer(s: State, i: number): State {
  const up = s.up.map((v, k) => (k === i ? !v : v));
  const goingDown = s.up[i];
  const mem = goingDown ? s.mem.map((v, k) => (k === i ? false : v)) : s.mem;
  const text = goingDown
    ? `${SERVERS[i]} crashed (or was replaced by a deploy). Anything in its memory is gone.`
    : `${SERVERS[i]} is back, with empty memory.`;
  return { ...s, up, mem, log: [{ text, tone: (goingDown ? "warn" : "neutral") as Tone }, ...s.log].slice(0, 10) };
}

const TONE: Record<Tone, string> = { good: "bg-good-soft", bad: "bg-bad-soft", warn: "bg-warn-soft", neutral: "bg-surface-2" };

export function HldStatelessSessions() {
  const [store, setStore] = useState<Store>("memory");
  const [s, setS] = useState<State>(fresh);

  function pick(st: Store) {
    setStore(st);
    setS(fresh());
  }

  return (
    <Widget
      title="Where does the session live?"
      hint="Three web servers behind a round-robin load balancer. Log in, make a few requests, then crash a server. Compare the three ways of keeping session state."
    >
      <div className="flex flex-wrap gap-2">
        {(Object.keys(STORE_LABEL) as Store[]).map((k) => (
          <Pill key={k} active={store === k} onClick={() => pick(k)}>
            {STORE_LABEL[k]}
          </Pill>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {SERVERS.map((name, i) => (
          <button
            key={name}
            type="button"
            onClick={() => setS((p) => toggleServer(p, i))}
            className={`min-h-10 min-w-0 rounded-lg border p-2 text-left text-sm ${s.up[i] ? "border-border bg-surface" : "border-bad bg-bad-soft"}`}
          >
            <p className="font-mono font-semibold">
              {name} {s.up[i] ? "" : "(down)"}
            </p>
            <p className="text-xs text-muted">
              {store === "shared" ? "stateless" : s.mem[i] ? "holds your session" : "no session"} · served {s.served[i]}
              {store === "sticky" && s.pinned === i ? " · pinned" : ""}
            </p>
            <p className="mt-1 text-xs text-accent">Tap to {s.up[i] ? "crash" : "restart"}</p>
          </button>
        ))}
      </div>
      {store === "shared" && (
        <p className={`mt-2 rounded-lg p-2 text-xs ${s.shared ? "bg-good-soft" : "bg-surface-2"}`}>
          Redis (replicated): {s.shared ? "session:abc123 = {user: 7, cart: 2 items}" : "empty"}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => setS((p) => act(p, store, "login"))} className="min-h-10 flex-1 rounded-lg bg-accent px-3 text-sm font-medium text-white dark:text-bg">
          Log in
        </button>
        <button type="button" onClick={() => setS((p) => act(p, store, "request"))} className="min-h-10 flex-1 rounded-lg border border-accent px-3 text-sm font-medium text-accent">
          Load my cart
        </button>
        <button type="button" onClick={() => setS(fresh())} className="min-h-10 rounded-lg border border-border px-3 text-sm">
          Reset
        </button>
      </div>

      <ol className="mt-3 space-y-1">
        {s.log.map((l, i) => (
          <li key={`${s.log.length}-${i}`} className={`rounded px-2 py-1 font-mono text-[0.72rem] break-words ${TONE[l.tone]}`}>
            {l.text}
          </li>
        ))}
      </ol>
    </Widget>
  );
}

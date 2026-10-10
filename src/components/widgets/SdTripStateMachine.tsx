"use client";

import { useState } from "react";
import { Widget } from "./Widget";

type State = "REQUESTED" | "MATCHING" | "OFFERED" | "ACCEPTED" | "ARRIVED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "NO_DRIVERS";
type Event = "dispatch" | "offer_driver" | "driver_accepts" | "offer_times_out" | "driver_arrives" | "start_trip" | "end_trip" | "rider_cancels" | "search_exhausted";

const STATES: State[] = ["REQUESTED", "MATCHING", "OFFERED", "ACCEPTED", "ARRIVED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_DRIVERS"];
const TERMINAL = new Set<State>(["COMPLETED", "CANCELLED", "NO_DRIVERS"]);

/** Allowed transitions, with the side effects the trip service fires on each one. */
const TRANSITIONS: Record<Event, { from: State[]; to: State; effect: string }> = {
  dispatch: { from: ["REQUESTED"], to: "MATCHING", effect: "Rider's cell looked up; request joins the next 2-second matching batch." },
  offer_driver: { from: ["MATCHING"], to: "OFFERED", effect: "SET driver:101:lock trip:77 NX EX 15 → OK. Push offer to driver 101." },
  offer_times_out: { from: ["OFFERED"], to: "MATCHING", effect: "Lock expires on its own; driver 101 is free again. Re-batch the rider." },
  driver_accepts: { from: ["OFFERED"], to: "ACCEPTED", effect: "Driver status = on_trip. Push \"driver is on the way\" + ETA to rider." },
  driver_arrives: { from: ["ACCEPTED"], to: "ARRIVED", effect: "Notify rider. Start the waiting-time clock." },
  start_trip: { from: ["ARRIVED"], to: "IN_PROGRESS", effect: "Begin recording the route from the location stream." },
  end_trip: { from: ["IN_PROGRESS"], to: "COMPLETED", effect: "Compute fare, charge the card (idempotency key = trip:77), driver back to available." },
  rider_cancels: { from: ["REQUESTED", "MATCHING", "OFFERED", "ACCEPTED", "ARRIVED"], to: "CANCELLED", effect: "Release any driver lock. Cancellation fee only if the driver had already accepted." },
  search_exhausted: { from: ["MATCHING"], to: "NO_DRIVERS", effect: "k-ring hit its limit with no free driver. Tell the rider to try again." },
};
const EVENTS = Object.keys(TRANSITIONS) as Event[];

type Log = { text: string; ok: boolean };

export function SdTripStateMachine() {
  const [state, setState] = useState<State>("REQUESTED");
  const [version, setVersion] = useState(1);
  const [log, setLog] = useState<Log[]>([]);

  function fire(e: Event) {
    const t = TRANSITIONS[e];
    if (!t.from.includes(state)) {
      setLog((l) => [{ text: `${e} rejected: not allowed from ${state}. Nothing changes.`, ok: false }, ...l].slice(0, 6));
      return;
    }
    // A real service makes this a conditional write: UPDATE … WHERE state = $from AND version = $v.
    setLog((l) => [{ text: `v${version} ${state} → ${t.to}: ${t.effect}`, ok: true }, ...l].slice(0, 6));
    setState(t.to);
    setVersion((v) => v + 1);
  }

  function reset() {
    setState("REQUESTED");
    setVersion(1);
    setLog([]);
  }

  return (
    <Widget title="Trip lifecycle" hint="Fire events at trip 77. Only legal transitions change the state. Try ending a trip that hasn't started, or accepting twice.">
      <div className="flex flex-wrap gap-1.5">
        {STATES.map((s) => (
          <span
            key={s}
            className={`rounded-full border px-2 py-1 font-mono text-[0.68rem] ${
              s === state ? "border-accent bg-accent text-white dark:text-bg" : "border-border text-muted"
            }`}
          >
            {s}
          </span>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {EVENTS.map((e) => {
          const legal = TRANSITIONS[e].from.includes(state);
          return (
            <button
              key={e}
              type="button"
              onClick={() => fire(e)}
              className={`min-h-10 min-w-0 rounded-lg border px-2 font-mono text-xs break-all ${legal ? "border-accent bg-accent-soft" : "border-border text-muted"}`}
            >
              {e}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" onClick={reset} className="min-h-10 rounded-lg border border-border px-3 text-sm">Reset</button>
        <span className="text-xs text-muted">Highlighted buttons are legal from the current state.</span>
      </div>

      {TERMINAL.has(state) && <p className="mt-2 rounded-lg bg-surface-2 p-2 text-sm">{state} is terminal. No event can move the trip again.</p>}

      <ol className="mt-3 space-y-1">
        {log.map((l, i) => (
          <li key={`${version}-${i}`} className={`rounded px-2 py-1 font-mono text-[0.72rem] break-words ${l.ok ? "bg-good-soft" : "bg-bad-soft"}`}>
            {l.text}
          </li>
        ))}
      </ol>
    </Widget>
  );
}

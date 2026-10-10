"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Broker = "none" | "pubsub" | "streams";
type Client = { name: string; instance: number };

const CLIENTS: Client[] = [
  { name: "Ana", instance: 1 },
  { name: "Ben", instance: 2 },
  { name: "Dev", instance: 2 },
  { name: "Chen", instance: 3 },
];

const BROKERS: Record<Broker, string> = {
  none: "No broker",
  pubsub: "Redis Pub/Sub",
  streams: "Redis Streams",
};

type State = {
  seq: number;
  seen: Record<string, number[]>;
  instance3Up: boolean;
  backlog: number[]; // stored for instance 3 while it's down (Streams only)
  log: string[];
};

const fresh = (): State => ({ seq: 0, seen: Object.fromEntries(CLIENTS.map((c) => [c.name, []])), instance3Up: true, backlog: [], log: [] });

/** Ana (instance 1) moves a task: who receives event `seq`? */
export function publish(s: State, broker: Broker): State {
  const seq = s.seq + 1;
  const seen = { ...s.seen };
  const got: string[] = [];
  let backlog = s.backlog;
  let lost = "";
  for (const c of CLIENTS) {
    const reachable = broker === "none" ? c.instance === 1 : c.instance !== 3 || s.instance3Up;
    if (reachable) {
      seen[c.name] = [...seen[c.name], seq];
      got.push(c.name);
    }
  }
  if (broker !== "none" && !s.instance3Up) {
    if (broker === "streams") backlog = [...backlog, seq];
    else lost = " Instance 3 wasn't subscribed, so Redis dropped it for Chen.";
  }
  const writes = got.length;
  const line = `#${seq} task.moved -> ${got.join(", ") || "nobody"} (${writes} socket write${writes === 1 ? "" : "s"}).${broker === "none" ? " Instances 2 and 3 never heard about it." : lost}`;
  return { ...s, seq, seen, backlog, log: [line, ...s.log].slice(0, 5) };
}

/** Instance 3 finishes restarting; Chen reconnects. */
export function restore(s: State, broker: Broker, catchUp: boolean): State {
  const seen = { ...s.seen };
  const last = Math.max(0, ...seen.Chen);
  let replay: number[] = [];
  if (broker === "streams") replay = s.backlog;
  if (catchUp) replay = Array.from({ length: s.seq - last }, (_, i) => last + i + 1);
  seen.Chen = [...new Set([...seen.Chen, ...replay])].sort((a, b) => a - b);
  const how = catchUp
    ? `Chen reconnects with lastSeq=${last}; server replays ${replay.length ? replay.map((n) => `#${n}`).join(", ") : "nothing"} from the event log.`
    : broker === "streams"
      ? `Instance 3 reads the stream from its last acknowledged ID: ${replay.length ? replay.map((n) => `#${n}`).join(", ") : "nothing new"}.`
      : "Chen reconnects, but nothing was stored and he didn't say what he'd seen. Missed events stay missed until a refresh.";
  return { ...s, seen, instance3Up: true, backlog: [], log: [`Instance 3 back up. ${how}`, ...s.log].slice(0, 5) };
}

export function PubSubFanout() {
  const [broker, setBroker] = useState<Broker>("none");
  const [catchUp, setCatchUp] = useState(false);
  const [state, setState] = useState<State>(fresh);

  const missing = (name: string) => Array.from({ length: state.seq }, (_, i) => i + 1).filter((n) => !state.seen[name].includes(n));

  return (
    <Widget title="Fan-out across instances" hint="Four teammates watch board 412, spread over three instances. Ana moves tasks. Add a broker, then restart instance 3 mid-stream.">
      <div className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-20 text-muted-foreground">Broker</span>
          {(Object.keys(BROKERS) as Broker[]).map((b) => (
            <Pill key={b} active={broker === b} onClick={() => { setBroker(b); setState(fresh()); }}>{BROKERS[b]}</Pill>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-20 text-muted-foreground">Reconnect</span>
          <Pill active={!catchUp} onClick={() => { setCatchUp(false); setState(fresh()); }}>Just reconnect</Pill>
          <Pill active={catchUp} onClick={() => { setCatchUp(true); setState(fresh()); }}>Send last seq seen</Pill>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {[1, 2, 3].map((inst) => {
          const down = inst === 3 && !state.instance3Up;
          return (
            <div key={inst} className={`rounded-lg border p-3 ${down ? "border-warn bg-warn-soft" : "border-border bg-muted"}`}>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Instance {inst} {down ? "· restarting" : ""}</p>
              <ul className="mt-2 space-y-1 text-sm">
                {CLIENTS.filter((c) => c.instance === inst).map((c) => {
                  const miss = missing(c.name);
                  return (
                    <li key={c.name} className="flex flex-wrap items-baseline justify-between gap-x-2">
                      <span>{c.name}</span>
                      <span className={`font-mono text-[0.75rem] ${miss.length ? "text-bad" : "text-good"}`}>
                        {state.seq === 0 ? "—" : miss.length ? `missing ${miss.map((n) => `#${n}`).join(" ")}` : `up to date (#${state.seq})`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => setState((s) => publish(s, broker))} className="min-h-10 flex-1 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
          Ana moves a task
        </button>
        <button
          type="button"
          onClick={() => setState((s) => (s.instance3Up ? { ...s, instance3Up: false, log: ["Deploy: instance 3 stops; Chen's socket drops.", ...s.log].slice(0, 5) } : restore(s, broker, catchUp)))}
          className="min-h-10 rounded-lg border border-border px-4 text-sm"
        >
          {state.instance3Up ? "Restart instance 3" : "Instance 3 back up"}
        </button>
        <button type="button" onClick={() => setState(fresh())} className="min-h-10 rounded-lg border border-border px-4 text-sm">Reset</button>
      </div>

      {state.log.length > 0 && (
        <pre className="mt-3 whitespace-pre-wrap break-all rounded-lg bg-muted px-3 py-2 font-mono text-[0.75rem] leading-5">{state.log.join("\n")}</pre>
      )}
      <p className="mt-2 text-xs text-muted-foreground">Every delivered event costs one socket write per watcher: fan-out is events times subscribers.</p>
    </Widget>
  );
}

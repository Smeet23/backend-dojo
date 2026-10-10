"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Strategy = "replica" | "primary" | "wait";

const ONE_WAY_TO_PRIMARY = 110; // Mumbai → us-east, one way
const REPLICATION_LAG = 250; // time after commit until the Mumbai replica has it
const LOCAL_READ = 5;

const STRATEGIES: { id: Strategy; label: string; blurb: string }[] = [
  { id: "replica", label: "Always read from replica", blurb: "Every read goes to the nearest replica." },
  { id: "primary", label: "Read your writes from primary", blurb: "For a few seconds after a user writes, their reads go to the primary." },
  { id: "wait", label: "Wait until replica catches up", blurb: "The read waits until the replica has applied the write." },
];

const DELAYS = [0, 100, 300];

export function ReplicaLagLab() {
  const [strategy, setStrategy] = useState<Strategy>("replica");
  const [delay, setDelay] = useState(0);

  // Times are measured from the moment the primary commits the write.
  const ackAtClient = ONE_WAY_TO_PRIMARY;
  const readIssuedAt = ackAtClient + delay;
  const replicaReadyAt = REPLICATION_LAG;

  let fresh: boolean;
  let readLatency: number;
  let where: string;
  if (strategy === "replica") {
    fresh = readIssuedAt >= replicaReadyAt;
    readLatency = LOCAL_READ;
    where = "Mumbai replica";
  } else if (strategy === "primary") {
    fresh = true;
    readLatency = ONE_WAY_TO_PRIMARY * 2;
    where = "US primary";
  } else {
    fresh = true;
    readLatency = Math.max(0, replicaReadyAt - readIssuedAt) + LOCAL_READ;
    where = "Mumbai replica (after waiting)";
  }
  const shown = fresh ? "Asha Kapoor" : "Asha K";

  return (
    <Widget
      title="Replication lag"
      hint="A user in Mumbai renames herself from “Asha K” to “Asha Kapoor”. The write goes to the primary in the US; the page then re-fetches her profile."
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Read routing</p>
      <div className="mt-1 flex flex-wrap gap-2">
        {STRATEGIES.map((s) => (
          <Pill key={s.id} active={strategy === s.id} onClick={() => setStrategy(s.id)}>{s.label}</Pill>
        ))}
      </div>
      <p className="mt-1 text-xs text-muted">{STRATEGIES.find((s) => s.id === strategy)?.blurb}</p>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted">Frontend waits before re-fetching</p>
      <div className="mt-1 flex flex-wrap gap-2">
        {DELAYS.map((d) => (
          <Pill key={d} active={delay === d} onClick={() => setDelay(d)}>{d} ms</Pill>
        ))}
      </div>

      <ol className="mt-4 space-y-1 text-sm">
        {[
          { t: 0, text: "Primary commits the new name" },
          { t: ackAtClient, text: "Browser gets 200 OK and shows “Saved”" },
          { t: readIssuedAt, text: "Browser sends GET /me" },
          { t: replicaReadyAt, text: "Mumbai replica applies the change" },
        ]
          .sort((a, b) => a.t - b.t)
          .map((e) => (
            <li key={e.text} className="rounded-md bg-surface-2 px-2 py-1">
              <span className="font-mono text-xs text-muted">t = {e.t} ms</span> {e.text}
            </li>
          ))}
      </ol>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div className={`rounded-lg p-2 ${fresh ? "bg-good-soft" : "bg-bad-soft"}`}>
          <p className="text-xs text-muted">Profile shows</p>
          <p className="font-semibold">{shown}</p>
          <p className="text-xs">{fresh ? "Fresh" : "Stale: right after “Saved”!"}</p>
        </div>
        <div className="rounded-lg bg-surface-2 p-2">
          <p className="text-xs text-muted">Read served by</p>
          <p className="font-semibold">{where}</p>
          <p className="text-xs">read latency ≈ {readLatency} ms</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted">
        Every option trades something: staleness, latency, or extra load on the primary.
      </p>
    </Widget>
  );
}

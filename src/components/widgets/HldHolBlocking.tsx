"use client";

import { useMemo, useState } from "react";
import { Pill, Widget } from "./Widget";

type Mode = "h1" | "h2" | "h3";
type Res = "A" | "B" | "C";
type Lost = Res | "none";

const RES: Res[] = ["A", "B", "C"];
const PACKETS = 4; // packets per resource
const RECOVERY = 10; // ticks from the lost send until the retransmission arrives

const MODE_LABEL: Record<Mode, string> = {
  h1: "HTTP/1.1 (one connection)",
  h2: "HTTP/2 over TCP",
  h3: "HTTP/3 over QUIC",
};

const MODE_NOTE: Record<Mode, string> = {
  h1: "Responses go one after another on the connection, so C can't start until A and B finish (head-of-line blocking at the HTTP layer). A lost packet also freezes everything behind it in TCP.",
  h2: "Streams are interleaved, so C no longer waits for A to finish. But TCP delivers bytes strictly in order: one lost packet stalls every stream until it's retransmitted.",
  h3: "QUIC orders bytes per stream, not per connection. A lost packet only stalls its own stream; the others keep being delivered.",
};

type Pkt = { res: Res; seq: number; sent: number; arrives: number };

function simulate(mode: Mode, lost: Lost) {
  // Send order: sequential for HTTP/1.1, round-robin interleaving for HTTP/2 and HTTP/3.
  const order: { res: Res; seq: number }[] = [];
  if (mode === "h1") {
    for (const r of RES) for (let s = 1; s <= PACKETS; s++) order.push({ res: r, seq: s });
  } else {
    for (let s = 1; s <= PACKETS; s++) for (const r of RES) order.push({ res: r, seq: s });
  }
  const pkts: Pkt[] = order.map((p, i) => {
    const isLost = p.res === lost && p.seq === 2;
    return { ...p, sent: i, arrives: isLost ? i + RECOVERY : i + 1 };
  });

  // Delivery to the application.
  const delivered: number[] = [];
  const lastPerStream: Record<Res, number> = { A: 0, B: 0, C: 0 };
  pkts.forEach((p, i) => {
    let t = p.arrives;
    if (mode === "h3") t = Math.max(t, lastPerStream[p.res]);
    else if (i > 0) t = Math.max(t, delivered[i - 1]);
    delivered.push(t);
    lastPerStream[p.res] = t;
  });

  const done: Record<Res, number> = { A: 0, B: 0, C: 0 };
  pkts.forEach((p, i) => {
    done[p.res] = Math.max(done[p.res], delivered[i]);
  });
  const stalled = pkts.map((p, i) => delivered[i] > p.arrives);
  return { pkts, delivered, done, stalled };
}

export function HldHolBlocking() {
  const [mode, setMode] = useState<Mode>("h2");
  const [lost, setLost] = useState<Lost>("A");
  const sim = useMemo(() => simulate(mode, lost), [mode, lost]);
  const max = Math.max(...RES.map((r) => sim.done[r]), 1);

  return (
    <Widget
      title="Head-of-line blocking"
      hint="A page loads three resources of 4 packets each. Drop one packet and compare when each resource is usable."
    >
      <div className="flex flex-wrap gap-2">
        {(Object.keys(MODE_LABEL) as Mode[]).map((m) => (
          <Pill key={m} active={mode === m} onClick={() => setMode(m)}>
            {MODE_LABEL[m]}
          </Pill>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted">Lose packet 2 of:</span>
        {(["none", "A", "B", "C"] as Lost[]).map((l) => (
          <Pill key={l} active={lost === l} onClick={() => setLost(l)}>
            {l === "none" ? "Nothing" : l}
          </Pill>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {RES.map((r) => (
          <div key={r} className="flex items-center gap-2">
            <span className="w-6 shrink-0 font-mono text-sm">{r}</span>
            <div className="h-6 min-w-0 flex-1 rounded bg-surface-2">
              <div
                className={`flex h-6 items-center justify-end rounded px-2 text-xs ${
                  lost === r ? "bg-bad-soft" : sim.pkts.some((p, i) => p.res === r && sim.stalled[i]) ? "bg-warn-soft" : "bg-good-soft"
                }`}
                style={{ width: `${Math.max(12, (sim.done[r] / max) * 100)}%` }}
              >
                t={sim.done[r]}
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-muted">Packets in send order (amber = arrived but held back waiting for an earlier packet, red = lost):</p>
      <div className="mt-1 flex flex-wrap gap-1">
        {sim.pkts.map((p, i) => {
          const isLost = p.res === lost && p.seq === 2;
          const cls = isLost ? "border-bad bg-bad-soft" : sim.stalled[i] ? "border-warn bg-warn-soft" : "border-border bg-surface-2";
          return (
            <span key={`${p.res}${p.seq}`} className={`rounded border px-1.5 py-0.5 font-mono text-xs ${cls}`}>
              {p.res}
              {p.seq}
            </span>
          );
        })}
      </div>

      <p className="mt-3 rounded-lg bg-surface-2 p-3 text-sm">{MODE_NOTE[mode]}</p>
    </Widget>
  );
}

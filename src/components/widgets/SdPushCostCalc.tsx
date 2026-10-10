"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

const CLIENTS = [1_000, 10_000, 100_000, 1_000_000];
const EVENT_EVERY = [1, 10, 60, 600]; // seconds between updates for one client
const POLL_EVERY = [1, 5, 30]; // short-poll interval, seconds
const LONG_POLL_TIMEOUT = 30;
const HTTP_OVERHEAD = 700; // bytes of request + response headers per round trip, a typical figure
const SSE_FRAMING = 12; // "id: …\ndata: …\n\n"
const WS_FRAMING = 6; // 2–14 bytes per frame; masked client frames are a little bigger

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return n >= 10 ? n.toFixed(0) : n.toFixed(1);
}
function bytes(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} GB/s`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} MB/s`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)} KB/s`;
  return `${n.toFixed(0)} B/s`;
}
function secs(n: number): string {
  return n < 1 ? "~1 network trip" : `~${n.toFixed(n < 10 ? 1 : 0)} s`;
}

type Row = { name: string; reqs: number; empty: number; held: number; delay: string; overhead: number; note: string };

export function SdPushCostCalc() {
  const [clients, setClients] = useState(100_000);
  const [eventEvery, setEventEvery] = useState(60);
  const [pollEvery, setPollEvery] = useState(5);
  const [twoWay, setTwoWay] = useState(false);

  const eventsPerSec = clients / eventEvery;
  const pollReqs = clients / pollEvery;
  const pollUseful = Math.min(pollReqs, eventsPerSec);
  const longCycle = Math.min(eventEvery, LONG_POLL_TIMEOUT);
  const longReqs = clients / longCycle;

  const rows: Row[] = [
    {
      name: "Short polling",
      reqs: pollReqs,
      empty: pollReqs ? 1 - pollUseful / pollReqs : 0,
      held: 0,
      delay: secs(pollEvery / 2),
      overhead: pollReqs * HTTP_OVERHEAD,
      note: "Simple and cacheable, but most requests come back empty when updates are rare.",
    },
    {
      name: "Long polling",
      reqs: longReqs,
      empty: eventEvery > LONG_POLL_TIMEOUT ? 1 - LONG_POLL_TIMEOUT / eventEvery : 0,
      held: clients,
      delay: secs(0),
      overhead: longReqs * HTTP_OVERHEAD,
      note: "Near-instant, but a full HTTP round trip per update plus a re-request after every timeout.",
    },
    {
      name: "SSE",
      reqs: 0,
      empty: 0,
      held: clients,
      delay: secs(0),
      overhead: eventsPerSec * SSE_FRAMING,
      note: twoWay ? "Server→client only: client messages need separate HTTP POSTs." : "One request, then a stream of small text events.",
    },
    {
      name: "WebSocket",
      reqs: 0,
      empty: 0,
      held: clients,
      delay: secs(0),
      overhead: eventsPerSec * WS_FRAMING,
      note: twoWay ? "Both directions on one connection, a few bytes of framing per message." : "Works, but you pay for bidirectional machinery you don't use.",
    },
  ];

  return (
    <Widget title="What each transport costs at scale" hint="Pick an audience and an update rate. Numbers are steady-state estimates for the server side.">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-28 text-xs text-muted">Connected clients</span>
          {CLIENTS.map((c) => (
            <Pill key={c} active={clients === c} onClick={() => setClients(c)}>{fmt(c)}</Pill>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-28 text-xs text-muted">Update per client</span>
          {EVENT_EVERY.map((e) => (
            <Pill key={e} active={eventEvery === e} onClick={() => setEventEvery(e)}>
              every {e >= 60 ? `${e / 60} min` : `${e} s`}
            </Pill>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-28 text-xs text-muted">Poll interval</span>
          {POLL_EVERY.map((p) => (
            <Pill key={p} active={pollEvery === p} onClick={() => setPollEvery(p)}>{p} s</Pill>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-28 text-xs text-muted">Client also sends</span>
          <Pill active={twoWay} onClick={() => setTwoWay((v) => !v)}>{twoWay ? "yes (chat, game)" : "no (feed, dashboard)"}</Pill>
        </div>
      </div>

      <p className="mt-3 text-sm">
        Real updates: <span className="font-mono">{fmt(eventsPerSec)}/s</span> across all clients.
      </p>

      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {rows.map((r) => {
          const best = twoWay ? r.name === "WebSocket" : r.name === "SSE";
          return (
            <div key={r.name} className={`min-w-0 rounded-lg border p-3 text-sm ${best ? "border-accent bg-accent-soft" : "border-border bg-surface"}`}>
              <p className="font-semibold">
                {r.name}
                {best && <span className="ml-2 text-xs font-normal text-accent">good fit</span>}
              </p>
              <dl className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 text-xs">
                <dt className="text-muted">HTTP requests/s</dt>
                <dd className="font-mono">{r.reqs ? fmt(r.reqs) : "only on connect"}</dd>
                <dt className="text-muted">Empty responses</dt>
                <dd className={`font-mono ${r.empty > 0.5 ? "text-bad" : ""}`}>{Math.round(r.empty * 100)}%</dd>
                <dt className="text-muted">Open connections</dt>
                <dd className="font-mono">{r.held ? fmt(r.held) : "~0 idle"}</dd>
                <dt className="text-muted">Delay to client</dt>
                <dd className="font-mono">{r.delay}</dd>
                <dt className="text-muted">Protocol overhead</dt>
                <dd className="font-mono">{bytes(r.overhead)}</dd>
              </dl>
              <p className="mt-2 text-xs text-muted">{r.note}</p>
            </div>
          );
        })}
      </div>
    </Widget>
  );
}

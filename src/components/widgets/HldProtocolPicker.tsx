"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Client = "browser" | "native";
type Flow = "ask" | "push" | "both";
type Payload = "data" | "media" | "game";
type Audience = "public" | "internal";

type Rec = { protocol: string; transport: string; why: string; watch: string };

function recommend(client: Client, flow: Flow, payload: Payload, audience: Audience): Rec {
  if (payload === "media") {
    return {
      protocol: "WebRTC",
      transport: "UDP (SRTP for media), with a WebSocket or HTTPS signalling channel",
      why: "Live audio and video must arrive on time more than they must arrive complete. WebRTC sends media over UDP, adapts bitrate, and connects peers directly when NAT allows.",
      watch: "You still need servers: signalling to exchange offers, STUN to discover public addresses, TURN to relay when direct paths fail, and an SFU once calls have more than a handful of people.",
    };
  }
  if (payload === "game") {
    return client === "browser"
      ? {
          protocol: "WebSocket (or a WebRTC data channel in unreliable mode)",
          transport: "TCP, or UDP via the data channel",
          why: "Browsers can't open raw UDP sockets. WebSocket is the simple choice; a WebRTC data channel set to unordered, no-retransmit gives UDP-like behaviour when stale updates must not block fresh ones.",
          watch: "Over TCP a single lost packet delays every later position update. Send compact snapshots and tolerate jitter.",
        }
      : {
          protocol: "Custom protocol over UDP",
          transport: "UDP",
          why: "A position update from 50 ms ago is worthless, so retransmitting it is wasted work. Games send state snapshots over UDP and add reliability only for the few messages that need it.",
          watch: "You own sequencing, congestion control and NAT traversal. QUIC-based libraries can take some of that off your hands.",
        };
  }
  if (flow === "ask") {
    if (client === "native" && audience === "internal") {
      return {
        protocol: "gRPC",
        transport: "HTTP/2 over TCP (TLS)",
        why: "Service-to-service calls benefit from a strict schema (protobuf), compact binary encoding, generated clients, deadlines and multiplexing many calls over one connection.",
        watch: "Harder to debug with curl, needs HTTP/2 end to end, and browsers need gRPC-Web or a gateway.",
      };
    }
    return {
      protocol: "REST (or GraphQL) over HTTPS",
      transport: "HTTP/1.1, HTTP/2 or HTTP/3; TCP or QUIC underneath",
      why: "Request-response with a public, human-readable contract. Caches, CDNs, proxies and every client library understand HTTP.",
      watch: "Polling HTTP for updates wastes requests. If the server needs to push, change the flow answer.",
    };
  }
  if (flow === "push") {
    return client === "browser"
      ? {
          protocol: "Server-Sent Events (SSE)",
          transport: "One long-lived HTTP response over TCP",
          why: "The server streams events down; the client only listens. SSE is plain HTTP, works through most proxies, and the browser reconnects automatically with Last-Event-ID.",
          watch: "One direction only. Client actions go as normal HTTP requests. On HTTP/1.1 each stream holds one of the browser's ~6 connections per host.",
        }
      : {
          protocol: "gRPC server streaming (or SSE)",
          transport: "HTTP/2 over TCP",
          why: "A native client or another service can hold one stream open and receive typed messages as they happen.",
          watch: "Long-lived streams need keepalives and reconnect logic, and they pin a client to one server, which matters for load balancing.",
        };
  }
  return client === "browser"
    ? {
        protocol: "WebSocket",
        transport: "TCP, upgraded from an HTTP request",
        why: "Both sides send whenever they like over one persistent connection with tiny frame headers: chat, collaborative editing, live dashboards with controls.",
        watch: "Stateful connections: load balancers need long timeouts, servers need a pub-sub backplane to reach users connected to other nodes, and clients need reconnect and resume logic.",
      }
    : {
        protocol: "gRPC bidirectional streaming (or WebSocket)",
        transport: "HTTP/2 over TCP",
        why: "Both sides stream typed messages over one connection, with flow control per stream.",
        watch: "Same stateful-connection concerns as WebSocket: sticky routing, reconnects and draining on deploy.",
      };
}

function Row<T extends string>({
  label,
  value,
  set,
  options,
}: {
  label: string;
  value: T;
  set: (v: T) => void;
  options: [T, string][];
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <div className="mt-1 flex flex-wrap gap-2">
        {options.map(([v, l]) => (
          <Pill key={v} active={value === v} onClick={() => set(v)}>
            {l}
          </Pill>
        ))}
      </div>
    </div>
  );
}

export function HldProtocolPicker() {
  const [client, setClient] = useState<Client>("browser");
  const [flow, setFlow] = useState<Flow>("both");
  const [payload, setPayload] = useState<Payload>("data");
  const [audience, setAudience] = useState<Audience>("public");
  const rec = recommend(client, flow, payload, audience);

  return (
    <Widget title="Protocol picker" hint="Describe the communication and see which protocol fits, and what it will cost you.">
      <div className="space-y-3">
        <Row label="Client" value={client} set={setClient} options={[["browser", "Web browser"], ["native", "Native app or backend service"]]} />
        <Row label="Who sends" value={flow} set={setFlow} options={[["ask", "Client asks, server answers"], ["push", "Server pushes updates"], ["both", "Both, any time"]]} />
        <Row label="What flows" value={payload} set={setPayload} options={[["data", "Requests and records"], ["media", "Live audio or video"], ["game", "Fast game state"]]} />
        <Row label="Audience" value={audience} set={setAudience} options={[["public", "Public or third party"], ["internal", "Internal services"]]} />
      </div>
      <div className="mt-4 rounded-lg border border-accent bg-accent-soft p-3">
        <p className="text-lg font-semibold">{rec.protocol}</p>
        <p className="text-xs text-muted">Runs on: {rec.transport}</p>
        <p className="mt-2 text-sm">{rec.why}</p>
        <p className="mt-2 text-sm">
          <span className="font-semibold text-warn">Watch out: </span>
          {rec.watch}
        </p>
      </div>
    </Widget>
  );
}

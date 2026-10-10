"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Net = "4g" | "wifi";
type Mode = "seq" | "par" | "bff";

const NETS: Record<Net, { label: string; rtt: number; kbps: number }> = {
  "4g": { label: "Mobile 4G (120 ms RTT, 4 Mbps)", rtt: 120, kbps: 4000 },
  wifi: { label: "Office Wi-Fi (20 ms RTT, 50 Mbps)", rtt: 20, kbps: 50000 },
};

/** Services the home screen needs: server time in ms and full response size in KB. */
const SERVICES = [
  { name: "users", ms: 20, kb: 12 },
  { name: "orders", ms: 45, kb: 60 },
  { name: "recs", ms: 70, kb: 80 },
  { name: "cart", ms: 15, kb: 8 },
];

const BFF_KB = 18; // trimmed to exactly what the screen shows
const GATEWAY_MS = 3; // gateway overhead + internal hops in the data centre

const MODES: { id: Mode; label: string; blurb: string }[] = [
  { id: "seq", label: "Client calls each service, one by one", blurb: "Four round trips over the slow link, and four full payloads." },
  { id: "par", label: "Client calls all four in parallel", blurb: "One round trip of waiting, but still four full payloads, four requests to keep in sync, and the client knows your internal layout." },
  { id: "bff", label: "Gateway / BFF aggregates", blurb: "One request over the slow link. The fan-out happens over the fast internal network, and the response is trimmed for the screen." },
];

function transferMs(kb: number, kbps: number) {
  return Math.round((kb * 8 * 1000) / kbps);
}

type Seg = { label: string; ms: number; kind: "net" | "server" | "xfer" };

function plan(mode: Mode, net: Net): { segs: Seg[]; requests: number; kb: number } {
  const { rtt, kbps } = NETS[net];
  const fullKb = SERVICES.reduce((a, s) => a + s.kb, 0);
  if (mode === "seq") {
    const segs: Seg[] = [];
    for (const s of SERVICES) {
      segs.push({ label: `${s.name} RTT`, ms: rtt, kind: "net" });
      segs.push({ label: s.name, ms: s.ms, kind: "server" });
      segs.push({ label: `${s.name} body`, ms: transferMs(s.kb, kbps), kind: "xfer" });
    }
    return { segs, requests: 4, kb: fullKb };
  }
  if (mode === "par") {
    const slowest = Math.max(...SERVICES.map((s) => s.ms));
    return {
      segs: [
        { label: "RTT", ms: rtt, kind: "net" },
        { label: "slowest service", ms: slowest, kind: "server" },
        { label: "4 bodies share the link", ms: transferMs(fullKb, kbps), kind: "xfer" },
      ],
      requests: 4,
      kb: fullKb,
    };
  }
  const slowest = Math.max(...SERVICES.map((s) => s.ms));
  return {
    segs: [
      { label: "RTT", ms: rtt, kind: "net" },
      { label: "gateway + fan-out", ms: GATEWAY_MS + slowest, kind: "server" },
      { label: "1 trimmed body", ms: transferMs(BFF_KB, kbps), kind: "xfer" },
    ],
    requests: 1,
    kb: BFF_KB,
  };
}

const KIND: Record<Seg["kind"], string> = { net: "bg-warn", server: "bg-accent", xfer: "bg-good" };

export function HldBffFanout() {
  const [net, setNet] = useState<Net>("4g");
  const [mode, setMode] = useState<Mode>("seq");
  const all = (["seq", "par", "bff"] as Mode[]).map((m) => ({ m, ...plan(m, net) }));
  const maxTotal = Math.max(...all.map((p) => p.segs.reduce((a, s) => a + s.ms, 0)));
  const cur = all.find((p) => p.m === mode) ?? all[0];
  const total = cur.segs.reduce((a, s) => a + s.ms, 0);

  return (
    <Widget
      title="Rendering a home screen"
      hint="The screen needs data from four services. Compare who does the fan-out, on a slow and a fast network."
    >
      <div className="flex flex-wrap gap-2">
        {(Object.keys(NETS) as Net[]).map((n) => (
          <Pill key={n} active={net === n} onClick={() => setNet(n)}>
            {NETS[n].label}
          </Pill>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {MODES.map((m) => (
          <Pill key={m.id} active={mode === m.id} onClick={() => setMode(m.id)}>
            {m.label}
          </Pill>
        ))}
      </div>
      <p className="mt-2 text-sm text-muted">{MODES.find((m) => m.id === mode)?.blurb}</p>

      <div className="mt-4 space-y-3">
        {all.map((p) => {
          const t = p.segs.reduce((a, s) => a + s.ms, 0);
          return (
            <div key={p.m} className={p.m === mode ? "" : "opacity-50"}>
              <div className="flex flex-wrap justify-between gap-2 text-xs">
                <span className="font-medium">{MODES.find((m) => m.id === p.m)?.label}</span>
                <span className="font-mono">{t} ms</span>
              </div>
              <div className="mt-1 flex h-4 w-full overflow-hidden rounded bg-surface-2">
                {p.segs.map((s, i) => (
                  <div
                    key={i}
                    title={`${s.label}: ${s.ms} ms`}
                    className={`${KIND[s.kind]} h-full border-r border-surface`}
                    style={{ width: `${(s.ms / maxTotal) * 100}%` }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-sm bg-warn" /> network round trip</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-sm bg-accent" /> server work</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-sm bg-good" /> downloading the body</span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
        <div className="min-w-0 rounded-lg border border-border bg-bg p-2">
          <p className="text-xs text-muted">Time to render</p>
          <p className="text-lg font-semibold">{total} ms</p>
        </div>
        <div className="min-w-0 rounded-lg border border-border bg-bg p-2">
          <p className="text-xs text-muted">Requests from device</p>
          <p className="text-lg font-semibold">{cur.requests}</p>
        </div>
        <div className="min-w-0 rounded-lg border border-border bg-bg p-2">
          <p className="text-xs text-muted">Bytes downloaded</p>
          <p className="text-lg font-semibold">{cur.kb} KB</p>
        </div>
      </div>
    </Widget>
  );
}

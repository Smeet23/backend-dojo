"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Feature = "tls" | "cache" | "gzip" | "waf";
type Req = "product" | "product-again" | "attack" | "report";
type Tone = "good" | "warn" | "bad" | "neutral";
type Hop = { where: string; text: string; tone: Tone };

const FEATURES: { id: Feature; label: string }[] = [
  { id: "tls", label: "TLS termination" },
  { id: "cache", label: "Cache" },
  { id: "gzip", label: "Compression" },
  { id: "waf", label: "WAF" },
];

const REQS: { id: Req; label: string; line: string }[] = [
  { id: "product", label: "First product view", line: "GET /products/42" },
  { id: "product-again", label: "Same product again", line: "GET /products/42" },
  { id: "attack", label: "SQL injection probe", line: "GET /products?id=1' OR '1'='1" },
  { id: "report", label: "Large JSON report", line: "GET /reports/q3 (220 KB JSON)" },
];

function trace(req: Req, on: Set<Feature>) {
  const hops: Hop[] = [];
  let backendHits = 0;
  let backendTls = false;
  let bytes = req === "report" ? 220 : 12;

  hops.push({ where: "Client", text: `HTTPS ${REQS.find((r) => r.id === req)?.line}`, tone: "neutral" });
  if (on.has("tls")) hops.push({ where: "Proxy", text: "TLS handshake done here with the api.example.com certificate", tone: "good" });
  else {
    hops.push({ where: "Proxy", text: "TCP passthrough: can't read the encrypted request, so no caching, gzip or WAF", tone: "warn" });
    backendTls = true;
  }
  const canRead = on.has("tls");

  if (req === "attack" && canRead && on.has("waf")) {
    hops.push({ where: "Proxy", text: "WAF rule matched SQL injection pattern → 403, request never reaches the app", tone: "good" });
    return { hops, backendHits, bytes: 1, backendTls };
  }
  if (req === "product-again" && canRead && on.has("cache")) {
    hops.push({ where: "Proxy", text: "Cache HIT (stored 8 s ago, max-age 60) → served from proxy", tone: "good" });
    return { hops, backendHits, bytes, backendTls };
  }
  if (req === "product-again" && canRead && on.has("cache") === false) hops.push({ where: "Proxy", text: "No cache: forward again", tone: "warn" });
  if (req === "product" && canRead && on.has("cache")) hops.push({ where: "Proxy", text: "Cache MISS, forward and store the 200", tone: "neutral" });

  hops.push({ where: "Proxy", text: "Pick healthy backend 10.0.1.12, add X-Forwarded-For: 203.0.113.42", tone: "neutral" });
  backendHits = 1;
  if (backendTls) hops.push({ where: "App", text: "App must hold the certificate and do its own TLS handshake", tone: "warn" });
  if (req === "attack") hops.push({ where: "App", text: "Malicious query reaches app code; you're relying on parameterised queries alone", tone: "bad" });
  else hops.push({ where: "App", text: `200 OK, ${bytes} KB JSON`, tone: "neutral" });

  if (req === "report" && canRead && on.has("gzip")) {
    bytes = 31;
    hops.push({ where: "Proxy", text: "Client sent Accept-Encoding: br, gzip → compressed 220 KB to 31 KB", tone: "good" });
  }
  return { hops, backendHits, bytes, backendTls };
}

const toneClass: Record<Tone, string> = { good: "bg-good-soft", warn: "bg-warn-soft", bad: "bg-bad-soft", neutral: "bg-surface-2" };

export function HldProxyPath() {
  const [on, setOn] = useState<Set<Feature>>(new Set(["tls"]));
  const [req, setReq] = useState<Req>("product");
  const r = trace(req, on);

  function toggle(f: Feature) {
    setOn((s) => {
      const n = new Set(s);
      if (n.has(f)) n.delete(f);
      else n.add(f);
      return n;
    });
  }

  return (
    <Widget title="What the reverse proxy does" hint="Switch proxy features on and off, then send a request. Notice how much depends on terminating TLS.">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Proxy features</p>
      <div className="mt-1 flex flex-wrap gap-2">
        {FEATURES.map((f) => (
          <Pill key={f.id} active={on.has(f.id)} onClick={() => toggle(f.id)}>{f.label}</Pill>
        ))}
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted">Request</p>
      <div className="mt-1 flex flex-wrap gap-2">
        {REQS.map((q) => (
          <Pill key={q.id} active={req === q.id} onClick={() => setReq(q.id)}>{q.label}</Pill>
        ))}
      </div>

      <ol className="mt-3 space-y-1">
        {r.hops.map((h, i) => (
          <li key={i} className={`flex gap-2 rounded px-2 py-1 text-[0.75rem] ${toneClass[h.tone]}`}>
            <span className="w-12 shrink-0 font-semibold">{h.where}</span>
            <span className="min-w-0 break-words">{h.text}</span>
          </li>
        ))}
      </ol>

      <div className="mt-3 grid grid-cols-2 gap-2 text-center text-sm">
        <div className="min-w-0 rounded-lg bg-surface-2 p-2"><p className="text-xs text-muted">Backend requests</p><p className="font-mono">{r.backendHits}</p></div>
        <div className="min-w-0 rounded-lg bg-surface-2 p-2"><p className="text-xs text-muted">Bytes to client</p><p className="font-mono">{r.bytes} KB</p></div>
      </div>
    </Widget>
  );
}

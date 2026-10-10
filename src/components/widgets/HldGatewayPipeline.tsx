"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Feature = "auth" | "rate" | "cache";
type Tone = "good" | "warn" | "bad" | "neutral";

type Req = {
  id: string;
  label: string;
  line: string;
  token: "valid" | "none" | "user-only";
  forged?: boolean;
  overLimit?: boolean;
  cached?: boolean;
  needsAdmin?: boolean;
  backend: string;
};

const REQUESTS: Req[] = [
  { id: "ok", label: "Normal order", line: "POST /api/v1/orders  (valid JWT)", token: "valid", backend: "orders-svc" },
  { id: "repeat", label: "Popular product, again", line: "GET /api/v1/products/7  (cached 20 s ago)", token: "valid", cached: true, backend: "catalog-svc" },
  { id: "notoken", label: "No token", line: "POST /api/v1/orders  (no Authorization header)", token: "none", backend: "orders-svc" },
  { id: "flood", label: "Free key, 121st call this minute", line: "GET /api/v1/search?q=shoe  (limit 120/min)", token: "valid", overLimit: true, backend: "search-svc" },
  { id: "admin", label: "User calls admin route", line: "DELETE /api/v1/admin/users/9  (JWT without admin scope)", token: "user-only", needsAdmin: true, backend: "users-svc" },
  { id: "forged", label: "Forged identity header", line: "GET /api/v1/orders  (no JWT, sends X-User-Id: 1)", token: "none", forged: true, backend: "orders-svc" },
];

type Hop = { stage: string; text: string; tone: Tone };

function run(r: Req, on: Record<Feature, boolean>): { hops: Hop[]; outcome: string; tone: Tone } {
  const hops: Hop[] = [{ stage: "TLS", text: "Decrypt HTTPS with the public certificate", tone: "neutral" }];

  if (on.auth) {
    if (r.forged) hops.push({ stage: "Auth", text: "Strip X-User-Id from the outside request", tone: "good" });
    if (r.token === "none") {
      hops.push({ stage: "Auth", text: "No valid JWT: reject", tone: "good" });
      return { hops, outcome: "401 Unauthorized at the edge. The backend never sees it.", tone: "good" };
    }
    hops.push({ stage: "Auth", text: "JWT signature, expiry and audience valid. Add X-User-Id from the token", tone: "neutral" });
    if (r.needsAdmin && r.token === "user-only") {
      hops.push({ stage: "Auth", text: "Route requires the admin scope; token lacks it", tone: "good" });
      return { hops, outcome: "403 Forbidden at the edge.", tone: "good" };
    }
  } else {
    hops.push({ stage: "Auth", text: "Off: request passes with whatever headers it carries", tone: "warn" });
  }

  if (on.rate) {
    if (r.overLimit) {
      hops.push({ stage: "Rate limit", text: "Counter for this key is 121, limit 120", tone: "good" });
      return { hops, outcome: "429 Too Many Requests with Retry-After. search-svc is protected.", tone: "good" };
    }
    hops.push({ stage: "Rate limit", text: "Under the limit", tone: "neutral" });
  } else {
    hops.push({ stage: "Rate limit", text: "Off", tone: r.overLimit ? "warn" : "neutral" });
  }

  if (on.cache && r.cached) {
    hops.push({ stage: "Cache", text: "Fresh cached response found", tone: "good" });
    return { hops, outcome: "200 from the gateway cache in about 1 ms. catalog-svc not called.", tone: "good" };
  }
  if (r.cached) hops.push({ stage: "Cache", text: on.cache ? "Miss" : "Off", tone: "warn" });

  hops.push({ stage: "Route", text: `Match path prefix, pick a healthy ${r.backend} instance`, tone: "neutral" });
  hops.push({ stage: "Backend", text: `${r.backend} handles the request`, tone: "neutral" });

  if (r.forged) return { hops, outcome: "orders-svc trusts X-User-Id: 1 and returns user 1's orders. Impersonation.", tone: "bad" };
  if (r.token === "none") return { hops, outcome: "orders-svc must validate tokens itself, or anyone can create orders.", tone: "bad" };
  if (r.needsAdmin) return { hops, outcome: "users-svc deletes a user unless it checks scopes itself.", tone: "bad" };
  if (r.overLimit) return { hops, outcome: "search-svc absorbs the abusive traffic; every other caller slows down.", tone: "bad" };
  if (r.cached) return { hops, outcome: "200, but catalog-svc did work it already did 20 seconds ago.", tone: "warn" };
  return { hops, outcome: "201 Created. Every check passed and the request reached the right service.", tone: "good" };
}

const TONE: Record<Tone, string> = { good: "bg-good-soft", warn: "bg-warn-soft", bad: "bg-bad-soft", neutral: "bg-surface-2" };
const BOX: Record<Tone, string> = { good: "border-good bg-good-soft", warn: "border-warn bg-warn-soft", bad: "border-bad bg-bad-soft", neutral: "border-border bg-surface-2" };

const FEATURES: { id: Feature; label: string }[] = [
  { id: "auth", label: "Auth" },
  { id: "rate", label: "Rate limiting" },
  { id: "cache", label: "Response cache" },
];

export function HldGatewayPipeline() {
  const [rid, setRid] = useState("ok");
  const [on, setOn] = useState<Record<Feature, boolean>>({ auth: true, rate: true, cache: true });
  const r = REQUESTS.find((x) => x.id === rid) ?? REQUESTS[0];
  const res = run(r, on);

  return (
    <Widget
      title="Gateway filter pipeline"
      hint="Pick a request and watch it pass through the gateway's filters. Then switch a filter off and see what reaches the services."
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Gateway filters</p>
      <div className="mt-1 flex flex-wrap gap-2">
        {FEATURES.map((f) => (
          <Pill key={f.id} active={on[f.id]} onClick={() => setOn((o) => ({ ...o, [f.id]: !o[f.id] }))}>
            {f.label}: {on[f.id] ? "on" : "off"}
          </Pill>
        ))}
      </div>

      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">Incoming request</p>
      <div className="mt-1 flex flex-wrap gap-2">
        {REQUESTS.map((x) => (
          <Pill key={x.id} active={rid === x.id} onClick={() => setRid(x.id)}>
            {x.label}
          </Pill>
        ))}
      </div>
      <pre className="mt-2 whitespace-pre-wrap break-all rounded-lg bg-surface-2 p-3 font-mono text-xs">{r.line}</pre>

      <ol className="mt-3 space-y-1.5">
        {res.hops.map((h, i) => (
          <li key={i} className={`flex flex-wrap gap-x-2 rounded-md px-3 py-2 text-sm ${TONE[h.tone]}`}>
            <span className="w-24 shrink-0 font-semibold">{h.stage}</span>
            <span className="min-w-0 flex-1">{h.text}</span>
          </li>
        ))}
      </ol>

      <div className={`mt-3 rounded-lg border p-3 text-sm ${BOX[res.tone]}`}>{res.outcome}</div>
    </Widget>
  );
}

"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Hop = { at: number; title: string; detail: string; tone: "good" | "warn" | "bad" | "neutral" };


type Scenario = "happy" | "flaky" | "denied";

const SCENARIOS: Record<Scenario, { label: string; caller: string; hops: Hop[] }> = {
  happy: {
    caller: "orders",
    label: "Normal call",
    hops: [
      { at: 0, title: "POST http://payments/charge", detail: "Plain HTTP to localhost. The app has no idea a proxy exists; iptables redirects the packet to the sidecar.", tone: "neutral" },
      { at: 1, title: "Pick an instance, apply policy", detail: "Looks up healthy payments pods from control-plane config, picks one by least requests, starts a 2 s timeout, opens an mTLS connection with its orders certificate, starts a trace span.", tone: "neutral" },
      { at: 2, title: "Verify the caller", detail: "Terminates mTLS and reads the caller identity spiffe://cluster.local/ns/shop/sa/orders. Authorization policy allows orders to POST /charge.", tone: "good" },
      { at: 3, title: "Handle the request", detail: "Receives plain HTTP on localhost, charges the card, returns 200.", tone: "good" },
      { at: 1, title: "Record and return", detail: "Both proxies record latency, status and bytes. The 200 flows back to the orders app.", tone: "good" },
    ],
  },
  flaky: {
    caller: "orders",
    label: "One pod is failing",
    hops: [
      { at: 0, title: "GET http://payments/status/77", detail: "An idempotent read. Same plain call as always.", tone: "neutral" },
      { at: 1, title: "Send to pod payments-b", detail: "Load balancer picks payments-b over mTLS.", tone: "neutral" },
      { at: 2, title: "payments-b returns 503", detail: "The pod is overloaded. The inbound proxy passes the 503 back.", tone: "bad" },
      { at: 1, title: "Retry on a different pod", detail: "Route policy allows 2 retries on 503 for GETs, within a retry budget. The retry goes to payments-a. Outlier detection counts the failure against payments-b.", tone: "warn" },
      { at: 3, title: "payments-a answers 200", detail: "The user sees success. After a few more 5xx, payments-b is ejected from the pool for 30 s.", tone: "good" },
    ],
  },
  denied: {
    caller: "reviews",
    label: "Unauthorised caller",
    hops: [
      { at: 0, title: "POST http://payments/charge", detail: "The reviews service has been compromised, and the attacker makes it call POST http://payments/charge.", tone: "neutral" },
      { at: 1, title: "Outbound with its own identity", detail: "Its sidecar presents the reviews certificate. It cannot forge the orders identity: it has no orders private key.", tone: "neutral" },
      { at: 2, title: "Policy check fails", detail: "Caller is spiffe://cluster.local/ns/shop/sa/reviews. Only orders may POST /charge, so the proxy returns 403 without touching the app.", tone: "bad" },
      { at: 3, title: "Never sees the request", detail: "The app code contains no auth logic for this; the mesh enforced it at the edge of the pod.", tone: "good" },
    ],
  },
};

const TONE: Record<Hop["tone"], string> = {
  good: "bg-good-soft",
  warn: "bg-warn-soft",
  bad: "bg-bad-soft",
  neutral: "bg-surface-2",
};

export function HldSidecarStepper() {
  const [scenario, setScenario] = useState<Scenario>("happy");
  const [step, setStep] = useState(0);
  const hops = SCENARIOS[scenario].hops;
  const hop = hops[step];
  const caller = SCENARIOS[scenario].caller;
  const nodes = [`${caller} app`, `${caller} sidecar`, "payments sidecar", "payments app"];

  function choose(s: Scenario) {
    setScenario(s);
    setStep(0);
  }

  return (
    <Widget title="Sidecar request path" hint="Step a request to the payments service through both proxies.">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(SCENARIOS) as Scenario[]).map((s) => (
          <Pill key={s} active={scenario === s} onClick={() => choose(s)}>
            {SCENARIOS[s].label}
          </Pill>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {nodes.map((n, i) => (
          <div
            key={n}
            className={`min-w-0 rounded-lg border px-2 py-2 text-center text-sm ${
              hop.at === i ? "border-accent bg-accent-soft font-semibold" : "border-border bg-surface"
            }`}
          >
            <p className="truncate">{n}</p>
            <p className="text-xs text-muted">{i < 2 ? `${caller} pod` : "payments pod"}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-xs text-muted">app to sidecar: localhost · sidecar to sidecar: mTLS over the network</p>

      <div className={`mt-4 rounded-lg px-3 py-3 text-sm ${TONE[hop.tone]}`}>
        <p className="text-xs uppercase tracking-wide text-muted">
          Step {step + 1} of {hops.length} · {nodes[hop.at]}
        </p>
        <p className="mt-1 font-semibold">{hop.title}</p>
        <p className="mt-1">{hop.detail}</p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="min-h-10 rounded-lg border border-border px-4 text-sm disabled:opacity-40"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => setStep((s) => Math.min(hops.length - 1, s + 1))}
          disabled={step === hops.length - 1}
          className="min-h-10 rounded-lg bg-accent px-4 text-sm text-white disabled:opacity-40 dark:text-bg"
        >
          Next hop
        </button>
      </div>
    </Widget>
  );
}

"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Fault = "none" | "dns" | "firewall" | "app";

type Hop = { name: string; detail: string };

const hops: Hop[] = [
  { name: "Browser", detail: "You open https://api.notes.dev/users. The browser only knows a name, not where it lives." },
  { name: "DNS", detail: "An A record maps api.notes.dev → 54.210.10.7 (the server's public IP)." },
  { name: "Firewall", detail: "The cloud security group checks the port. 443 (HTTPS) is open, so the packet is let in." },
  { name: "Reverse proxy", detail: "Nginx on the machine terminates TLS and forwards requests for api.notes.dev to localhost:3001." },
  { name: "App server", detail: "Your Node/Go/Python process handles GET /users and returns JSON." },
];

const faults: Record<Exclude<Fault, "none">, { at: number; result: string }> = {
  dns: { at: 1, result: "No A record for api.notes.dev → the browser can't find an IP. Error: DNS_PROBE_FINISHED_NXDOMAIN. Your server never sees anything." },
  firewall: { at: 2, result: "Port 443 isn't allowed in the security group → the packet is dropped. The browser just times out. Your server never sees anything." },
  app: { at: 4, result: "Nginx forwards to localhost:3001, but nothing is listening (the process crashed) → Nginx answers 502 Bad Gateway." },
};

const faultLabels: Record<Fault, string> = {
  none: "Everything healthy",
  dns: "DNS record missing",
  firewall: "Port 443 closed",
  app: "App process crashed",
};

export function RequestJourney() {
  const [fault, setFault] = useState<Fault>("none");
  const [step, setStep] = useState(0);
  const failAt = fault === "none" ? null : faults[fault].at;
  const last = failAt ?? hops.length; // index of the final card (result)
  const shown = Math.min(step, last);

  return (
    <Widget title="Follow a request" hint="Pick a scenario, then step through each hop between the browser and your code.">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(faultLabels) as Fault[]).map((f) => (
          <Pill key={f} active={fault === f} onClick={() => { setFault(f); setStep(0); }}>{faultLabels[f]}</Pill>
        ))}
      </div>

      <ol className="mt-4 space-y-2">
        {hops.slice(0, Math.min(shown + 1, hops.length)).map((h, i) => {
          const failed = failAt === i;
          return (
            <li key={h.name} className={`rounded-lg border p-3 text-sm ${failed ? "border-bad bg-bad-soft" : "border-border"}`}>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Hop {i + 1} · {h.name}</p>
              <p className="mt-1">{failed && fault !== "none" ? faults[fault].result : h.detail}</p>
            </li>
          );
        })}
        {fault === "none" && shown >= hops.length && (
          <li className="rounded-lg border border-good bg-good-soft p-3 text-sm">
            ✓ Response travels back the same way: app → Nginx → internet → browser. <code className="font-mono">200 OK</code> with the users JSON.
          </li>
        )}
      </ol>

      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => setStep(0)} className="min-h-10 rounded-lg border border-border px-4 text-sm">Restart</button>
        <button
          type="button"
          onClick={() => setStep(shown + 1)}
          disabled={shown >= last}
          className="min-h-10 flex-1 rounded-lg bg-accent px-4 text-sm font-medium text-white disabled:opacity-40 dark:text-bg"
        >
          {shown >= last ? "Done" : "Next hop"}
        </button>
      </div>
    </Widget>
  );
}

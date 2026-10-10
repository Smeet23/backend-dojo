"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Tier = { name: string; avail: number; copies: number };

const AVAILS = [0.99, 0.999, 0.9999];
const COPIES = [1, 2, 3];
const AZ_AVAIL = 0.999; // one data centre, as a shared dependency

const START: Tier[] = [
  { name: "Load balancer", avail: 0.9999, copies: 1 },
  { name: "App servers", avail: 0.99, copies: 1 },
  { name: "Database", avail: 0.999, copies: 1 },
];

const pct = (a: number) => {
  const p = a * 100;
  return `${p >= 99.9999 ? p.toFixed(5) : p.toFixed(4).replace(/0+$/, "").replace(/\.$/, "")}%`;
};

function downtime(a: number) {
  const minYear = (1 - a) * 365.25 * 24 * 60;
  const minMonth = (1 - a) * 30 * 24 * 60;
  const fmt = (m: number) => (m >= 1440 ? `${(m / 1440).toFixed(1)} days` : m >= 60 ? `${(m / 60).toFixed(1)} h` : m >= 1 ? `${m.toFixed(1)} min` : `${(m * 60).toFixed(0)} s`);
  return { year: fmt(minYear), month: fmt(minMonth) };
}

export function HldNinesCalculator() {
  const [tiers, setTiers] = useState<Tier[]>(START);
  const [multiAz, setMultiAz] = useState(false);

  const tierAvail = tiers.map((t) => 1 - Math.pow(1 - t.avail, t.copies));
  const anyRedundant = tiers.some((t) => t.copies > 1);
  // Single AZ: everything shares one data centre, so its availability multiplies in series.
  // Multi-AZ: copies sit in different zones; treat zone loss as absorbed by redundancy (when copies > 1).
  const azFactor = multiAz && anyRedundant ? 1 : AZ_AVAIL;
  const total = tierAvail.reduce((x, y) => x * y, 1) * azFactor;
  const d = downtime(total);
  const weakest = tierAvail.indexOf(Math.min(...tierAvail));

  function update(i: number, patch: Partial<Tier>) {
    setTiers((ts) => ts.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  }

  return (
    <Widget
      title="Availability calculator"
      hint="Each request passes through every tier in series. Add copies to a tier to put them in parallel, then see what shared fate does."
    >
      <div className="space-y-3">
        {tiers.map((t, i) => (
          <div key={t.name} className={`rounded-lg border p-3 ${i === weakest ? "border-bad bg-bad-soft" : "border-border"}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-semibold">{t.name}</p>
              <p className="font-mono text-sm">tier: {pct(tierAvail[i])}</p>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted">Each copy</span>
              {AVAILS.map((a) => (
                <Pill key={a} active={t.avail === a} onClick={() => update(i, { avail: a })}>{pct(a)}</Pill>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted">Copies</span>
              {COPIES.map((c) => (
                <Pill key={c} active={t.copies === c} onClick={() => update(i, { copies: c })}>×{c}</Pill>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Pill active={!multiAz} onClick={() => setMultiAz(false)}>All in one AZ ({pct(AZ_AVAIL)})</Pill>
        <Pill active={multiAz} onClick={() => setMultiAz(true)}>Copies spread across AZs</Pill>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 text-center sm:grid-cols-3">
        <div className="min-w-0 rounded-lg bg-accent-soft p-2"><p className="text-xs text-muted">End-to-end</p><p className="font-mono text-lg">{pct(total)}</p></div>
        <div className="min-w-0 rounded-lg bg-surface-2 p-2"><p className="text-xs text-muted">Downtime / year</p><p className="font-mono text-lg">{d.year}</p></div>
        <div className="min-w-0 rounded-lg bg-surface-2 p-2"><p className="text-xs text-muted">Downtime / month</p><p className="font-mono text-lg">{d.month}</p></div>
      </div>

      <p className="mt-3 text-sm text-muted">
        {!multiAz
          ? `Every copy shares one data centre, so its ${pct(AZ_AVAIL)} sits in series with everything: no amount of copies gets you past it.`
          : anyRedundant
            ? "Copies live in separate zones, so a zone failure is absorbed. The weakest tier (highlighted) now limits you: add copies there first."
            : "Spreading across zones does nothing until a tier has more than one copy to spread."}
      </p>
    </Widget>
  );
}

"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Name = "shop.example.com" | "api.example.com" | "news.other.org";

const RECORDS: Record<Name, { ip: string; ttl: number; tld: string; zone: string }> = {
  "shop.example.com": { ip: "203.0.113.10", ttl: 300, tld: "com", zone: "example.com" },
  "api.example.com": { ip: "203.0.113.20", ttl: 60, tld: "com", zone: "example.com" },
  "news.other.org": { ip: "198.51.100.7", ttl: 3600, tld: "org", zone: "other.org" },
};

const BROWSER_CAP = 60; // browsers keep entries briefly regardless of TTL
const TLD_NS_TTL = 172800;
const ZONE_NS_TTL = 86400;

type Cache = Record<string, number>; // key -> expires at (seconds)
type State = { now: number; browser: Cache; os: Cache; resolver: Cache };
type Hop = { who: string; text: string; ms: number; tone: "good" | "warn" | "neutral" };

const START: State = { now: 0, browser: {}, os: {}, resolver: {} };

function live(c: Cache, k: string, now: number) {
  return c[k] !== undefined && c[k] > now;
}

function resolve(s: State, name: Name): { next: State; hops: Hop[] } {
  const r = RECORDS[name];
  const { now } = s;
  const hops: Hop[] = [];
  const browser = { ...s.browser };
  const os = { ...s.os };
  const resolver = { ...s.resolver };

  if (live(browser, name, now)) {
    hops.push({ who: "Browser cache", text: `HIT ${r.ip} (expires in ${browser[name] - now}s)`, ms: 0, tone: "good" });
    return { next: s, hops };
  }
  hops.push({ who: "Browser cache", text: "miss", ms: 0, tone: "neutral" });

  if (live(os, name, now)) {
    hops.push({ who: "OS cache", text: `HIT ${r.ip} (expires in ${os[name] - now}s)`, ms: 1, tone: "good" });
    browser[name] = now + Math.min(BROWSER_CAP, os[name] - now);
    return { next: { ...s, browser }, hops };
  }
  hops.push({ who: "OS cache", text: "miss, ask the recursive resolver", ms: 1, tone: "neutral" });

  if (live(resolver, `A ${name}`, now)) {
    const left = resolver[`A ${name}`] - now;
    hops.push({ who: "Recursive resolver", text: `HIT ${r.ip} from shared cache (expires in ${left}s)`, ms: 15, tone: "good" });
    os[name] = now + left;
    browser[name] = now + Math.min(BROWSER_CAP, left);
    return { next: { ...s, browser, os }, hops };
  }
  hops.push({ who: "Recursive resolver", text: "miss, start walking the hierarchy", ms: 15, tone: "neutral" });

  if (live(resolver, `NS ${r.zone}`, now)) {
    hops.push({ who: "Root and TLD", text: `skipped: ${r.zone} name servers already cached`, ms: 0, tone: "good" });
  } else {
    if (live(resolver, `NS ${r.tld}`, now)) {
      hops.push({ who: "Root", text: `skipped: .${r.tld} name servers already cached`, ms: 0, tone: "good" });
    } else {
      hops.push({ who: "Root", text: `referral: ask the .${r.tld} servers`, ms: 20, tone: "warn" });
      resolver[`NS ${r.tld}`] = now + TLD_NS_TTL;
    }
    hops.push({ who: `.${r.tld} TLD`, text: `referral: ${r.zone} is served by ns1.dnsprovider.net`, ms: 30, tone: "warn" });
    resolver[`NS ${r.zone}`] = now + ZONE_NS_TTL;
  }
  hops.push({ who: "Authoritative", text: `${name} A ${r.ip}, TTL ${r.ttl}`, ms: 40, tone: "warn" });
  resolver[`A ${name}`] = now + r.ttl;
  os[name] = now + r.ttl;
  browser[name] = now + Math.min(BROWSER_CAP, r.ttl);
  return { next: { ...s, browser, os, resolver }, hops };
}

function CacheBox({ title, cache, now }: { title: string; cache: Cache; now: number }) {
  const rows = Object.entries(cache).filter(([, exp]) => exp > now);
  return (
    <div className="min-w-0 rounded-lg border border-border bg-surface-2 p-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
      {rows.length === 0 ? (
        <p className="mt-1 text-xs text-muted">empty</p>
      ) : (
        <ul className="mt-1 space-y-0.5 font-mono text-[0.7rem]">
          {rows.map(([k, exp]) => (
            <li key={k} className="break-all">
              {k} · {exp - now}s
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function HldDnsResolver() {
  const [state, setState] = useState<State>(START);
  const [hops, setHops] = useState<Hop[]>([]);
  const [name, setName] = useState<Name>("shop.example.com");

  const total = hops.reduce((a, h) => a + h.ms, 0);

  function lookup() {
    const { next, hops: h } = resolve(state, name);
    setState(next);
    setHops(h);
  }
  function wait(sec: number) {
    setState((s) => ({ ...s, now: s.now + sec }));
    setHops([]);
  }
  function restartLaptop() {
    setState((s) => ({ ...s, browser: {}, os: {} }));
    setHops([]);
  }

  return (
    <Widget title="DNS resolution with caching" hint="Look up a name, then look it up again, wait, or switch names. Watch which layers answer.">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {(Object.keys(RECORDS) as Name[]).map((n) => (
          <Pill key={n} active={name === n} onClick={() => setName(n)}>
            {n}
          </Pill>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <button type="button" onClick={lookup} className="min-h-10 rounded-lg bg-accent px-4 text-white dark:text-bg">
          Look up
        </button>
        <button type="button" onClick={() => wait(60)} className="min-h-10 rounded-lg border border-border px-3">
          Wait 1 min
        </button>
        <button type="button" onClick={() => wait(600)} className="min-h-10 rounded-lg border border-border px-3">
          Wait 10 min
        </button>
        <button type="button" onClick={restartLaptop} className="min-h-10 rounded-lg border border-border px-3">
          Restart laptop
        </button>
        <button
          type="button"
          onClick={() => {
            setState(START);
            setHops([]);
          }}
          className="min-h-10 rounded-lg border border-border px-3"
        >
          Reset
        </button>
      </div>
      <p className="mt-2 text-xs text-muted">Clock: {state.now}s</p>

      {hops.length > 0 && (
        <ol className="mt-3 space-y-1 text-sm">
          {hops.map((h, i) => (
            <li
              key={i}
              className={`flex flex-wrap justify-between gap-x-3 rounded-md px-3 py-1.5 ${
                h.tone === "good" ? "bg-good-soft" : h.tone === "warn" ? "bg-warn-soft" : "bg-surface-2"
              }`}
            >
              <span className="font-semibold">{h.who}</span>
              <span className="min-w-0 break-all">{h.text}</span>
            </li>
          ))}
          <li className="px-3 pt-1 text-sm text-muted">Approximate lookup time: {total} ms</li>
        </ol>
      )}

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <CacheBox title="Browser (max 60 s)" cache={state.browser} now={state.now} />
        <CacheBox title="OS" cache={state.os} now={state.now} />
        <CacheBox title="Recursive resolver" cache={state.resolver} now={state.now} />
      </div>
    </Widget>
  );
}

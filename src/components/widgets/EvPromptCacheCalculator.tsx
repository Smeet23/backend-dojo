"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Inputs = { prefix: number; variable: number; output: number; requests: number; hit: number };

const DISCOUNTS = [0.5, 0.75, 0.9];
// Illustrative list prices in dollars per million tokens.
const IN_PRICE = 3;
const OUT_PRICE = 15;

function Slider({
  label,
  value,
  min,
  max,
  step,
  fmt,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  fmt: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block min-w-0 text-sm">
      <span className="flex justify-between gap-2">
        <span>{label}</span>
        <span className="font-mono">{fmt(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-accent"
      />
    </label>
  );
}

const money = (x: number) => `$${x >= 100 ? Math.round(x).toLocaleString("en-US") : x.toFixed(2)}`;
const tok = (x: number) => x.toLocaleString("en-US");

export function EvPromptCacheCalculator() {
  const [v, setV] = useState<Inputs>({ prefix: 3000, variable: 500, output: 300, requests: 100000, hit: 1 });
  const [discount, setDiscount] = useState(0.9);
  const [staticFirst, setStaticFirst] = useState(true);
  const set = (k: keyof Inputs) => (x: number) => setV((s) => ({ ...s, [k]: x }));

  const M = 1_000_000;
  const outCost = (v.output * v.requests * OUT_PRICE) / M;
  const uncachedIn = ((v.prefix + v.variable) * v.requests * IN_PRICE) / M;
  // Static-first: the shared prefix is billed at the cached rate whenever it hits.
  // Variable-first: the prefix no longer starts the prompt, so it never matches.
  const hit = staticFirst ? v.hit : 0;
  const prefixCost = (v.prefix * v.requests * IN_PRICE * (1 - hit * discount)) / M;
  const variableCost = (v.variable * v.requests * IN_PRICE) / M;
  const cachedIn = prefixCost + variableCost;
  const before = uncachedIn + outCost;
  const after = cachedIn + outCost;
  const saved = before > 0 ? 1 - after / before : 0;
  const prefixShare = v.prefix / (v.prefix + v.variable);

  const segs = staticFirst
    ? [
        { label: "Instructions + examples", w: prefixShare, cls: staticFirst && hit > 0 ? "bg-good" : "bg-surface-2" },
        { label: "User input", w: 1 - prefixShare, cls: "bg-warn" },
      ]
    : [
        { label: "User input", w: 1 - prefixShare, cls: "bg-warn" },
        { label: "Instructions + examples", w: prefixShare, cls: "bg-surface-2" },
      ];

  return (
    <Widget
      title="Prompt caching cost calculator"
      hint="Set the size of the fixed part of your prompt, the part that changes per request, and your traffic. Compare a cache-friendly layout with one that puts the user input first."
    >
      <div className="flex flex-wrap gap-2">
        <Pill active={staticFirst} onClick={() => setStaticFirst(true)}>Static first</Pill>
        <Pill active={!staticFirst} onClick={() => setStaticFirst(false)}>User input first</Pill>
      </div>

      <div className="mt-3 flex h-7 w-full overflow-hidden rounded border border-border text-[0.7rem]">
        {segs.map((s) => (
          <div
            key={s.label}
            className={`flex min-w-0 items-center justify-center overflow-hidden px-1 whitespace-nowrap ${s.cls}`}
            style={{ width: `${s.w * 100}%` }}
          >
            {s.label}
          </div>
        ))}
      </div>
      <p className="mt-1 text-xs text-muted">
        {staticFirst
          ? "Green = identical prefix on every request, billed at the cached rate."
          : "The prompt now starts with text that differs per request, so the prefix match ends almost at once."}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Slider label="Static prefix tokens" value={v.prefix} min={0} max={20000} step={500} fmt={tok} onChange={set("prefix")} />
        <Slider label="Variable tokens per request" value={v.variable} min={100} max={5000} step={100} fmt={tok} onChange={set("variable")} />
        <Slider label="Output tokens per request" value={v.output} min={50} max={2000} step={50} fmt={tok} onChange={set("output")} />
        <Slider label="Requests per day" value={v.requests} min={1000} max={500000} step={1000} fmt={tok} onChange={set("requests")} />
        <Slider label="Share of requests that hit the cache" value={v.hit} min={0} max={1} step={0.05} fmt={(x) => `${Math.round(x * 100)}%`} onChange={set("hit")} />
        <div className="text-sm">
          <p>Cached-token discount</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {DISCOUNTS.map((d) => (
              <Pill key={d} active={discount === d} onClick={() => setDiscount(d)}>
                {Math.round(d * 100)}% off
              </Pill>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted">
              <th className="py-1 font-normal">Per day</th>
              <th className="py-1 text-right font-normal">No caching</th>
              <th className="py-1 text-right font-normal">This layout</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            <tr className="border-t border-border">
              <td className="py-1 font-sans">Input tokens</td>
              <td className="py-1 text-right">{money(uncachedIn)}</td>
              <td className="py-1 text-right">{money(cachedIn)}</td>
            </tr>
            <tr className="border-t border-border">
              <td className="py-1 font-sans">Output tokens</td>
              <td className="py-1 text-right">{money(outCost)}</td>
              <td className="py-1 text-right">{money(outCost)}</td>
            </tr>
            <tr className="border-t border-border font-semibold">
              <td className="py-1 font-sans">Total</td>
              <td className="py-1 text-right">{money(before)}</td>
              <td className="py-1 text-right">{money(after)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className={`mt-3 rounded-lg border p-2 text-sm ${saved > 0.005 ? "border-good bg-good-soft" : "border-border bg-surface-2"}`}>
        {saved > 0.005
          ? `Caching saves ${Math.round(saved * 100)}% of the daily bill (${money(before - after)}/day). Output tokens are never discounted, so they set the floor.`
          : staticFirst
            ? "No savings: either there is no shared prefix or nothing hits the cache."
            : "No savings: with the user input first, no two requests share a meaningful prefix. Same tokens, same model, full price."}
      </p>
      <p className="mt-2 text-xs text-muted">
        Illustrative prices: ${IN_PRICE} per million input tokens, ${OUT_PRICE} per million output tokens. Real providers differ in discount, minimum cacheable length, cache lifetime, and whether writing to the cache costs extra.
      </p>
    </Widget>
  );
}

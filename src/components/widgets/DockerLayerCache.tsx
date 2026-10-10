"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Order = "bad" | "good";
type Change = "src" | "deps" | "base";
type Layer = { line: string; inputs: Change[]; seconds: number; mb: number };

const LAYERS: Record<Order, Layer[]> = {
  bad: [
    { line: "FROM node:22.11-slim", inputs: ["base"], seconds: 0, mb: 75 },
    { line: "WORKDIR /app", inputs: [], seconds: 0, mb: 0 },
    { line: "COPY . .", inputs: ["src", "deps"], seconds: 1, mb: 2 },
    { line: "RUN npm ci", inputs: [], seconds: 48, mb: 140 },
    { line: "RUN npm run build", inputs: [], seconds: 18, mb: 6 },
    { line: 'CMD ["node", "dist/server.js"]', inputs: [], seconds: 0, mb: 0 },
  ],
  good: [
    { line: "FROM node:22.11-slim", inputs: ["base"], seconds: 0, mb: 75 },
    { line: "WORKDIR /app", inputs: [], seconds: 0, mb: 0 },
    { line: "COPY package.json package-lock.json ./", inputs: ["deps"], seconds: 0, mb: 0.4 },
    { line: "RUN npm ci", inputs: [], seconds: 48, mb: 140 },
    { line: "COPY . .", inputs: ["src", "deps"], seconds: 1, mb: 2 },
    { line: "RUN npm run build", inputs: [], seconds: 18, mb: 6 },
    { line: 'CMD ["node", "dist/server.js"]', inputs: [], seconds: 0, mb: 0 },
  ],
};

const CHANGES: { id: Change; label: string }[] = [
  { id: "src", label: "Edit src/notes.ts" },
  { id: "deps", label: "Add a dependency" },
  { id: "base", label: "Bump base image" },
];

/** Index of the first layer whose inputs changed; it and everything after it rebuild. */
export function firstInvalidated(layers: Layer[], change: Change): number {
  const i = layers.findIndex((l) => l.inputs.includes(change));
  return i === -1 ? layers.length : i;
}

export function DockerLayerCache() {
  const [order, setOrder] = useState<Order>("bad");
  const [change, setChange] = useState<Change>("src");

  const layers = LAYERS[order];
  const cut = firstInvalidated(layers, change);
  const seconds = layers.slice(cut).reduce((s, l) => s + l.seconds, 0);
  const mb = layers.slice(cut).reduce((s, l) => s + l.mb, 0);

  return (
    <Widget title="Docker layer cache" hint="Each instruction is a cached layer. The first layer whose inputs changed, and every layer after it, rebuilds.">
      <div className="space-y-2 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-24 text-muted-foreground">Dockerfile</span>
          <Pill active={order === "bad"} onClick={() => setOrder("bad")}>Copy everything first</Pill>
          <Pill active={order === "good"} onClick={() => setOrder("good")}>Copy lock file first</Pill>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-24 text-muted-foreground">You changed</span>
          {CHANGES.map((c) => <Pill key={c.id} active={change === c.id} onClick={() => setChange(c.id)}>{c.label}</Pill>)}
        </div>
      </div>

      <ol className="mt-4 space-y-1.5">
        {layers.map((l, i) => {
          const rebuilt = i >= cut;
          return (
            <li
              key={l.line}
              className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-md border px-3 py-2 ${rebuilt ? "border-warn bg-warn-soft" : "border-border bg-muted"}`}
            >
              <code className="break-all font-mono text-[0.78rem]">{l.line}</code>
              <span className={`text-xs font-semibold ${rebuilt ? "text-warn" : "text-good"}`}>
                {rebuilt ? `REBUILT${l.seconds ? ` · ${l.seconds}s` : ""}` : "CACHED"}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <div className={`rounded-lg px-3 py-2 ${seconds > 30 ? "bg-bad-soft" : "bg-good-soft"}`}>
          <p className="text-xs text-muted-foreground">Build time</p>
          <p className="font-mono">~{seconds}s</p>
        </div>
        <div className={`rounded-lg px-3 py-2 ${mb > 50 ? "bg-bad-soft" : "bg-good-soft"}`}>
          <p className="text-xs text-muted-foreground">New layers each server must pull</p>
          <p className="font-mono">~{Math.round(mb)} MB</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        {order === "bad" && change === "src"
          ? "A one-line code change reinstalls every dependency, because npm ci sits after COPY . . in the cache chain."
          : change === "src"
            ? "Only the source copy and build rerun. Code changes many times a day, so this is the case to optimise."
            : change === "deps"
              ? "Changing dependencies has to reinstall them either way. That's rare, so it's fine."
              : "A new base image invalidates everything above it. Pin versions so this only happens when you choose."}
      </p>
    </Widget>
  );
}

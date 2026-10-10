"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Env = "development" | "production";
type Layer = "defaults" | "file" | "env" | "flags";
type Values = Partial<Record<Key, string>>;

const KEYS = ["PORT", "LOG_LEVEL", "DB_POOL_SIZE", "DATABASE_URL", "STRIPE_API_KEY"] as const;
type Key = (typeof KEYS)[number];

const LAYERS: Layer[] = ["defaults", "file", "env", "flags"];
const LAYER_LABEL: Record<Layer, string> = {
  defaults: "Defaults (code)",
  file: "config.yaml",
  env: "Env vars",
  flags: "CLI flags",
};

const SECRET: Key[] = ["DATABASE_URL", "STRIPE_API_KEY"];
const REQUIRED: Key[] = ["DATABASE_URL", "STRIPE_API_KEY"];

function sources(env: Env, forgetKey: boolean, typo: boolean): Record<Layer, Values> {
  return {
    defaults: { PORT: "8080", LOG_LEVEL: "info", DB_POOL_SIZE: "10" },
    file: env === "development" ? { LOG_LEVEL: "debug", DB_POOL_SIZE: "10" } : { LOG_LEVEL: "info", DB_POOL_SIZE: "50" },
    env:
      env === "development"
        ? { DATABASE_URL: "postgres://dev:dev@localhost:5432/shop", STRIPE_API_KEY: "sk_test_51Hx", ...(typo ? { DB_POOL_SIZE: "fifty" } : {}) }
        : {
            PORT: "3000",
            DATABASE_URL: "postgres://shop_app:s3cret@db.internal:5432/shop",
            ...(forgetKey ? {} : { STRIPE_API_KEY: "sk_live_9Kq2" }),
            ...(typo ? { DB_POOL_SIZE: "fifty" } : {}),
          },
    flags: { LOG_LEVEL: "debug" },
  };
}

function mask(key: Key, value: string) {
  return SECRET.includes(key) ? `${value.slice(0, 8)}•••` : value;
}

function validate(key: Key, value: string | undefined): string | null {
  if (value === undefined) return REQUIRED.includes(key) ? `${key} is required` : null;
  if ((key === "PORT" || key === "DB_POOL_SIZE") && !/^\d+$/.test(value)) return `${key} must be an integer, got "${value}"`;
  if (key === "LOG_LEVEL" && !["debug", "info", "warn", "error"].includes(value)) return `${key} must be debug, info, warn or error`;
  if (key === "STRIPE_API_KEY" && !value.startsWith("sk_")) return `${key} must start with sk_`;
  return null;
}

export function ConfigPrecedence() {
  const [env, setEnv] = useState<Env>("production");
  const [enabled, setEnabled] = useState<Record<Layer, boolean>>({ defaults: true, file: true, env: true, flags: false });
  const [forgetKey, setForgetKey] = useState(false);
  const [typo, setTypo] = useState(false);

  const layers = sources(env, forgetKey, typo);
  const rows = KEYS.map((key) => {
    let value: string | undefined;
    let from: Layer | undefined;
    for (const layer of LAYERS) {
      const v = layers[layer][key];
      if (enabled[layer] && v !== undefined) {
        value = v;
        from = layer;
      }
    }
    return { key, value, from, error: validate(key, value) };
  });
  const errors = rows.filter((r) => r.error).map((r) => r.error as string);

  return (
    <Widget
      title="Config precedence resolver"
      hint="Later layers override earlier ones. Switch environments, toggle layers, then break something and watch startup validation catch it."
    >
      <div className="flex flex-wrap gap-2">
        <Pill active={env === "development"} onClick={() => setEnv("development")}>Development</Pill>
        <Pill active={env === "production"} onClick={() => setEnv("production")}>Production</Pill>
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Layers (lowest → highest priority)</p>
      <div className="mt-1 flex flex-wrap gap-2">
        {LAYERS.map((layer) => (
          <Pill key={layer} active={enabled[layer]} onClick={() => setEnabled((e) => ({ ...e, [layer]: !e[layer] }))}>
            {LAYER_LABEL[layer]}
          </Pill>
        ))}
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Break it</p>
      <div className="mt-1 flex flex-wrap gap-2">
        <Pill active={forgetKey} onClick={() => setForgetKey((v) => !v)}>Forget STRIPE_API_KEY in prod</Pill>
        <Pill active={typo} onClick={() => setTypo((v) => !v)}>DB_POOL_SIZE=fifty</Pill>
      </div>

      <ul className="mt-4 space-y-2">
        {rows.map((r) => (
          <li key={r.key} className={`rounded-lg border p-2 ${r.error ? "border-bad bg-bad-soft" : "border-border"}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="font-mono text-sm font-semibold">{r.key}</span>
              <span className="text-xs text-muted-foreground">{r.from ? `from ${LAYER_LABEL[r.from]}` : "not set"}</span>
            </div>
            <p className="mt-0.5 break-all font-mono text-[0.8rem]">{r.value === undefined ? "(undefined)" : mask(r.key, r.value)}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {LAYERS.map((layer) => {
                const v = layers[layer][r.key];
                if (v === undefined) return null;
                const winner = r.from === layer;
                return (
                  <span
                    key={layer}
                    className={`rounded px-1.5 py-0.5 text-[0.7rem] ${
                      !enabled[layer] ? "bg-muted text-muted-foreground line-through" : winner ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {LAYER_LABEL[layer]}: {mask(r.key, v)}
                  </span>
                );
              })}
            </div>
          </li>
        ))}
      </ul>

      <div className={`mt-3 rounded-lg border p-3 text-sm ${errors.length ? "border-bad bg-bad-soft" : "border-good bg-good-soft"}`}>
        {errors.length ? (
          <>
            <p className="font-semibold">Startup validation failed. The app refuses to start.</p>
            <ul className="mt-1 list-disc pl-5">
              {errors.map((e) => (
                <li key={e} className="break-all">{e}</li>
              ))}
            </ul>
            <p className="mt-1 text-muted-foreground">With a rolling deploy, the old version keeps serving traffic.</p>
          </>
        ) : (
          <p className="font-semibold">Config valid. Server starts on port {rows[0].value}.</p>
        )}
      </div>
    </Widget>
  );
}

"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Kind = "required" | "type" | "syntactic" | "semantic" | "complex";
type Issue = { field: string; kind: Kind; message: string };

type Raw = {
  email: string;
  age: string;
  dateOfBirth: string;
  password: string;
  passwordConfirmation: string;
  delivery: boolean;
  address: string;
};

/** Fixed "today" so the widget is deterministic. */
const TODAY = "2025-11-05";

const PRESETS: { label: string; raw: Raw }[] = [
  {
    label: "Messy but fixable",
    raw: { email: "  Ada@Example.COM ", age: "34", dateOfBirth: "1991-03-14", password: "correct-horse", passwordConfirmation: "correct-horse", delivery: false, address: "" },
  },
  {
    label: "Lots wrong",
    raw: { email: "ada-at-example", age: "430", dateOfBirth: "2026-01-13", password: "short", passwordConfirmation: "shorter", delivery: true, address: "" },
  },
  {
    label: "Empty form",
    raw: { email: "", age: "", dateOfBirth: "", password: "", passwordConfirmation: "", delivery: false, address: "" },
  },
];

type Clean = { email: string; age: number | string; dateOfBirth: string; password: string; passwordConfirmation: string; shipping: string; address?: string };

function transform(raw: Raw, enabled: boolean): Clean {
  const age = enabled && raw.age.trim() !== "" && !Number.isNaN(Number(raw.age)) ? Number(raw.age) : raw.age;
  return {
    email: enabled ? raw.email.trim().toLowerCase() : raw.email,
    age,
    dateOfBirth: raw.dateOfBirth,
    password: raw.password,
    passwordConfirmation: raw.passwordConfirmation,
    shipping: raw.delivery ? "delivery" : "pickup",
    ...(raw.address.trim() ? { address: enabled ? raw.address.trim() : raw.address } : {}),
  };
}

function validate(c: Clean): Issue[] {
  const out: Issue[] = [];
  if (c.email === "") out.push({ field: "email", kind: "required", message: "email is required" });
  else if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(c.email)) out.push({ field: "email", kind: "syntactic", message: "Invalid email format" });

  if (c.age === "") out.push({ field: "age", kind: "required", message: "age is required" });
  else if (typeof c.age !== "number") out.push({ field: "age", kind: "type", message: `Expected number, received string ("${c.age}")` });
  else if (c.age < 1 || c.age > 120) out.push({ field: "age", kind: "semantic", message: "Age must be between 1 and 120" });

  if (c.dateOfBirth === "") out.push({ field: "dateOfBirth", kind: "required", message: "dateOfBirth is required" });
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(c.dateOfBirth)) out.push({ field: "dateOfBirth", kind: "syntactic", message: "Expected format YYYY-MM-DD" });
  else if (c.dateOfBirth > TODAY) out.push({ field: "dateOfBirth", kind: "semantic", message: "Date of birth cannot be in the future" });

  if (c.password.length < 8) out.push({ field: "password", kind: "syntactic", message: "Must contain at least 8 characters" });
  if (c.passwordConfirmation !== c.password) out.push({ field: "passwordConfirmation", kind: "complex", message: "Passwords don't match" });
  if (c.shipping === "delivery" && !c.address) out.push({ field: "address", kind: "complex", message: "address is required when shipping is delivery" });
  return out;
}

const KIND_STYLE: Record<Kind, string> = {
  required: "bg-bad-soft",
  type: "bg-warn-soft",
  syntactic: "bg-primary/10",
  semantic: "bg-muted",
  complex: "bg-good-soft",
};

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-sm">
      <span className="text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block min-h-10 w-full rounded-lg border border-border bg-card px-3 font-mono text-[0.8rem]"
      />
    </label>
  );
}

export function ValidationPipeline() {
  const [raw, setRaw] = useState<Raw>(PRESETS[0].raw);
  const [transformOn, setTransformOn] = useState(true);
  const [allErrors, setAllErrors] = useState(true);

  const set = (k: keyof Raw) => (v: string) => setRaw((r) => ({ ...r, [k]: v }));
  const clean = transform(raw, transformOn);
  const issues = validate(clean);
  const shown = allErrors ? issues : issues.slice(0, 1);
  const ok = issues.length === 0;

  return (
    <Widget title="Validation pipeline" hint={`Sign-up for the shop. Form fields arrive as strings. "Today" is ${TODAY}. Edit, then watch transform → validate.`}>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <Pill key={p.label} active={raw === p.raw} onClick={() => setRaw(p.raw)}>{p.label}</Pill>
        ))}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="email" value={raw.email} onChange={set("email")} />
        <Field label="age (string from the form)" value={raw.age} onChange={set("age")} />
        <Field label="dateOfBirth" value={raw.dateOfBirth} onChange={set("dateOfBirth")} />
        <Field label="password" value={raw.password} onChange={set("password")} />
        <Field label="passwordConfirmation" value={raw.passwordConfirmation} onChange={set("passwordConfirmation")} />
        <Field label="address" value={raw.address} onChange={set("address")} />
      </div>

      <div className="mt-3 space-y-2 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-24 text-muted-foreground">Shipping</span>
          <Pill active={!raw.delivery} onClick={() => setRaw((r) => ({ ...r, delivery: false }))}>pickup</Pill>
          <Pill active={raw.delivery} onClick={() => setRaw((r) => ({ ...r, delivery: true }))}>delivery</Pill>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-24 text-muted-foreground">Transform</span>
          <Pill active={transformOn} onClick={() => setTransformOn(true)}>On (cast + normalize)</Pill>
          <Pill active={!transformOn} onClick={() => setTransformOn(false)}>Off</Pill>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-24 text-muted-foreground">Errors</span>
          <Pill active={allErrors} onClick={() => setAllErrors(true)}>Report all</Pill>
          <Pill active={!allErrors} onClick={() => setAllErrors(false)}>Stop at first</Pill>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">1 · After transform</p>
          <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-[0.78rem] leading-6">{JSON.stringify(clean, null, 2)}</pre>
        </div>
        <div className={`rounded-lg border p-3 ${ok ? "border-good bg-good-soft" : "border-bad bg-bad-soft"}`}>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">2 · Validate → response</p>
          <p className="font-mono text-sm font-semibold">{ok ? "201 Created" : "400 Bad Request"}</p>
          {ok ? (
            <p className="mt-1 text-sm">Clean data goes to the service layer.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {shown.map((i) => (
                <li key={i.field + i.kind} className="rounded-md bg-card px-2 py-1.5 text-sm">
                  <span className={`mr-2 rounded px-1.5 py-0.5 text-xs ${KIND_STYLE[i.kind]}`}>{i.kind}</span>
                  <span className="font-mono text-[0.78rem]">{i.field}</span>: {i.message}
                </li>
              ))}
              {!allErrors && issues.length > 1 && (
                <li className="text-xs text-muted-foreground">{issues.length - 1} more problem(s) hidden. The user will find them one resubmit at a time.</li>
              )}
            </ul>
          )}
        </div>
      </div>
    </Widget>
  );
}

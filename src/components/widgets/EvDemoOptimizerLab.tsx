"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Kind = "plain" | "sarcasm" | "two asks" | "slang";
type Item = { id: string; kind: Kind; text: string; gold: string };

const TRAIN: Item[] = [
  { id: "T1", kind: "plain", text: "Where is order #4471? It shipped Monday.", gold: "shipping" },
  { id: "T2", kind: "plain", text: "Please refund the duplicate charge on my card.", gold: "refund" },
  { id: "T3", kind: "sarcasm", text: "Love paying for express shipping and waiting 3 weeks. Great job.", gold: "shipping" },
  { id: "T4", kind: "sarcasm", text: "Wow, a 'premium' blender that died in a day. Amazing.", gold: "refund" },
  { id: "T5", kind: "two asks", text: "Can I change my email? Also I want my money back for the mug.", gold: "refund" },
  { id: "T6", kind: "two asks", text: "Box arrived crushed. Refund it, and update my address.", gold: "refund" },
  { id: "T7", kind: "slang", text: "yo my pw reset link is busted, cant get in", gold: "account" },
  { id: "T8", kind: "slang", text: "lemme log in pls, 2fa code never comes", gold: "shipping" },
];

const HELD: Item[] = [
  { id: "H1", kind: "plain", text: "Has my parcel left the warehouse yet?", gold: "shipping" },
  { id: "H2", kind: "plain", text: "I was charged twice, please reverse one.", gold: "refund" },
  { id: "H3", kind: "sarcasm", text: "Fantastic, tracking says delivered and my porch is empty.", gold: "shipping" },
  { id: "H4", kind: "sarcasm", text: "Sure, a jacket with one sleeve is exactly what I ordered.", gold: "refund" },
  { id: "H5", kind: "two asks", text: "Refund the lamp please, and how do I turn off emails?", gold: "refund" },
  { id: "H6", kind: "two asks", text: "Reset my password and refund order #889.", gold: "refund" },
  { id: "H7", kind: "slang", text: "acct locked again smh, help", gold: "account" },
  { id: "H8", kind: "slang", text: "cant sign in on the app, says user not found lol", gold: "account" },
];

const MAX_DEMOS = 3;
type Setup = { spec: boolean; fixed: boolean; strict: boolean };

/** Toy model of what a program with these demos would do on one item, scored by the chosen metric. */
function passes(item: Item, demos: Set<string>, s: Setup): boolean {
  if (!s.strict) return true; // "is the output one of the three labels?" is always true
  if (demos.has(item.id)) return true; // the answer is sitting in the prompt
  if (item.id === "T8" && !s.fixed) return false; // a correct answer disagrees with the wrong gold label
  if (item.kind === "plain") return true;
  if (item.kind === "sarcasm") return demos.has("T3") || demos.has("T4");
  if (item.kind === "two asks") return s.spec; // depends on a policy nobody wrote down
  const good = demos.has("T7") || (demos.has("T8") && s.fixed);
  const bad = demos.has("T8") && !s.fixed;
  return good && !bad;
}

const score = (items: Item[], demos: Set<string>, s: Setup) => items.filter((i) => passes(i, demos, s)).length;

function subsets(): string[][] {
  const ids = TRAIN.map((t) => t.id);
  const out: string[][] = [[]];
  for (const id of ids) for (const prev of [...out]) if (prev.length < MAX_DEMOS) out.push([...prev, id]);
  return out;
}

type Search = { best: number; tied: number; low: number; high: number };

export function EvDemoOptimizerLab() {
  const [demos, setDemos] = useState<Set<string>>(new Set());
  const [spec, setSpec] = useState(false);
  const [fixed, setFixed] = useState(false);
  const [strict, setStrict] = useState(true);
  const [search, setSearch] = useState<Search | null>(null);
  const s: Setup = { spec, fixed, strict };

  const toggle = (id: string) => {
    setSearch(null);
    setDemos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_DEMOS) next.add(id);
      return next;
    });
  };

  const optimize = () => {
    const all = subsets().map((d) => {
      const set = new Set(d);
      return { set, train: score(TRAIN, set, s), held: score(HELD, set, s) };
    });
    const best = Math.max(...all.map((r) => r.train));
    const top = all.filter((r) => r.train === best);
    const helds = top.map((r) => r.held);
    setDemos(top[top.length - 1].set);
    setSearch({ best, tied: top.length, low: Math.min(...helds), high: Math.max(...helds) });
  };

  const change = (f: () => void) => () => {
    setSearch(null);
    f();
  };

  const train = score(TRAIN, demos, s);
  const held = score(HELD, demos, s);
  const gap = train - held;

  let note = "Pick up to 3 training examples as few-shot demos, or let the optimizer search every combination.";
  if (!strict) note = "The metric only checks that the output is a valid label, so every program scores 100%. There is nothing to climb: the optimizer can only be as good as the metric.";
  else if (gap >= 2) note = `Train says ${train}/8, held-out says ${held}/8. Demos sitting in the prompt pass trivially, and the wrong label on T8 is being rewarded. That is overfitting.`;
  else if (!spec && held < 8) note = "The two-request messages keep failing on held-out data. No choice of demos fixes them: the routing policy was never written down.";
  else if (held === 8) note = "Held-out is perfect. The spec is complete, the gold labels are right, and the demos teach patterns instead of answers.";

  const bar = (label: string, n: number) => (
    <div className="min-w-0">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-mono">{Math.round((n / 8) * 100)}%</span>
      </div>
      <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(n / 8) * 100}%` }} />
      </div>
    </div>
  );

  const chip = (i: Item) => {
    const ok = passes(i, demos, s);
    return (
      <span
        key={i.id}
        title={i.text}
        className={`rounded-md px-1.5 py-0.5 font-mono text-[0.7rem] ${ok ? "bg-good-soft" : "bg-bad-soft"} ${demos.has(i.id) ? "ring-1 ring-accent" : ""}`}
      >
        {i.id} {ok ? "pass" : "fail"}
      </span>
    );
  };

  return (
    <Widget title="Toy demo optimizer" hint="A support-ticket router (refund, shipping, account). Choose demos, the spec and the metric; compare train with held-out.">
      <div className="flex flex-wrap gap-2">
        <Pill active={spec} onClick={change(() => setSpec((v) => !v))}>Spec: refund wins on two requests</Pill>
        <Pill active={fixed} onClick={change(() => setFixed((v) => !v))}>Fix T8 gold label</Pill>
        <Pill active={strict} onClick={change(() => setStrict((v) => !v))}>{strict ? "Metric: exact label" : "Metric: valid label only"}</Pill>
      </div>

      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted">Training examples (demo pool)</p>
      <ul className="mt-1 space-y-1">
        {TRAIN.map((t) => (
          <li key={t.id}>
            <label className="flex cursor-pointer items-start gap-2 rounded-md border border-border px-2 py-1.5 text-sm hover:bg-surface-2">
              <input type="checkbox" className="mt-1 accent-accent" checked={demos.has(t.id)} onChange={() => toggle(t.id)} />
              <span className="min-w-0">
                <span className="font-mono text-xs text-muted">{t.id} · {t.kind} · gold: </span>
                <span className={`font-mono text-xs ${t.id === "T8" && !fixed ? "text-bad" : "text-muted"}`}>
                  {t.id === "T8" && fixed ? "account" : t.gold}
                </span>
                <span className="block">{t.text}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={optimize} className="min-h-9 rounded-full border border-accent px-3 text-sm text-accent hover:bg-accent-soft">
          Run optimizer (maximize train score)
        </button>
        <button type="button" onClick={change(() => setDemos(new Set()))} className="min-h-9 rounded-full border border-border px-3 text-sm hover:bg-surface-2">
          Clear demos
        </button>
      </div>
      {search && (
        <p className="mt-2 text-sm text-muted">
          Searched every set of up to 3 demos. {search.tied} tie at the top train score ({search.best}/8); their held-out scores range from {search.low}/8 to {search.high}/8. Train alone can&apos;t tell them apart.
        </p>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {bar("Train (demos come from here)", train)}
        {bar("Held-out (never in the prompt)", held)}
      </div>
      <div className="mt-3 space-y-1.5">
        <div className="flex flex-wrap gap-1">{TRAIN.map(chip)}</div>
        <div className="flex flex-wrap gap-1">{HELD.map(chip)}</div>
      </div>
      <p className={`mt-3 rounded-md px-2 py-1.5 text-sm ${gap >= 2 || !strict ? "bg-warn-soft" : held === 8 ? "bg-good-soft" : "bg-surface-2"}`}>{note}</p>
    </Widget>
  );
}

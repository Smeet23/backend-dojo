"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

const STATES = [
  "ParseRequest", "PlanToolCalls", "GenCustomerArgs", "GetCustomerProfile", "GenRecipeArgs",
  "GetRecipes", "GenWebArgs", "GetWebInfo", "ComposeResponse", "DeliverResponse",
];
const SHORT = ["Parse", "Plan", "GenCust", "GetCust", "GenRec", "GetRec", "GenWeb", "GetWeb", "Compose", "Deliver"];
const S = Object.fromEntries(STATES.map((s, i) => [s, i])) as Record<string, number>;

type Step = { state: string; log: string };
type Trace = { user: string; steps: Step[]; answer: number };

/** Eight traces in the style of the homework set. `answer` = index of the first failing step. */
const TRACES: Trace[] = [
  { user: "I need a gluten-free dinner idea for four.", answer: 2, steps: [
    { state: "ParseRequest", log: "gluten-free, dinner, serves 4" },
    { state: "PlanToolCalls", log: "plan: search recipes" },
    { state: "GenRecipeArgs", log: "Error: unable to generate search parameters" },
    { state: "ComposeResponse", log: "\"Any other restrictions?\"" }] },
  { user: "Suggest a healthy breakfast using oatmeal.", answer: 2, steps: [
    { state: "ParseRequest", log: "healthy, breakfast, must use oatmeal" },
    { state: "PlanToolCalls", log: "plan: search recipes" },
    { state: "GenRecipeArgs", log: "{diet: \"healthy breakfast\"} (no oatmeal)" },
    { state: "GetRecipes", log: "2 results: avocado toast, yogurt parfait" },
    { state: "ComposeResponse", log: "recommends avocado toast and a parfait" }] },
  { user: "I need a gluten-free dinner idea for four.", answer: 4, steps: [
    { state: "ParseRequest", log: "gluten-free, dinner, serves 4" },
    { state: "PlanToolCalls", log: "plan: profile, then recipes" },
    { state: "GenCustomerArgs", log: "{user_id: 4417}" },
    { state: "GetCustomerProfile", log: "profile: gluten-free, likes Thai" },
    { state: "GetRecipes", log: "Error: no gluten-free dinners for 4" },
    { state: "ComposeResponse", log: "\"Try a different cuisine?\"" }] },
  { user: "What vegetarian high-protein meal can I cook tonight?", answer: 3, steps: [
    { state: "ParseRequest", log: "vegetarian, high-protein, tonight" },
    { state: "PlanToolCalls", log: "plan: profile, then recipes" },
    { state: "GenCustomerArgs", log: "{user_id: 902}" },
    { state: "GetCustomerProfile", log: "Error: unable to retrieve profile" },
    { state: "ComposeResponse", log: "suggests lentil curry from memory" }] },
  { user: "Suggest a healthy breakfast using oatmeal.", answer: 2, steps: [
    { state: "ParseRequest", log: "healthy, breakfast, oatmeal" },
    { state: "PlanToolCalls", log: "plan: search recipes" },
    { state: "GetRecipes", log: "Error: unable to retrieve recipes" },
    { state: "ComposeResponse", log: "generic oatmeal tips" }] },
  { user: "Suggest a healthy breakfast using oatmeal.", answer: 5, steps: [
    { state: "ParseRequest", log: "healthy, breakfast, oatmeal" },
    { state: "PlanToolCalls", log: "plan: search recipes" },
    { state: "GenRecipeArgs", log: "{ingredient: \"oats\", meal: \"breakfast\"}" },
    { state: "GetRecipes", log: "3 oatmeal recipes" },
    { state: "ComposeResponse", log: "drafts overnight oats answer" },
    { state: "DeliverResponse", log: "Error: network issue, not sent" }] },
  { user: "Quick vegan lunch with chickpeas?", answer: 4, steps: [
    { state: "ParseRequest", log: "vegan, lunch, quick, chickpeas" },
    { state: "PlanToolCalls", log: "plan: recipes, then web for nutrition" },
    { state: "GenRecipeArgs", log: "{ingredient: \"chickpeas\", diet: \"vegan\"}" },
    { state: "GetRecipes", log: "4 chickpea recipes" },
    { state: "GenWebArgs", log: "{query: \"chickpea futures price\"}" },
    { state: "GetWebInfo", log: "commodity market news" },
    { state: "ComposeResponse", log: "mixes a recipe with grain prices" }] },
  { user: "I need a gluten-free dinner idea for four.", answer: 3, steps: [
    { state: "ParseRequest", log: "gluten-free, dinner, serves 4" },
    { state: "PlanToolCalls", log: "plan: profile, then recipes" },
    { state: "GenCustomerArgs", log: "{user_id: 4417}" },
    { state: "GetRecipes", log: "Error: unable to retrieve recipes" },
    { state: "ComposeResponse", log: "\"Anything to avoid?\"" }] },
];

/** The other 88 homework traces, as (from, to, count). Add the 8 above to get the full 96. */
const REST: [string, string, number][] = [
  ["PlanToolCalls", "GenRecipeArgs", 8], ["GetCustomerProfile", "GetRecipes", 8], ["GenCustomerArgs", "GetRecipes", 7],
  ["GenCustomerArgs", "GetCustomerProfile", 6], ["GetCustomerProfile", "GenRecipeArgs", 7], ["GenRecipeArgs", "GetRecipes", 7],
  ["PlanToolCalls", "GetRecipes", 5], ["PlanToolCalls", "GenCustomerArgs", 6], ["PlanToolCalls", "GetCustomerProfile", 4],
  ["GetRecipes", "GenWebArgs", 2], ["ParseRequest", "GetCustomerProfile", 2], ["GenCustomerArgs", "GenRecipeArgs", 2],
  ["PlanToolCalls", "GetWebInfo", 2], ["PlanToolCalls", "GenWebArgs", 2], ["ParseRequest", "GetRecipes", 2],
  ["GenRecipeArgs", "GenWebArgs", 2], ["GetRecipes", "DeliverResponse", 2], ["GetRecipes", "GetWebInfo", 2],
  ["ParseRequest", "PlanToolCalls", 1], ["GenWebArgs", "ComposeResponse", 1], ["GenCustomerArgs", "GenWebArgs", 1],
  ["GetWebInfo", "ComposeResponse", 1], ["GenCustomerArgs", "GetWebInfo", 1],
  ["GenRecipeArgs", "ComposeResponse", 1], ["PlanToolCalls", "DeliverResponse", 1], ["ParseRequest", "GenCustomerArgs", 1],
  ["ParseRequest", "GenRecipeArgs", 1], ["GenRecipeArgs", "DeliverResponse", 1], ["GenCustomerArgs", "ComposeResponse", 1],
  ["GetRecipes", "ComposeResponse", 1],
];

export function EvTransitionMatrixBuilder() {
  const [picks, setPicks] = useState<(number | null)[]>(TRACES.map(() => null));
  const [cur, setCur] = useState(0);
  const [withRest, setWithRest] = useState(false);
  const [checked, setChecked] = useState(false);

  const n = STATES.length;
  const m = Array.from({ length: n }, () => Array<number>(n).fill(0));
  if (withRest) for (const [f, t, c] of REST) m[S[f]][S[t]] += c;
  picks.forEach((p, i) => {
    if (p === null || p === 0) return;
    const steps = TRACES[i].steps;
    m[S[steps[p - 1].state]][S[steps[p].state]] += 1;
  });
  const colSum = STATES.map((_, j) => m.reduce((a, row) => a + row[j], 0));
  const total = colSum.reduce((a, b) => a + b, 0);
  let hot = { r: -1, c: -1, v: 0 };
  m.forEach((row, r) => row.forEach((v, c) => { if (v > hot.v) hot = { r, c, v }; }));
  const topCol = colSum.indexOf(Math.max(...colSum));
  const labeled = picks.filter((p) => p !== null).length;
  const correct = picks.filter((p, i) => p === TRACES[i].answer).length;

  const t = TRACES[cur];
  const pick = picks[cur];
  const choose = (k: number) => {
    setChecked(false);
    setPicks((prev) => prev.map((p, i) => (i === cur ? k : p)));
  };

  return (
    <Widget
      title="Transition matrix builder"
      hint="Label each failed trace by tapping the first step that went wrong. The step before it becomes the last success, and that edge lands in the matrix."
    >
      <div className="flex flex-wrap gap-1.5">
        {TRACES.map((_, i) => (
          <Pill key={i} active={i === cur} onClick={() => setCur(i)}>
            {i + 1}{picks[i] !== null ? (checked ? (picks[i] === TRACES[i].answer ? " ✓" : " ✗") : " •") : ""}
          </Pill>
        ))}
      </div>

      <div className="mt-3 rounded-lg border border-border p-3">
        <p className="text-sm"><span className="text-muted">User:</span> {t.user}</p>
        <ol className="mt-2 space-y-1.5">
          {t.steps.map((s, k) => {
            const isPick = pick === k;
            const before = pick !== null && k === pick - 1;
            return (
              <li key={k}>
                <button
                  type="button"
                  onClick={() => choose(k)}
                  className={`w-full rounded-md border px-2 py-1.5 text-left text-sm ${
                    isPick ? "border-bad bg-bad-soft" : before ? "border-good bg-good-soft" : "border-border hover:bg-surface-2"
                  }`}
                >
                  <span className="font-mono text-xs font-semibold">{s.state}</span>
                  <span className="ml-2 text-muted">{s.log}</span>
                </button>
              </li>
            );
          })}
        </ol>
        <p className="mt-2 text-xs text-muted">
          {pick === null
            ? "Tap the first step whose output was wrong (not just the first error message)."
            : pick === 0
              ? "Nothing succeeded before this step, so there is no edge to count. Look again."
              : `Edge: ${t.steps[pick - 1].state} → ${t.steps[pick].state}`}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Pill active={withRest} onClick={() => setWithRest((v) => !v)}>Add the other 88 homework traces</Pill>
        <Pill active={checked} onClick={() => setChecked((v) => !v)}>Check my labels</Pill>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="mx-auto border-separate border-spacing-0.5 text-center font-mono text-[10px]">
          <thead>
            <tr>
              <th className="px-1 text-left font-normal text-muted">from ↓ / to →</th>
              {SHORT.map((s, j) => (
                <th key={s} className={`min-w-7 font-normal ${j === topCol && total ? "text-bad" : "text-muted"}`}>{s}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {m.map((row, r) => (
              <tr key={r}>
                <td className="px-1 text-left text-muted">{SHORT[r]}</td>
                {row.map((v, c) => (
                  <td
                    key={c}
                    className={`h-7 rounded ${v ? "" : "bg-surface-2"} ${r === hot.r && c === hot.c ? "ring-2 ring-bad" : ""}`}
                    style={v ? { background: `color-mix(in srgb, var(--bad) ${15 + (70 * v) / Math.max(1, hot.v)}%, transparent)` } : undefined}
                  >
                    {v || ""}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td className="px-1 text-left text-muted">total</td>
              {colSum.map((v, j) => <td key={j} className="font-semibold">{v || ""}</td>)}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-3 rounded-lg bg-surface-2 p-3 text-sm">
        <p>
          Failed traces counted: <span className="font-mono font-semibold">{total}</span>
          {checked && <> · labels matching the reference: <span className="font-mono font-semibold">{correct}/{TRACES.length}</span></>}
        </p>
        <p className="mt-1 text-muted">
          {total === 0
            ? `Label a trace to start filling the matrix (${labeled}/${TRACES.length} labeled).`
            : `Hottest cell: ${STATES[hot.r]} → ${STATES[hot.c]} (${hot.v}). Hottest column: ${STATES[topCol]} (${colSum[topCol]} first failures). ${
                hot.c !== topCol ? "The busiest cell and the busiest column point at different states: read both sets of traces." : "Start by reading the traces in that cell."
              }`}
        </p>
      </div>
    </Widget>
  );
}

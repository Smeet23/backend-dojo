"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Verdict = "PASS" | "FAIL";
type Trace = { diet: string; query: string; recipe: string; human: Verdict; why: string };

const TRACES: Trace[] = [
  { diet: "vegan", query: "Easy vegan dessert", recipe: "Banana oat cookies, vegan chocolate chips", human: "PASS", why: "All plant-based." },
  { diet: "vegetarian", query: "Comfort food without the guilt", recipe: "Lemon herb grilled chicken", human: "FAIL", why: "Chicken is meat." },
  { diet: "gluten-free", query: "Gluten-free stir fry", recipe: "Veggie stir fry with regular soy sauce", human: "FAIL", why: "Regular soy sauce contains wheat." },
  { diet: "keto", query: "Keto meal that won't make me feel gross", recipe: "Garlic butter shrimp with spinach", human: "PASS", why: "No grains, starch or sugar." },
  { diet: "low-carb", query: "Something light but filling", recipe: "Quinoa and roasted veg bowl", human: "FAIL", why: "A cup of quinoa is about 39 g of carbs." },
  { diet: "sugar-free", query: "Sugar-free candy", recipe: "Bliss balls with honey or stevia syrup", human: "FAIL", why: "Offering honey is an added-sugar option." },
  { diet: "dairy-free", query: "Dairy-free dessert, no coconut", recipe: "Oat milk chocolate pudding", human: "PASS", why: "No dairy, no coconut." },
  { diet: "gluten-free", query: "Gluten-free pasta night", recipe: "Rice pasta with tomatoes and dried oregano", human: "PASS", why: "Dried oregano is not a gluten source." },
  { diet: "vegan", query: "Vegan pasta", recipe: "Pasta with nutritional yeast instead of parmesan", human: "PASS", why: "Classic compliant swap." },
  { diet: "pescatarian", query: "Pescatarian dinner for two", recipe: "Baked salmon with lemon and asparagus", human: "PASS", why: "Fish is allowed." },
  { diet: "paleo", query: "Paleo breakfast", recipe: "Sweet potato hash with eggs", human: "PASS", why: "No grains, legumes or dairy." },
  { diet: "raw vegan", query: "Raw vegan soup that's warm", recipe: "Blended carrot soup warmed to 110°F", human: "PASS", why: "Stays under the 118°F raw limit." },
];

const flip = (v: Verdict): Verdict => (v === "PASS" ? "FAIL" : "PASS");
const fromWrong = (wrong: number[]) => TRACES.map((t, i) => (wrong.includes(i) ? flip(t.human) : t.human));

const PRESETS: { name: string; note: string; judge: Verdict[] }[] = [
  { name: "Draft prompt", note: "Lenient: no false fails, but it waves through hidden gluten and a carb-heavy grain. High agreement, weak TNR.", judge: fromWrong([2, 4]) },
  { name: "Strict rewrite", note: "Catches every failure but invents risk: fails dried oregano and the warmed raw soup. TNR fixed, TPR drops.", judge: fromWrong([7, 11]) },
  { name: "Definitions + examples", note: "Clearer definitions and a raw-vegan example: one miss left on 12 traces.", judge: fromWrong([11]) },
  { name: "Always PASS", note: "Agrees with you on 8 of 12 traces and catches nothing.", judge: TRACES.map(() => "PASS") },
];

const pct = (x: number) => (Number.isFinite(x) ? `${Math.round(x * 1000) / 10}%` : "n/a");

function Cell({ label, n, good }: { label: string; n: number; good: boolean }) {
  return (
    <div className={`rounded-md p-2 text-center ${good ? "bg-good-soft" : n > 0 ? "bg-bad-soft" : "bg-surface-2"}`}>
      <p className="text-[0.7rem] text-muted">{label}</p>
      <p className="font-mono text-lg">{n}</p>
    </div>
  );
}

export function EvJudgeConfusionLab() {
  const [preset, setPreset] = useState(0);
  const [judge, setJudge] = useState<Verdict[]>(PRESETS[0].judge);

  const toggle = (i: number) => {
    setPreset(-1);
    setJudge((j) => j.map((v, k) => (k === i ? flip(v) : v)));
  };

  let tp = 0, fn = 0, fp = 0, tn = 0;
  TRACES.forEach((t, i) => {
    if (t.human === "PASS") {
      if (judge[i] === "PASS") tp++;
      else fn++;
    } else if (judge[i] === "FAIL") tn++;
    else fp++;
  });
  const tpr = tp / (tp + fn);
  const tnr = tn / (tn + fp);
  const acc = (tp + tn) / TRACES.length;
  const judgedPass = (tp + fp) / TRACES.length;
  const truePass = (tp + fn) / TRACES.length;

  return (
    <Widget
      title="Judge vs human"
      hint="Twelve dev traces with your labels. Pick a judge version, or tap a trace to flip the judge's verdict, and watch the confusion matrix."
    >
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p, k) => (
          <Pill
            key={p.name}
            active={preset === k}
            onClick={() => {
              setPreset(k);
              setJudge(p.judge);
            }}
          >
            {p.name}
          </Pill>
        ))}
      </div>
      <p className="mt-2 min-h-10 text-sm text-muted">{preset >= 0 ? PRESETS[preset].note : "Custom judge: your edits."}</p>

      <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
        {TRACES.map((t, i) => {
          const ok = judge[i] === t.human;
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => toggle(i)}
                className={`w-full rounded-lg border px-2.5 py-1.5 text-left text-sm transition-colors ${
                  ok ? "border-border bg-surface hover:bg-surface-2" : "border-bad bg-bad-soft"
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate font-semibold">{t.diet}</span>
                  <span className="shrink-0 font-mono text-xs">
                    you {t.human} · judge {judge[i]}
                  </span>
                </span>
                <span className="block truncate text-xs text-muted">&ldquo;{t.query}&rdquo; → {t.recipe}</span>
                {!ok && <span className="block text-xs">{t.why}</span>}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <div className="grid grid-cols-[auto_1fr_1fr] items-center gap-1.5 text-xs">
            <span />
            <span className="text-center text-muted">judge PASS</span>
            <span className="text-center text-muted">judge FAIL</span>
            <span className="text-muted">you PASS</span>
            <Cell label="TP" n={tp} good />
            <Cell label="FN (false fail)" n={fn} good={false} />
            <span className="text-muted">you FAIL</span>
            <Cell label="FP (false pass)" n={fp} good={false} />
            <Cell label="TN" n={tn} good />
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          {[
            ["TPR", pct(tpr), `${tp}/${tp + fn}`],
            ["TNR", pct(tnr), `${tn}/${tn + fp}`],
            ["Accuracy", pct(acc), `${tp + tn}/12`],
            ["Judged PASS", pct(judgedPass), `true ${pct(truePass)}`],
          ].map(([k, v, sub]) => (
            <div key={k} className="rounded-md border border-border p-2">
              <dt className="text-xs text-muted">{k}</dt>
              <dd className="font-mono text-lg">{v}</dd>
              <dd className="text-[0.7rem] text-muted">{sub}</dd>
            </div>
          ))}
        </dl>
      </div>

      <p className={`mt-3 rounded-md px-2 py-1.5 text-sm ${tnr < 0.75 ? "bg-warn-soft" : "bg-surface-2"}`}>
        {tnr < 0.75
          ? `Accuracy says ${pct(acc)}, but the judge lets ${fp} of 4 real failures through. With only 4 fails here, each one moves TNR by 25 points.`
          : fn > 0
            ? `The judge catches the failures but rejects ${fn} good recipe${fn > 1 ? "s" : ""}: tighten what counts as evidence of a violation.`
            : "Judge and human agree on all 12. On a real dev set, check for leaked examples before you celebrate."}
      </p>
    </Widget>
  );
}

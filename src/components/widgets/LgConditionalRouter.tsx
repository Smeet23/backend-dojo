"use client";

import { useState, type ReactNode } from "react";
import { Pill, Widget } from "./Widget";

type Scenario = "quadratic" | "review";
type Guard = "plain" | "literal";

const QUAD_PRESETS: { a: number; b: number; c: number }[] = [
  { a: 4, b: -5, c: -4 },
  { a: 1, b: 2, c: 1 },
  { a: 2, b: 3, c: 5 },
  { a: 1, b: -3, c: 2 },
];

const REVIEWS = [
  { text: "Setup took two minutes and the offline mode just works. Love it.", sentiment: "positive", diagnosis: null },
  { text: "Login spins forever since yesterday's update. I can't open my notes at all!", sentiment: "negative", diagnosis: { issue_type: "Bug", tone: "frustrated", urgency: "high" } },
  { text: "The new menu buries export three levels deep. Annoying, but I'll live.", sentiment: "negative", diagnosis: { issue_type: "UX", tone: "annoyed", urgency: "low" } },
] as const;

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(3));
const signed = (n: number) => (n < 0 ? `- ${Math.abs(n)}` : `+ ${n}`);

function Branch({ name, chosen, children }: { name: string; chosen: boolean; children?: ReactNode }) {
  return (
    <div className={`min-w-0 rounded-lg border p-2 text-xs ${chosen ? "border-accent bg-accent-soft" : "border-dashed border-border text-muted"}`}>
      <p className="font-mono font-semibold break-all">{name}</p>
      <p className="mt-0.5">{chosen ? children : "skipped"}</p>
    </div>
  );
}

export function LgConditionalRouter() {
  const [scenario, setScenario] = useState<Scenario>("quadratic");
  const [coef, setCoef] = useState(QUAD_PRESETS[0]);
  const [review, setReview] = useState(0);
  const [typo, setTypo] = useState(false);
  const [guard, setGuard] = useState<Guard>("literal");

  const bump = (k: "a" | "b" | "c", d: number) =>
    setCoef((c) => {
      let v = Math.max(-9, Math.min(9, c[k] + d));
      if (k === "a" && v === 0) v = d > 0 ? 1 : -1; // a = 0 is not a quadratic
      return { ...c, [k]: v };
    });

  // Quadratic route
  const D = coef.b * coef.b - 4 * coef.a * coef.c;
  const quadRoute = D > 0 ? "real_roots" : D === 0 ? "repeated_root" : "no_real_roots";
  const quadResult =
    quadRoute === "real_roots"
      ? `Two real roots: ${fmt((-coef.b + Math.sqrt(D)) / (2 * coef.a))} and ${fmt((-coef.b - Math.sqrt(D)) / (2 * coef.a))}`
      : quadRoute === "repeated_root"
        ? `One repeated root: ${fmt(-coef.b / (2 * coef.a))}`
        : "No real roots";

  // Review route
  const r = REVIEWS[review];
  const reviewRoute = r.sentiment === "positive" ? "positive_reply" : "run_diagnosis";

  const route = scenario === "quadratic" ? quadRoute : reviewRoute;
  const returned = typo ? (scenario === "quadratic" ? "real_root" : "diagnosis") : route;
  const broken = typo;

  return (
    <Widget title="Conditional edge router" hint="The router function reads the state and returns the name of the next node. Change the input and watch which single branch runs.">
      <div className="flex flex-wrap gap-2">
        <Pill active={scenario === "quadratic"} onClick={() => setScenario("quadratic")}>Quadratic solver</Pill>
        <Pill active={scenario === "review"} onClick={() => setScenario("review")}>Review triage (LLM)</Pill>
      </div>

      {scenario === "quadratic" ? (
        <div className="mt-3">
          <p className="font-mono text-sm">
            {coef.a}x² {signed(coef.b)}x {signed(coef.c)} = 0
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(["a", "b", "c"] as const).map((k) => (
              <div key={k} className="flex items-center gap-1 rounded-lg border border-border px-1">
                <button type="button" onClick={() => bump(k, -1)} className="min-h-10 min-w-10 rounded text-lg hover:bg-surface-2" aria-label={`decrease ${k}`}>−</button>
                <span className="w-12 text-center font-mono text-sm">{k}={coef[k]}</span>
                <button type="button" onClick={() => bump(k, 1)} className="min-h-10 min-w-10 rounded text-lg hover:bg-surface-2" aria-label={`increase ${k}`}>+</button>
              </div>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {QUAD_PRESETS.map((p, i) => (
              <Pill key={i} active={p.a === coef.a && p.b === coef.b && p.c === coef.c} onClick={() => setCoef(p)}>
                {p.a}, {p.b}, {p.c}
              </Pill>
            ))}
          </div>
          <p className="mt-2 rounded bg-surface-2 px-2 py-1 font-mono text-[0.75rem]">
            calculate_discriminant → discriminant = {coef.b}² − 4·{coef.a}·{coef.c} = {D}
          </p>
        </div>
      ) : (
        <div className="mt-3">
          <div className="flex flex-col gap-2">
            {REVIEWS.map((rv, i) => (
              <button key={i} type="button" onClick={() => setReview(i)} className={`min-h-10 rounded-lg border px-3 py-2 text-left text-sm ${review === i ? "border-accent bg-accent-soft" : "border-border hover:bg-surface-2"}`}>
                “{rv.text}”
              </button>
            ))}
          </div>
          <p className="mt-2 rounded bg-surface-2 px-2 py-1 font-mono text-[0.75rem]">
            find_sentiment → sentiment = &quot;{r.sentiment}&quot; (structured output)
          </p>
        </div>
      )}

      <pre className="mt-3 overflow-x-auto rounded-lg bg-surface-2 p-3 font-mono text-[0.72rem]">
        {scenario === "quadratic"
          ? `def route_by_discriminant(state)${guard === "literal" ? ' -> Literal[\n        "real_roots", "repeated_root", "no_real_roots"]' : ""}:
    if state["discriminant"] > 0:
        return "${typo ? "real_root" : "real_roots"}"
    elif state["discriminant"] == 0:
        return "repeated_root"
    return "no_real_roots"`
          : `def route_by_sentiment(state)${guard === "literal" ? ' -> Literal[\n        "positive_reply", "run_diagnosis"]' : ""}:
    if state["sentiment"] == "positive":
        return "positive_reply"
    return "${typo ? "diagnosis" : "run_diagnosis"}"`}
      </pre>
      <p className="mt-1 text-sm">
        Router returned <span className="font-mono">&quot;{returned}&quot;</span>
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {scenario === "quadratic" ? (
          <>
            <Branch name="real_roots" chosen={!broken && route === "real_roots"}>{quadResult}</Branch>
            <Branch name="repeated_root" chosen={!broken && route === "repeated_root"}>{quadResult}</Branch>
            <Branch name="no_real_roots" chosen={!broken && route === "no_real_roots"}>{quadResult}</Branch>
          </>
        ) : (
          <>
            <Branch name="positive_reply" chosen={!broken && route === "positive_reply"}>Warm thank-you, asks for a public rating.</Branch>
            <Branch name="run_diagnosis → negative_reply" chosen={!broken && route === "run_diagnosis"}>
              {r.diagnosis ? `issue=${r.diagnosis.issue_type}, tone=${r.diagnosis.tone}, urgency=${r.diagnosis.urgency} → empathetic fix-it reply` : ""}
            </Branch>
          </>
        )}
      </div>

      {broken && (
        <div className={`mt-3 rounded-lg p-3 text-sm ${guard === "literal" ? "bg-warn-soft" : "bg-bad-soft"}`}>
          {guard === "literal" ? (
            <p>
              <span className="font-mono">KeyError: &apos;{returned}&apos;</span>. The declared destinations don&apos;t include that name, so the run fails loudly at the router. Annoying, but you find the typo in seconds.
            </p>
          ) : (
            <p>
              No exception. LangGraph logs a warning (&quot;wrote to unknown channel branch:to:{returned}, ignoring it&quot;), no branch runs, and invoke() returns a state with <span className="font-mono">result</span> missing. This is the bug that reaches production.
            </p>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <Pill active={typo} onClick={() => setTypo((t) => !t)}>Break it: typo in router {typo ? "on" : "off"}</Pill>
        <Pill active={guard === "literal"} onClick={() => setGuard("literal")}>Literal return type</Pill>
        <Pill active={guard === "plain"} onClick={() => setGuard("plain")}>Plain str, no map</Pill>
      </div>
    </Widget>
  );
}

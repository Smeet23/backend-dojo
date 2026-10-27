"use client";

import { useMemo, useState } from "react";
import { Pill, Widget } from "./Widget";

const INTENTS = ["Check availability", "Schedule tour", "Reschedule tour", "Pet policy", "Maintenance request", "Rent balance"] as const;
const PERSONAS = ["Prospect, budget", "Prospect, luxury", "Current resident", "Former resident"] as const;
const SCENARIOS = ["Clear, all details", "Ambiguous", "Terse or typo-ridden", "Multi-part"] as const;

type Intent = (typeof INTENTS)[number];
type Persona = (typeof PERSONAS)[number];
type Scenario = (typeof SCENARIOS)[number];
type Tuple = { intent: Intent; persona: Persona; scenario: Scenario };

const PHRASES: Record<Intent, { clear: string; vague: string; terse: string }> = {
  "Check availability": { clear: "Do you have a 1-bed, 1-bath available before March 15?", vague: "What do you have open?", terse: "1bd avail?? march" },
  "Schedule tour": { clear: "Can I tour on Saturday at 11am?", vague: "I'd like to come see the place sometime.", terse: "tour sat" },
  "Reschedule tour": { clear: "Please move my Thursday 3pm tour to Friday at 4pm.", vague: "Something came up, can we change my visit?", terse: "cant make it thurs. fri?" },
  "Pet policy": { clear: "Do you allow two cats, and what is the pet deposit?", vague: "Are you pet friendly?", terse: "dogs ok? big one" },
  "Maintenance request": { clear: "My kitchen sink in unit 204 has been leaking since last night.", vague: "Something is wrong in my bathroom.", terse: "ac broke again" },
  "Rent balance": { clear: "What is my current balance and when is it due?", vague: "Do I owe anything?", terse: "balance?" },
};

const PERSONA_CONTEXT: Record<Persona, string> = {
  "Prospect, budget": "Trying to keep it under $1,600. ",
  "Prospect, luxury": "Looking for a top-floor unit with a view. ",
  "Current resident": "",
  "Former resident": "I moved out in June. ",
};

/** Combinations a reviewer would discard as implausible. */
function unrealistic(t: Tuple): string | null {
  const prospect = t.persona.startsWith("Prospect");
  if (prospect && (t.intent === "Maintenance request" || t.intent === "Rent balance")) return "prospects have no unit or balance";
  if (t.persona === "Former resident" && (t.intent === "Maintenance request" || t.intent === "Schedule tour" || t.intent === "Reschedule tour")) return "former residents rarely do this";
  return null;
}

function toQuery(t: Tuple): string {
  const p = PHRASES[t.intent];
  const ctx = PERSONA_CONTEXT[t.persona];
  if (t.scenario === "Clear, all details") return ctx + p.clear;
  if (t.scenario === "Ambiguous") return ctx + p.vague;
  if (t.scenario === "Terse or typo-ridden") return p.terse;
  const other = INTENTS[(INTENTS.indexOf(t.intent) + 3) % INTENTS.length];
  return `${ctx}${p.clear} Also, ${PHRASES[other].vague.charAt(0).toLowerCase()}${PHRASES[other].vague.slice(1)}`;
}

function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

export function EvTupleGenerator() {
  const [intents, setIntents] = useState<Intent[]>(["Check availability", "Schedule tour", "Reschedule tour", "Maintenance request"]);
  const [personas, setPersonas] = useState<Persona[]>(["Prospect, budget", "Current resident"]);
  const [scenarios, setScenarios] = useState<Scenario[]>(["Clear, all details", "Ambiguous", "Terse or typo-ridden"]);
  const [showDropped, setShowDropped] = useState(false);

  const { kept, dropped } = useMemo(() => {
    const all: Tuple[] = [];
    for (const intent of INTENTS.filter((x) => intents.includes(x)))
      for (const persona of PERSONAS.filter((x) => personas.includes(x)))
        for (const scenario of SCENARIOS.filter((x) => scenarios.includes(x))) all.push({ intent, persona, scenario });
    return { kept: all.filter((t) => !unrealistic(t)), dropped: all.filter((t) => unrealistic(t)) };
  }, [intents, personas, scenarios]);

  const total = kept.length + dropped.length;
  const perTuple = kept.length ? Math.ceil(100 / kept.length) : 0;

  const group = (label: string, values: readonly string[], selected: string[], onToggle: (v: string) => void) => (
    <div className="mt-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {values.map((v) => (
          <Pill key={v} active={selected.includes(v)} onClick={() => onToggle(v)}>
            {v}
          </Pill>
        ))}
      </div>
    </div>
  );

  return (
    <Widget title="Synthetic query generator" hint="Pick values for each dimension. Every combination is a tuple; implausible tuples get filtered; each kept tuple becomes a natural-language query.">
      {group("Dimension 1: intent", INTENTS, intents, (v) => setIntents((l) => toggle(l, v as Intent)))}
      {group("Dimension 2: caller persona", PERSONAS, personas, (v) => setPersonas((l) => toggle(l, v as Persona)))}
      {group("Dimension 3: scenario", SCENARIOS, scenarios, (v) => setScenarios((l) => toggle(l, v as Scenario)))}

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-surface-2 p-2">
          <p className="font-mono text-lg font-semibold">{total}</p>
          <p className="text-[0.7rem] text-muted">tuples (cross product)</p>
        </div>
        <div className="rounded-lg bg-warn-soft p-2">
          <p className="font-mono text-lg font-semibold">{dropped.length}</p>
          <p className="text-[0.7rem] text-muted">dropped in review</p>
        </div>
        <div className="rounded-lg bg-good-soft p-2">
          <p className="font-mono text-lg font-semibold">{kept.length}</p>
          <p className="text-[0.7rem] text-muted">kept</p>
        </div>
      </div>
      <p className="mt-2 text-sm text-muted">
        {kept.length === 0
          ? "Select at least one value in every dimension."
          : kept.length >= 100
            ? "Over 100 tuples: sample about 100 of them rather than running all."
            : `To reach about 100 queries, write ${perTuple} differently phrased ${perTuple === 1 ? "query" : "queries"} per kept tuple.`}
      </p>

      <div className="mt-3 flex gap-2">
        <Pill active={!showDropped} onClick={() => setShowDropped(false)}>Kept tuples and queries</Pill>
        <Pill active={showDropped} onClick={() => setShowDropped(true)}>Dropped tuples</Pill>
      </div>
      <ul className="mt-2 max-h-72 space-y-1.5 overflow-y-auto">
        {(showDropped ? dropped : kept).slice(0, 40).map((t) => (
          <li key={`${t.intent}|${t.persona}|${t.scenario}`} className={`rounded-md border border-border px-2 py-1.5 text-sm ${showDropped ? "bg-warn-soft" : "bg-surface"}`}>
            <p className="font-mono text-[0.7rem] text-muted break-words">
              ({t.intent}, {t.persona}, {t.scenario})
            </p>
            <p className="break-words">{showDropped ? `Dropped: ${unrealistic(t)}` : `"${toQuery(t)}"`}</p>
          </li>
        ))}
        {(showDropped ? dropped : kept).length > 40 && <li className="text-xs text-muted">and {(showDropped ? dropped : kept).length - 40} more</li>}
      </ul>
      <p className="mt-2 text-xs text-muted">The queries here come from templates. In practice a second LLM prompt writes them, and you read every one before running the bot.</p>
    </Widget>
  );
}

"use client";

import { useState } from "react";
import { Pill, Widget } from "./Widget";

type Part = {
  key: string;
  label: string;
  need: "always" | "format" | "optional";
  text: string;
  gap: string;
};

const PARTS: Part[] = [
  {
    key: "role",
    label: "Role and objective",
    need: "always",
    text: "You are a friendly home-cooking assistant. Your goal is to suggest one practical recipe that fits the user's request.",
    gap: "Who is it, and what is it for? Tone and scope drift: some replies are lectures on nutrition, some are one-liners.",
  },
  {
    key: "rules",
    label: "Rules (always / never)",
    need: "always",
    text: "Rules:\n- \"Easy\" means at most 8 ingredients and 30 minutes.\n- Always give quantities for every ingredient.\n- Never include an ingredient the user is allergic to.\n- If the request conflicts (e.g. \"quick\" roast), ask before answering.",
    gap: "What does \"easy\" mean? Are quantities required? What about allergies or conflicting requests? The model guesses, differently each time.",
  },
  {
    key: "context",
    label: "Context",
    need: "always",
    text: "User profile:\n<profile>diet: vegetarian; allergies: peanuts; skill: beginner; pantry: rice, eggs, spinach</profile>",
    gap: "It can't respect a peanut allergy or use the pantry it was never shown.",
  },
  {
    key: "examples",
    label: "Few-shot example",
    need: "always",
    text: "Example:\n<query>something warm with eggs</query>\n<answer>## Spinach egg fried rice ... (full ideal answer)</answer>",
    gap: "No picture of a good answer, so length, level of detail and style vary from reply to reply.",
  },
  {
    key: "reasoning",
    label: "Reasoning steps",
    need: "optional",
    text: "Before answering, check every constraint (diet, allergies, time), then choose a dish, then write it out.",
    gap: "Usually fine to skip on modern reasoning models. Useful on older or smaller models for multi-constraint requests.",
  },
  {
    key: "format",
    label: "Output format",
    need: "format",
    text: "Respond in Markdown with exactly these headings: ## Name, ### Ingredients, ### Steps (numbered).",
    gap: "Free-form output. Your parser breaks and \"failures\" in error analysis are really just a missing instruction.",
  },
  {
    key: "delims",
    label: "Delimiters",
    need: "optional",
    text: "(Sections separated with headings and <tags> as above.)",
    gap: "Fine for a short prompt. In long prompts, unmarked sections blur together and context gets mistaken for instructions.",
  },
];

const BASE = "Suggest a recipe for {user_query}.";

export function EvPromptBuilder() {
  const [on, setOn] = useState<Record<string, boolean>>({});
  const [structured, setStructured] = useState(false);

  const required = PARTS.filter((p) => p.need === "always" || (p.need === "format" && !structured));
  const missingReq = required.filter((p) => !on[p.key]);
  const missingOpt = PARTS.filter((p) => !on[p.key] && !required.includes(p));
  const covered = required.length - missingReq.length;

  const prompt = [
    ...PARTS.filter((p) => on[p.key] && p.key !== "delims").map((p) => p.text),
    on.role ? "Request: {user_query}" : BASE,
  ].join("\n\n");

  return (
    <Widget title="Fix the vague prompt" hint={`Start from "${BASE}" and add components. Watch what the model no longer has to guess.`}>
      <div className="flex flex-wrap gap-2">
        {PARTS.map((p) => (
          <Pill key={p.key} active={!!on[p.key]} onClick={() => setOn((s) => ({ ...s, [p.key]: !s[p.key] }))}>
            {p.label}
          </Pill>
        ))}
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={structured} onChange={(e) => setStructured(e.target.checked)} className="h-4 w-4" />
        Using a structured-outputs / tool-calling API (schema enforced for you)
      </label>

      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-muted">
          <span>Essential components</span>
          <span>
            {covered}/{required.length}
          </span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2">
          <div
            className={`h-full transition-all ${missingReq.length === 0 ? "bg-good" : "bg-warn"}`}
            style={{ width: `${(covered / required.length) * 100}%` }}
          />
        </div>
      </div>

      <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-surface-2 p-3 font-mono text-[0.72rem] leading-relaxed">
        {prompt}
      </pre>

      {missingReq.length > 0 ? (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">What the model must still guess</p>
          {missingReq.map((p) => (
            <p key={p.key} className="rounded-md bg-warn-soft px-3 py-2 text-sm">
              <span className="font-semibold">{p.label}: </span>
              {p.gap}
            </p>
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-md bg-good-soft px-3 py-2 text-sm">
          A solid first draft. Now run it on varied queries and start error analysis: the failures you find will be real ones, not missing
          instructions.
        </p>
      )}

      {missingOpt.length > 0 && (
        <div className="mt-3 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Optional, add if it helps</p>
          {missingOpt.map((p) => (
            <p key={p.key} className="text-sm text-muted">
              <span className="font-medium text-text">{p.label}: </span>
              {p.need === "format" ? "Your API already enforces the schema, so describing it in prose is optional." : p.gap}
            </p>
          ))}
        </div>
      )}
    </Widget>
  );
}

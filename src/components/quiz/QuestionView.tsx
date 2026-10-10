"use client";

import { useMemo } from "react";
import type { Question, Response } from "@/lib/types";
import { shuffle } from "@/lib/quiz";

type Props = {
  question: Question;
  response: Response;
  onChange: (r: Response) => void;
  /** After "Check": inputs lock and show right/wrong. */
  checked: boolean;
};

export function emptyResponse(q: Question): Response {
  switch (q.type) {
    case "scenario":
      return { type: "scenario", values: q.fields.map(() => "") };
    case "mcq":
      return { type: "mcq", value: "" };
    case "order":
      return { type: "order", sequence: [] };
  }
}

export function isComplete(q: Question, r: Response): boolean {
  if (q.type === "scenario" && r.type === "scenario") return r.values.every(Boolean);
  if (q.type === "mcq" && r.type === "mcq") return r.value !== "";
  if (q.type === "order" && r.type === "order") return r.sequence.length === q.steps.length;
  return false;
}

export function QuestionView({ question, response, onChange, checked }: Props) {
  if (question.type === "scenario" && response.type === "scenario") {
    return (
      <div className="space-y-3">
        {question.fields.map((field, i) => {
          const value = response.values[i];
          const right = value === field.answer;
          return (
            <label key={field.label} className="block">
              <span className="mb-1 block text-sm font-medium">{field.label}</span>
              <select
                value={value}
                disabled={checked}
                onChange={(e) => {
                  const values = [...response.values];
                  values[i] = e.target.value;
                  onChange({ type: "scenario", values });
                }}
                className={`min-h-11 w-full rounded-lg border bg-surface px-3 text-base sm:text-sm ${
                  checked ? (right ? "border-good bg-good-soft" : "border-bad bg-bad-soft") : "border-border"
                }`}
              >
                <option value="">Choose…</option>
                {field.options.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
              {checked && !right && (
                <span className="mt-1 block text-sm text-good">Correct: <code className="font-mono">{field.answer}</code></span>
              )}
            </label>
          );
        })}
      </div>
    );
  }

  if (question.type === "mcq" && response.type === "mcq") {
    return (
      <div className="space-y-2" role="radiogroup">
        {question.options.map((o) => {
          const picked = response.value === o;
          const right = o === question.answer;
          const style = checked
            ? right
              ? "border-good bg-good-soft"
              : picked
                ? "border-bad bg-bad-soft"
                : "border-border opacity-60"
            : picked
              ? "border-accent bg-accent-soft"
              : "border-border hover:bg-surface-2";
          return (
            <button
              key={o}
              type="button"
              role="radio"
              aria-checked={picked}
              disabled={checked}
              onClick={() => onChange({ type: "mcq", value: o })}
              className={`block min-h-11 w-full rounded-lg border px-3 py-2 text-left text-sm ${style}`}
            >
              {o}
            </button>
          );
        })}
      </div>
    );
  }

  if (question.type === "order" && response.type === "order") {
    return <OrderInput question={question} sequence={response.sequence} checked={checked} onChange={(sequence) => onChange({ type: "order", sequence })} />;
  }

  return null;
}

function OrderInput({
  question,
  sequence,
  checked,
  onChange,
}: {
  question: Extract<Question, { type: "order" }>;
  sequence: string[];
  checked: boolean;
  onChange: (s: string[]) => void;
}) {
  // Shuffle once per question so the pool order doesn't give the answer away.
  const pool = useMemo(() => shuffle(question.steps), [question]);
  const remaining = pool.filter((s) => !sequence.includes(s));

  return (
    <div>
      <p className="mb-2 text-sm text-muted">Tap the steps in the order they happen. Tap a placed step to remove it.</p>
      <ol className="mb-3 space-y-2">
        {sequence.map((s, i) => {
          const right = question.steps[i] === s;
          return (
            <li key={s}>
              <button
                type="button"
                disabled={checked}
                onClick={() => onChange(sequence.filter((x) => x !== s))}
                className={`flex min-h-11 w-full items-start gap-2 rounded-lg border px-3 py-2 text-left text-sm ${
                  checked ? (right ? "border-good bg-good-soft" : "border-bad bg-bad-soft") : "border-accent bg-accent-soft"
                }`}
              >
                <span className="font-mono font-semibold">{i + 1}.</span>
                <span>{s}</span>
              </button>
            </li>
          );
        })}
        {sequence.length === 0 && <li className="rounded-lg border border-dashed border-border px-3 py-3 text-sm text-muted">Your order appears here</li>}
      </ol>
      {!checked && (
        <div className="space-y-2">
          {remaining.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange([...sequence, s])}
              className="block min-h-11 w-full rounded-lg border border-border px-3 py-2 text-left text-sm hover:bg-surface-2"
            >
              {s}
            </button>
          ))}
        </div>
      )}
      {checked && sequence.some((s, i) => question.steps[i] !== s) && (
        <div className="mt-2 rounded-lg bg-surface-2 px-3 py-2 text-sm">
          <p className="font-semibold">Correct order</p>
          <ol className="ml-5 list-decimal">
            {question.steps.map((s) => <li key={s}>{s}</li>)}
          </ol>
        </div>
      )}
    </div>
  );
}

"use client";

import { useId, useMemo } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import type { Question, Response } from "@/lib/types";
import { shuffle } from "@/lib/quiz";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

const resultTone = (right: boolean) => (right ? "border-good bg-good-soft" : "border-bad bg-bad-soft");

export function QuestionView({ question, response, onChange, checked }: Props) {
  const id = useId();

  if (question.type === "scenario" && response.type === "scenario") {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {question.fields.map((field, i) => {
          const value = response.values[i];
          const right = value === field.answer;
          const fieldId = `${id}-${i}`;
          return (
            <div key={field.label} className={cn("space-y-1.5", question.fields.length % 2 === 1 && i === question.fields.length - 1 && "sm:col-span-2")}>
              <Label htmlFor={fieldId}>{field.label}</Label>
              <Select
                value={value || undefined}
                disabled={checked}
                onValueChange={(v) => {
                  const values = [...response.values];
                  values[i] = v;
                  onChange({ type: "scenario", values });
                }}
              >
                <SelectTrigger id={fieldId} className={cn("h-11 w-full", checked && resultTone(right))}>
                  <SelectValue placeholder="Choose…" />
                </SelectTrigger>
                <SelectContent>
                  {field.options.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {checked && !right && (
                <p className="text-sm text-good">
                  Correct: <code className="font-mono">{field.answer}</code>
                </p>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if (question.type === "mcq" && response.type === "mcq") {
    return (
      <RadioGroup value={response.value} onValueChange={(v) => onChange({ type: "mcq", value: v })} disabled={checked} className="gap-2">
        {question.options.map((o, i) => {
          const picked = response.value === o;
          const right = o === question.answer;
          const optionId = `${id}-o${i}`;
          return (
            <Label
              key={o}
              htmlFor={optionId}
              className={cn(
                "flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm leading-snug font-normal transition-colors",
                checked
                  ? right
                    ? "border-good bg-good-soft"
                    : picked
                      ? "border-bad bg-bad-soft"
                      : "opacity-60"
                  : picked
                    ? "border-primary bg-primary/5"
                    : "hover:bg-accent/60",
                checked && "cursor-default",
              )}
            >
              <RadioGroupItem id={optionId} value={o} className="mt-0.5" />
              <span className="flex-1">{o}</span>
              {checked && right && <CheckCircle2 className="size-4 shrink-0 text-good" />}
              {checked && picked && !right && <XCircle className="size-4 shrink-0 text-bad" />}
            </Label>
          );
        })}
      </RadioGroup>
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
      <p className="mb-3 text-sm text-muted-foreground">Tap the steps in the order they happen. Tap a placed step to remove it.</p>
      <ol className="mb-4 space-y-2">
        {sequence.map((s, i) => {
          const right = question.steps[i] === s;
          return (
            <li key={s}>
              <button
                type="button"
                disabled={checked}
                onClick={() => onChange(sequence.filter((x) => x !== s))}
                className={cn(
                  "flex min-h-11 w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-sm",
                  checked ? resultTone(right) : "border-primary/40 bg-primary/5 hover:bg-primary/10",
                )}
              >
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                  {i + 1}
                </span>
                <span>{s}</span>
              </button>
            </li>
          );
        })}
        {sequence.length === 0 && (
          <li className="rounded-lg border border-dashed px-3 py-3 text-sm text-muted-foreground">Your order appears here</li>
        )}
      </ol>
      {!checked && remaining.length > 0 && (
        <div className="space-y-2">
          {remaining.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange([...sequence, s])}
              className="block min-h-11 w-full rounded-lg border bg-background px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {s}
            </button>
          ))}
        </div>
      )}
      {checked && sequence.some((s, i) => question.steps[i] !== s) && (
        <div className="mt-2 rounded-lg bg-muted px-3 py-2 text-sm">
          <p className="font-semibold">Correct order</p>
          <ol className="mt-1 ml-5 list-decimal space-y-0.5">
            {question.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

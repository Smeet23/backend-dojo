"use client";

import { useState } from "react";
import type { Question } from "@/lib/types";
import type { GradeResult } from "@/lib/ai-schemas";
import { streamText } from "@/lib/ai-client";
import { Markdown } from "@/components/ai/Markdown";
import { ErrorNote } from "@/components/ai/AiGate";

const statusStyle = { hit: "✅", partial: "⚠️", miss: "❌" } as const;

/** AI grading of a written answer: score, key points hit or missed, coaching and a model answer. */
export function GradeFeedback({ result: g }: { result: GradeResult }) {
  const tone = g.score >= 80 ? "bg-good-soft" : g.score >= 50 ? "bg-warn-soft" : "bg-bad-soft";
  return (
    <div className="mt-4 space-y-3">
      <div className={`rounded-lg px-3 py-3 text-sm ${tone}`}>
        <p className="font-semibold">{g.score}/100 · {g.verdict}</p>
        <ul className="mt-2 space-y-1.5">
          {g.points.map((p) => (
            <li key={p.point} className="flex gap-2">
              <span aria-label={p.status}>{statusStyle[p.status]}</span>
              <span>
                <span className="font-medium">{p.point}</span>
                <span className="text-muted"> — {p.note}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-2"><Markdown>{g.feedback}</Markdown></div>
      </div>
      <div className="rounded-lg bg-surface-2 px-3 py-3 text-sm">
        <p className="font-semibold">Model answer</p>
        <Markdown>{g.modelAnswer}</Markdown>
      </div>
    </div>
  );
}

/** "Why was I wrong?": explains this specific mistake, streamed in. */
export function WhyWrong({ question, given }: { question: Question; given: string }) {
  const [text, setText] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState("");

  async function ask() {
    setState("busy");
    setError("");
    const res = await streamText("/api/ai/explain", { questionId: question.id, given }, setText);
    setState(res.ok ? "done" : "idle");
    if (!res.ok) setError(res.error);
  }

  if (state === "idle" && !text) {
    return (
      <>
        <button type="button" onClick={ask} className="mt-2 min-h-10 rounded-lg border border-border bg-surface px-3 text-sm font-medium hover:bg-surface-2">
          🤔 Why was I wrong?
        </button>
        {error && <ErrorNote error={error} />}
      </>
    );
  }
  return (
    <div className="mt-3 rounded-lg border border-border bg-surface px-3 py-2 text-sm">
      {text ? <Markdown>{text}</Markdown> : <p className="text-muted">Thinking…</p>}
      {state === "busy" && text && <span className="text-muted">▍</span>}
    </div>
  );
}

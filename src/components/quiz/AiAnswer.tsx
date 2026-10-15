"use client";

import { useState } from "react";
import type { Question } from "@/lib/types";
import type { GradeResult } from "@/lib/ai-schemas";
import { answerKey } from "@/lib/quiz";
import { postJson, streamText } from "@/lib/ai-client";
import { Markdown } from "@/components/ai/Markdown";
import { ErrorNote } from "@/components/ai/AiGate";

const statusStyle = { hit: "✅", partial: "⚠️", miss: "❌" } as const;

/** Free-text answer box; the AI grades it against the question's answer key. */
export function OwnWordsAnswer({ question, onGraded }: { question: Question; onGraded: (result: GradeResult) => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setBusy(true);
    setError("");
    const res = await postJson<GradeResult>("/api/ai/grade", { questionId: question.id, answer: text });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    onGraded(res.data);
  }

  return (
    <div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        maxLength={4000}
        placeholder="Explain what you'd do and why, like you would to a teammate or an interviewer…"
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-base leading-relaxed sm:text-sm"
      />
      <button
        type="button"
        onClick={submit}
        disabled={busy || text.trim().length < 15}
        className="mt-3 min-h-11 w-full rounded-lg bg-accent px-4 text-sm font-medium text-white disabled:opacity-40 dark:text-bg"
      >
        {busy ? "Grading…" : "Grade my answer"}
      </button>
      {error && <ErrorNote error={error} />}
    </div>
  );
}

export function GradeFeedback({ question, result: g }: { question: Question; result: GradeResult }) {
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
        <p className="mt-2 font-semibold">Answer key</p>
        <p className="whitespace-pre-line font-mono text-[0.8rem]">{answerKey(question)}</p>
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

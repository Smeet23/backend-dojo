"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { GradeResult, WrittenQuestion } from "@/lib/ai-schemas";
import { getJson, postJson } from "@/lib/ai-client";
import { recordAnswer } from "@/lib/progress";
import { GradeFeedback } from "@/components/quiz/AiAnswer";
import { AiBadge, AiGate, ErrorNote } from "./AiGate";

type Props = { courseId: string; slug: string };

/** "Explain it": open questions after the quiz, answered in prose and graded by AI. */
export function ExplainIt(props: Props) {
  return (
    <AiGate quiet>
      <section id="explain-it" className="mt-14 scroll-mt-20">
        <h2 className="mb-1 flex items-center gap-2 text-2xl font-semibold tracking-tight">
          ✍️ Explain it <AiBadge />
        </h2>
        <p className="mb-5 text-sm text-muted">Three open questions: explain why, weigh a trade-off, or debug. Write like you would to a teammate.</p>
        <Questions {...props} />
      </section>
    </AiGate>
  );
}

function Questions({ courseId, slug }: Props) {
  const [questions, setQuestions] = useState<WrittenQuestion[] | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    getJson<{ questions: WrittenQuestion[] | null }>(`/api/ai/written?course=${courseId}&slug=${slug}`).then((r) => {
      if (!live) return;
      if (r.ok) setQuestions(r.data.questions);
      else setError(r.error);
    });
    return () => {
      live = false;
    };
  }, [courseId, slug]);

  async function create() {
    setBusy(true);
    setError("");
    const r = await postJson<{ questions: WrittenQuestion[] }>("/api/ai/written", { courseId, slug });
    setBusy(false);
    if (r.ok) setQuestions(r.data.questions);
    else setError(r.error);
  }

  if (questions === undefined) return error ? <ErrorNote error={error} /> : <p className="text-sm text-muted">Loading…</p>;

  if (questions === null) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-sm text-muted">These questions are written for this lesson the first time you open them, then saved.</p>
        <button
          type="button"
          onClick={create}
          disabled={busy}
          className="mt-3 min-h-11 w-full rounded-lg bg-accent px-4 text-sm font-medium text-white disabled:opacity-40 dark:text-bg"
        >
          {busy ? "Writing questions… (10-30s)" : "Get my 3 questions"}
        </button>
        {error && <ErrorNote error={error} />}
      </div>
    );
  }

  return (
    <ol className="space-y-4">
      {questions.map((q, i) => (
        <li key={q.id}>
          <WrittenCard question={q} n={i + 1} total={questions.length} courseId={courseId} slug={slug} />
        </li>
      ))}
    </ol>
  );
}

function WrittenCard({ question, n, total, courseId, slug }: { question: WrittenQuestion; n: number; total: number } & Props) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<GradeResult | null>(null);

  async function submit() {
    setBusy(true);
    setError("");
    const r = await postJson<GradeResult>("/api/ai/written/grade", { courseId, slug, questionId: question.id, answer: text });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setResult(r.data);
    // Written answers are never word-perfect, so 80+ counts as fully right (no "missed" mark).
    recordAnswer(question.id, r.data.score >= 80 ? 1 : r.data.score / 100);
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
      <p className="mb-2 text-sm text-muted">Question {n} / {total}</p>
      <p className="mb-4 whitespace-pre-line text-[0.95rem] leading-relaxed">{question.prompt}</p>
      {result ? (
        <>
          <div className="whitespace-pre-wrap rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-muted">{text}</div>
          <GradeFeedback result={result} />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
            <Link href={`#${question.lessonAnchor}`} className="font-medium text-accent">Review this in the lesson →</Link>
            <button type="button" onClick={() => setResult(null)} className="min-h-10 rounded-lg border border-border px-3 font-medium hover:bg-surface-2">
              Try again
            </button>
          </div>
        </>
      ) : (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            maxLength={4000}
            placeholder="Your answer…"
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
        </>
      )}
    </div>
  );
}

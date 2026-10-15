"use client";

import { useState } from "react";
import Link from "next/link";
import type { Question, Response } from "@/lib/types";
import type { GradeResult } from "@/lib/ai-schemas";
import { grade, responseText } from "@/lib/quiz";
import { recordAnswer, recordQuizFinished } from "@/lib/progress";
import { useAiStatus } from "@/lib/ai-client";
import { QuestionView, emptyResponse, isComplete } from "./QuestionView";
import { GradeFeedback, OwnWordsAnswer, WhyWrong } from "./AiAnswer";

type Props = {
  questions: Question[];
  /** Set for an end-of-lecture quiz; omitted for mixed practice. */
  lectureId?: number;
  courseId: string;
  /** Lecture id -> slug for this course, for "review this section" links. */
  lectureSlugs: Record<string, string>;
  title: string;
  onRestart?: () => void;
};

type Result = { question: Question; score: number };

function lessonHref(courseId: string, slugs: Record<string, string>, q: Question) {
  const slug = slugs[String(q.lectures[0])];
  return slug ? `/courses/${courseId}/${slug}#${q.lessonAnchor}` : `/courses/${courseId}`;
}

export function Quiz({ questions, lectureId, courseId, lectureSlugs, title, onRestart }: Props) {
  const [index, setIndex] = useState(0);
  const [response, setResponse] = useState<Response>(() => emptyResponse(questions[0]));
  const [checked, setChecked] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [finished, setFinished] = useState(false);
  // Answer in your own words (graded by AI) instead of picking options; kept across questions.
  const [ownWords, setOwnWords] = useState(false);
  const [aiGrade, setAiGrade] = useState<GradeResult | null>(null);
  const aiReady = useAiStatus() === "ready";

  const question = questions[index];
  // Ordering steps doesn't translate into a written answer, so those stay as-is.
  const canWrite = aiReady && question.type !== "order";
  const writing = ownWords && canWrite;

  function finishQuestion(score: number) {
    recordAnswer(question.id, score);
    setResults((r) => [...r, { question, score }]);
    setChecked(true);
  }

  function check() {
    finishQuestion(grade(question, response));
  }

  function graded(result: GradeResult) {
    setAiGrade(result);
    finishQuestion(result.score / 100);
  }

  function next() {
    if (index === questions.length - 1) {
      recordQuizFinished(courseId, lectureId === undefined ? null : `${courseId}:${lectureId}`, percent(results), results.length);
      setFinished(true);
      return;
    }
    setIndex(index + 1);
    setResponse(emptyResponse(questions[index + 1]));
    setChecked(false);
    setAiGrade(null);
  }

  function restart() {
    setIndex(0);
    setResponse(emptyResponse(questions[0]));
    setChecked(false);
    setAiGrade(null);
    setResults([]);
    setFinished(false);
    onRestart?.();
  }

  if (finished) {
    const pct = percent(results);
    const missed = results.filter((r) => r.score < 1);
    return (
      <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
        <p className="text-sm text-muted">{title}</p>
        <p className="mt-1 text-4xl font-semibold">{pct}%</p>
        <p className={`mt-1 text-sm font-medium ${pct >= 80 ? "text-good" : "text-warn"}`}>
          {pct >= 80 ? "Passed — nice work." : "Below 80%. Review the sections below and try again."}
        </p>
        {missed.length > 0 && (
          <div className="mt-5">
            <p className="text-sm font-semibold">Review these</p>
            <ul className="mt-2 space-y-2">
              {missed.map(({ question: q, score }) => (
                <li key={q.id} className="rounded-lg bg-surface-2 px-3 py-2 text-sm">
                  <p className="line-clamp-2">{q.prompt}</p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="text-muted">{Math.round(score * 100)}% correct</span>
                    <Link href={lessonHref(courseId, lectureSlugs, q)} className="font-medium text-accent">Review section →</Link>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        <button type="button" onClick={restart} className="mt-5 min-h-11 w-full rounded-lg bg-accent px-4 text-sm font-medium text-white dark:text-bg">
          Try again
        </button>
      </div>
    );
  }

  const score = checked ? results[results.length - 1].score : 0;

  return (
    <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between text-sm text-muted">
        <span>{title}</span>
        <span>{index + 1} / {questions.length}</span>
      </div>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full bg-accent transition-all" style={{ width: `${(index / questions.length) * 100}%` }} />
      </div>

      <p className="mb-4 whitespace-pre-line text-[0.95rem] leading-relaxed">{question.prompt}</p>

      {canWrite && !checked && (
        <div className="mb-4 flex rounded-lg border border-border bg-surface-2 p-1 text-sm" role="tablist">
          {[
            { value: false, label: "Pick options" },
            { value: true, label: "✍️ Own words · AI graded" },
          ].map((m) => (
            <button
              key={m.label}
              type="button"
              role="tab"
              aria-selected={ownWords === m.value}
              onClick={() => setOwnWords(m.value)}
              className={`min-h-9 flex-1 rounded-md px-2 font-medium ${ownWords === m.value ? "bg-surface shadow-sm" : "text-muted"}`}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}

      {writing && !checked ? (
        <>
          {question.type === "scenario" && (
            <p className="mb-2 text-sm text-muted">Cover: {question.fields.map((f) => f.label.toLowerCase()).join(" · ")}</p>
          )}
          <OwnWordsAnswer key={question.id} question={question} onGraded={graded} />
        </>
      ) : aiGrade ? (
        <GradeFeedback question={question} result={aiGrade} />
      ) : (
        <QuestionView key={question.id} question={question} response={response} onChange={setResponse} checked={checked} />
      )}

      {checked && aiGrade && (
        <div className="mt-4 rounded-lg bg-surface-2 px-3 py-3 text-sm">
          <p className="leading-relaxed">{question.explanation}</p>
          <Link href={lessonHref(courseId, lectureSlugs, question)} className="mt-1 inline-block font-medium text-accent">Review this in the lesson →</Link>
        </div>
      )}

      {checked && !aiGrade && (
        <div className={`mt-4 rounded-lg px-3 py-3 text-sm ${score === 1 ? "bg-good-soft" : score > 0 ? "bg-warn-soft" : "bg-bad-soft"}`}>
          <p className="font-semibold">{score === 1 ? "✅ Correct" : score > 0 ? `⚠️ Partly right (${Math.round(score * 100)}%)` : "❌ Not quite"}</p>
          <p className="mt-1 leading-relaxed">{question.explanation}</p>
          <Link href={lessonHref(courseId, lectureSlugs, question)} className="mt-1 inline-block font-medium text-accent">Review this in the lesson →</Link>
          {score < 1 && aiReady && <WhyWrong key={question.id} question={question} given={responseText(question, response)} />}
        </div>
      )}

      <div className="mt-5">
        {writing && !checked ? null : checked ? (
          <button type="button" onClick={next} className="min-h-11 w-full rounded-lg bg-accent px-4 text-sm font-medium text-white dark:text-bg">
            {index === questions.length - 1 ? "See results" : "Next question"}
          </button>
        ) : (
          <button
            type="button"
            onClick={check}
            disabled={!isComplete(question, response)}
            className="min-h-11 w-full rounded-lg bg-accent px-4 text-sm font-medium text-white disabled:opacity-40 dark:text-bg"
          >
            Check answer
          </button>
        )}
      </div>
    </div>
  );
}

function percent(results: Result[]) {
  if (results.length === 0) return 0;
  return Math.round((results.reduce((a, r) => a + r.score, 0) / results.length) * 100);
}

"use client";

import { useState } from "react";
import Link from "next/link";
import type { Question, Response } from "@/lib/types";
import { grade } from "@/lib/quiz";
import { recordAnswer, recordLectureQuiz } from "@/lib/progress";
import { QuestionView, emptyResponse, isComplete } from "./QuestionView";
import { lectures } from "@/content/lectures";

type Props = {
  questions: Question[];
  /** Set for an end-of-lecture quiz; omitted for mixed practice. */
  lectureId?: number;
  title: string;
  onRestart?: () => void;
};

type Result = { question: Question; score: number };

function lessonHref(q: Question) {
  const lecture = lectures.find((l) => l.id === q.lectures[0]);
  return lecture ? `/lectures/${lecture.slug}#${q.lessonAnchor}` : "/";
}

export function Quiz({ questions, lectureId, title, onRestart }: Props) {
  const [index, setIndex] = useState(0);
  const [response, setResponse] = useState<Response>(() => emptyResponse(questions[0]));
  const [checked, setChecked] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [finished, setFinished] = useState(false);

  const question = questions[index];

  function check() {
    const score = grade(question, response);
    recordAnswer(question.id, score);
    setResults((r) => [...r, { question, score }]);
    setChecked(true);
  }

  function next() {
    if (index === questions.length - 1) {
      if (lectureId !== undefined) recordLectureQuiz(lectureId, percent([...results]));
      setFinished(true);
      return;
    }
    setIndex(index + 1);
    setResponse(emptyResponse(questions[index + 1]));
    setChecked(false);
  }

  function restart() {
    setIndex(0);
    setResponse(emptyResponse(questions[0]));
    setChecked(false);
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
                    <Link href={lessonHref(q)} className="font-medium text-accent">Review section →</Link>
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
      <QuestionView key={question.id} question={question} response={response} onChange={setResponse} checked={checked} />

      {checked && (
        <div className={`mt-4 rounded-lg px-3 py-3 text-sm ${score === 1 ? "bg-good-soft" : score > 0 ? "bg-warn-soft" : "bg-bad-soft"}`}>
          <p className="font-semibold">{score === 1 ? "✅ Correct" : score > 0 ? `⚠️ Partly right (${Math.round(score * 100)}%)` : "❌ Not quite"}</p>
          <p className="mt-1 leading-relaxed">{question.explanation}</p>
          <Link href={lessonHref(question)} className="mt-1 inline-block font-medium text-accent">Review this in the lesson →</Link>
        </div>
      )}

      <div className="mt-5">
        {checked ? (
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

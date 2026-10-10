"use client";

import Link from "next/link";
import type { Lecture } from "@/lib/types";
import { getLessonProgress, useProgress } from "@/lib/progress";

type Props = {
  courseId: string;
  lectures: Lecture[];
  /** This course's question ids, so weak spots are counted per course. */
  questionIds: string[];
};

export function LectureList({ courseId, lectures, questionIds }: Props) {
  const progress = useProgress();
  const key = (l: Lecture) => `${courseId}:${l.id}`;
  const href = (l: Lecture) => `/courses/${courseId}/${l.slug}`;
  const last = lectures.find((l) => key(l) === progress.lastLecture && l.available);
  const weak = questionIds.filter((id) => progress.misses[id]).length;

  return (
    <>
      {last && (
        <Link
          href={href(last)}
          prefetch={true}
          className="mt-6 flex items-center justify-between rounded-xl bg-accent px-4 py-3 text-white dark:text-bg"
        >
          <span>
            <span className="block text-xs opacity-80">Continue</span>
            <span className="font-medium">{last.id}. {last.title}</span>
          </span>
          <span aria-hidden>→</span>
        </Link>
      )}

      <ol className="mt-6 space-y-3">
        {lectures.map((l) => {
          const p = getLessonProgress(progress, key(l));
          const status = p.done ? "Done" : p.visited ? "In progress" : l.available ? "Not started" : "Coming soon";
          const badge = p.done
            ? "bg-good-soft text-good"
            : p.visited
              ? "bg-accent-soft text-accent"
              : "bg-surface-2 text-muted";
          const body = (
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 px-1.5 font-mono text-sm font-semibold">
                {l.id}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-medium">{l.title}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${badge}`}>{status}</span>
                </div>
                <p className="mt-1 text-sm text-muted">{l.summary}</p>
                {p.quizBest !== null && <p className="mt-1 text-xs text-muted">Best quiz score: {p.quizBest}%</p>}
              </div>
            </div>
          );
          return (
            <li key={l.id}>
              {l.available ? (
                <Link href={href(l)} prefetch={true} className="block rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent">
                  {body}
                </Link>
              ) : (
                <div className="rounded-xl border border-dashed border-border p-4 opacity-60">{body}</div>
              )}
            </li>
          );
        })}
      </ol>

      <Link href={`/courses/${courseId}/practice`} className="mt-6 block rounded-xl border border-border bg-surface p-4 hover:border-accent">
        <span className="font-medium">Mixed practice</span>
        <span className="mt-1 block text-sm text-muted">
          Scenarios from every lecture you&apos;ve finished{weak > 0 ? `, weighted toward your ${weak} weak spot${weak === 1 ? "" : "s"}` : ""}.
        </span>
      </Link>
    </>
  );
}

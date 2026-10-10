"use client";

import { useState } from "react";
import Link from "next/link";
import type { Question } from "@/lib/types";
import { eligibleQuestions, pickWeighted } from "@/lib/quiz";
import { useProgress } from "@/lib/progress";
import { Quiz } from "@/components/quiz/Quiz";

const SIZE = 10;

type Props = { pool: Question[]; courseId: string; lectureSlugs: Record<string, string> };

export function MixedPractice({ pool, courseId, lectureSlugs }: Props) {
  const progress = useProgress();
  const [round, setRound] = useState<{ n: number; questions: Question[] } | null>(null);

  // Lessons are keyed "<course>:<id>"; only this course's finished lectures count.
  const prefix = `${courseId}:`;
  const completed = new Set(
    Object.entries(progress.lessons)
      .filter(([key, l]) => l.done && key.startsWith(prefix))
      .map(([key]) => Number(key.slice(prefix.length))),
  );
  const eligible = eligibleQuestions(pool, completed);

  if (eligible.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4 text-sm">
        Finish at least one lecture quiz to unlock mixed practice.{" "}
        <Link href={`/courses/${courseId}`} className="font-medium text-accent">Go to lectures →</Link>
      </div>
    );
  }

  const start = () => setRound((r) => ({ n: (r?.n ?? 0) + 1, questions: pickWeighted(eligible, progress.misses, SIZE) }));

  if (!round) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-sm text-muted">
          {eligible.length} questions available from {completed.size} finished lecture{completed.size === 1 ? "" : "s"}.
        </p>
        <button type="button" onClick={start} className="mt-3 min-h-11 w-full rounded-lg bg-accent px-4 text-sm font-medium text-white dark:text-bg">
          Start a round
        </button>
      </div>
    );
  }

  return <Quiz key={round.n} questions={round.questions} courseId={courseId} lectureSlugs={lectureSlugs} title="Mixed practice" onRestart={start} />;
}

"use client";

import { useState } from "react";
import Link from "next/link";
import type { Question } from "@/lib/types";
import { eligibleQuestions, pickWeighted } from "@/lib/quiz";
import { useProgress } from "@/lib/progress";
import { Quiz } from "@/components/quiz/Quiz";

const SIZE = 10;

export function MixedPractice({ pool }: { pool: Question[] }) {
  const progress = useProgress();
  const [round, setRound] = useState<{ n: number; questions: Question[] } | null>(null);

  const completed = new Set(
    Object.entries(progress.lessons)
      .filter(([, l]) => l.done)
      .map(([id]) => Number(id)),
  );
  const eligible = eligibleQuestions(pool, completed);

  if (eligible.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4 text-sm">
        Finish at least one lecture quiz to unlock mixed practice.{" "}
        <Link href="/" className="font-medium text-accent">Go to lectures →</Link>
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

  return <Quiz key={round.n} questions={round.questions} title="Mixed practice" onRestart={start} />;
}

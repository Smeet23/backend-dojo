"use client";

import { useState } from "react";
import Link from "next/link";
import { Dumbbell, Lock, Play, TriangleAlert } from "lucide-react";
import type { Question } from "@/lib/types";
import { eligibleQuestions, pickWeighted } from "@/lib/quiz";
import { useProgress } from "@/lib/progress";
import { Quiz } from "@/components/quiz/Quiz";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

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
  const weak = eligible.filter((q) => progress.misses[q.id]).length;

  if (eligible.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="mb-2 flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Lock className="size-5" />
          </div>
          <CardTitle>Nothing to practise yet</CardTitle>
          <CardDescription>Finish at least one lecture quiz to unlock mixed practice.</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button asChild>
            <Link href="/">Go to lectures</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  const start = () => setRound((r) => ({ n: (r?.n ?? 0) + 1, questions: pickWeighted(eligible, progress.misses, SIZE) }));

  if (!round) {
    return (
      <Card>
        <CardHeader>
          <div className="mb-2 flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Dumbbell className="size-5" />
          </div>
          <CardTitle>Ready for a round?</CardTitle>
          <CardDescription>
            {eligible.length} questions available from {completed.size} finished lecture{completed.size === 1 ? "" : "s"}.
          </CardDescription>
        </CardHeader>
        {weak > 0 && (
          <CardContent>
            <p className="flex items-center gap-2 rounded-lg bg-warn-soft px-3 py-2 text-sm">
              <TriangleAlert className="size-4 shrink-0 text-warn" />
              {weak} of them are weak spots and are more likely to come up.
            </p>
          </CardContent>
        )}
        <CardFooter>
          <Button size="lg" className="w-full" onClick={start}>
            <Play /> Start a round
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return <Quiz key={round.n} questions={round.questions} title="Mixed practice" onRestart={start} />;
}

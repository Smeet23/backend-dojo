"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, CircleAlert, RotateCcw, Trophy, XCircle } from "lucide-react";
import type { Question, Response } from "@/lib/types";
import { grade } from "@/lib/quiz";
import { recordAnswer, recordQuizFinished } from "@/lib/progress";
import { cn } from "@/lib/utils";
import { lectures } from "@/content/lectures";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { QuestionView, emptyResponse, isComplete } from "./QuestionView";

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

const typeLabel = { scenario: "Scenario", mcq: "Multiple choice", order: "Put in order" } as const;

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
      recordQuizFinished(lectureId ?? null, percent(results), results.length);
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
    const passed = pct >= 80;
    const missed = results.filter((r) => r.score < 1);
    return (
      <Card>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <span className={cn("flex size-14 shrink-0 items-center justify-center rounded-full", passed ? "bg-good-soft text-good" : "bg-warn-soft text-warn")}>
              {passed ? <Trophy className="size-7" /> : <CircleAlert className="size-7" />}
            </span>
            <div>
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className="text-4xl font-semibold tabular-nums">{pct}%</p>
              <p className={cn("text-sm font-medium", passed ? "text-good" : "text-warn")}>
                {passed ? "Passed — nice work." : "Below 80%. Review the sections below and try again."}
              </p>
            </div>
          </div>
          {missed.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold">Review these ({missed.length})</p>
              <ul className="divide-y rounded-lg border">
                {missed.map(({ question: q, score }) => (
                  <li key={q.id} className="flex flex-col gap-2 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <p className="line-clamp-2 min-w-0">{q.prompt}</p>
                    <div className="flex shrink-0 items-center gap-3">
                      <Badge variant="outline" className="tabular-nums">{Math.round(score * 100)}%</Badge>
                      <Button asChild variant="link" size="sm" className="h-auto px-0">
                        <Link href={lessonHref(q)}>
                          Review <ArrowRight />
                        </Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Button onClick={restart} size="lg" className="w-full">
            <RotateCcw /> Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const score = checked ? results[results.length - 1].score : 0;
  const feedback =
    score === 1
      ? { title: "Correct", tone: "border-good/40 bg-good-soft", icon: <CheckCircle2 className="text-good" /> }
      : score > 0
        ? { title: `Partly right (${Math.round(score * 100)}%)`, tone: "border-warn/40 bg-warn-soft", icon: <CircleAlert className="text-warn" /> }
        : { title: "Not quite", tone: "border-bad/40 bg-bad-soft", icon: <XCircle className="text-bad" /> };

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium">
            Question {index + 1} <span className="text-muted-foreground">of {questions.length}</span>
          </span>
          <Badge variant="secondary">{typeLabel[question.type]}</Badge>
        </div>
        <Progress value={((index + (checked ? 1 : 0)) / questions.length) * 100} aria-label={`${title} progress`} />
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-[0.95rem] leading-relaxed whitespace-pre-line">{question.prompt}</p>
        <QuestionView key={question.id} question={question} response={response} onChange={setResponse} checked={checked} />

        {checked && (
          <Alert className={feedback.tone}>
            {feedback.icon}
            <AlertTitle>{feedback.title}</AlertTitle>
            <AlertDescription className="text-foreground/90">
              <p className="leading-relaxed">{question.explanation}</p>
              <Link href={lessonHref(question)} className="mt-1 inline-flex items-center gap-1 font-medium text-primary hover:underline">
                <BookOpen className="size-3.5" /> Review this in the lesson
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {checked ? (
          <Button onClick={next} size="lg" className="w-full">
            {index === questions.length - 1 ? "See results" : "Next question"} <ArrowRight />
          </Button>
        ) : (
          <Button onClick={check} size="lg" className="w-full" disabled={!isComplete(question, response)}>
            Check answer
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function percent(results: Result[]) {
  if (results.length === 0) return 0;
  return Math.round((results.reduce((a, r) => a + r.score, 0) / results.length) * 100);
}

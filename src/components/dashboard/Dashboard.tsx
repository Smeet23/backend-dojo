"use client";

import Link from "next/link";
import { ArrowRight, BookOpenCheck, Gauge, Play, Target, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { lectures } from "@/content/lectures";
import { modules, moduleLectures, moduleOf } from "@/content/modules";
import { getLessonProgress, useProgress, type LessonProgress } from "@/lib/progress";
import type { Lecture } from "@/lib/types";
import { ProgressRing } from "./ProgressRing";

function StatusBadge({ p }: { p: LessonProgress }) {
  if (p.done) return <Badge className="border-transparent bg-good-soft text-good">Done</Badge>;
  if (p.visited) return <Badge className="border-transparent bg-primary/10 text-primary">In progress</Badge>;
  return <Badge variant="outline" className="text-muted-foreground">Not started</Badge>;
}

function Stat({ label, value, icon, ring }: { label: string; value: string; icon?: React.ReactNode; ring?: number }) {
  return (
    <Card className="gap-0 py-0">
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground sm:text-sm">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
        </div>
        {ring !== undefined ? (
          <ProgressRing value={ring} label={label} />
        ) : (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">{icon}</span>
        )}
      </CardContent>
    </Card>
  );
}

function LectureCard({ lecture, p }: { lecture: Lecture; p: LessonProgress }) {
  return (
    <Link href={`/lectures/${lecture.slug}`} className="group block rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
      <Card className="h-full gap-0 py-0 transition-colors group-hover:border-primary/50">
        <CardContent className="flex h-full flex-col gap-3 p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-md bg-muted px-1.5 font-mono text-xs font-semibold">
              {lecture.id}
            </span>
            <div className="min-w-0">
              <p className="leading-snug font-medium">{lecture.title}</p>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{lecture.summary}</p>
            </div>
          </div>
          <div className="mt-auto flex items-center justify-between gap-2">
            <StatusBadge p={p} />
            {p.quizBest !== null && (
              <span className="text-xs text-muted-foreground">
                Best <span className="font-semibold text-foreground tabular-nums">{p.quizBest}%</span>
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function Dashboard() {
  const progress = useProgress();
  const all = lectures.map((l) => ({ l, p: getLessonProgress(progress, l.id) }));
  const done = all.filter((x) => x.p.done).length;
  const scored = all.filter((x) => x.p.quizBest !== null);
  const average = scored.length ? Math.round(scored.reduce((a, x) => a + (x.p.quizBest ?? 0), 0) / scored.length) : null;
  const passed = scored.filter((x) => (x.p.quizBest ?? 0) >= 80).length;
  const weak = Object.keys(progress.misses).length;

  // Resume the last lecture opened, or the first one not yet done.
  const resume =
    lectures.find((l) => l.id === progress.lastLecture) ?? all.find((x) => !x.p.done)?.l ?? lectures[0];
  const resumeP = getLessonProgress(progress, resume.id);
  const resumeModule = moduleOf(resume.id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{progress.lastLecture ? "Continue learning" : "Start learning"}</h1>
        <p className="mt-2 text-muted-foreground">Read the lesson, play with the widgets, then prove it with real-world scenarios.</p>
      </div>

      <Card className="gap-0 py-0">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
          <div className="hidden size-16 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:flex">
            <BookOpenCheck className="size-7" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">
              {resumeModule?.title} · Lecture {resume.id}
            </p>
            <p className="mt-1 text-xl font-semibold tracking-tight">{resume.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{resume.summary}</p>
            <p className="mt-3 text-xs text-muted-foreground">
              {resumeP.done
                ? `Quiz done · best ${resumeP.quizBest}%`
                : resumeP.visited
                  ? "Lesson opened · quiz not finished yet"
                  : "Not started yet"}
            </p>
          </div>
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href={`/lectures/${resume.slug}`}>
              <Play /> {resumeP.visited ? "Resume" : "Start"}
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Lectures done" value={`${done}/${lectures.length}`} ring={done / lectures.length} />
        <Stat label="Quiz average" value={average === null ? "–" : `${average}%`} icon={<Gauge className="size-5" />} />
        <Stat label="Weak spots" value={String(weak)} icon={<TriangleAlert className="size-5" />} />
        <Stat label="Quizzes passed" value={String(passed)} icon={<Target className="size-5" />} />
      </div>

      {weak > 0 && (
        <Card className="gap-0 border-warn/40 bg-warn-soft py-0">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm">
              You have <span className="font-semibold">{weak}</span> question{weak === 1 ? "" : "s"} to revisit. Mixed practice brings them back until they stick.
            </p>
            <Button asChild variant="outline" size="sm" className="shrink-0">
              <Link href="/practice">
                Practice now <ArrowRight />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {modules.map((m) => {
        const items = moduleLectures(m);
        const mDone = items.filter((l) => getLessonProgress(progress, l.id).done).length;
        return (
          <section key={m.id} aria-labelledby={`m-${m.id}`}>
            <div className="mb-3 flex items-end justify-between gap-3">
              <h2 id={`m-${m.id}`} className="text-lg font-semibold tracking-tight">{m.title}</h2>
              <span className="text-sm text-muted-foreground tabular-nums">{mDone}/{items.length} done</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((l) => (
                <LectureCard key={l.slug} lecture={l} p={getLessonProgress(progress, l.id)} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

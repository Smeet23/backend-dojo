"use client";

import Link from "next/link";
import { useProgress } from "@/lib/progress";

export type CourseCard = { id: string; title: string; summary: string; author: string; lectureKeys: string[] };

export function CourseList({ courses }: { courses: CourseCard[] }) {
  const progress = useProgress();
  const lastCourse = progress.lastLecture?.split(":")[0];

  return (
    <ol className="mt-6 space-y-3">
      {courses.map((c) => {
        const done = c.lectureKeys.filter((k) => progress.lessons[k]?.done).length;
        const started = c.lectureKeys.some((k) => progress.lessons[k]?.visited);
        const pct = c.lectureKeys.length ? Math.round((done / c.lectureKeys.length) * 100) : 0;
        return (
          <li key={c.id}>
            <Link
              href={`/courses/${c.id}`}
              prefetch={true}
              className="block rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent"
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-medium">{c.title}</span>
                {lastCourse === c.id && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent">Continue</span>}
              </div>
              <p className="mt-1 text-sm text-muted">{c.summary}</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                  <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="shrink-0 text-xs text-muted">
                  {done}/{c.lectureKeys.length} lectures{started && done === 0 ? " · started" : ""}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted">From {c.author}&apos;s playlist</p>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

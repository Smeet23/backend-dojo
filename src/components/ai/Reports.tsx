"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AiReport, Review, Scorecard } from "@/lib/ai-schemas";
import { getJson } from "@/lib/ai-client";
import { Markdown } from "./Markdown";

export type LectureOption = { id: number; title: string; slug: string };

/** Pick lectures to focus on; none selected means the whole course. */
export function LecturePicker({ lectures, selected, onChange }: { lectures: LectureOption[]; selected: number[]; onChange: (ids: number[]) => void }) {
  const toggle = (id: number) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : selected.length >= 12 ? selected : [...selected, id]);
  return (
    <fieldset>
      <legend className="text-sm font-medium">Lectures {selected.length === 0 ? <span className="text-muted">(none picked = whole course)</span> : <span className="text-muted">({selected.length} picked)</span>}</legend>
      <div className="mt-1 max-h-56 overflow-y-auto rounded-lg border border-border">
        {lectures.map((l) => (
          <label key={l.id} className="flex min-h-10 cursor-pointer items-center gap-2 border-b border-border px-3 py-1.5 text-sm last:border-b-0 hover:bg-surface-2">
            <input type="checkbox" checked={selected.includes(l.id)} onChange={() => toggle(l.id)} className="h-4 w-4 accent-[var(--accent)]" />
            <span className="min-w-0">{l.id}. {l.title}</span>
          </label>
        ))}
      </div>
      {selected.length > 0 && (
        <button type="button" onClick={() => onChange([])} className="mt-1 text-xs text-muted hover:text-text">
          Clear (use whole course)
        </button>
      )}
    </fieldset>
  );
}

function scoreTone(score: number) {
  return score >= 80 ? "text-good" : score >= 60 ? "text-warn" : "text-bad";
}

function LessonLink({ courseId, slug, lectures }: { courseId: string; slug: string; lectures: LectureOption[] }) {
  const lecture = lectures.find((l) => l.slug === slug);
  if (!lecture) return null;
  return (
    <Link href={`/courses/${courseId}/${slug}`} className="font-medium text-accent">
      → Lecture {lecture.id}: {lecture.title}
    </Link>
  );
}

export function ScorecardView({ data, courseId, lectures }: { data: Scorecard; courseId: string; lectures: LectureOption[] }) {
  return (
    <div className="space-y-4 text-sm">
      <div>
        <p className={`text-4xl font-semibold ${scoreTone(data.overall)}`}>{data.overall}<span className="text-lg text-muted">/100</span></p>
        <Markdown>{data.summary}</Markdown>
      </div>
      {data.strengths.length > 0 && (
        <div>
          <p className="font-semibold">Strengths</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">{data.strengths.map((s) => <li key={s}>{s}</li>)}</ul>
        </div>
      )}
      {data.gaps.length > 0 && (
        <div>
          <p className="font-semibold">Gaps to work on</p>
          <ul className="mt-1 space-y-2">
            {data.gaps.map((g) => (
              <li key={g.topic} className="rounded-lg bg-surface-2 px-3 py-2">
                <p className="font-medium">{g.topic}</p>
                <p className="text-muted">{g.advice}</p>
                {g.lectureSlug && <LessonLink courseId={courseId} slug={g.lectureSlug} lectures={lectures} />}
              </li>
            ))}
          </ul>
        </div>
      )}
      {data.nextSteps.length > 0 && (
        <div>
          <p className="font-semibold">Next steps</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">{data.nextSteps.map((s) => <li key={s}>{s}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

const severityStyle = { high: "bg-bad-soft", medium: "bg-warn-soft", low: "bg-surface-2" };

export function ReviewView({ data, courseId, lectures }: { data: Review; courseId: string; lectures: LectureOption[] }) {
  return (
    <div className="space-y-4 text-sm">
      <div>
        <p className={`text-4xl font-semibold ${scoreTone(data.score)}`}>{data.score}<span className="text-lg text-muted">/100</span></p>
        <Markdown>{data.summary}</Markdown>
      </div>
      {data.issues.length > 0 && (
        <div>
          <p className="font-semibold">Issues</p>
          <ul className="mt-1 space-y-2">
            {data.issues.map((i) => (
              <li key={i.title} className={`rounded-lg px-3 py-2 ${severityStyle[i.severity]}`}>
                <p className="font-medium">
                  <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-muted">{i.severity}</span> {i.title}
                </p>
                <Markdown>{i.detail}</Markdown>
                {i.lectureSlug && <LessonLink courseId={courseId} slug={i.lectureSlug} lectures={lectures} />}
              </li>
            ))}
          </ul>
        </div>
      )}
      {data.strengths.length > 0 && (
        <div>
          <p className="font-semibold">What&apos;s good</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">{data.strengths.map((s) => <li key={s}>{s}</li>)}</ul>
        </div>
      )}
      {data.questions.length > 0 && (
        <div>
          <p className="font-semibold">Questions a reviewer would ask</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">{data.questions.map((s) => <li key={s}>{s}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

/** Earlier scorecards or reviews; `refresh` changes whenever a new one is saved. */
export function PastReports({ courseId, kind, lectures, refresh }: { courseId: string; kind: AiReport["kind"]; lectures: LectureOption[]; refresh: number }) {
  const [reports, setReports] = useState<AiReport[] | null>(null);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    let live = true;
    getJson<AiReport[]>(`/api/ai/reports?course=${courseId}&kind=${kind}`).then((r) => live && r.ok && setReports(r.data));
    return () => {
      live = false;
    };
  }, [courseId, kind, refresh]);

  if (!reports || reports.length === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold">{kind === "interview" ? "Past interviews" : "Past reviews"}</h2>
      <ul className="mt-2 space-y-2">
        {reports.map((r) => {
          const score = r.kind === "interview" ? r.data.overall : r.data.score;
          return (
            <li key={r.id} className="rounded-xl border border-border bg-surface">
              <button type="button" onClick={() => setOpen(open === r.id ? null : r.id)} className="flex min-h-12 w-full items-center justify-between gap-3 px-3 text-left text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{r.title}</span>
                  <span className="text-xs text-muted">{new Date(r.createdAt).toLocaleString()}</span>
                </span>
                <span className={`shrink-0 font-semibold ${scoreTone(score)}`}>{score}</span>
              </button>
              {open === r.id && (
                <div className="border-t border-border px-3 py-3">
                  {r.kind === "interview" ? (
                    <ScorecardView data={r.data} courseId={courseId} lectures={lectures} />
                  ) : (
                    <ReviewView data={r.data} courseId={courseId} lectures={lectures} />
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

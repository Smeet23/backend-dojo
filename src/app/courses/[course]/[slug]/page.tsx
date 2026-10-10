import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { courses, getCourse, getLecture } from "@/content/catalog";
import { LectureQuiz } from "./LectureQuiz";
import { VisitTracker } from "./VisitTracker";

export function generateStaticParams() {
  return courses.flatMap((c) => c.lectures.filter((l) => l.available).map((l) => ({ course: c.course.id, slug: l.slug })));
}

export async function generateMetadata({ params }: PageProps<"/courses/[course]/[slug]">): Promise<Metadata> {
  const { course, slug } = await params;
  const lecture = getLecture(course, slug);
  return { title: lecture ? `${lecture.id}. ${lecture.title} · Backend Dojo` : "Backend Dojo" };
}

export default function LecturePage({ params }: PageProps<"/courses/[course]/[slug]">) {
  // Reading params inside Suspense keeps client navigation instant.
  return (
    <Suspense fallback={<p className="text-muted">Loading lesson…</p>}>
      <LectureContent params={params} />
    </Suspense>
  );
}

async function LectureContent({ params }: { params: PageProps<"/courses/[course]/[slug]">["params"] }) {
  const { course, slug } = await params;
  if (!getLecture(course, slug) || !getCourse(course)?.lessons[slug]) notFound();
  return <LectureBody courseId={course} slug={slug} />;
}

/**
 * Lesson content depends only on course + slug, so it's cached. That lets <Link prefetch>
 * fetch the whole lesson ahead of the click instead of only the loading fallback.
 */
async function LectureBody({ courseId, slug }: { courseId: string; slug: string }) {
  "use cache";
  const { course, lectures, lessons } = getCourse(courseId)!;
  const lecture = getLecture(courseId, slug)!;
  const lesson = lessons[slug];
  const { Lesson } = lesson;
  const lectureSlugs = Object.fromEntries(lectures.map((l) => [String(l.id), l.slug]));

  return (
    <article>
      <VisitTracker lectureKey={`${courseId}:${lecture.id}`} />
      <Link href={`/courses/${courseId}`} className="text-sm text-muted hover:text-text">← {course.title}</Link>
      <p className="mt-4 text-sm font-medium text-accent">Lecture {lecture.id}</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{lecture.title}</h1>
      <p className="mt-2 text-muted">{lecture.summary}</p>
      <p className="mt-3 text-xs text-muted">
        {lecture.videoUrl ? (
          <>
            Based on{" "}
            <a href={lecture.videoUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">
              the original video
            </a>{" "}
            (~{lecture.minutes} min) · lesson written for this course
          </>
        ) : (
          <>Written from the topic for this course (the source video isn&apos;t publicly available)</>
        )}
      </p>

      <div className="lesson prose prose-neutral mt-8 max-w-none prose-headings:tracking-tight prose-h2:mt-12 prose-pre:overflow-x-auto">
        <Lesson />
      </div>

      <section id="quiz" className="mt-14 scroll-mt-20">
        <h2 className="mb-1 text-2xl font-semibold tracking-tight">Scenario quiz</h2>
        <p className="mb-5 text-sm text-muted">Real situations, engineer-style answers. 80% to pass.</p>
        <LectureQuiz questions={lesson.quiz} courseId={courseId} lectureId={lecture.id} lectureSlugs={lectureSlugs} />
      </section>
    </article>
  );
}

import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { courseQuestions, courses, getCourse } from "@/content/catalog";
import { LectureList } from "./LectureList";

export function generateStaticParams() {
  return courses.map((c) => ({ course: c.course.id }));
}

export async function generateMetadata({ params }: PageProps<"/courses/[course]">): Promise<Metadata> {
  const { course } = await params;
  return { title: `${getCourse(course)?.course.title ?? "Course"} · Grokstack` };
}

export default function CoursePage({ params }: PageProps<"/courses/[course]">) {
  return (
    <Suspense fallback={<p className="text-muted">Loading course…</p>}>
      <CourseContent params={params} />
    </Suspense>
  );
}

async function CourseContent({ params }: { params: PageProps<"/courses/[course]">["params"] }) {
  const { course: courseId } = await params;
  if (!getCourse(courseId)) notFound();
  return <CourseBody courseId={courseId} />;
}

/** Depends only on the course id, so it's cached and prefetchable. */
async function CourseBody({ courseId }: { courseId: string }) {
  "use cache";
  const { course, lectures } = getCourse(courseId)!;
  return (
    <div>
      <Link href="/" className="text-sm text-muted hover:text-text">← All courses</Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{course.title}</h1>
      <p className="mt-2 max-w-xl text-muted">{course.summary}</p>
      <p className="mt-2 text-xs text-muted">
        Based on the{" "}
        <a href={course.playlistUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">
          {course.author} playlist
        </a>{" "}
        · lessons written for this course
      </p>
      <LectureList courseId={course.id} lectures={lectures} questionIds={courseQuestions(course.id).map((q) => q.id)} />
    </div>
  );
}

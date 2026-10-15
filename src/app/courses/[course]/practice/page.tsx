import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { courseQuestions, courses, getCourse } from "@/content/catalog";
import { MixedPractice } from "./MixedPractice";
import { AiPractice } from "./AiPractice";

export function generateStaticParams() {
  return courses.map((c) => ({ course: c.course.id }));
}

export async function generateMetadata({ params }: PageProps<"/courses/[course]/practice">): Promise<Metadata> {
  const { course } = await params;
  return { title: `Mixed practice · ${getCourse(course)?.course.title ?? "Course"}` };
}

export default function PracticePage({ params }: PageProps<"/courses/[course]/practice">) {
  return (
    <Suspense fallback={<p className="text-muted">Loading practice…</p>}>
      <PracticeContent params={params} />
    </Suspense>
  );
}

async function PracticeContent({ params }: { params: PageProps<"/courses/[course]/practice">["params"] }) {
  const { course: courseId } = await params;
  const content = getCourse(courseId);
  if (!content) notFound();
  const lectureSlugs = Object.fromEntries(content.lectures.map((l) => [String(l.id), l.slug]));
  return (
    <div>
      <Link href={`/courses/${courseId}`} className="text-sm text-muted hover:text-text">← {content.course.title}</Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Mixed practice</h1>
      <p className="mt-2 text-muted">
        Up to 10 scenarios from every lecture you&apos;ve finished in this course. Questions you&apos;ve missed show up more often until you get them right.
      </p>
      <div className="mt-6">
        <MixedPractice pool={courseQuestions(courseId)} courseId={courseId} lectureSlugs={lectureSlugs} />
      </div>
      <AiPractice
        courseId={courseId}
        lectures={content.lectures.filter((l) => l.available).map((l) => ({ id: l.id, title: l.title }))}
        lectureSlugs={lectureSlugs}
      />
    </div>
  );
}

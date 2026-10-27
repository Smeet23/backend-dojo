import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { courses, getCourse } from "@/content/catalog";
import { AiBadge } from "@/components/ai/AiGate";
import { MockInterview } from "./MockInterview";
import { PrivateCourseGate } from "@/components/PrivateCourseGate";

export function generateStaticParams() {
  return courses.map((c) => ({ course: c.course.id }));
}

export async function generateMetadata({ params }: PageProps<"/courses/[course]/interview">): Promise<Metadata> {
  const { course } = await params;
  return { title: `Mock interview · ${getCourse(course)?.course.title ?? "Course"} · Grokstack` };
}

export default function Page({ params }: PageProps<"/courses/[course]/interview">) {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/courses/[course]/interview">["params"] }) {
  const { course: courseId } = await params;
  const content = getCourse(courseId);
  if (!content) notFound();
  const lectures = content.lectures.filter((l) => l.available).map((l) => ({ id: l.id, title: l.title, slug: l.slug }));
  return (
    <PrivateCourseGate course={content.course}>
      <div>
        <Link href={`/courses/${courseId}`} className="text-sm text-muted hover:text-text">← {content.course.title}</Link>
        <h1 className="mt-4 flex items-center gap-3 text-3xl font-semibold tracking-tight">
          Mock interview <AiBadge />
        </h1>
        <p className="mt-2 mb-6 text-muted">An AI interviewer asks one question at a time and follows up on your answers, like a real interview. Finish whenever you like to get a scorecard with gaps linked to the lessons.</p>
        <MockInterview courseId={courseId} lectures={lectures} designFirst={courseId !== "backend"} />
      </div>
    </PrivateCourseGate>
  );
}

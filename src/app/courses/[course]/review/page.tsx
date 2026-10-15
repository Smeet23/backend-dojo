import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { courses, getCourse } from "@/content/catalog";
import { AiBadge } from "@/components/ai/AiGate";
import { DesignReview } from "./DesignReview";

export function generateStaticParams() {
  return courses.map((c) => ({ course: c.course.id }));
}

export async function generateMetadata({ params }: PageProps<"/courses/[course]/review">): Promise<Metadata> {
  const { course } = await params;
  return { title: `Design review · ${getCourse(course)?.course.title ?? "Course"} · Grokstack` };
}

export default function Page({ params }: PageProps<"/courses/[course]/review">) {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/courses/[course]/review">["params"] }) {
  const { course: courseId } = await params;
  const content = getCourse(courseId);
  if (!content) notFound();
  const lectures = content.lectures.filter((l) => l.available).map((l) => ({ id: l.id, title: l.title, slug: l.slug }));
  return (
    <div>
      <Link href={`/courses/${courseId}`} className="text-sm text-muted hover:text-text">← {content.course.title}</Link>
      <h1 className="mt-4 flex items-center gap-3 text-3xl font-semibold tracking-tight">
        Design review <AiBadge />
      </h1>
      <p className="mt-2 mb-6 text-muted">Paste a design doc, an architecture sketch in words, or code. A senior-engineer review comes back with issues ranked by severity, linked to the lessons that cover them.</p>
      <DesignReview courseId={courseId} lectures={lectures} />
    </div>
  );
}

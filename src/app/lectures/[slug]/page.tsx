import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock, ExternalLink, ListChecks } from "lucide-react";
import { getLecture, lectures } from "@/content/lectures";
import { lessons } from "@/content/registry";
import { moduleOf } from "@/content/modules";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { TableOfContents } from "@/components/lesson/TableOfContents";
import { LectureQuiz } from "./LectureQuiz";
import { VisitTracker } from "./VisitTracker";

export function generateStaticParams() {
  return lectures.filter((l) => l.available).map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: PageProps<"/lectures/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const lecture = getLecture(slug);
  return { title: lecture ? `${lecture.id}. ${lecture.title} · Backend Dojo` : "Backend Dojo" };
}

export default function LecturePage({ params }: PageProps<"/lectures/[slug]">) {
  // Reading params inside Suspense keeps client navigation instant.
  return (
    <Suspense fallback={<LessonSkeleton />}>
      <LectureContent params={params} />
    </Suspense>
  );
}

function LessonSkeleton() {
  return (
    <div className="max-w-3xl space-y-4">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-10 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  );
}

async function LectureContent({ params }: { params: PageProps<"/lectures/[slug]">["params"] }) {
  const { slug } = await params;
  const lecture = getLecture(slug);
  const lesson = lessons[slug];
  if (!lecture || !lesson) notFound();

  const { Lesson } = lesson;
  const mod = moduleOf(lecture.id);
  const index = lectures.findIndex((l) => l.slug === slug);
  const prev = lectures[index - 1];
  const next = lectures[index + 1];

  return (
    <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_15rem]">
      <article className="min-w-0 max-w-3xl">
        <VisitTracker lectureId={lecture.id} />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem className="hidden sm:inline-flex">{mod?.title}</BreadcrumbItem>
            <BreadcrumbSeparator className="hidden sm:inline-flex" />
            <BreadcrumbItem>
              <BreadcrumbPage>Lecture {lecture.id}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{lecture.title}</h1>
        <p className="mt-3 text-lg text-muted-foreground">{lecture.summary}</p>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-4" /> ~{lecture.minutes} min source
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ListChecks className="size-4" /> {lesson.quiz.length} questions
          </span>
          <a href={lecture.videoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-foreground">
            <ExternalLink className="size-4" /> Original video
          </a>
        </div>
        <Separator className="my-8" />

        <div id="lesson-body" className="lesson prose prose-neutral max-w-none dark:prose-invert prose-headings:tracking-tight prose-h2:mt-12 prose-pre:overflow-x-auto">
          <Lesson />
        </div>

        <section id="quiz" className="mt-16 scroll-mt-20">
          <h2 className="text-2xl font-semibold tracking-tight">Scenario quiz</h2>
          <p className="mt-1 mb-5 text-sm text-muted-foreground">Real situations, engineer-style answers. 80% to pass.</p>
          <LectureQuiz questions={lesson.quiz} lectureId={lecture.id} />
        </section>

        <nav className="mt-12 grid gap-3 sm:grid-cols-2" aria-label="Lecture navigation">
          {prev ? (
            <Button asChild variant="outline" className="h-auto justify-start py-3 whitespace-normal">
              <Link href={`/lectures/${prev.slug}`}>
                <ArrowLeft />
                <span className="text-left">
                  <span className="block text-xs text-muted-foreground">Previous · {prev.id}</span>
                  {prev.title}
                </span>
              </Link>
            </Button>
          ) : (
            <span />
          )}
          {next && (
            <Button asChild variant="outline" className="h-auto justify-end py-3 whitespace-normal">
              <Link href={`/lectures/${next.slug}`}>
                <span className="text-right">
                  <span className="block text-xs text-muted-foreground">Next · {next.id}</span>
                  {next.title}
                </span>
                <ArrowRight />
              </Link>
            </Button>
          )}
        </nav>
      </article>

      <aside className="hidden xl:block">
        <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
          <TableOfContents containerId="lesson-body" />
        </div>
      </aside>
    </div>
  );
}

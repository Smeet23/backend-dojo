import type { Lecture, Question } from "@/lib/types";
import { courses, type CourseContent } from "./courses";

export { courses };
export type { CourseContent };

/** Display order of courses on the home page. */
const ORDER = ["backend", "system-design", "hld", "langgraph"];
courses.sort((a, b) => (ORDER.indexOf(a.course.id) + 1 || 99) - (ORDER.indexOf(b.course.id) + 1 || 99));

export function getCourse(courseId: string): CourseContent | undefined {
  return courses.find((c) => c.course.id === courseId);
}

export function getLecture(courseId: string, slug: string): Lecture | undefined {
  return getCourse(courseId)?.lectures.find((l) => l.slug === slug);
}

/** Progress key for a lecture: lecture ids repeat across courses, so they're namespaced. */
export function lectureKey(courseId: string, lectureId: number): string {
  return `${courseId}:${lectureId}`;
}

export function courseQuestions(courseId: string): Question[] {
  const c = getCourse(courseId);
  return c ? Object.values(c.lessons).flatMap((l) => l.quiz) : [];
}

export function lectureHref(courseId: string, slug: string): string {
  return `/courses/${courseId}/${slug}`;
}

import "server-only";
import { courses, getCourse } from "@/content/catalog";
import type { Lecture, Question } from "@/lib/types";

export { lessonSectionsFor, lessonText, sectionText, type Section } from "./lesson-text";

export function lectureById(courseId: string, lectureId: number): Lecture | undefined {
  return getCourse(courseId)?.lectures.find((l) => l.id === lectureId);
}

/** Finds a built-in quiz question and the course it belongs to. */
export function findQuestion(questionId: string): { courseId: string; question: Question } | undefined {
  for (const c of courses) {
    for (const lesson of Object.values(c.lessons)) {
      const question = lesson.quiz.find((q) => q.id === questionId);
      if (question) return { courseId: c.course.id, question };
    }
  }
  return undefined;
}

/** "Course › Lecture N. Title" lines for every course, so the AI can point to related lessons. */
export function catalogOutline(): string {
  return courses
    .map((c) => `${c.course.title} (course id "${c.course.id}"):\n${c.lectures.filter((l) => l.available).map((l) => `  ${l.id}. ${l.title} [slug ${l.slug}]`).join("\n")}`)
    .join("\n\n");
}

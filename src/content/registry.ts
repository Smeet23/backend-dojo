import type { ComponentType } from "react";
import type { Question } from "@/lib/types";
import HttpLesson from "./05-http/lesson.mdx";
import { httpQuiz } from "./05-http/quiz";

/** Lesson bodies and quizzes for each available lecture, keyed by slug. */
export const lessons: Record<string, { Lesson: ComponentType; quiz: Question[] }> = {
  http: { Lesson: HttpLesson, quiz: httpQuiz },
};

export const allQuestions: Question[] = Object.values(lessons).flatMap((l) => l.quiz);

import type { ComponentType } from "react";
import type { Question } from "@/lib/types";
import RoadmapLesson from "./01-roadmap/lesson.mdx";
import { quiz as roadmapQuiz } from "./01-roadmap/quiz";
import PathLesson from "./02-path-of-a-backend-engineer/lesson.mdx";
import { quiz as pathQuiz } from "./02-path-of-a-backend-engineer/quiz";
import BackendLesson from "./03-what-is-a-backend/lesson.mdx";
import { quiz as backendQuiz } from "./03-what-is-a-backend/quiz";
import PrinciplesLesson from "./04-first-principles/lesson.mdx";
import { quiz as principlesQuiz } from "./04-first-principles/quiz";
import HttpLesson from "./05-http/lesson.mdx";
import { quiz as httpQuiz } from "./05-http/quiz";

/** Lesson bodies and quizzes for each available lecture, keyed by slug. */
export const lessons: Record<string, { Lesson: ComponentType; quiz: Question[] }> = {
  roadmap: { Lesson: RoadmapLesson, quiz: roadmapQuiz },
  "path-of-a-backend-engineer": { Lesson: PathLesson, quiz: pathQuiz },
  "what-is-a-backend": { Lesson: BackendLesson, quiz: backendQuiz },
  "first-principles": { Lesson: PrinciplesLesson, quiz: principlesQuiz },
  http: { Lesson: HttpLesson, quiz: httpQuiz },
};

export const allQuestions: Question[] = Object.values(lessons).flatMap((l) => l.quiz);

import type { Question } from "@/lib/types";

export const pathQuiz: Question[] = [
  {
    id: "path-phase-order",
    lectures: [2],
    tags: ["mindset"],
    type: "order",
    prompt: "Put the learning phases in the order this course recommends.",
    steps: [
      "Understand the principles and how they connect",
      "Implement each principle in a specific language",
      "Build end-to-end production projects",
    ],
    explanation:
      "Principles first, so the code makes sense when you see it; implementation next; projects last, to combine everything under real constraints.",
    lessonAnchor: "three-phases",
  },
  {
    id: "path-why-principles-first",
    lectures: [2],
    tags: ["mindset"],
    type: "mcq",
    prompt:
      "You're about to learn a Postgres driver library. Why does understanding connection pooling and migrations first help?",
    options: [
      "The library's docs read like a checklist of things you already understand",
      "It doesn't; you should learn the library first",
      "Because libraries hide nothing",
      "So you can skip using a library",
    ],
    answer: "The library's docs read like a checklist of things you already understand",
    explanation:
      "Knowing the problem a tool solves turns documentation from a mystery into a lookup: \"how does this library do pooling?\"",
    lessonAnchor: "why-this-order-works",
  },
  {
    id: "path-goal",
    lectures: [2],
    tags: ["mindset"],
    type: "mcq",
    prompt: "Which outcome best describes the goal of this course?",
    options: [
      "Build systems that scale from zero to a million users and stay maintainable for years",
      "Memorise every Express and Django API",
      "Pass framework certification exams",
      "Write CRUD endpoints as fast as possible",
    ],
    answer: "Build systems that scale from zero to a million users and stay maintainable for years",
    explanation: "Scale and maintainability are the two axes that separate production backends from demo projects.",
    lessonAnchor: "the-goal",
  },
];

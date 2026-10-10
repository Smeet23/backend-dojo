# Backend Dojo: v1 Design

**Date:** 2026-10-10
**Goal:** a personal, interactive course for learning backend engineering from first principles *without watching the source videos*. You learn by reading lessons, using interactive widgets and solving scenario-based quizzes.

Lessons are original write-ups based on the "Backend from first principles" YouTube series. Each lesson links to its source video. No transcripts are stored in this repo.

## Decisions

| Topic | Decision |
|---|---|
| Users | Single user (personal use). No login, no accounts |
| Stack | Next.js (App Router) + Tailwind + MDX, deployed on Vercel |
| Backend / DB | None in v1. Course content ships as files in the repo; progress is kept in browser storage |
| Scope | Lectures 1–5 only, to validate the format before writing more |
| Lesson style | One long, readable page per lecture with embedded diagrams and widgets, then a scenario quiz |
| Grading | Structured answers only (dropdowns, multiple choice, ordering). No AI in v1 |
| Devices | Phone-first, fully responsive; light and dark mode |

## Screens
1. **Home:** lectures 1–5 with status (done / in progress / not started), best quiz score and "Continue".
2. **Lesson page:** sections + diagrams + interactive widgets + the end-of-lecture scenario quiz.
3. **Quiz results:** score, correct answer + explanation per question, "review this section" links.
4. **Mixed quiz:** questions from all completed lectures, weighted toward previous misses.

## Content layout
```
content/<NN-slug>/lesson.mdx   lesson body (MDX, embeds widget components)
content/<NN-slug>/quiz.ts      questions for that lecture
```

## Question schema
```ts
type Question = {
  id: string;
  lectures: number[];          // shown in mixed quizzes only when all are completed
  tags: string[];
  type: "scenario" | "mcq" | "order";   // "free-text" (AI-graded) planned later
  prompt: string;
  fields?: { label: string; options: string[]; answer: string }[]; // scenario: graded per field
  options?: string[]; answer?: string | string[];                  // mcq / order
  explanation: string;
  lessonAnchor: string;        // heading id in the lesson
};
```

## Progress
One versioned object in `localStorage`, accessed only through `lib/progress.ts`:
```ts
{ version: 1, lessons: { [lectureId]: { done, quizBest } }, misses: { [questionId]: count } }
```
- Corrupted data or an older version: reset safely.
- Storage unavailable: the app still works and shows a "progress won't be saved" notice.
- A later move to a database only changes `lib/progress.ts`.

## Build order
1. Skeleton: Next.js + Tailwind + MDX, responsive layout, theme.
2. Quiz engine (scenario / mcq / order), results screen, `lib/progress.ts`.
3. Lecture 5 (HTTP) with widgets: message anatomy, CORS flow stepper, status-code picker, caching (ETag → 304) flow, plus about 10 scenarios.
4. Review the format on phone and desktop; adjust.
5. Lectures 1–4 (lighter lessons and quizzes).
6. Mixed quiz across lectures 1–5.
7. Deploy to Vercel.

## Testing
- Unit tests: quiz grading, weak-topic weighted selection.
- Content check: every question has a valid answer, and its `lessonAnchor` exists in the lesson.
- Manual pass at 375px and desktop widths.

## Out of scope for v1
AI grading of free-text answers, database and cross-device sync, lectures 6–30, module projects and capstone, playlist importer (paste a YouTube playlist and generate a course).

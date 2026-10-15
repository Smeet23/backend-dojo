import { boolean, check, date, index, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/** One row per lecture opened, keyed "<course>:<lectureId>" (e.g. "backend:21.1"). */
export const lessonProgress = pgTable(
  "lesson_progress",
  {
    lectureId: text("lecture_id").primaryKey(),
    visited: boolean("visited").notNull().default(false),
    done: boolean("done").notNull().default(false),
    quizBest: integer("quiz_best"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check("quiz_best_range", sql`${t.quizBest} between 0 and 100`)],
);

/** Every finished quiz, lecture or mixed (lecture_id null), for history. */
export const quizAttempts = pgTable(
  "quiz_attempts",
  {
    id: serial("id").primaryKey(),
    course: text("course").notNull().default("backend"),
    /** Lecture key, or null for a mixed-practice round. */
    lectureId: text("lecture_id"),
    scorePct: integer("score_pct").notNull(),
    questionCount: integer("question_count").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("score_pct_range", sql`${t.scorePct} between 0 and 100`),
    check("question_count_positive", sql`${t.questionCount} > 0`),
  ],
);

/** Net miss count per question; rows are deleted when the count returns to zero. */
export const questionMisses = pgTable(
  "question_misses",
  {
    questionId: text("question_id").primaryKey(),
    misses: integer("misses").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check("misses_positive", sql`${t.misses} > 0`)],
);

/** Failed unlock attempts per key ("ip:<addr>" or "global"), for rate limiting. */
export const loginAttempts = pgTable("login_attempts", {
  key: text("key").primaryKey(),
  failures: integer("failures").notNull(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
});

/** Small key/value settings, e.g. the last lecture opened. */
export const appState = pgTable("app_state", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

/** AI calls made per day (UTC), to keep usage inside the providers' free tiers. */
export const aiUsage = pgTable("ai_usage", {
  day: date("day").primaryKey(),
  calls: integer("calls").notNull(),
});

/** Practice questions written by the AI, validated, then kept so they can be replayed. */
export const aiQuestions = pgTable(
  "ai_questions",
  {
    id: text("id").primaryKey(),
    course: text("course").notNull(),
    /** Lecture key, e.g. "backend:13". */
    lectureId: text("lecture_id").notNull(),
    /** A Question (see src/lib/types.ts). */
    question: jsonb("question").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ai_questions_course_idx").on(t.course, t.createdAt)],
);

/** The "Explain it" open questions for a lesson, written by the AI once and then reused. */
export const writtenQuestions = pgTable("written_questions", {
  /** "<course>/<slug>". */
  lesson: text("lesson").primaryKey(),
  /** WrittenQuestion[] (see src/lib/ai-schemas.ts). */
  questions: jsonb("questions").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Mock-interview scorecards and design reviews, for looking back at later. */
export const aiReports = pgTable(
  "ai_reports",
  {
    id: serial("id").primaryKey(),
    kind: text("kind", { enum: ["interview", "review"] }).notNull(),
    course: text("course").notNull(),
    title: text("title").notNull(),
    /** The structured report (see src/lib/ai-schemas.ts). */
    data: jsonb("data").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ai_reports_course_idx").on(t.course, t.kind, t.createdAt)],
);

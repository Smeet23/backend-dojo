import { boolean, check, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/** One row per lecture the learner has opened. Lecture ids are text so "21.1" stays exact. */
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

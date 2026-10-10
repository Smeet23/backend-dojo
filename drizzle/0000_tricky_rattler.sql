CREATE TABLE "app_state" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_progress" (
	"lecture_id" text PRIMARY KEY NOT NULL,
	"visited" boolean DEFAULT false NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"quiz_best" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quiz_best_range" CHECK ("lesson_progress"."quiz_best" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "question_misses" (
	"question_id" text PRIMARY KEY NOT NULL,
	"misses" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "misses_positive" CHECK ("question_misses"."misses" > 0)
);
--> statement-breakpoint
CREATE TABLE "quiz_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"lecture_id" text,
	"score_pct" integer NOT NULL,
	"question_count" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "score_pct_range" CHECK ("quiz_attempts"."score_pct" between 0 and 100),
	CONSTRAINT "question_count_positive" CHECK ("quiz_attempts"."question_count" > 0)
);

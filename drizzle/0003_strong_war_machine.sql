CREATE TABLE "ai_questions" (
	"id" text PRIMARY KEY NOT NULL,
	"course" text NOT NULL,
	"lecture_id" text NOT NULL,
	"question" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"course" text NOT NULL,
	"title" text NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_usage" (
	"day" date PRIMARY KEY NOT NULL,
	"calls" integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX "ai_questions_course_idx" ON "ai_questions" USING btree ("course","created_at");--> statement-breakpoint
CREATE INDEX "ai_reports_course_idx" ON "ai_reports" USING btree ("course","kind","created_at");
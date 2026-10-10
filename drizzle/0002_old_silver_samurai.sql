ALTER TABLE "quiz_attempts" ADD COLUMN "course" text DEFAULT 'backend' NOT NULL;--> statement-breakpoint
-- Progress saved before courses existed belongs to the backend course.
UPDATE "lesson_progress" SET "lecture_id" = 'backend:' || "lecture_id" WHERE "lecture_id" NOT LIKE '%:%';
--> statement-breakpoint
UPDATE "quiz_attempts" SET "lecture_id" = 'backend:' || "lecture_id" WHERE "lecture_id" IS NOT NULL AND "lecture_id" NOT LIKE '%:%';
--> statement-breakpoint
UPDATE "app_state" SET "value" = 'backend:' || "value" WHERE "key" = 'last_lecture' AND "value" NOT LIKE '%:%';

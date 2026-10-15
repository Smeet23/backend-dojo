CREATE TABLE "written_questions" (
	"lesson" text PRIMARY KEY NOT NULL,
	"questions" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

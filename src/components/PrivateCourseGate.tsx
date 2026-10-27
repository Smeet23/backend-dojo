import type { ReactNode } from "react";
import Link from "next/link";
import { connection } from "next/server";
import type { Course } from "@/lib/types";
import { isAuthenticated } from "@/server/auth";

/** Renders a private course's pages only once this device has entered the passcode. */
export async function PrivateCourseGate({ course, children }: { course: Course; children: ReactNode }) {
  // Public courses skip the cookie read, so their pages stay fully cached.
  if (!course.private) return children;
  // Checking the session reads the clock, so this part must render per request.
  await connection();
  if (await isAuthenticated()) return children;
  return (
    <div className="mx-auto max-w-md">
      <Link href="/" className="text-sm text-muted hover:text-text">← All courses</Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">{course.title}</h1>
      <p className="mt-2 text-muted">This course is private. Enter the passcode on this device to open it.</p>
      <Link
        href="/unlock"
        className="mt-6 inline-block min-h-10 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white dark:text-bg"
      >
        Enter passcode
      </Link>
    </div>
  );
}

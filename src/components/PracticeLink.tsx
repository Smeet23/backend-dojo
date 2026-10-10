"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Header link to the current course's mixed practice; hidden outside a course. */
export function PracticeLink() {
  const course = /^\/courses\/([^/]+)/.exec(usePathname())?.[1];
  if (!course) return null;
  return (
    <Link href={`/courses/${course}/practice`} className="text-sm text-muted hover:text-text">
      Practice
    </Link>
  );
}

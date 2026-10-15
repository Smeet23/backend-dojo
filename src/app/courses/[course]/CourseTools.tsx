import Link from "next/link";

const tools = [
  { href: "practice", icon: "🎯", title: "Practice", text: "Mixed rounds, plus fresh AI questions on your weak spots" },
  { href: "interview", icon: "🎤", title: "Mock interview", text: "An AI interviewer with follow-ups, then a scorecard" },
  { href: "review", icon: "🧐", title: "Design review", text: "Paste a design or code; get a senior engineer's review" },
];

/** Links to the course's practice and AI tools. */
export function CourseTools({ courseId }: { courseId: string }) {
  return (
    <div className="mt-6 grid gap-2 sm:grid-cols-3">
      {tools.map((t) => (
        <Link
          key={t.href}
          href={`/courses/${courseId}/${t.href}`}
          className="min-w-0 rounded-xl border border-border bg-surface px-3 py-3 hover:border-accent"
        >
          <p className="text-sm font-semibold">{t.icon} {t.title}</p>
          <p className="mt-0.5 text-xs leading-snug text-muted">{t.text}</p>
        </Link>
      ))}
    </div>
  );
}

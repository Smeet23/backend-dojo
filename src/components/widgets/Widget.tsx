import type { ReactNode } from "react";

/** Shared frame for interactive widgets embedded in lessons. */
export function Widget({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="not-prose my-8 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <header className="border-b border-border bg-surface-2 px-4 py-2.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Try it · {title}</p>
        {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-9 rounded-full border px-3 text-sm transition-colors ${
        active ? "border-accent bg-accent text-white dark:text-bg" : "border-border bg-surface hover:bg-surface-2"
      }`}
    >
      {children}
    </button>
  );
}

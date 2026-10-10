import type { ReactNode } from "react";

const styles = {
  tip: "border-accent bg-accent-soft",
  warn: "border-warn bg-warn-soft",
  remember: "border-good bg-good-soft",
};

const labels = { tip: "Tip", warn: "Watch out", remember: "Remember" };

export function Callout({ kind = "tip", children }: { kind?: keyof typeof styles; children: ReactNode }) {
  return (
    <aside className={`not-prose my-6 rounded-r-lg border-l-4 px-4 py-3 text-[0.95rem] leading-relaxed ${styles[kind]}`}>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{labels[kind]}</p>
      <div className="[&_code]:rounded [&_code]:bg-surface [&_code]:px-1 [&_code]:text-[0.85em]">{children}</div>
    </aside>
  );
}

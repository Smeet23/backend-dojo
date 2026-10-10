import type { ReactNode } from "react";
import { MousePointerClick } from "lucide-react";
import { cn } from "@/lib/utils";

/** Shared frame for interactive widgets embedded in lessons. */
export function Widget({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="not-prose my-8 overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm">
      <header className="flex items-start gap-3 border-b bg-muted/40 px-4 py-3">
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <MousePointerClick className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            <span className="text-muted-foreground">Try it · </span>
            {title}
          </p>
          {hint && <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p>}
        </div>
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

/** Toggle-style option button used across widgets (matches shadcn's outline/default buttons). */
export function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-9 items-center rounded-lg border px-3 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-xs"
          : "bg-background hover:bg-accent hover:text-accent-foreground",
      )}
    >
      {children}
    </button>
  );
}

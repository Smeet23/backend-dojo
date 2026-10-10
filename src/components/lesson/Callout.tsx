import type { ReactNode } from "react";
import { Info, Lightbulb, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const styles = {
  tip: { box: "border-primary/30 bg-primary/5", icon: "text-primary", Icon: Info, label: "Tip" },
  warn: { box: "border-warn/40 bg-warn-soft", icon: "text-warn", Icon: TriangleAlert, label: "Watch out" },
  remember: { box: "border-good/40 bg-good-soft", icon: "text-good", Icon: Lightbulb, label: "Remember" },
};

export function Callout({ kind = "tip", children }: { kind?: keyof typeof styles; children: ReactNode }) {
  const s = styles[kind];
  return (
    <aside role="note" className={cn("not-prose my-6 flex gap-3 rounded-xl border px-4 py-3 text-[0.95rem] leading-relaxed", s.box)}>
      <s.Icon className={cn("mt-0.5 size-5 shrink-0", s.icon)} aria-hidden />
      <div className="min-w-0">
        <p className="font-semibold">{s.label}</p>
        <div className="mt-0.5 [&_code]:rounded [&_code]:bg-background/70 [&_code]:px-1 [&_code]:font-mono [&_code]:text-[0.85em] [&_p+p]:mt-2">
          {children}
        </div>
      </div>
    </aside>
  );
}

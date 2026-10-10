"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Heading = { id: string; text: string };

/** "On this page": reads the lesson's h2 headings and highlights the one in view. */
export function TableOfContents({ containerId }: { containerId: string }) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const root = document.getElementById(containerId);
    if (!root) return;
    const els = [...root.querySelectorAll<HTMLHeadingElement>("h2[id]")];
    // eslint-disable-next-line react-hooks/set-state-in-effect -- headings come from the rendered DOM
    setHeadings([...els.map((h) => ({ id: h.id, text: h.textContent ?? "" })), { id: "quiz", text: "Scenario quiz" }]);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -70% 0px" },
    );
    [...els, document.getElementById("quiz")].forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [containerId]);

  if (headings.length === 0) return null;
  return (
    <nav aria-label="On this page" className="text-sm">
      <p className="mb-3 font-semibold">On this page</p>
      <ul className="space-y-0.5 border-l">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              className={cn(
                "-ml-px block border-l-2 py-1 pl-3 leading-snug transition-colors",
                active === h.id
                  ? "border-primary font-medium text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

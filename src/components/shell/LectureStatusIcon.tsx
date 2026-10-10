import { CheckCircle2, Circle, CircleDashed } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LessonProgress } from "@/lib/progress";

/** Done = filled check, opened = dashed ring, untouched = empty ring. */
export function LectureStatusIcon({ progress, className }: { progress: LessonProgress; className?: string }) {
  if (progress.done) return <CheckCircle2 className={cn("size-4 text-good", className)} aria-label="Done" />;
  if (progress.visited) return <CircleDashed className={cn("size-4 text-primary", className)} aria-label="In progress" />;
  return <Circle className={cn("size-4 text-muted-foreground/60", className)} aria-label="Not started" />;
}

import { SquareTerminal } from "lucide-react";
import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <SquareTerminal className="size-4" />
      </span>
      <span>Backend Dojo</span>
    </Link>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Dumbbell, House, RefreshCw } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

/** Thumb-reachable navigation on phones; "Lectures" opens the module sheet. */
export function MobileTabBar() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const item = "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium";
  const tone = (active: boolean) => (active ? "text-primary" : "text-muted-foreground");

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <Link href="/" className={cn(item, tone(pathname === "/"))}>
        <House className="size-5" />
        Home
      </Link>
      <button type="button" onClick={() => setOpenMobile(true)} className={cn(item, tone(pathname.startsWith("/lectures")))}>
        <BookOpen className="size-5" />
        Lectures
      </button>
      <Link href="/practice" className={cn(item, tone(pathname === "/practice"))}>
        <Dumbbell className="size-5" />
        Practice
      </Link>
      <Link href="/unlock" className={cn(item, tone(pathname === "/unlock"))}>
        <RefreshCw className="size-5" />
        Sync
      </Link>
    </nav>
  );
}

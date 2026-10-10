"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { modules, moduleLectures } from "@/content/modules";
import { getLessonProgress, useProgress } from "@/lib/progress";
import { LectureStatusIcon } from "./LectureStatusIcon";

/** ⌘K / Ctrl+K palette to jump to any lecture. */
export function SearchCommand() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const progress = useProgress();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="h-9 w-full max-w-sm justify-start gap-2 px-3 font-normal text-muted-foreground"
      >
        <Search className="size-4" />
        <span className="truncate">Search lectures…</span>
        <kbd className="ml-auto hidden rounded border bg-muted px-1.5 font-mono text-[10px] sm:inline">⌘K</kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} title="Search lectures" description="Jump to any lecture">
        <CommandInput placeholder="Search lectures and topics…" />
        <CommandList>
          <CommandEmpty>No lecture found.</CommandEmpty>
          <CommandGroup heading="Go to">
            <CommandItem onSelect={() => go("/")}>Home</CommandItem>
            <CommandItem onSelect={() => go("/practice")}>Mixed practice</CommandItem>
            <CommandItem onSelect={() => go("/unlock")}>Progress sync</CommandItem>
          </CommandGroup>
          {modules.map((m) => (
            <CommandGroup key={m.id} heading={m.title}>
              {moduleLectures(m).map((l) => (
                <CommandItem key={l.slug} value={`${l.id} ${l.title} ${l.summary}`} onSelect={() => go(`/lectures/${l.slug}`)}>
                  <LectureStatusIcon progress={getLessonProgress(progress, l.id)} />
                  <span className="w-8 font-mono text-xs text-muted-foreground">{l.id}</span>
                  <span className="truncate">{l.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}

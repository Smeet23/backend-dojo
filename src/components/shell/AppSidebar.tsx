"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Dumbbell, House, RefreshCw } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { modules, moduleLectures, moduleOf } from "@/content/modules";
import { lectures } from "@/content/lectures";
import { getLessonProgress, useProgress } from "@/lib/progress";
import { LectureStatusIcon } from "./LectureStatusIcon";
import { Logo } from "./Logo";

const nav = [
  { href: "/", label: "Home", icon: House },
  { href: "/practice", label: "Practice", icon: Dumbbell },
  { href: "/unlock", label: "Sync", icon: RefreshCw },
];

export function AppSidebar() {
  const pathname = usePathname();
  const progress = useProgress();
  const { setOpenMobile } = useSidebar();
  const currentSlug = pathname.startsWith("/lectures/") ? pathname.split("/")[2] : null;
  const current = lectures.find((l) => l.slug === currentSlug);
  // Open the module you're reading (or last read); the rest stay folded.
  const openModule = moduleOf(current?.id ?? progress.lastLecture ?? 1)?.id;
  const close = () => setOpenMobile(false);

  return (
    <Sidebar>
      <SidebarHeader className="h-14 justify-center px-4">
        <Logo />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton asChild isActive={pathname === href}>
                    <Link href={href} onClick={close}>
                      <Icon />
                      <span>{label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Course</SidebarGroupLabel>
          <SidebarMenu>
            {modules.map((m) => {
              const items = moduleLectures(m);
              const done = items.filter((l) => getLessonProgress(progress, l.id).done).length;
              return (
                <Collapsible key={m.id} defaultOpen={m.id === openModule} className="group/collapsible" asChild>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton>
                        <span className="font-medium">{m.title}</span>
                        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                          {done}/{items.length}
                        </span>
                        <ChevronRight className="transition-transform group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {items.map((l) => (
                          <SidebarMenuSubItem key={l.slug}>
                            <SidebarMenuSubButton asChild isActive={l.slug === currentSlug} className="h-auto items-start py-1.5 [&>svg]:mt-0.5">
                              <Link href={`/lectures/${l.slug}`} onClick={close}>
                                <LectureStatusIcon progress={getLessonProgress(progress, l.id)} className="shrink-0" />
                                <span className="w-7 shrink-0 font-mono text-xs text-muted-foreground">{l.id}</span>
                                <span className="line-clamp-2 leading-snug">{l.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}

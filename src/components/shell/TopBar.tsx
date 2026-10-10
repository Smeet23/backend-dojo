import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { SyncBadge } from "@/components/SyncBadge";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { SearchCommand } from "./SearchCommand";

export function TopBar() {
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur sm:px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-5" />
      <div className="min-w-0 flex-1">
        <SearchCommand />
      </div>
      <SyncBadge />
      <ThemeToggle />
    </header>
  );
}

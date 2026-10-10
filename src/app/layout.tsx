import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SyncBadge } from "@/components/SyncBadge";
import { ThemeToggle, themeScript } from "@/components/ThemeToggle";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Backend Dojo",
  description: "Learn backend engineering from first principles through lessons and real-world scenarios.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf9" },
    { media: "(prefers-color-scheme: dark)", color: "#121211" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The theme script sets the "dark" class before React hydrates, hence suppressHydrationWarning.
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <header className="sticky top-0 z-20 border-b border-border bg-bg/90 backdrop-blur">
          <nav className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
            <Link href="/" className="font-semibold tracking-tight">
              Backend <span className="text-accent">Dojo</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/practice" className="text-sm text-muted hover:text-text">
                Practice
              </Link>
              <SyncBadge />
              <ThemeToggle />
            </div>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:py-10">{children}</main>
      </body>
    </html>
  );
}

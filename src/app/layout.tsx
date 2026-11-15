import type { Metadata } from "next";
import "./globals.css";
import { getDemoContext } from "@/lib/analytics";
import { fmtDate } from "@/lib/domain";
import { AppShellHeader } from "@/components/AppShellHeader";
import { SunnySidebar } from "@/components/SunnySidebar";

export const metadata: Metadata = {
  title: "Sunny Workplace Intelligence — Organizational Ontology Prototype",
  description:
    "Interactive synthetic-data prototype demonstrating how an organizational ontology enables human-centered workplace intelligence and meaningful employer action.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getDemoContext();
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f8f7f3] text-[#1c1e1d] antialiased">
        <AppShellHeader
          currentDateLabel={fmtDate(ctx.currentDate)}
          phase={ctx.phase}
          maxWeek={ctx.maxWeek}
          viewer={ctx.viewer}
          personas={ctx.personas}
        />

        <div className="mx-auto flex max-w-[1520px] gap-6 px-6 py-6">
          <SunnySidebar viewer={ctx.viewer} />
          <main className="min-w-0 flex-1">{children}</main>
        </div>

        <footer className="mt-12 border-t border-[#e6e2d8] bg-[#f2efe8] py-6 text-xs text-[#5c635f]">
          <div className="mx-auto flex max-w-[1520px] flex-wrap items-center justify-between gap-4 px-6">
            <p className="font-medium text-[#1c1e1d]">
              “The purpose of this system is not to give employers more ways to look into employees&apos; lives. It is to help them understand the environment they&apos;ve created and give them better ways to improve it.”
            </p>
            <p>
              All records are <strong>100% synthetic</strong> (Northstar Community Services · 72 employees · 8 teams · 12 projects). Independent technical demonstration.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}

"use client";

import React, { useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Compass,
  Database,
  FastForward,
  GitBranch,
  HeartHandshake,
  LayoutDashboard,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { advanceTimelineAction, resetDemoAction, switchViewerAction } from "@/lib/actions";

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: LayoutDashboard, step: "1" },
  { href: "/graph", label: "Organization Graph", icon: GitBranch, step: "2" },
  { href: "/teams", label: "Teams", icon: Users, step: "3" },
  { href: "/people", label: "People", icon: UserCheck, step: "4" },
  { href: "/insights", label: "AI Insights", icon: Sparkles, step: "5" },
  { href: "/interventions", label: "Interventions", icon: HeartHandshake, step: "6" },
  { href: "/outcomes", label: "Outcomes", icon: TrendingUp, step: "7" },
  { href: "/sources", label: "Data Sources", icon: Database, step: "8" },
];

export function AppShellHeader(props: {
  currentDateLabel: string;
  phase: "DISCOVERY" | "FOLLOW_UP";
  maxWeek: number;
  viewer: { id: string; name: string; role: string; systemRole: string; teamId: string };
  personas: { id: string; name: string; role: string; systemRole: string; label: string }[];
}) {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  return (
    <header className="sticky top-0 z-30 border-b border-[#e4dfd3] bg-[#faf8f3]/95 backdrop-blur">
      {/* Top bar: brand + synthetic badge + role switcher + timeline controls */}
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-6 py-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3d6b52] text-white shadow-xs">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold tracking-tight text-[#1f2421]">Sunny Workplace Intelligence</span>
                <span className="rounded-full border border-[#c8d8ce] bg-[#eaf2ed] px-2 py-0.5 text-[11px] font-medium text-[#2f5741]">
                  SYNTHETIC DEMO · Northstar Community Services
                </span>
              </div>
              <p className="text-xs text-[#5a625d]">
                Organizational Ontology · Independent Technical Prototype (No Surveillance · Aggregate &amp; Consent-First)
              </p>
            </div>
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Role Switcher */}
          <div className="flex items-center gap-1.5 rounded-lg border border-[#dfd9cc] bg-white px-2.5 py-1.5 text-xs">
            <ShieldCheck className="h-3.5 w-3.5 text-[#3d6b52]" />
            <span className="text-[#5a625d]">Viewing as:</span>
            <select
              aria-label="Switch RBAC viewer role"
              value={props.viewer.id}
              disabled={isPending}
              onChange={(e) => startTransition(() => switchViewerAction(e.target.value))}
              className="font-medium text-[#1f2421] focus:outline-none"
            >
              {props.personas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Demo Timeline state */}
          <div className="flex items-center gap-2 rounded-lg border border-[#dfd9cc] bg-white px-3 py-1.5 text-xs">
            <Activity className="h-3.5 w-3.5 text-[#3b6491]" />
            <div>
              <span className="font-medium text-[#1f2421]">
                {props.phase === "DISCOVERY" ? "Week 12 · Nov 16, 2026" : "Week 14 Follow-Up · Dec 2, 2026"}
              </span>
              <span className="ml-1.5 rounded bg-[#eef2f6] px-1.5 py-0.5 text-[10px] font-medium text-[#3b6491]">
                {props.phase === "DISCOVERY" ? "Scene 1–5: Discovery & Action" : "Scene 6: Follow-Up Measured"}
              </span>
            </div>
          </div>

          {props.phase === "DISCOVERY" ? (
            <button
              type="button"
              disabled={isPending}
              onClick={() => startTransition(() => advanceTimelineAction())}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#3b6491] px-3 py-1.5 text-xs font-medium text-white shadow-xs transition hover:bg-[#31547b] disabled:opacity-50"
            >
              <FastForward className="h-3.5 w-3.5" />
              Advance +2 Weeks (Follow-Up Pulse)
            </button>
          ) : (
            <span className="rounded-lg border border-[#c8d8ce] bg-[#eaf2ed] px-2.5 py-1.5 text-xs font-medium text-[#2f5741]">
              Follow-Up Pulse Active (Wk 14)
            </span>
          )}

          <button
            type="button"
            disabled={isPending}
            onClick={() => startTransition(() => resetDemoAction())}
            className="inline-flex items-center gap-1 rounded-lg border border-[#dfd9cc] bg-white px-2.5 py-1.5 text-xs font-medium text-[#454c47] transition hover:bg-[#f2efe8] disabled:opacity-50"
            title="Reset database to initial Week 12 state"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Demo
          </button>
        </div>
      </div>

      {/* Main navigation + Guided 6-Scene Story Bar */}
      <div className="border-t border-[#ece7dc] bg-[#f4f1ea]">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 overflow-x-auto px-6 py-1.5">
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active =
                item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    active
                      ? "bg-[#3d6b52] text-white shadow-xs"
                      : "text-[#3f4642] hover:bg-[#e8e3d7]"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-1.5 text-[11px] text-[#5a625d] xl:flex">
            <span className="font-medium text-[#2f5741]">Demo Story:</span>
            <Link href="/" className="hover:underline">1. Org System</Link>
            <span>→</span>
            <Link href="/teams/t-outreach" className="hover:underline">2. Outreach Vitals</Link>
            <span>→</span>
            <Link href="/graph?team=t-outreach&highlight=reasoning" className="hover:underline">3. Ontology Graph</Link>
            <span>→</span>
            <Link href="/insights" className="hover:underline">4. Ask AI</Link>
            <span>→</span>
            <Link href="/interventions?select=clarify-responsibilities" className="hover:underline">5. Approve Action</Link>
            <span>→</span>
            <Link href="/outcomes" className="hover:underline">6. Outcome Loop</Link>
          </div>
        </div>
      </div>
    </header>
  );
}

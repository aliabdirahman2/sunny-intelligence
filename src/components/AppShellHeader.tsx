"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BatteryCharging,
  BookOpen,
  Database,
  FastForward,
  GitBranch,
  LayoutDashboard,
  RotateCcw,
  ShieldCheck,
  Smile,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { advanceTimelineAction, resetDemoAction, switchViewerAction } from "@/lib/actions";
import { EnergyCheckInModal } from "./EnergyCheckInModal";

export const SIDEBAR_GROUPS = [
  {
    title: "INTELLIGENCE LAYER",
    items: [
      { href: "/", label: "Overview", icon: LayoutDashboard },
      { href: "/graph", label: "Organization Graph", icon: GitBranch },
      { href: "/insights", label: "AI Insights", icon: Sparkles },
    ],
  },
  {
    title: "CHECK-INS & TEAM VITALS",
    items: [
      { href: "/teams", label: "Team Insights", icon: Users },
      { href: "/interventions", label: "Connect Guides", icon: BookOpen },
      { href: "/outcomes", label: "Outcomes Loop", icon: TrendingUp },
    ],
  },
  {
    title: "ENERGY & PEOPLE",
    items: [
      { href: "/people/e-jordan-ellis", label: "My Battery & Profile", icon: BatteryCharging },
      { href: "/people", label: "Team Directory (72)", icon: UserCheck },
    ],
  },
  {
    title: "GOVERNANCE",
    items: [{ href: "/sources", label: "Data Sources", icon: Database }],
  },
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
  const [checkInOpen, setCheckInOpen] = useState(false);

  const initials = props.viewer.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-[#262826] bg-[#161716] text-white">
        {/* Top Sunny Workplace Bar (Screenshot 1 aesthetic) */}
        <div className="mx-auto flex max-w-[1520px] flex-wrap items-center justify-between gap-3 px-6 py-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f6d54a] text-[#161716] shadow-xs">
                <Smile className="h-4 w-4" />
              </div>
              <div className="flex items-baseline gap-2.5">
                <span className="font-editorial text-xl tracking-tight text-white">Sunny workplace</span>
                <span className="hidden rounded-full border border-[#3a3f3b] bg-[#242725] px-2.5 py-0.5 text-[10px] font-medium text-[#c8e6c9] sm:inline-block">
                  SYNTHETIC ONTOLOGY PROTOTYPE · Northstar Community Services
                </span>
              </div>
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Simulate Slack/Teams Daily Check-In (Screenshot 3) */}
            <button
              type="button"
              onClick={() => setCheckInOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#f6d54a] px-3.5 py-1.5 text-xs font-semibold text-[#161716] shadow-xs transition hover:bg-[#f2ca27]"
            >
              <Smile className="h-3.5 w-3.5" />
              My Check-In Prompt
            </button>

            {/* Role Switcher */}
            <div className="flex items-center gap-1.5 rounded-full border border-[#323633] bg-[#222523] px-3 py-1.5 text-xs">
              <ShieldCheck className="h-3.5 w-3.5 text-[#7ee0a8]" />
              <select
                aria-label="Switch RBAC viewer role"
                value={props.viewer.id}
                disabled={isPending}
                onChange={(e) => startTransition(() => switchViewerAction(e.target.value))}
                className="bg-transparent font-medium text-white focus:outline-none"
              >
                {props.personas.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#161716] text-white">
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Timeline state */}
            <div className="flex items-center gap-1.5 rounded-full border border-[#323633] bg-[#222523] px-3 py-1.5 text-xs">
              <Activity className="h-3.5 w-3.5 text-[#8cc2ff]" />
              <span className="font-medium text-white">
                {props.phase === "DISCOVERY" ? "Wk 12 · Nov 16" : "Wk 14 · Dec 2"}
              </span>
            </div>

            {props.phase === "DISCOVERY" ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() => startTransition(() => advanceTimelineAction())}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#3eb489] px-3.5 py-1.5 text-xs font-semibold text-[#0e261c] transition hover:bg-[#4dc498] disabled:opacity-50"
              >
                <FastForward className="h-3.5 w-3.5" />
                Advance +2 Wks
              </button>
            ) : (
              <span className="rounded-full border border-[#3eb489]/40 bg-[#1e382d] px-3 py-1.5 text-xs font-medium text-[#8ee3be]">
                Follow-Up Active (Wk 14)
              </span>
            )}

            <button
              type="button"
              disabled={isPending}
              onClick={() => startTransition(() => resetDemoAction())}
              className="inline-flex items-center gap-1 rounded-full border border-[#323633] bg-[#222523] px-3 py-1.5 text-xs font-medium text-[#d4d8d5] transition hover:bg-[#2e322f] disabled:opacity-50"
              title="Reset database to initial Week 12 state"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>

            <div
              className="hidden h-8 w-8 items-center justify-center rounded-full border border-[#4a4f4b] bg-gradient-to-br from-[#d9c8f7] to-[#a7c8ff] text-[11px] font-bold text-[#161716] md:flex"
              title={props.viewer.name}
            >
              {initials}
            </div>
          </div>
        </div>

        {/* Guided 6-Scene Story Bar + Mobile Nav */}
        <div className="border-t border-[#262927] bg-[#1e201e]">
          <div className="mx-auto flex max-w-[1520px] items-center justify-between gap-4 overflow-x-auto px-6 py-1.5 text-[11px] text-[#b8beb9]">
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="font-semibold text-[#f6d54a]">6-Scene Demo Story:</span>
              <Link href="/" className="hover:text-white hover:underline">1. Org System</Link>
              <span>→</span>
              <Link href="/teams/t-outreach" className="hover:text-white hover:underline">2. Outreach Vitals</Link>
              <span>→</span>
              <Link href="/graph?team=t-outreach&highlight=reasoning" className="hover:text-white hover:underline">3. Ontology Graph</Link>
              <span>→</span>
              <Link href="/insights" className="hover:text-white hover:underline">4. Ask AI</Link>
              <span>→</span>
              <Link href="/interventions?select=clarify-responsibilities" className="hover:text-white hover:underline">5. Connect Guide Action</Link>
              <span>→</span>
              <Link href="/outcomes" className="hover:text-white hover:underline">6. Outcome Loop</Link>
            </div>
            <div className="hidden text-[11px] text-[#8f9792] lg:block">
              No surveillance · Aggregate n≥5 · Consent-first Energy Profiles
            </div>
          </div>

          {/* Mobile quick nav */}
          <nav className="flex gap-1 overflow-x-auto px-4 pb-2 lg:hidden">
            {SIDEBAR_GROUPS.flatMap((g) => g.items).map((item) => {
              const Icon = item.icon;
              const active =
                item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                    active ? "bg-[#f6d54a] text-[#161716]" : "bg-[#262926] text-[#d5dad6]"
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <EnergyCheckInModal
        open={checkInOpen}
        onClose={() => setCheckInOpen(false)}
        viewerName={props.viewer.name}
      />
    </>
  );
}

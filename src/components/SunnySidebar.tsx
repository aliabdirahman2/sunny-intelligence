"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SIDEBAR_GROUPS } from "./AppShellHeader";

export function SunnySidebar(props: {
  viewer: { id: string; name: string; role: string; systemRole: string };
}) {
  const pathname = usePathname();
  const initials = props.viewer.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className="hidden w-60 shrink-0 lg:block">
      <div className="sticky top-28 rounded-2xl border border-[#e6e2d8] bg-white p-4 shadow-xs">
        {/* User Identity Header (Screenshot 2) */}
        <Link
          href={`/people/${props.viewer.id}`}
          className="flex items-center gap-2.5 border-b border-[#f0ece2] pb-3.5 transition hover:opacity-80"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#f6d54a] to-[#3eb489] text-xs font-bold text-[#161716]">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-[#1c1e1d]">{props.viewer.name}</div>
            <div className="truncate text-[11px] text-[#5c635f]">{props.viewer.systemRole}</div>
          </div>
        </Link>

        {/* Grouped Navigation (Screenshot 2) */}
        <nav className="mt-4 space-y-5">
          {SIDEBAR_GROUPS.map((group) => (
            <div key={group.title}>
              <div className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-[#7c837e]">
                {group.title}
              </div>
              <ul className="mt-1.5 space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active =
                    item.href === "/"
                      ? pathname === "/"
                      : item.href === "/people"
                        ? pathname === "/people" || (pathname.startsWith("/people/") && pathname !== "/people/e-jordan-ellis")
                        : pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium transition ${
                          active
                            ? "bg-[#f4f1e6] font-semibold text-[#1c1e1d] shadow-2xs"
                            : "text-[#4b524e] hover:bg-[#faf8f3] hover:text-[#1c1e1d]"
                        }`}
                      >
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full ${
                            active ? "bg-[#f6d54a] text-[#161716]" : "bg-[#f2efe8] text-[#5c635f]"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}


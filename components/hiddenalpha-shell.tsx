"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import {
  Activity,
  BarChart3,
  Bell,
  ChevronDown,
  Command,
  Database,
  Home,
  Radar,
  Search,
  Star,
  Wrench,
  Zap,
} from "lucide-react";

import MarketStrip from "@/components/market-strip";
import MarketAutoSync from "@/components/market-auto-sync";
import EngineHealthStatus from "@/components/engine-health-status";

type Props = {
  children: ReactNode;
};

type StoredAlert = {
  read?: boolean;
};

const ALERTS_KEY =
  "hiddenalpha:alerts:v1";

const navigation = [
  {
    label: "Overview",
    href: "/",
    icon: Home,
    available: true,
  },
  {
    label: "Signals",
    href: "/signals",
    icon: Zap,
    available: true,
  },
  {
    label: "Market",
    href: "/markets",
    icon: BarChart3,
    available: true,
  },
  {
    label: "Scanner",
    href: "/scanner",
    icon: Radar,
    available: true,
  },
  {
    label: "Watchlist",
    href: "/watchlist",
    icon: Star,
    available: true,
  },
  {
    label: "Tools",
    href: "/tools",
    icon: Wrench,
    available: true,
  },
  {
    label: "Performance",
    href: "/performance",
    icon: Activity,
    available: true,
  },
  {
    label: "Alerts",
    href: "/alerts",
    icon: Bell,
    available: true,
  },
];

function getUnreadAlertCount() {
  if (
    typeof window ===
    "undefined"
  ) {
    return 0;
  }

  try {
    const stored =
      window.localStorage.getItem(
        ALERTS_KEY
      );

    if (!stored) {
      return 0;
    }

    const parsed: unknown =
      JSON.parse(stored);

    if (
      !Array.isArray(parsed)
    ) {
      return 0;
    }

    return parsed.filter(
      (
        item:
          StoredAlert
      ) =>
        item &&
        item.read !== true
    ).length;
  } catch {
    return 0;
  }
}

function formatBadgeCount(
  count: number
) {
  if (
    count > 99
  ) {
    return "99+";
  }

  return String(
    count
  );
}

export default function HiddenAlphaShell({
  children,
}: Props) {
  const pathname =
    usePathname();

  const [
    unreadAlerts,
    setUnreadAlerts,
  ] =
    useState(0);

  /*
   * ========================================
   * GLOBAL ALERT BADGE
   * ========================================
   *
   * Alert v1 is stored in localStorage.
   * Storage events only fire reliably
   * across different tabs, so the shell
   * also performs a lightweight periodic
   * local read for same-tab updates.
   */

  useEffect(() => {
    function syncUnread() {
      setUnreadAlerts(
        getUnreadAlertCount()
      );
    }

    syncUnread();

    const interval =
      window.setInterval(
        syncUnread,
        3000
      );

    function handleStorage(
      event: StorageEvent
    ) {
      if (
        event.key ===
        ALERTS_KEY
      ) {
        syncUnread();
      }
    }

    function handleVisibility() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        syncUnread();
      }
    }

    window.addEventListener(
      "storage",
      handleStorage
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibility
    );

    return () => {
      window.clearInterval(
        interval
      );

      window.removeEventListener(
        "storage",
        handleStorage
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );
    };
  }, [
    pathname,
  ]);

  return (
    <>
      <MarketAutoSync />

      <div className="min-h-screen bg-[var(--ha-bg)] text-zinc-100">
        <div className="flex min-h-screen">

          {/* SIDEBAR */}

          <aside className="fixed inset-y-0 left-0 z-40 hidden w-[220px] flex-col border-r border-white/[0.055] bg-[#07090d] lg:flex">

            {/* BRAND */}

            <div className="flex h-[72px] items-center border-b border-white/[0.055] px-5">
              <div className="flex items-center gap-3">

                <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 shadow-[0_0_30px_rgba(124,58,237,0.12)]">
                  <span className="text-[16px] font-bold text-white">
                    α
                  </span>

                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#07090d] bg-emerald-400" />
                </div>

                <div>
                  <div className="text-[15px] font-semibold tracking-[-0.02em] text-white">
                    HiddenAlpha
                  </div>

                  <div className="mt-0.5 text-[7px] font-medium uppercase tracking-[0.18em] text-zinc-600">
                    Trading Intelligence
                  </div>
                </div>

              </div>
            </div>

            {/* NAVIGATION */}

            <div className="flex-1 px-3 py-5">

              <p className="mb-3 px-3 text-[8px] font-semibold uppercase tracking-[0.16em] text-zinc-700">
                Command Desk
              </p>

              <nav className="space-y-1">
                {navigation.map(
                  (item) => {
                    const Icon =
                      item.icon;

                    const active =
                      item.href === "/"
                        ? pathname === "/"
                        : pathname.startsWith(
                            item.href
                          );

                    if (
                      !item.available
                    ) {
                      return (
                        <div
                          key={
                            item.label
                          }
                          className="flex cursor-default items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] text-zinc-700"
                        >
                          <Icon
                            size={16}
                            strokeWidth={
                              1.8
                            }
                          />

                          <span>
                            {item.label}
                          </span>

                          <span className="ml-auto text-[7px] font-medium uppercase tracking-wider text-zinc-800">
                            Soon
                          </span>
                        </div>
                      );
                    }

                    return (
                      <Link
                        key={
                          item.label
                        }
                        href={
                          item.href
                        }
                        className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] transition ${
                          active
                            ? "border border-violet-500/10 bg-violet-500/[0.10] text-zinc-100"
                            : "border border-transparent text-zinc-500 hover:bg-white/[0.025] hover:text-zinc-300"
                        }`}
                      >
                        <Icon
                          size={16}
                          strokeWidth={
                            1.8
                          }
                          className={
                            active
                              ? "text-violet-400"
                              : "text-zinc-600 transition group-hover:text-zinc-400"
                          }
                        />

                        <span>
                          {item.label}
                        </span>

                        {item.label ===
                          "Signals" && (
                          <span className="ml-auto flex items-center gap-1 text-[7px] font-medium text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

                            LIVE
                          </span>
                        )}
                        {item.label ===
                          "Scanner" && (
                          <span className="ml-auto rounded-md border border-violet-500/10 bg-violet-500/[0.06] px-1.5 py-0.5 text-[6px] font-medium uppercase tracking-[0.08em] text-violet-400">
                            Active
                          </span>
                        )}

                        {item.label ===
                          "Watchlist" && (
                          <span className="ml-auto rounded-md border border-amber-500/10 bg-amber-500/[0.05] px-1.5 py-0.5 text-[6px] font-medium uppercase tracking-[0.08em] text-amber-400">
                            Active
                          </span>
                        )}

                        {item.label ===
                          "Tools" && (
                          <span className="ml-auto rounded-md border border-cyan-500/10 bg-cyan-500/[0.05] px-1.5 py-0.5 text-[6px] font-medium uppercase tracking-[0.08em] text-cyan-400">
                            Active
                          </span>
                        )}

                        {item.label ===
                          "Alerts" &&
                          unreadAlerts >
                            0 && (
                            <span className="ml-auto flex min-w-[20px] items-center justify-center rounded-full border border-red-500/15 bg-red-500/[0.08] px-1.5 py-0.5 text-[6px] font-semibold text-red-400">
                              {formatBadgeCount(
                                unreadAlerts
                              )}
                            </span>
                          )}

                      </Link>
                    );
                  }
                )}
              </nav>

            </div>

            {/* CORE STATUS */}

            <div className="border-t border-white/[0.05] p-3">
              <div className="rounded-xl border border-white/[0.055] bg-white/[0.018] p-3">

                <div className="flex items-center justify-between">

                  <div className="flex items-center gap-2">
                    <span className="ha-live-dot" />

                    <span className="text-[9px] font-medium text-zinc-400">
                      Core Engine
                    </span>
                  </div>

                  <span className="text-[8px] font-medium text-emerald-400">
                    v1
                  </span>

                </div>

                <p className="mt-2 text-[7px] leading-4 text-zinc-700">
                  Market context,
                  signals, risk &
                  performance.
                </p>

              </div>
            </div>

          </aside>

          {/* MAIN */}

          <div className="min-w-0 flex-1 lg:pl-[220px]">

            {/* TOPBAR */}

            <header className="sticky top-0 z-30 border-b border-white/[0.055] bg-[#07090d]/95 backdrop-blur-xl">

              <div className="flex h-[64px] items-center gap-3 px-4 lg:px-5">

                {/* MOBILE BRAND */}

                <div className="flex items-center gap-2 lg:hidden">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-sm font-bold">
                    α
                  </div>
                </div>

                {/* SEARCH */}

                <div className="hidden max-w-[430px] flex-1 md:block">
                  <div className="flex h-9 items-center gap-2 rounded-lg border border-white/[0.055] bg-[#0a0d13] px-3">

                    <Search
                      size={14}
                      className="text-zinc-700"
                    />

                    <input
                      placeholder="Search assets, signals, charts, or ask AI..."
                      className="min-w-0 flex-1 bg-transparent text-[10px] text-zinc-300 outline-none placeholder:text-zinc-700"
                    />

                    <div className="flex items-center gap-1 rounded border border-white/[0.05] bg-white/[0.02] px-1.5 py-1 text-[7px] text-zinc-700">

                      <Command
                        size={8}
                      />

                      K

                    </div>

                  </div>
                </div>

                <div className="ml-auto flex items-center gap-2">

                  {/* DESK */}

                  <button className="hidden h-9 items-center gap-2 rounded-lg border border-white/[0.055] bg-[#0a0d13] px-3 text-[9px] text-zinc-400 sm:flex">

                    <span className="text-amber-400">
                      ◈
                    </span>

                    Core Desk

                    <ChevronDown
                      size={11}
                      className="text-zinc-700"
                    />

                  </button>

                  {/* DATA */}

                  <div className="hidden h-9 items-center gap-2 rounded-lg border border-white/[0.055] bg-[#0a0d13] px-3 md:flex">

                    <Database
                      size={12}
                      className="text-emerald-400"
                    />

                    <div>
                      <p className="text-[8px] text-zinc-400">
                        Bybit
                      </p>

                      <p className="text-[7px] text-emerald-400">
                        Live Data
                      </p>
                    </div>

                  </div>

                  {/* REAL ENGINE HEALTH */}

                  <EngineHealthStatus />

                  {/* ALERT BUTTON */}

                  <Link
                    href="/alerts"
                    className={`relative flex h-9 w-9 items-center justify-center rounded-lg border transition ${
                      pathname.startsWith(
                        "/alerts"
                      )
                        ? "border-violet-500/15 bg-violet-500/[0.08]"
                        : "border-white/[0.055] bg-[#0a0d13] hover:border-white/[0.09]"
                    }`}
                    aria-label="Open alerts"
                  >

                    <Bell
                      size={14}
                      className={
                        pathname.startsWith(
                          "/alerts"
                        )
                          ? "text-violet-400"
                          : unreadAlerts >
                            0
                          ? "text-amber-400"
                          : "text-zinc-500"
                      }
                    />

                    {unreadAlerts >
                      0 && (
                      <>
                        <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />

                        <span className="absolute -right-1.5 -top-1.5 flex min-h-[15px] min-w-[15px] items-center justify-center rounded-full border border-[#07090d] bg-red-500 px-1 text-[5px] font-bold text-white">
                          {formatBadgeCount(
                            unreadAlerts
                          )}
                        </span>
                      </>
                    )}

                  </Link>

                  {/* PROFILE */}

                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-gradient-to-br from-zinc-700 to-zinc-900 text-[9px] font-semibold text-zinc-300">
                    R
                  </div>

                </div>

              </div>

              <MarketStrip />

            </header>

            {/* PAGE */}

            <main className="min-h-[calc(100vh-64px)]">
              {children}
            </main>

          </div>

        </div>
      </div>
    </>
  );
}
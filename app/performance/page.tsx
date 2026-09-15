"use client";

import PerformanceChart from "@/components/performance/performance-chart";
import { useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  Bell,
  Bot,
  CalendarDays,
  ChevronDown,
  Home,
  LineChart,
  Search,
  Settings,
  ShieldCheck,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";

type PerformanceSummary = {
  totalTrades: number;
  wins: number;
  losses: number;
  breakevens: number;
  winRate: number;
  totalR: number;
  averageR: number;
};

const navigation = [
  { label: "Overview", icon: Home },
  { label: "Signals", icon: Zap },
  { label: "Markets", icon: BarChart3 },
  { label: "Scanner", icon: Search },
  { label: "Watchlist", icon: Star },
  { label: "AI Analyst", icon: Bot },
  { label: "Risk", icon: ShieldCheck },
  { label: "Performance", icon: Activity },
  { label: "Portfolio", icon: Wallet },
  { label: "Settings", icon: Settings },
];

export default function PerformancePage() {
  const [summary, setSummary] =
    useState<PerformanceSummary | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPerformance() {
      try {
        const response = await fetch("/api/trading/performance");
        const data = await response.json();

        if (data.success) {
          setSummary(data.summary);
        }
      } finally {
        setLoading(false);
      }
    }

    loadPerformance();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#06070a] text-white">
        <div className="flex min-h-screen">
          <aside className="hidden w-[240px] border-r border-white/[0.06] bg-[#08090d] lg:block" />

          <div className="flex flex-1 items-center justify-center text-sm text-zinc-600">
            Loading performance...
          </div>
        </div>
      </main>
    );
  }

  if (!summary) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#06070a] text-sm text-zinc-500">
        Failed to load performance.
      </main>
    );
  }

  const statCards = [
    {
      label: "Total Trades",
      value: summary.totalTrades,
      icon: Target,
      description: "Completed positions",
      iconStyle: "bg-violet-500/10 text-violet-400",
    },
    {
      label: "Win Rate",
      value: `${summary.winRate.toFixed(1)}%`,
      icon: TrendingUp,
      description: `${summary.wins} winning trades`,
      iconStyle: "bg-emerald-500/10 text-emerald-400",
    },
    {
      label: "Net Performance",
      value: `${summary.totalR >= 0 ? "+" : ""}${summary.totalR.toFixed(2)}R`,
      icon: Activity,
      description: "Cumulative realized R",
      iconStyle: "bg-cyan-500/10 text-cyan-400",
    },
    {
      label: "Average Trade",
      value: `${summary.averageR >= 0 ? "+" : ""}${summary.averageR.toFixed(2)}R`,
      icon: LineChart,
      description: "Average realized R",
      iconStyle: "bg-amber-500/10 text-amber-400",
    },
  ];

  return (
    <main className="min-h-screen bg-[#06070a] text-white">
      <div className="flex min-h-screen">

        {/* SIDEBAR */}

        <aside className="hidden w-[240px] shrink-0 border-r border-white/[0.06] bg-[#08090d] lg:flex lg:flex-col">

          {/* BRAND */}

          <div className="flex h-[76px] items-center border-b border-white/[0.06] px-5">

            <div className="flex items-center gap-3">

              <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600">
                <span className="text-sm font-bold">
                  α
                </span>

                <div className="absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full border-2 border-[#08090d] bg-emerald-400" />
              </div>

              <div>
                <div className="text-[15px] font-semibold tracking-tight">
                  hiddenalpha
                </div>

                <div className="mt-0.5 text-[9px] font-medium tracking-[0.24em] text-zinc-600">
                  TRADING INTELLIGENCE
                </div>
              </div>

            </div>

          </div>

          {/* NAVIGATION */}

          <div className="px-3 pt-5">

            <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-700">
              Workspace
            </p>

            <nav className="space-y-1">

              {navigation.map((item) => {
                const Icon = item.icon;
                const active = item.label === "Performance";

                return (
                  <div
                    key={item.label}
                    className={`group flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition ${
                      active
                        ? "bg-violet-500/10 text-white"
                        : "text-zinc-500 hover:bg-white/[0.03] hover:text-zinc-300"
                    }`}
                  >

                    <Icon
                      size={17}
                      strokeWidth={1.8}
                      className={
                        active
                          ? "text-violet-400"
                          : "text-zinc-600 group-hover:text-zinc-400"
                      }
                    />

                    <span>
                      {item.label}
                    </span>

                    {item.label === "Signals" && (
                      <span className="ml-auto rounded-md bg-violet-500/10 px-1.5 py-0.5 text-[9px] text-violet-400">
                        LIVE
                      </span>
                    )}

                  </div>
                );
              })}

            </nav>

          </div>

          <div className="mt-auto p-4">

            {/* SYSTEM STATUS */}

            <div className="mb-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">

              <div className="flex items-center justify-between">

                <span className="text-[11px] text-zinc-500">
                  System status
                </span>

                <span className="flex items-center gap-1.5 text-[10px] text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Operational
                </span>

              </div>

              <div className="mt-3 h-px bg-white/[0.05]" />

              <div className="mt-3 flex items-center justify-between text-[10px]">

                <span className="text-zinc-600">
                  Market data
                </span>

                <span className="text-zinc-400">
                  Bybit
                </span>

              </div>

            </div>

            {/* USER */}

            <div className="flex items-center gap-3 rounded-xl px-2 py-2">

              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 text-[11px] font-semibold">
                T
              </div>

              <div className="min-w-0 flex-1">

                <p className="truncate text-[12px] font-medium">
                  Trader
                </p>

                <p className="truncate text-[10px] text-zinc-600">
                  Personal workspace
                </p>

              </div>

              <ChevronDown
                size={13}
                className="text-zinc-700"
              />

            </div>

          </div>

        </aside>

        {/* MAIN */}

        <section className="min-w-0 flex-1">

          {/* TOP BAR */}

          <header className="flex h-[76px] items-center border-b border-white/[0.06] px-5 lg:px-8">

            <div className="relative hidden w-full max-w-[460px] md:block">

              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-700"
              />

              <input
                placeholder="Search markets, signals or tools..."
                className="h-10 w-full rounded-xl border border-white/[0.07] bg-white/[0.025] pl-10 pr-16 text-[12px] text-white outline-none placeholder:text-zinc-700 focus:border-violet-500/30"
              />

              <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-white/[0.07] px-1.5 py-1 text-[9px] text-zinc-700">
                Ctrl K
              </span>

            </div>

            <div className="ml-auto flex items-center gap-5">

              <div className="relative">

                <Bell
                  size={18}
                  className="text-zinc-600"
                />

                <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-violet-500" />

              </div>

              <div className="h-7 w-px bg-white/[0.06]" />

              <div className="flex items-center gap-2.5">

                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 text-[10px] font-semibold">
                  T
                </div>

                <div className="hidden sm:block">
                  <p className="text-[11px] font-medium">
                    Trader
                  </p>

                  <p className="text-[9px] text-zinc-700">
                    Personal
                  </p>
                </div>

              </div>

            </div>

          </header>

          {/* PAGE */}

          <div className="mx-auto max-w-[1500px] p-5 lg:p-8">

            {/* HEADER */}

            <div className="mb-7 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">

              <div>

                <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-400">
                  <Activity size={13} />
                  Trading analytics
                </div>

                <h1 className="text-[30px] font-semibold tracking-[-0.03em]">
                  Performance
                </h1>

                <p className="mt-1.5 max-w-xl text-[12px] leading-5 text-zinc-600">
                  Measure the quality of your trading decisions,
                  understand your edge, and improve over time.
                </p>

              </div>

              <button className="flex h-10 items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3.5 text-[11px] text-zinc-400 transition hover:bg-white/[0.05]">

                <CalendarDays size={14} />

                Last 30 Days

                <ChevronDown size={13} />

              </button>

            </div>

            {/* STAT CARDS */}

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">

              {statCards.map((card) => {

                const Icon = card.icon;

                return (
                  <div
                    key={card.label}
                    className="rounded-2xl border border-white/[0.06] bg-[#0a0c10] p-5 transition hover:border-white/[0.1]"
                  >

                    <div className="flex items-start justify-between">

                      <div>

                        <p className="text-[11px] text-zinc-600">
                          {card.label}
                        </p>

                        <p className="mt-3 text-[26px] font-semibold tracking-[-0.03em]">
                          {card.value}
                        </p>

                        <p className="mt-1.5 text-[10px] text-zinc-700">
                          {card.description}
                        </p>

                      </div>

                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-xl ${card.iconStyle}`}
                      >
                        <Icon size={17} />
                      </div>

                    </div>

                  </div>
                );
              })}

            </div>

            {/* MAIN ANALYTICS */}

            <div className="mt-3 grid gap-3 xl:grid-cols-[1.75fr_1fr]">

              {/* CHART */}

              <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0a0c10]">

                <div className="flex items-center justify-between border-b border-white/[0.05] px-5 py-4">

                  <div>

                    <h2 className="text-[13px] font-medium">
                      Performance curve
                    </h2>

                    <p className="mt-1 text-[10px] text-zinc-700">
                      Cumulative realized R
                    </p>

                  </div>

                  <div className="hidden items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.015] p-1 sm:flex">

                    <button className="rounded-md bg-violet-500/15 px-2.5 py-1.5 text-[9px] font-medium text-violet-300">
                      Cumulative R
                    </button>

                    <button className="px-2.5 py-1.5 text-[9px] text-zinc-700">
                      Daily R
                    </button>

                    <button className="px-2.5 py-1.5 text-[9px] text-zinc-700">
                      Equity
                    </button>

                  </div>

                </div>

                <div className="p-3">

                  <div className="rounded-xl border border-white/[0.04] bg-[#080a0e] p-2">

                    <PerformanceChart />

                  </div>

                </div>

              </div>

              {/* DISTRIBUTION */}

              <div className="rounded-2xl border border-white/[0.06] bg-[#0a0c10] p-5">

                <div className="flex items-start justify-between">

                  <div>

                    <h2 className="text-[13px] font-medium">
                      Trade distribution
                    </h2>

                    <p className="mt-1 text-[10px] text-zinc-700">
                      Completed signal outcomes
                    </p>

                  </div>

                  <BarChart3
                    size={16}
                    className="text-zinc-700"
                  />

                </div>

                <div className="mt-7 flex items-center justify-center">

                  <div className="relative h-40 w-40 rounded-full bg-white/[0.03]">

                    <div
                      className="absolute inset-0 rounded-full"
                      style={{
                        background: `conic-gradient(
                          #22c55e 0 ${summary.winRate}%,
                          #ef4444 ${summary.winRate}% 100%
                        )`,
                      }}
                    />

                    <div className="absolute inset-[7px] flex flex-col items-center justify-center rounded-full bg-[#0a0c10]">

                      <span className="text-[27px] font-semibold tracking-tight">
                        {summary.totalTrades}
                      </span>

                      <span className="text-[10px] text-zinc-700">
                        completed
                      </span>

                    </div>

                  </div>

                </div>

                <div className="mt-7 space-y-3">

                  <div className="flex items-center justify-between">

                    <div className="flex items-center gap-2.5">

                      <span className="h-2 w-2 rounded-full bg-emerald-500" />

                      <span className="text-[11px] text-zinc-500">
                        Wins
                      </span>

                    </div>

                    <span className="text-[11px] font-medium">
                      {summary.wins}
                    </span>

                  </div>

                  <div className="flex items-center justify-between">

                    <div className="flex items-center gap-2.5">

                      <span className="h-2 w-2 rounded-full bg-red-500" />

                      <span className="text-[11px] text-zinc-500">
                        Losses
                      </span>

                    </div>

                    <span className="text-[11px] font-medium">
                      {summary.losses}
                    </span>

                  </div>

                  <div className="flex items-center justify-between">

                    <div className="flex items-center gap-2.5">

                      <span className="h-2 w-2 rounded-full bg-zinc-600" />

                      <span className="text-[11px] text-zinc-500">
                        Breakevens
                      </span>

                    </div>

                    <span className="text-[11px] font-medium">
                      {summary.breakevens}
                    </span>

                  </div>

                </div>

              </div>

            </div>

            {/* LOWER ANALYTICS */}

            <div className="mt-3 grid gap-3 lg:grid-cols-3">

              {/* SIGNAL QUALITY */}

              <div className="rounded-2xl border border-white/[0.06] bg-[#0a0c10] p-5">

                <div className="flex items-center justify-between">

                  <div>

                    <h2 className="text-[13px] font-medium">
                      Signal quality
                    </h2>

                    <p className="mt-1 text-[10px] text-zinc-700">
                      Current signal performance
                    </p>

                  </div>

                  <Target
                    size={16}
                    className="text-violet-400"
                  />

                </div>

                <div className="mt-6">

                  <div className="flex items-end justify-between">

                    <span className="text-[10px] text-zinc-600">
                      Win rate
                    </span>

                    <span className="text-[16px] font-medium">
                      {summary.winRate.toFixed(1)}%
                    </span>

                  </div>

                  <div className="mt-3 h-1.5 rounded-full bg-white/[0.05]">

                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{
                        width: `${Math.min(summary.winRate, 100)}%`,
                      }}
                    />

                  </div>

                </div>

                <div className="mt-6 grid grid-cols-2 gap-2">

                  <div className="rounded-xl border border-white/[0.05] bg-white/[0.015] p-3">

                    <p className="text-[9px] text-zinc-700">
                      Wins
                    </p>

                    <p className="mt-1.5 text-[17px] font-medium text-emerald-400">
                      {summary.wins}
                    </p>

                  </div>

                  <div className="rounded-xl border border-white/[0.05] bg-white/[0.015] p-3">

                    <p className="text-[9px] text-zinc-700">
                      Losses
                    </p>

                    <p className="mt-1.5 text-[17px] font-medium text-red-400">
                      {summary.losses}
                    </p>

                  </div>

                </div>

              </div>

              {/* AI */}

              <div className="rounded-2xl border border-violet-500/10 bg-[#0a0c10] p-5">

                <div className="flex items-center gap-3">

                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                    <Bot size={17} />
                  </div>

                  <div>

                    <h2 className="text-[13px] font-medium">
                      AI performance insights
                    </h2>

                    <p className="mt-1 text-[10px] text-zinc-700">
                      Intelligence layer
                    </p>

                  </div>

                </div>

                <div className="mt-5 rounded-xl border border-violet-500/10 bg-violet-500/[0.025] p-4">

                  <div className="flex items-center gap-2 text-[10px] text-violet-300">

                    <Zap size={12} />

                    Building your profile

                  </div>

                  <p className="mt-2 text-[11px] leading-5 text-zinc-600">
                    Hiddenalpha will identify patterns across
                    your signals, risk and execution history.
                  </p>

                </div>

              </div>

              {/* RISK */}

              <div className="rounded-2xl border border-white/[0.06] bg-[#0a0c10] p-5">

                <div className="flex items-center gap-3">

                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                    <ShieldCheck size={17} />
                  </div>

                  <div>

                    <h2 className="text-[13px] font-medium">
                      Risk discipline
                    </h2>

                    <p className="mt-1 text-[10px] text-zinc-700">
                      Risk engine status
                    </p>

                  </div>

                </div>

                <div className="mt-6 flex items-center justify-between">

                  <div>

                    <p className="text-[11px] font-medium">
                      Risk engine active
                    </p>

                    <p className="mt-1 text-[10px] text-zinc-700">
                      R-based trade evaluation enabled.
                    </p>

                  </div>

                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10">

                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

                  </div>

                </div>

              </div>

            </div>

            {/* FOOTER METRICS */}

            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">

              <div className="rounded-xl border border-white/[0.05] bg-white/[0.015] px-4 py-3">

                <div className="flex items-center gap-2">

                  <TrendingUp
                    size={13}
                    className="text-emerald-400"
                  />

                  <span className="text-[9px] uppercase tracking-wider text-zinc-700">
                    Winning trades
                  </span>

                </div>

                <p className="mt-2 text-sm font-medium">
                  {summary.wins}
                </p>

              </div>

              <div className="rounded-xl border border-white/[0.05] bg-white/[0.015] px-4 py-3">

                <div className="flex items-center gap-2">

                  <TrendingDown
                    size={13}
                    className="text-red-400"
                  />

                  <span className="text-[9px] uppercase tracking-wider text-zinc-700">
                    Losing trades
                  </span>

                </div>

                <p className="mt-2 text-sm font-medium">
                  {summary.losses}
                </p>

              </div>

              <div className="rounded-xl border border-white/[0.05] bg-white/[0.015] px-4 py-3">

                <div className="flex items-center gap-2">

                  <Activity
                    size={13}
                    className="text-cyan-400"
                  />

                  <span className="text-[9px] uppercase tracking-wider text-zinc-700">
                    Total R
                  </span>

                </div>

                <p className="mt-2 text-sm font-medium">
                  {summary.totalR >= 0 ? "+" : ""}
                  {summary.totalR.toFixed(2)}R
                </p>

              </div>

              <div className="rounded-xl border border-white/[0.05] bg-white/[0.015] px-4 py-3">

                <div className="flex items-center gap-2">

                  <LineChart
                    size={13}
                    className="text-violet-400"
                  />

                  <span className="text-[9px] uppercase tracking-wider text-zinc-700">
                    Average R
                  </span>

                </div>

                <p className="mt-2 text-sm font-medium">
                  {summary.averageR >= 0 ? "+" : ""}
                  {summary.averageR.toFixed(2)}R
                </p>

              </div>

            </div>

          </div>

        </section>
      </div>
    </main>
  );
}
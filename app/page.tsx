"use client";

import DashboardMarketOverview from "@/components/dashboard-market-overview";
import DashboardTopSignal from "@/components/dashboard-top-signal";
import { useEffect, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Bot,
  ChevronRight,
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

type Ticker = {
  symbol: string;
  lastPrice: number;
  price24hChange: number;
};

type TradePlan = {
  signal?: {
    symbol: string;
    timeframe: string;
    direction: "LONG" | "SHORT" | "WAIT";
    confidence: number;
    quality: "VALID" | "WEAK" | "REJECTED";
    summary: string;
  };
  setup?: {
    entryPrice: number;
    stopLossPrice: number;
    takeProfit1Price: number;
    takeProfit2Price: number;
    riskRewardRatioTP1: number;
    riskRewardRatioTP2: number;
  } | null;
  risk?: {
    riskAmount?: number;
    positionSize?: number;
    positionValue?: number;
    marginRequired?: number;
    potentialLoss?: number;
    potentialProfitTP1?: number;
    potentialProfitTP2?: number;
  } | null;
};

type Performance = {
  totalTrades: number;
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

const SYMBOLS = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
];

function formatPrice(value: number) {
  if (!Number.isFinite(value) || value === 0) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits:
      value >= 1000 ? 2 : 2,
    maximumFractionDigits:
      value >= 1000 ? 2 : 4,
  }).format(value);
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "0.00%";

  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function shortSymbol(symbol: string) {
  return symbol.replace("USDT", " / USDT");
}

function confidenceLabel(value: number) {
  if (value >= 70) return "HIGH";
  if (value >= 45) return "MEDIUM";
  return "LOW";
}

export default function HomePage() {
  const [tickers, setTickers] = useState<
    Record<string, Ticker>
  >({});

  const [tradePlan, setTradePlan] =
    useState<TradePlan | null>(null);

  const [performance, setPerformance] =
    useState<Performance>({
      totalTrades: 0,
      winRate: 0,
      totalR: 0,
      averageR: 0,
    });

  const [lastUpdated, setLastUpdated] =
    useState<Date | null>(null);

  async function loadMarketData() {
    try {
      const results = await Promise.all(
        SYMBOLS.map(async (symbol) => {
          const response = await fetch(
            `/api/market/ticker?symbol=${symbol}`,
            {
              cache: "no-store",
            }
          );

          const data = await response.json();

          if (!data.success) {
            return null;
          }

          return data.ticker as Ticker;
        })
      );

      const next: Record<string, Ticker> = {};

      results.forEach((ticker) => {
        if (ticker) {
          next[ticker.symbol] = ticker;
        }
      });

      setTickers(next);
      setLastUpdated(new Date());
    } catch {
      // Keep existing market data.
    }
  }

  async function loadTradePlan() {
    try {
      const response = await fetch(
        "/api/trading/plan?symbol=BTCUSDT&timeframe=1m&accountBalance=10000&riskPercent=1&leverage=1",
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (
        data &&
        data.signal
      ) {
        setTradePlan(data);
      }
    } catch {
      // Keep dashboard available.
    }
  }

  async function loadPerformance() {
    try {
      const response = await fetch(
        "/api/trading/performance",
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (data.success) {
        setPerformance({
          totalTrades:
            data.summary.totalTrades ?? 0,
          winRate:
            data.summary.winRate ?? 0,
          totalR:
            data.summary.totalR ?? 0,
          averageR:
            data.summary.averageR ?? 0,
        });
      }
    } catch {
      // Keep dashboard available.
    }
  }

  useEffect(() => {
    loadMarketData();
    loadTradePlan();
    loadPerformance();

    const interval = window.setInterval(() => {
      loadMarketData();
      loadTradePlan();
    }, 15000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const signal =
    tradePlan?.signal;

  const setup =
    tradePlan?.setup;

  const hasTrade = Boolean(
  signal &&
  signal.direction !== "WAIT" &&
  setup
);

  return (
    <main className="min-h-screen bg-[#050608] text-white">

      <div className="flex min-h-screen">

        {/* SIDEBAR */}

        <aside className="hidden w-[225px] shrink-0 border-r border-white/[0.06] bg-[#08090c] lg:flex lg:flex-col">

          <div className="flex h-[72px] items-center border-b border-white/[0.06] px-5">

            <div className="flex items-center gap-3">

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-500 shadow-lg shadow-violet-900/20">
                <span className="text-sm font-bold">
                  α
                </span>
              </div>

              <div>
                <div className="text-[15px] font-semibold tracking-tight">
                  hiddenalpha
                </div>

                <div className="mt-0.5 text-[8px] font-medium tracking-[0.22em] text-zinc-600">
                  TRADING INTELLIGENCE
                </div>
              </div>

            </div>

          </div>

          <div className="px-3 pt-5">

            <p className="mb-3 px-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-700">
              Workspace
            </p>

            <nav className="space-y-1">

              {navigation.map((item) => {
                const Icon = item.icon;
                const active =
                  item.label === "Overview";

                return (
                  <button
                    key={item.label}
                    className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[12px] transition ${
                      active
                        ? "bg-violet-500/[0.10] text-white"
                        : "text-zinc-500 hover:bg-white/[0.03] hover:text-zinc-300"
                    }`}
                  >

                    <Icon
                      size={16}
                      strokeWidth={1.8}
                      className={
                        active
                          ? "text-violet-400"
                          : "text-zinc-600"
                      }
                    />

                    <span>
                      {item.label}
                    </span>

                    {item.label ===
                      "Signals" && (
                      <span className="ml-auto rounded-md bg-violet-500/10 px-1.5 py-0.5 text-[8px] text-violet-400">
                        LIVE
                      </span>
                    )}

                  </button>
                );
              })}

            </nav>

          </div>

          <div className="mt-auto p-4">

            <div className="mb-3 rounded-2xl border border-white/[0.06] bg-white/[0.018] p-4">

              <div className="flex items-center justify-between">

                <span className="text-[10px] text-zinc-500">
                  Data engine
                </span>

                <span className="flex items-center gap-1.5 text-[9px] text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Online
                </span>

              </div>

              <div className="mt-3 h-px bg-white/[0.05]" />

              <div className="mt-3 flex items-center justify-between text-[9px]">
                <span className="text-zinc-600">
                  Market source
                </span>

                <span className="text-zinc-400">
                  Bybit
                </span>
              </div>

            </div>

            <div className="flex items-center gap-3 px-2 py-2">

              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 text-[10px] font-semibold">
                R
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-medium">
                  Trader
                </p>

                <p className="truncate text-[9px] text-zinc-600">
                  Personal workspace
                </p>
              </div>

            </div>

          </div>

        </aside>

        {/* MAIN */}

        <section className="min-w-0 flex-1">

          {/* TOPBAR */}

          <header className="flex h-[72px] items-center border-b border-white/[0.06] px-5 lg:px-7">

            <div className="relative hidden w-full max-w-[420px] md:block">

              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-700"
              />

              <input
                placeholder="Search assets, signals, tools..."
                className="h-9 w-full rounded-xl border border-white/[0.07] bg-white/[0.025] pl-10 pr-16 text-[11px] text-white outline-none placeholder:text-zinc-700 focus:border-violet-500/30"
              />

              <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-white/[0.07] px-1.5 py-1 text-[8px] text-zinc-700">
                ⌘K
              </span>

            </div>

            <div className="ml-auto flex items-center gap-4">

              <button className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.02]">
                <Bell
                  size={16}
                  className="text-zinc-500"
                />

                <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-violet-600 text-[7px]">
                  3
                </span>
              </button>

              <div className="h-6 w-px bg-white/[0.06]" />

              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 text-[10px] font-semibold">
                R
              </div>

            </div>

          </header>

          {/* CONTENT */}

          <div className="mx-auto max-w-[1500px] p-4 lg:p-6">

            {/* HEADER */}

            <div className="mb-4 flex items-end justify-between">

              <div>

                <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-violet-400">
                  <Activity size={12} />
                  Market Intelligence
                </div>

                <h1 className="mt-1.5 text-[24px] font-semibold tracking-[-0.035em]">
                  Good evening, Trader
                </h1>

                <p className="mt-1 text-[10px] text-zinc-600">
                  Here&apos;s what&apos;s happening in the market today.
                </p>

              </div>

              <div className="hidden text-right md:block">

                <p className="text-[9px] text-zinc-700">
                  Market data
                </p>

                <p className="mt-1 text-[10px] text-emerald-400">
                  {lastUpdated
                    ? `Updated ${lastUpdated.toLocaleTimeString()}`
                    : "Connecting..."}
                </p>

              </div>

            </div>

            {/* TICKERS */}

            <div className="grid gap-3 md:grid-cols-3">

              {SYMBOLS.map((symbol) => {

                const ticker =
                  tickers[symbol];

                const positive =
                  (ticker?.price24hChange ?? 0) >= 0;

                return (
                  <div
                    key={symbol}
                    className="group rounded-2xl border border-white/[0.06] bg-[#090b0f] p-4 transition hover:border-white/[0.10]"
                  >

                    <div className="flex items-center justify-between">

                      <div className="flex items-center gap-2">

                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.04] text-[10px] font-bold">
                          {symbol === "BTCUSDT"
                            ? "₿"
                            : symbol === "ETHUSDT"
                            ? "Ξ"
                            : "S"}
                        </div>

                        <span className="text-[11px] font-medium">
                          {shortSymbol(symbol)}
                        </span>

                      </div>

                      <LineChart
                        size={14}
                        className={
                          positive
                            ? "text-emerald-400"
                            : "text-red-400"
                        }
                      />

                    </div>

                    <div className="mt-3 flex items-end justify-between">

                      <span className="text-[17px] font-medium tracking-tight">
                        $
                        {formatPrice(
                          ticker?.lastPrice ?? 0
                        )}
                      </span>

                      <span
                        className={`text-[10px] ${
                          positive
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {formatPercent(
                          ticker?.price24hChange ?? 0
                        )}
                      </span>

                    </div>

                    <div className="mt-3 h-7 overflow-hidden">

                      <div className="flex h-full items-end gap-[3px] opacity-70">

                        {[18, 24, 20, 29, 22, 34, 27, 38, 31, 43, 36, 49, 42, 54, 48].map(
                          (height, index) => (
                            <div
                              key={index}
                              className={`w-full rounded-sm ${
                                positive
                                  ? "bg-emerald-500/40"
                                  : "bg-red-500/40"
                              }`}
                              style={{
                                height: `${height}%`,
                              }}
                            />
                          )
                        )}

                      </div>

                    </div>

                  </div>
                );
              })}

            </div>

            {/* TOP SIGNAL + WATCHLIST */}

            <div className="mt-3 grid gap-3 xl:grid-cols-[1.65fr_1fr]">

              {/* TOP SIGNAL */}

              <div className="rounded-2xl border border-white/[0.06] bg-[#090b0f] p-5">

                <div className="flex items-center justify-between">

                  <div className="flex items-center gap-2">

                    <Zap
                      size={14}
                      className="text-violet-400"
                    />

                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-violet-400">
                      Top Signal
                    </span>

                  </div>

                  <span className="text-[9px] text-zinc-700">
                    BTCUSDT · 1m
                  </span>

                </div>

                {hasTrade ? (

                  <div className="mt-5">

                    <div className="flex flex-col justify-between gap-5 lg:flex-row">

                      <div>

                        <div className="flex items-center gap-2">

                          <h2 className="text-[22px] font-semibold">
                            BTC / USDT
                          </h2>

                          <span
                            className={`rounded-md px-2 py-1 text-[8px] font-medium ${
                              signal?.direction ===
                              "LONG"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-red-500/10 text-red-400"
                            }`}
                          >
                            {signal?.direction}
                          </span>

                        </div>

                        <div className="mt-3">

                          <span className="text-[9px] uppercase tracking-[0.12em] text-zinc-600">
                            Confidence
                          </span>

                          <div className="mt-1 flex items-end gap-2">

                            <span className="text-[28px] font-semibold text-emerald-400">
                              {signal?.confidence}%
                            </span>

                            <span className="mb-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[8px] text-emerald-400">
                              {confidenceLabel(
                                signal?.confidence ?? 0
                              )}
                            </span>

                          </div>

                        </div>

                      </div>

                      <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">

                        <Metric
                          label="Entry"
                          value={`$${formatPrice(
                            setup?.entryPrice ?? 0
                          )}`}
                        />

                        <Metric
                          label="Stop Loss"
                          value={`$${formatPrice(
                            setup?.stopLossPrice ?? 0
                          )}`}
                          negative
                        />

                        <Metric
                          label="TP1"
                          value={`$${formatPrice(
                            setup?.takeProfit1Price ?? 0
                          )}`}
                        />

                        <Metric
                          label="TP2"
                          value={`$${formatPrice(
                            setup?.takeProfit2Price ?? 0
                          )}`}
                        />

                      </div>

                    </div>

                    <div className="mt-5 flex flex-col justify-between gap-3 border-t border-white/[0.05] pt-4 sm:flex-row sm:items-center">

                      <div className="flex items-center gap-5">

                        <MiniStat
                          label="R:R TP1"
                          value={`1 : ${setup?.riskRewardRatioTP1?.toFixed(1) ?? "—"}`}
                        />

                        <MiniStat
                          label="R:R TP2"
                          value={`1 : ${setup?.riskRewardRatioTP2?.toFixed(1) ?? "—"}`}
                        />

                        <MiniStat
                          label="Quality"
                          value={signal?.quality ?? "—"}
                        />

                      </div>

                      <button className="flex h-9 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-[9px] font-medium transition hover:bg-violet-500">
                        View Signal
                        <ArrowUpRight size={12} />
                      </button>

                    </div>

                  </div>

                ) : (

                  <div className="mt-5 rounded-2xl border border-white/[0.05] bg-[#07090c] p-6">

                    <div className="flex flex-col items-center justify-center py-5 text-center">

                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-500/[0.06]">
                        <Target
                          size={20}
                          className="text-zinc-700"
                        />
                      </div>

                      <p className="mt-4 text-[13px] font-medium">
                        {signal?.direction ===
                        "WAIT"
                          ? "No confirmed setup"
                          : "Waiting for market data"}
                      </p>

                      <p className="mt-2 max-w-[300px] text-[9px] leading-5 text-zinc-700">
                        {signal?.summary ??
                          "Hiddenalpha is analyzing market conditions before generating a trade idea."}
                      </p>

                      {signal && (
                        <div className="mt-4 flex items-center gap-2">

                          <span className="rounded-md bg-zinc-500/10 px-2 py-1 text-[8px] text-zinc-500">
                            {signal.quality}
                          </span>

                          <span className="rounded-md bg-zinc-500/10 px-2 py-1 text-[8px] text-zinc-500">
                            {signal.confidence}% confidence
                          </span>

                        </div>
                      )}

                    </div>

                  </div>

                )}

              </div>

              {/* WATCHLIST */}

              <div className="rounded-2xl border border-white/[0.06] bg-[#090b0f] p-5">

                <div className="flex items-center justify-between">

                  <div className="flex items-center gap-2">

                    <Star
                      size={14}
                      className="text-amber-400"
                    />

                    <h2 className="text-[13px] font-medium">
                      Watchlist
                    </h2>

                  </div>

                  <button className="text-[9px] text-zinc-600 hover:text-zinc-300">
                    Manage
                  </button>

                </div>

                <div className="mt-4">

                  {SYMBOLS.map((symbol) => {

                    const ticker =
                      tickers[symbol];

                    const positive =
                      (ticker?.price24hChange ?? 0) >= 0;

                    return (
                      <div
                        key={symbol}
                        className="flex items-center border-b border-white/[0.04] py-3 last:border-0"
                      >

                        <div className="flex min-w-0 flex-1 items-center gap-2">

                          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white/[0.04] text-[9px] font-bold">
                            {symbol === "BTCUSDT"
                              ? "₿"
                              : symbol === "ETHUSDT"
                              ? "Ξ"
                              : "S"}
                          </div>

                          <span className="text-[10px]">
                            {shortSymbol(symbol)}
                          </span>

                        </div>

                        <span className="w-[90px] text-right text-[10px]">
                          $
                          {formatPrice(
                            ticker?.lastPrice ?? 0
                          )}
                        </span>

                        <span
                          className={`w-[65px] text-right text-[9px] ${
                            positive
                              ? "text-emerald-400"
                              : "text-red-400"
                          }`}
                        >
                          {formatPercent(
                            ticker?.price24hChange ?? 0
                          )}
                        </span>

                        <div className="ml-4 w-6">
                          {positive ? (
                            <TrendingUp
                              size={13}
                              className="text-emerald-400"
                            />
                          ) : (
                            <TrendingDown
                              size={13}
                              className="text-red-400"
                            />
                          )}
                        </div>

                      </div>
                    );
                  })}

                </div>

                <button className="mt-3 flex w-full items-center justify-center gap-1 text-[9px] text-violet-400">
                  + Add Asset
                </button>

              </div>

            </div>

            {/* MARKET OVERVIEW + AI + ALERTS */}

            <div className="mt-3 grid gap-3 xl:grid-cols-[1.15fr_1fr_0.9fr]">

              {/* MARKET OVERVIEW */}

              <DashboardMarketOverview />

              {/* AI SUMMARY */}

              <div className="rounded-2xl border border-white/[0.06] bg-[#090b0f] p-5">

                <div className="flex items-center justify-between">

                  <div className="flex items-center gap-2">

                    <Bot
                      size={14}
                      className="text-violet-400"
                    />

                    <h2 className="text-[13px] font-medium">
                      AI Market Summary
                    </h2>

                  </div>

                  <span className="rounded-md bg-violet-500/10 px-2 py-1 text-[8px] text-violet-400">
                    BETA
                  </span>

                </div>

                <div className="mt-5">

                  <span className="rounded-md bg-zinc-500/10 px-2 py-1 text-[8px] text-zinc-500">
                    MARKET CONTEXT
                  </span>

                  <p className="mt-4 text-[11px] leading-6 text-zinc-500">

                    {signal?.summary ??
                      "Hiddenalpha is continuously analyzing price action, momentum, volume and market structure."}

                  </p>

                  <div className="mt-5 space-y-2">

                    <ContextRow
                      label="Signal state"
                      value={
                        signal?.direction ??
                        "WAIT"
                      }
                    />

                    <ContextRow
                      label="Confidence"
                      value={`${signal?.confidence ?? 0}%`}
                    />

                    <ContextRow
                      label="Quality"
                      value={
                        signal?.quality ??
                        "—"
                      }
                    />

                  </div>

                </div>

              </div>

              {/* ALERTS */}

              <div className="rounded-2xl border border-white/[0.06] bg-[#090b0f] p-5">

                <div className="flex items-center justify-between">

                  <div className="flex items-center gap-2">

                    <Bell
                      size={14}
                      className="text-amber-400"
                    />

                    <h2 className="text-[13px] font-medium">
                      Recent Alerts
                    </h2>

                  </div>

                  <span className="text-[9px] text-zinc-600">
                    View all
                  </span>

                </div>

                <div className="mt-5 space-y-1">

                  <AlertRow
                    icon={Zap}
                    title={
                      hasTrade
                        ? `Signal: BTC ${signal?.direction}`
                        : "BTC analysis updated"
                    }
                    description={
                      hasTrade
                        ? `Confidence ${signal?.confidence}%`
                        : "Waiting for confirmation"
                    }
                    time="Now"
                    positive={hasTrade}
                  />

                  <AlertRow
                    icon={TrendingUp}
                    title="Market data online"
                    description="Bybit feed connected"
                    time="Live"
                    positive
                  />

                  <AlertRow
                    icon={ShieldCheck}
                    title="Risk engine"
                    description="Risk controls active"
                    time="Ready"
                    positive
                  />

                </div>

              </div>

            </div>

            {/* RECENT SIGNALS + PERFORMANCE */}

            <div className="mt-3 grid gap-3 xl:grid-cols-[1.65fr_1fr]">

              {/* RECENT SIGNALS */}

              <div className="rounded-2xl border border-white/[0.06] bg-[#090b0f] p-5">

                <div className="flex items-center justify-between">

                  <div className="flex items-center gap-2">

                    <Zap
                      size={14}
                      className="text-violet-400"
                    />

                    <h2 className="text-[13px] font-medium">
                      Recent Signals
                    </h2>

                  </div>

                  <button className="flex items-center gap-1 text-[9px] text-zinc-600">
                    View all
                    <ChevronRight size={11} />
                  </button>

                </div>

                <div className="mt-4 overflow-x-auto">

                  <table className="w-full min-w-[650px]">

                    <thead>
                      <tr className="border-b border-white/[0.05] text-left text-[8px] uppercase tracking-[0.12em] text-zinc-700">

                        <th className="pb-3 font-medium">
                          Asset
                        </th>

                        <th className="pb-3 font-medium">
                          Direction
                        </th>

                        <th className="pb-3 font-medium">
                          Entry
                        </th>

                        <th className="pb-3 font-medium">
                          TP
                        </th>

                        <th className="pb-3 font-medium">
                          SL
                        </th>

                        <th className="pb-3 text-right font-medium">
                          Confidence
                        </th>

                      </tr>
                    </thead>

                    <tbody>

                      <SignalRow
                        symbol="BTC / USDT"
                        direction={
                          signal?.direction ??
                          "WAIT"
                        }
                        entry={
                          setup?.entryPrice
                        }
                        tp={
                          setup?.takeProfit2Price
                        }
                        sl={
                          setup?.stopLossPrice
                        }
                        confidence={
                          signal?.confidence ?? 0
                        }
                      />

                      <SignalRow
                        symbol="ETH / USDT"
                        direction="WAIT"
                        confidence={0}
                      />

                      <SignalRow
                        symbol="SOL / USDT"
                        direction="WAIT"
                        confidence={0}
                      />

                    </tbody>

                  </table>

                </div>

              </div>

              {/* PERFORMANCE */}

              <div className="rounded-2xl border border-white/[0.06] bg-[#090b0f] p-5">

                <div className="flex items-center justify-between">

                  <div>

                    <h2 className="text-[13px] font-medium">
                      Performance
                    </h2>

                    <p className="mt-1 text-[9px] text-zinc-700">
                      Trading history
                    </p>

                  </div>

                  <LineChart
                    size={15}
                    className="text-emerald-400"
                  />

                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">

                  <PerformanceStat
                    label="Total Trades"
                    value={String(
                      performance.totalTrades
                    )}
                  />

                  <PerformanceStat
                    label="Win Rate"
                    value={`${performance.winRate.toFixed(1)}%`}
                  />

                  <PerformanceStat
                    label="Total R"
                    value={`${
                      performance.totalR >= 0
                        ? "+"
                        : ""
                    }${performance.totalR.toFixed(2)}R`}
                    positive={
                      performance.totalR >= 0
                    }
                  />

                  <PerformanceStat
                    label="Avg R"
                    value={`${
                      performance.averageR >= 0
                        ? "+"
                        : ""
                    }${performance.averageR.toFixed(2)}R`}
                    positive={
                      performance.averageR >= 0
                    }
                  />

                </div>

                <div className="mt-4 rounded-xl border border-emerald-500/10 bg-emerald-500/[0.025] p-4">

                  <div className="flex items-center justify-between">

                    <span className="text-[9px] text-zinc-600">
                      System status
                    </span>

                    <span className="flex items-center gap-1.5 text-[9px] text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      Healthy
                    </span>

                  </div>

                  <div className="mt-3 flex items-center gap-2 text-[9px] text-zinc-600">
                    <ShieldCheck size={12} />
                    Risk engine active
                  </div>

                </div>

              </div>

            </div>

            {/* FOOTER STATUS */}

            <div className="mt-3 flex flex-col justify-between gap-3 rounded-2xl border border-white/[0.05] bg-[#080a0d] px-5 py-4 sm:flex-row sm:items-center">

              <div className="flex items-center gap-2">

                <ShieldCheck
                  size={14}
                  className="text-amber-400"
                />

                <span className="text-[9px] text-zinc-600">
                  Always do your own research and manage risk properly.
                </span>

              </div>

              <div className="flex items-center gap-5 text-[9px]">

                <span className="text-zinc-700">
                  Data
                  <span className="ml-1 text-emerald-400">
                    Live
                  </span>
                </span>

                <span className="text-zinc-700">
                  Source
                  <span className="ml-1 text-zinc-400">
                    Bybit
                  </span>
                </span>

              </div>

            </div>

          </div>

        </section>

      </div>

    </main>
  );
}

function Metric({
  label,
  value,
  negative,
}: {
  label: string;
  value: string;
  negative?: boolean;
}) {
  return (
    <div>
      <p className="text-[8px] uppercase tracking-[0.12em] text-zinc-700">
        {label}
      </p>

      <p
        className={`mt-2 text-[12px] font-medium ${
          negative
            ? "text-red-400"
            : "text-zinc-200"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[8px] uppercase tracking-[0.1em] text-zinc-700">
        {label}
      </p>

      <p className="mt-1 text-[10px] text-zinc-400">
        {value}
      </p>
    </div>
  );
}

function OverviewStat({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/[0.05] bg-white/[0.015] p-3">

      <p className="text-[8px] uppercase tracking-[0.1em] text-zinc-700">
        {label}
      </p>

      <p
        className={`mt-2 text-[12px] font-medium ${
          positive === true
            ? "text-emerald-400"
            : "text-zinc-300"
        }`}
      >
        {value}
      </p>

    </div>
  );
}

function PerformanceStat({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/[0.05] bg-white/[0.015] p-3">

      <p className="text-[8px] uppercase tracking-[0.1em] text-zinc-700">
        {label}
      </p>

      <p
        className={`mt-2 text-[16px] font-semibold ${
          positive
            ? "text-emerald-400"
            : "text-white"
        }`}
      >
        {value}
      </p>

    </div>
  );
}

function ContextRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/[0.04] pb-2 last:border-0">

      <span className="text-[9px] text-zinc-700">
        {label}
      </span>

      <span className="text-[9px] text-zinc-400">
        {value}
      </span>

    </div>
  );
}

function AlertRow({
  icon: Icon,
  title,
  description,
  time,
  positive,
}: {
  icon: typeof Bell;
  title: string;
  description: string;
  time: string;
  positive?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl p-2.5 transition hover:bg-white/[0.02]">

      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
          positive
            ? "bg-emerald-500/10"
            : "bg-amber-500/10"
        }`}
      >
        <Icon
          size={12}
          className={
            positive
              ? "text-emerald-400"
              : "text-amber-400"
          }
        />
      </div>

      <div className="min-w-0 flex-1">

        <p className="truncate text-[9px] text-zinc-300">
          {title}
        </p>

        <p className="mt-0.5 truncate text-[8px] text-zinc-700">
          {description}
        </p>

      </div>

      <span className="text-[8px] text-zinc-700">
        {time}
      </span>

    </div>
  );
}

function SignalRow({
  symbol,
  direction,
  entry,
  tp,
  sl,
  confidence,
}: {
  symbol: string;
  direction: "LONG" | "SHORT" | "WAIT";
  entry?: number;
  tp?: number;
  sl?: number;
  confidence: number;
}) {
  const active =
    direction !== "WAIT";

  return (
    <tr className="border-b border-white/[0.04]">

      <td className="py-3 text-[9px] text-zinc-300">
        {symbol}
      </td>

      <td className="py-3">

        <span
          className={`rounded-md px-2 py-1 text-[8px] ${
            direction === "LONG"
              ? "bg-emerald-500/10 text-emerald-400"
              : direction === "SHORT"
              ? "bg-red-500/10 text-red-400"
              : "bg-zinc-500/10 text-zinc-600"
          }`}
        >
          {direction}
        </span>

      </td>

      <td className="py-3 text-[9px] text-zinc-500">
        {active && entry
          ? `$${formatPrice(entry)}`
          : "—"}
      </td>

      <td className="py-3 text-[9px] text-zinc-500">
        {active && tp
          ? `$${formatPrice(tp)}`
          : "—"}
      </td>

      <td className="py-3 text-[9px] text-red-400">
        {active && sl
          ? `$${formatPrice(sl)}`
          : "—"}
      </td>

      <td className="py-3 text-right">

        {active ? (
          <span className="rounded-md bg-emerald-500/10 px-2 py-1 text-[8px] text-emerald-400">
            {confidence}%
          </span>
        ) : (
          <span className="text-[8px] text-zinc-700">
            —
          </span>
        )}

      </td>

    </tr>
  );
}
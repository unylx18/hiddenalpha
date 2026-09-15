"use client";

import { useEffect, useState } from "react";
import MarketCandleChart from "@/components/markets/market-candle-chart";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Bot,
  CheckCircle2,
  Clock3,
  ShieldCheck,
  Target,
  TrendingDown,
  TrendingUp,
  Waves,
  Zap,
} from "lucide-react";

type Signal = {
  symbol: string;
  timeframe: string;
  direction: "LONG" | "SHORT" | "WAIT";
  summary: string;
  confidence: number;
  confidenceLevel: "LOW" | "MEDIUM" | "HIGH";
  quality: "VALID" | "WEAK" | "REJECTED";
  status: "ACTIVE" | "INVALIDATED" | "EXPIRED" | "COMPLETED";
  reasons: {
    factor: string;
    direction: "BULLISH" | "BEARISH" | "NEUTRAL";
    message: string;
  }[];
  invalidation: string | null;
  entryPrice?: number;
  stopLossPrice?: number;
  takeProfit1Price?: number;
  takeProfit2Price?: number;
  riskRewardRatioTP1?: number;
  riskRewardRatioTP2?: number;
};

type Setup = {
  entryPrice: number;
  stopLossPrice: number;
  takeProfit1Price: number;
  takeProfit2Price: number;
  riskRewardRatioTP1: number;
  riskRewardRatioTP2: number;
  stopDistancePercent: number;
};

type Risk = {
  riskAmount?: number;
  positionSize?: number;
  positionValue?: number;
  marginRequired?: number;
  potentialLoss?: number;
  potentialProfitTP1?: number;
  potentialProfitTP2?: number;
};

type TradePlan = {
  signal: Signal;
  setup: Setup | null;
  risk: Risk | null;
};

type MtfSignal = {
  success: boolean;
  symbol: string;
  timeframe: string;
  direction?: "LONG" | "SHORT" | "WAIT";
  confidence?: number;
  confidenceLevel?: "LOW" | "MEDIUM" | "HIGH";
  quality?: "VALID" | "WEAK" | "REJECTED";
  summary?: string;
  error?: string;
};


const EXECUTION_TIMEFRAMES = [
  "15m",
  "5m",
  "30m",
  "1h",
  "4h",
  "3m",
  "1m",
];

function formatPrice(value?: number) {
  if (
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

function formatMoney(value?: number) {
  if (
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  return `$${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;
}

function directionColor(
  direction: Signal["direction"]
) {
  if (direction === "LONG") {
    return "text-emerald-400";
  }

  if (direction === "SHORT") {
    return "text-red-400";
  }

  return "text-zinc-400";
}

function directionBg(
  direction: Signal["direction"]
) {
  if (direction === "LONG") {
    return "bg-emerald-500/10 border-emerald-500/10";
  }

  if (direction === "SHORT") {
    return "bg-red-500/10 border-red-500/10";
  }

  return "bg-zinc-500/[0.05] border-white/[0.06]";
}

function reasonIcon(direction: string) {
  if (direction === "BULLISH") {
    return TrendingUp;
  }

  if (direction === "BEARISH") {
    return TrendingDown;
  }

  return Activity;
}

export default function SignalsPage() {
  const [plan, setPlan] =
    useState<TradePlan | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [mtfSignals, setMtfSignals] =
    useState<MtfSignal[]>([]);

  async function loadSignal() {
    try {
      const plans = await Promise.all(
        EXECUTION_TIMEFRAMES.map(async (timeframe) => {
          try {
            const response = await fetch(
              `/api/trading/plan?symbol=BTCUSDT&timeframe=${timeframe}&accountBalance=10000&riskPercent=1&leverage=1`,
              { cache: "no-store" }
            );

            const data = await response.json();

            return {
              timeframe,
              data: response.ok ? data : null,
            };
          } catch {
            return {
              timeframe,
              data: null,
            };
          }
        })
      );

      const approvedPlans = plans.filter(
        (item) =>
          item.data?.signal &&
          item.data.signal.direction !== "WAIT" &&
          item.data.signal.quality !== "REJECTED" &&
          item.data.setup
      );

      const selected =
        approvedPlans.sort((a, b) => {
          const confidenceA =
            a.data?.signal?.confidence ?? 0;
          const confidenceB =
            b.data?.signal?.confidence ?? 0;

          const priorityA =
            EXECUTION_TIMEFRAMES.indexOf(a.timeframe);
          const priorityB =
            EXECUTION_TIMEFRAMES.indexOf(b.timeframe);

          const scoreA =
            confidenceA + Math.max(0, 20 - priorityA * 2);
          const scoreB =
            confidenceB + Math.max(0, 20 - priorityB * 2);

          return scoreB - scoreA;
        })[0];

      if (selected?.data?.signal) {
        setPlan(selected.data);
      } else {
        const fallback = plans.find(
          (item) =>
            item.data?.signal &&
            item.data.signal.timeframe === "15m"
        );

        if (fallback?.data) {
          setPlan(fallback.data);
        }
      }
    } catch {
      // Keep existing state.
    } finally {
      setLoading(false);
    }
  }

  async function loadMtfSignals() {
    try {
      const response = await fetch(
        "/api/trading/signals?symbol=BTCUSDT",
        { cache: "no-store" }
      );

      const data = await response.json();

      if (Array.isArray(data?.signals)) {
        setMtfSignals(data.signals);
      }
    } catch {
      // Keep existing state.
    }
  }

  useEffect(() => {
    loadSignal();
    loadMtfSignals();

    const interval =
      window.setInterval(
        () => {
          loadSignal();
          loadMtfSignals();
        },
        15000
      );

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const signal =
    plan?.signal;

  const setup =
    plan?.setup;

  const risk =
    plan?.risk;

  const hasTrade =
    Boolean(
      signal &&
      signal.direction !== "WAIT" &&
      setup
    );

  return (
    <main className="min-h-screen bg-[#050608] text-white">

      <div className="flex min-h-screen">

        {/* SIDEBAR */}

        <aside className="hidden w-[240px] shrink-0 border-r border-white/[0.06] bg-[#08090c] lg:flex lg:flex-col">

          <div className="flex h-[72px] items-center border-b border-white/[0.06] px-5">

            <div className="flex items-center gap-3">

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-500">
                <span className="text-sm font-bold">
                  α
                </span>
              </div>

              <div>
                <div className="text-[15px] font-semibold">
                  hiddenalpha
                </div>

                <div className="mt-0.5 text-[8px] tracking-[0.22em] text-zinc-600">
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

              {[
                ["Overview", Activity],
                ["Signals", Zap],
                ["Markets", BarChart3],
                ["Scanner", Activity],
                ["Watchlist", Target],
                ["AI Analyst", Bot],
                ["Risk", ShieldCheck],
                ["Performance", TrendingUp],
                ["Portfolio", Activity],
                ["Settings", ShieldCheck],
              ].map(([label, Icon]) => {

                const active =
                  label === "Signals";

                return (
                  <div
                    key={label as string}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] transition ${
                      active
                        ? "bg-violet-500/[0.10] text-white"
                        : "text-zinc-500 hover:bg-white/[0.025] hover:text-zinc-300"
                    }`}
                  >
                    <Icon
                      size={14}
                      strokeWidth={1.7}
                      className={
                        active
                          ? "text-violet-400"
                          : "text-zinc-600"
                      }
                    />

                    <span>{label as string}</span>

                    {label === "Signals" && (
                      <span className="ml-auto rounded-md bg-violet-500/10 px-1.5 py-0.5 text-[8px] text-violet-400">
                        LIVE
                      </span>
                    )}

                  </div>
                );
              })}

            </nav>

          </div>

          <div className="mt-auto p-4">

            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.018] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">

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

              <div className="mt-3 flex justify-between text-[9px]">

                <span className="text-zinc-600">
                  Market source
                </span>

                <span className="text-zinc-400">
                  Bybit
                </span>

              </div>

            </div>

          </div>

        </aside>

        {/* MAIN */}

        <section className="min-w-0 flex-1">

          {/* TOPBAR */}

          <header className="flex h-[72px] items-center border-b border-white/[0.06] px-5 lg:px-7">

            <div className="flex items-center gap-3">

              <a
                href="/"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.02] text-zinc-500 transition hover:text-white"
              >
                <ArrowLeft size={15} />
              </a>

              <div>

                <p className="text-[8px] uppercase tracking-[0.16em] text-zinc-700">
                  Trading Intelligence
                </p>

                <p className="mt-0.5 text-[11px] text-zinc-400">
                  Signal Detail
                </p>

              </div>

            </div>

            <div className="ml-auto flex items-center gap-3">

              <span className="flex items-center gap-1.5 text-[9px] text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Live
              </span>

              <div className="h-6 w-px bg-white/[0.06]" />

              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 text-[10px] font-semibold">
                R
              </div>

            </div>

          </header>

          {/* CONTENT */}

          <div className="mx-auto max-w-[1400px] p-5 lg:p-7">

            {/* HEADER */}

            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">

              <div>

                <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-violet-400">
                  <Zap size={12} />
                  Signal Intelligence
                </div>

                <div className="mt-2 flex items-center gap-3">

                  <h1 className="text-[28px] font-semibold tracking-[-0.035em]">
                    BTC / USDT
                  </h1>

                  <span className="rounded-md border border-white/[0.06] bg-white/[0.025] px-2 py-1 text-[9px] text-zinc-500">
                    {signal?.timeframe ?? "15m"}
                  </span>

                </div>

                <p className="mt-1 text-[10px] text-zinc-600">
                  Generated from market context, structure,
                  momentum and volume.
                </p>

              </div>

              <div className="flex items-center gap-2">

                <span
                  className={`rounded-lg border px-3 py-2 text-[9px] font-medium ${directionBg(
                    signal?.direction ?? "WAIT"
                  )} ${directionColor(
                    signal?.direction ?? "WAIT"
                  )}`}
                >
                  {loading
                    ? "ANALYZING"
                    : signal?.direction ?? "WAIT"}
                </span>

                <span className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[9px] text-zinc-500">
                  {signal?.status ?? "ACTIVE"}
                </span>

              </div>

            </div>

            {/* MULTI-TIMEFRAME MATRIX */}

            <div className="mt-5 rounded-2xl border border-white/[0.06] bg-[#090b0f] p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[8px] uppercase tracking-[0.14em] text-violet-400">
                    Multi-Timeframe Intelligence
                  </p>
                  <h2 className="mt-1 text-[15px] font-medium">
                    BTC / USDT Signal Matrix
                  </h2>
                  <p className="mt-1 text-[9px] text-zinc-600">
                    Directional confirmation across multiple trading horizons.
                  </p>
                </div>

                <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2 text-[9px] text-zinc-500">
                  {mtfSignals.length
                    ? `${mtfSignals.filter((item) => item.success).length} / ${mtfSignals.length} TF`
                    : "Analyzing"}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
                {["1m", "3m", "5m", "15m", "30m", "1h", "4h"].map((timeframe) => {
                  const item = mtfSignals.find(
                    (signalItem) => signalItem.timeframe === timeframe
                  );
                  const direction = item?.direction ?? "WAIT";
                  const alignment =
                    direction === signal?.direction && direction !== "WAIT";

                  return (
                    <div
                      key={timeframe}
                      className={`rounded-xl border p-3 ${
                        alignment
                          ? "border-violet-500/20 bg-violet-500/[0.045]"
                          : "border-white/[0.05] bg-white/[0.012]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-medium text-zinc-400">
                          {timeframe}
                        </span>
                        {alignment && (
                          <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                        )}
                      </div>

                      <p className={`mt-3 text-[12px] font-semibold ${directionColor(direction)}`}>
                        {item ? direction : "—"}
                      </p>

                      <p className="mt-1 text-[8px] text-zinc-700">
                        {item?.confidence !== undefined
                          ? `${item.confidence}% confidence`
                          : "Waiting for data"}
                      </p>

                      <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.05]">
                        <div
                          className={`h-full rounded-full ${
                            direction === "LONG"
                              ? "bg-emerald-400"
                              : direction === "SHORT"
                              ? "bg-red-400"
                              : "bg-zinc-600"
                          }`}
                          style={{
                            width: `${Math.min(item?.confidence ?? 0, 100)}%`,
                          }}
                        />
                      </div>

                      <p className="mt-2 text-[7px] uppercase tracking-[0.08em] text-zinc-700">
                        {item?.quality ?? "—"}
                      </p>
                    </div>
                  );
                })}
              </div>

              {mtfSignals.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/[0.04] pt-4">
                  <span className="text-[8px] uppercase tracking-[0.1em] text-zinc-700">
                    Alignment
                  </span>
                  <span className="text-[9px] text-zinc-400">
                    {
                      mtfSignals.filter(
                        (item) =>
                          item.success &&
                          item.direction === signal?.direction &&
                          item.direction !== "WAIT"
                      ).length
                    }{" "}
                    TF aligned with current signal
                  </span>
                  <span className="text-[9px] text-zinc-700">·</span>
                  <span className="text-[9px] text-zinc-500">
                    Higher TFs should confirm lower-TF setups.
                  </span>
                </div>
              )}
            </div>

            {/* SIGNAL HERO */}

            <div className="mt-3 grid gap-3 xl:grid-cols-[1.7fr_0.8fr]">

              <div className="rounded-2xl border border-white/[0.06] bg-[#090b0f] p-5">

                <div className="flex items-center justify-between">

                  <div>

                    <p className="text-[8px] uppercase tracking-[0.14em] text-zinc-700">
                      Signal Confidence
                    </p>

                    <div className="mt-1 flex items-end gap-2">

                      <span
                        className={`text-[34px] font-semibold ${directionColor(
                          signal?.direction ?? "WAIT"
                        )}`}
                      >
                        {loading
                          ? "..."
                          : `${signal?.confidence ?? 0}%`}
                      </span>

                      <span className="mb-1 rounded-md bg-white/[0.04] px-2 py-1 text-[8px] text-zinc-500">
                        {signal?.confidenceLevel ??
                          "LOW"}
                      </span>

                    </div>

                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/[0.06]">
                    <Target
                      size={18}
                      className="text-violet-400"
                    />
                  </div>

                </div>

                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">

                  <div
                    className={`h-full rounded-full ${
                      signal?.direction === "SHORT"
                        ? "bg-red-400"
                        : signal?.direction === "LONG"
                        ? "bg-emerald-400"
                        : "bg-zinc-600"
                    }`}
                    style={{
                      width: `${Math.min(
                        signal?.confidence ?? 0,
                        100
                      )}%`,
                    }}
                  />

                </div>

                <p className="mt-5 max-w-[700px] text-[12px] leading-6 text-zinc-400">
                  {loading
                    ? "Hiddenalpha is analyzing current market conditions..."
                    : signal?.summary ??
                      "No signal available."}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">

                  <Badge
                    label="Quality"
                    value={
                      signal?.quality ?? "—"
                    }
                  />

                  <Badge
                    label="Status"
                    value={
                      signal?.status ?? "—"
                    }
                  />

                  <Badge
                    label="Timeframe"
                    value={
                      signal?.timeframe ?? "15m"
                    }
                  />

                </div>

              </div>

              {/* QUICK STATUS */}

              <div className="rounded-2xl border border-white/[0.06] bg-[#090b0f] p-5">

                <p className="text-[8px] uppercase tracking-[0.14em] text-zinc-700">
                  Signal State
                </p>

                <div className="mt-5 space-y-4">

                  <StatusRow
                    icon={Zap}
                    label="Direction"
                    value={
                      signal?.direction ?? "WAIT"
                    }
                  />

                  <StatusRow
                    icon={ShieldCheck}
                    label="Quality"
                    value={
                      signal?.quality ?? "—"
                    }
                  />

                  <StatusRow
                    icon={Clock3}
                    label="Status"
                    value={
                      signal?.status ?? "—"
                    }
                  />

                  <StatusRow
                    icon={Activity}
                    label="Confidence"
                    value={`${signal?.confidence ?? 0}%`}
                  />

                </div>

              </div>

            </div>

            {/* SETUP */}

            <div className="mt-3 rounded-2xl border border-white/[0.06] bg-[#090b0f] p-5">

              <div className="flex items-center gap-2">

                <Target
                  size={14}
                  className="text-violet-400"
                />

                <h2 className="text-[13px] font-medium">
                  Trade Setup
                </h2>

                <span className="ml-auto text-[8px] text-zinc-700">
                  Engine generated
                </span>

              </div>

              {hasTrade ? (

                <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">

                  <PriceBox
                    label="Entry"
                    value={setup?.entryPrice}
                  />

                  <PriceBox
                    label="Stop Loss"
                    value={setup?.stopLossPrice}
                    danger
                  />

                  <PriceBox
                    label="TP1"
                    value={setup?.takeProfit1Price}
                    success
                  />

                  <PriceBox
                    label="TP2"
                    value={setup?.takeProfit2Price}
                    success
                  />

                  <PriceBox
                    label="Stop Distance"
                    value={
                      setup?.stopDistancePercent
                        ? setup.stopDistancePercent
                        : undefined
                    }
                    suffix="%"
                  />

                </div>

              ) : (

                <div className="mt-4 rounded-xl border border-white/[0.05] bg-[#07090c] px-5 py-8 text-center">

                  <Target
                    size={18}
                    className="mx-auto text-zinc-700"
                  />

                  <p className="mt-3 text-[11px] text-zinc-500">
                    No confirmed trade setup
                  </p>

                  <p className="mt-1 text-[8px] text-zinc-700">
                    Entry, stop loss and take profit will
                    appear only after signal confirmation.
                  </p>

                </div>

              )}

            </div>

            {/* PRICE ACTION */}

            <div className="mt-3 rounded-2xl border border-white/[0.06] bg-[#090b0f] p-5">

              <div className="flex items-center justify-between">

                <div className="flex items-center gap-2">

                  <BarChart3
                    size={14}
                    className="text-violet-400"
                  />

                  <h2 className="text-[13px] font-medium">
                    Price Action
                  </h2>

                </div>

                <span className="text-[8px] text-zinc-700">
                  BTCUSDT · 1m
                </span>

              </div>

              <div className="mt-4 overflow-hidden rounded-xl border border-white/[0.04] bg-[#07090c]">
                <MarketCandleChart
                  symbol="BTCUSDT"
                  timeframe="1m"
                  entryPrice={setup?.entryPrice}
                  stopLossPrice={setup?.stopLossPrice}
                  takeProfit1Price={setup?.takeProfit1Price}
                  takeProfit2Price={setup?.takeProfit2Price}
                  signalDirection={signal?.direction}
                />
              </div>

            </div>

            {/* WHY + AI */}

            <div className="mt-3 grid gap-3 lg:grid-cols-2">

              {/* WHY */}

              <div className="rounded-2xl border border-white/[0.06] bg-[#090b0f] p-5">

                <div className="flex items-center gap-2">

                  <CheckCircle2
                    size={14}
                    className="text-emerald-400"
                  />

                  <h2 className="text-[13px] font-medium">
                    Why This Trade?
                  </h2>

                </div>

                <div className="mt-5 space-y-3">

                  {signal?.reasons?.length ? (

                    signal.reasons.map(
                      (reason, index) => {

                        const Icon =
                          reasonIcon(
                            reason.direction
                          );

                        return (
                          <div
                            key={`${reason.factor}-${index}`}
                            className="flex gap-3 rounded-xl border border-white/[0.04] bg-white/[0.012] p-3"
                          >

                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.03]">
                              <Icon
                                size={13}
                                className={
                                  reason.direction ===
                                  "BULLISH"
                                    ? "text-emerald-400"
                                    : reason.direction ===
                                      "BEARISH"
                                    ? "text-red-400"
                                    : "text-zinc-500"
                                }
                              />
                            </div>

                            <div>

                              <p className="text-[8px] uppercase tracking-[0.1em] text-zinc-700">
                                {reason.factor}
                              </p>

                              <p className="mt-1 text-[10px] leading-5 text-zinc-400">
                                {reason.message}
                              </p>

                            </div>

                          </div>
                        );
                      }
                    )

                  ) : (

                    <div className="rounded-xl border border-white/[0.04] p-4 text-[9px] text-zinc-700">
                      No confirmed directional factors yet.
                    </div>

                  )}

                </div>

              </div>

              {/* AI */}

              <div className="rounded-2xl border border-violet-500/10 bg-violet-500/[0.018] p-5">

                <div className="flex items-center justify-between">

                  <div className="flex items-center gap-2">

                    <Bot
                      size={14}
                      className="text-violet-400"
                    />

                    <h2 className="text-[13px] font-medium">
                      AI Explanation
                    </h2>

                  </div>

                  <span className="rounded-md bg-violet-500/10 px-2 py-1 text-[8px] text-violet-400">
                    BETA
                  </span>

                </div>

                <p className="mt-5 text-[11px] leading-6 text-zinc-500">
                  {signal?.summary ??
                    "AI analysis will explain the market context, confirmation and risk once sufficient market data is available."}
                </p>

                <div className="mt-5 rounded-xl border border-white/[0.05] bg-black/10 p-4">

                  <div className="flex items-center gap-2">

                    <Waves
                      size={13}
                      className="text-violet-400"
                    />

                    <span className="text-[9px] text-zinc-500">
                      Intelligence Layer
                    </span>

                  </div>

                  <p className="mt-2 text-[9px] leading-5 text-zinc-700">
                    AI will interpret market structure,
                    momentum, volume, volatility and signal
                    quality instead of generating a trade
                    direction blindly.
                  </p>

                </div>

              </div>

            </div>

            {/* RISK */}

            <div className="mt-3 rounded-2xl border border-white/[0.06] bg-[#090b0f] p-5">

              <div className="flex items-center gap-2">

                <ShieldCheck
                  size={14}
                  className="text-amber-400"
                />

                <h2 className="text-[13px] font-medium">
                  Risk Management
                </h2>

                <span className="ml-auto text-[8px] text-zinc-700">
                  Account $10,000 · Risk 1%
                </span>

              </div>

              {risk ? (

                <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">

                  <RiskBox
                    label="Risk Amount"
                    value={formatMoney(
                      risk.riskAmount
                    )}
                  />

                  <RiskBox
                    label="Position Size"
                    value={
                      risk.positionSize !==
                      undefined
                        ? risk.positionSize.toFixed(5)
                        : "—"
                    }
                  />

                  <RiskBox
                    label="Position Value"
                    value={formatMoney(
                      risk.positionValue
                    )}
                  />

                  <RiskBox
                    label="Margin"
                    value={formatMoney(
                      risk.marginRequired
                    )}
                  />

                  <RiskBox
                    label="Potential Loss"
                    value={formatMoney(
                      risk.potentialLoss
                    )}
                    danger
                  />

                  <RiskBox
                    label="Potential TP2"
                    value={formatMoney(
                      risk.potentialProfitTP2
                    )}
                    success
                  />

                </div>

              ) : (

                <div className="mt-4 rounded-xl border border-white/[0.04] bg-white/[0.01] p-5 text-center">

                  <p className="text-[9px] text-zinc-700">
                    Risk calculation is unavailable until
                    a confirmed trade setup exists.
                  </p>

                </div>

              )}

            </div>

            {/* R:R */}

            <div className="mt-3 grid gap-3 md:grid-cols-2">

              <div className="rounded-2xl border border-white/[0.06] bg-[#090b0f] p-5">

                <p className="text-[8px] uppercase tracking-[0.14em] text-zinc-700">
                  Reward / Risk
                </p>

                <div className="mt-4 flex items-center justify-between">

                  <div>
                    <p className="text-[9px] text-zinc-600">
                      TP1
                    </p>

                    <p className="mt-1 text-[20px] font-semibold text-zinc-200">
                      {setup
                        ? `1 : ${setup.riskRewardRatioTP1.toFixed(
                            1
                          )}`
                        : "—"}
                    </p>
                  </div>

                  <div className="h-8 w-px bg-white/[0.06]" />

                  <div>
                    <p className="text-[9px] text-zinc-600">
                      TP2
                    </p>

                    <p className="mt-1 text-[20px] font-semibold text-emerald-400">
                      {setup
                        ? `1 : ${setup.riskRewardRatioTP2.toFixed(
                            1
                          )}`
                        : "—"}
                    </p>
                  </div>

                </div>

              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-[#090b0f] p-5">

                <p className="text-[8px] uppercase tracking-[0.14em] text-zinc-700">
                  Invalidation
                </p>

                <p className="mt-4 text-[10px] leading-5 text-zinc-500">
                  {signal?.invalidation ??
                    "No confirmed invalidation level because the current setup is not approved."}
                </p>

              </div>

            </div>

            {/* FOOTER */}

            <div className="mt-3 flex items-center justify-between rounded-2xl border border-white/[0.05] bg-[#080a0d] px-5 py-4">

              <div className="flex items-center gap-2">

                <ShieldCheck
                  size={13}
                  className="text-amber-400"
                />

                <span className="text-[8px] text-zinc-700">
                  Signal intelligence is informational. Always manage risk independently.
                </span>

              </div>

              <span className="hidden text-[8px] text-zinc-700 sm:block">
                Source · Bybit
              </span>

            </div>

          </div>

        </section>

      </div>

    </main>
  );
}

function Badge({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-white/[0.05] bg-white/[0.015] px-3 py-2">

      <span className="text-[7px] uppercase tracking-[0.1em] text-zinc-700">
        {label}
      </span>

      <span className="ml-2 text-[8px] text-zinc-400">
        {value}
      </span>

    </div>
  );
}

function StatusRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Zap;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/[0.04] pb-3 last:border-0">

      <div className="flex items-center gap-2">

        <Icon
          size={12}
          className="text-zinc-700"
        />

        <span className="text-[9px] text-zinc-600">
          {label}
        </span>

      </div>

      <span className="text-[9px] text-zinc-400">
        {value}
      </span>

    </div>
  );
}

function PriceBox({
  label,
  value,
  danger,
  success,
  suffix,
}: {
  label: string;
  value?: number;
  danger?: boolean;
  success?: boolean;
  suffix?: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.05] bg-white/[0.012] p-3">

      <p className="text-[8px] uppercase tracking-[0.1em] text-zinc-700">
        {label}
      </p>

      <p
        className={`mt-2 text-[12px] font-medium ${
          danger
            ? "text-red-400"
            : success
            ? "text-emerald-400"
            : "text-zinc-200"
        }`}
      >
        {value !== undefined
          ? `${formatPrice(value)}${suffix ?? ""}`
          : "—"}
      </p>

    </div>
  );
}

function RiskBox({
  label,
  value,
  danger,
  success,
}: {
  label: string;
  value: string;
  danger?: boolean;
  success?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/[0.05] bg-white/[0.012] p-3">

      <p className="text-[8px] uppercase tracking-[0.08em] text-zinc-700">
        {label}
      </p>

      <p
        className={`mt-2 text-[11px] font-medium ${
          danger
            ? "text-red-400"
            : success
            ? "text-emerald-400"
            : "text-zinc-300"
        }`}
      >
        {value}
      </p>

    </div>
  );
}

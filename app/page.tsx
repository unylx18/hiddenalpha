"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  Activity,
  Bell,
  BrainCircuit,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Gauge,
  ShieldCheck,
  TrendingUp,
  Zap,
} from "lucide-react";

import HiddenAlphaShell from "@/components/hiddenalpha-shell";
import DashboardMarketOverview from "@/components/dashboard-market-overview";
import DashboardTopSignal from "@/components/dashboard-top-signal";

type TradePlan = {
  signal?: {
    symbol: string;
    timeframe: string;
    direction:
      | "LONG"
      | "SHORT"
      | "WAIT";
    confidence: number;
    quality:
      | "VALID"
      | "WEAK"
      | "REJECTED";
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
    potentialLoss?: number;
    potentialProfitTP1?: number;
  } | null;
};

type Performance = {
  totalTrades: number;
  wins: number;
  losses: number;
  breakevens: number;
  winRate: number;
  totalR: number;
  averageR: number;
};

const emptyPerformance: Performance = {
  totalTrades: 0,
  wins: 0,
  losses: 0,
  breakevens: 0,
  winRate: 0,
  totalR: 0,
  averageR: 0,
};

function formatR(value: number) {
  if (!Number.isFinite(value)) {
    return "0.00R";
  }

  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}R`;
}

export default function HomePage() {
  const router = useRouter();

  const [tradePlan, setTradePlan] =
    useState<TradePlan | null>(null);

  const [
    performance,
    setPerformance,
  ] =
    useState<Performance>(
      emptyPerformance
    );

  const [planLoading, setPlanLoading] =
    useState(true);

  const [
    performanceLoading,
    setPerformanceLoading,
  ] = useState(true);

  const [lastUpdated, setLastUpdated] =
    useState<Date | null>(null);

  async function loadTradePlan() {
    try {
      const response = await fetch(
        "/api/trading/plan?symbol=BTCUSDT&timeframe=1h&accountBalance=10000&riskPercent=1&leverage=1",
        {
          cache: "no-store",
        }
      );

      const data =
        await response.json();

      if (
        response.ok &&
        data?.signal
      ) {
        setTradePlan(data);
        setLastUpdated(
          new Date()
        );
      }
    } catch {
      // Dashboard stays available.
    } finally {
      setPlanLoading(false);
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

      const data =
        await response.json();

      if (
        response.ok &&
        data.success &&
        data.summary
      ) {
        setPerformance({
          totalTrades:
            data.summary
              .totalTrades ?? 0,

          wins:
            data.summary.wins ?? 0,

          losses:
            data.summary.losses ??
            0,

          breakevens:
            data.summary
              .breakevens ?? 0,

          winRate:
            data.summary.winRate ??
            0,

          totalR:
            data.summary.totalR ??
            0,

          averageR:
            data.summary
              .averageR ?? 0,
        });
      }
    } catch {
      // Dashboard stays available.
    } finally {
      setPerformanceLoading(
        false
      );
    }
  }

  useEffect(() => {
    loadTradePlan();
    loadPerformance();

    const interval =
      window.setInterval(
        () => {
          loadTradePlan();
        },
        15000
      );

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, []);

  const signal =
    tradePlan?.signal;

  const setup =
    tradePlan?.setup;

  const confirmedTrade =
    Boolean(
      signal &&
        signal.direction !==
          "WAIT" &&
        signal.quality !==
          "REJECTED" &&
        setup
    );

  return (
    <HiddenAlphaShell>

      <div className="mx-auto max-w-[1700px] px-4 py-5 lg:px-5">

        {/* PAGE HEADER */}

        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">

          <div>

            <div className="flex items-center gap-2">

              <h1 className="text-[20px] font-semibold tracking-[-0.03em] text-zinc-100">
                Overview
              </h1>

              <span className="rounded-md border border-violet-500/10 bg-violet-500/[0.08] px-2 py-1 text-[7px] font-semibold uppercase tracking-[0.12em] text-violet-400">
                Command Center
              </span>

            </div>

            <p className="mt-1 text-[9px] text-zinc-600">
              Real-time market
              intelligence,
              opportunities and
              trading system health.
            </p>

          </div>

          <div className="flex items-center gap-2 text-[8px] text-zinc-700">

            <Clock3
              size={11}
            />

            {lastUpdated
              ? `Updated ${lastUpdated.toLocaleTimeString()}`
              : "Waiting for engine data"}

          </div>

        </div>

        {/* SYSTEM STATUS */}

        <div className="mb-3 grid grid-cols-2 gap-2 lg:grid-cols-4">

          <StatusCard
            icon={CheckCircle2}
            label="Core Engine"
            value="Operational"
            tone="green"
          />

          <StatusCard
            icon={Zap}
            label="Signal Engine"
            value={
              planLoading
                ? "Analyzing"
                : signal
                ? "Online"
                : "No Data"
            }
            tone={
              signal
                ? "green"
                : "neutral"
            }
          />

          <StatusCard
            icon={ShieldCheck}
            label="Trade Setup"
            value={
              planLoading
                ? "Scanning"
                : confirmedTrade
                ? "Confirmed"
                : "Waiting"
            }
            tone={
              confirmedTrade
                ? "purple"
                : "neutral"
            }
          />

          <StatusCard
            icon={Activity}
            label="Performance"
            value={
              performanceLoading
                ? "Loading"
                : `${performance.totalTrades} Trades`
            }
            tone="neutral"
          />

        </div>

        {/* PRIMARY GRID */}

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.75fr)]">

          <DashboardTopSignal
            signal={
              tradePlan?.signal
            }
            setup={
              tradePlan?.setup
            }
            onViewSignal={() =>
              router.push(
                "/signals"
              )
            }
          />

          {/* DESK INTELLIGENCE */}

          <section className="ha-panel p-5">

            <div className="flex items-center justify-between">

              <div className="flex items-center gap-2">

                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/[0.08]">

                  <BrainCircuit
                    size={13}
                    className="text-violet-400"
                  />

                </div>

                <div>

                  <h2 className="text-[11px] font-medium text-zinc-200">
                    Desk Intelligence
                  </h2>

                  <p className="text-[7px] text-zinc-700">
                    Engine state
                  </p>

                </div>

              </div>

              <span className="flex items-center gap-1.5 text-[7px] font-medium text-emerald-400">

                <span className="ha-live-dot" />

                LIVE

              </span>

            </div>

            <div className="mt-5 space-y-2">

              <IntelligenceRow
                icon={Gauge}
                title="Signal State"
                value={
                  signal?.direction ??
                  "WAIT"
                }
                positive={
                  signal?.direction ===
                  "LONG"
                }
                negative={
                  signal?.direction ===
                  "SHORT"
                }
              />

              <IntelligenceRow
                icon={Zap}
                title="Confidence"
                value={
                  signal
                    ? `${signal.confidence}%`
                    : "—"
                }
              />

              <IntelligenceRow
                icon={ShieldCheck}
                title="Risk Model"
                value={
                  tradePlan?.risk
                    ? "Calculated"
                    : "Standby"
                }
              />

              <IntelligenceRow
                icon={CheckCircle2}
                title="Setup Quality"
                value={
                  signal?.quality ??
                  "SCANNING"
                }
              />

            </div>

            <div className="mt-4 rounded-xl border border-white/[0.05] bg-white/[0.015] p-3">

              <p className="text-[8px] font-medium text-zinc-500">
                Engine Summary
              </p>

              <p className="mt-2 text-[9px] leading-5 text-zinc-600">
                {signal?.summary ??
                  "HiddenAlpha is monitoring the market and waiting for a statistically valid setup."}
              </p>

            </div>

          </section>

        </div>

        {/* SECONDARY GRID */}

        <div className="mt-3 grid gap-3 xl:grid-cols-[1.15fr_0.85fr]">

          <DashboardMarketOverview />

          {/* PERFORMANCE */}

          <section className="ha-panel p-5">

            <div className="flex items-center justify-between">

              <div className="flex items-center gap-2">

                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/[0.08]">

                  <TrendingUp
                    size={13}
                    className="text-violet-400"
                  />

                </div>

                <div>

                  <h2 className="text-[11px] font-medium text-zinc-200">
                    Performance Snapshot
                  </h2>

                  <p className="text-[7px] text-zinc-700">
                    Realized signal
                    outcomes
                  </p>

                </div>

              </div>

              <button
                onClick={() =>
                  router.push(
                    "/performance"
                  )
                }
                className="text-[8px] text-violet-400 transition hover:text-violet-300"
              >
                View Full
              </button>

            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">

              <MetricCard
                label="Win Rate"
                value={`${performance.winRate.toFixed(
                  1
                )}%`}
              />

              <MetricCard
                label="Total R"
                value={formatR(
                  performance.totalR
                )}
                positive={
                  performance.totalR >
                  0
                }
                negative={
                  performance.totalR <
                  0
                }
              />

              <MetricCard
                label="Average R"
                value={formatR(
                  performance.averageR
                )}
                positive={
                  performance.averageR >
                  0
                }
                negative={
                  performance.averageR <
                  0
                }
              />

              <MetricCard
                label="Total Trades"
                value={`${performance.totalTrades}`}
              />

            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">

              <MiniMetric
                label="Wins"
                value={
                  performance.wins
                }
                tone="green"
              />

              <MiniMetric
                label="Losses"
                value={
                  performance.losses
                }
                tone="red"
              />

              <MiniMetric
                label="B/E"
                value={
                  performance.breakevens
                }
              />

            </div>

          </section>

        </div>

        {/* BOTTOM GRID */}

        <div className="mt-3 grid gap-3 lg:grid-cols-2">

          {/* ALERTS */}

          <section className="ha-panel p-5">

            <div className="flex items-center gap-2">

              <Bell
                size={13}
                className="text-amber-400"
              />

              <h2 className="text-[11px] font-medium text-zinc-200">
                Recent Alerts
              </h2>

            </div>

            <div className="mt-4 flex min-h-[94px] items-center justify-center rounded-xl border border-dashed border-white/[0.06] bg-white/[0.01]">

              <div className="text-center">

                <Bell
                  size={16}
                  className="mx-auto text-zinc-700"
                />

                <p className="mt-2 text-[9px] text-zinc-600">
                  Alert feed not
                  connected yet.
                </p>

                <p className="mt-1 text-[7px] text-zinc-800">
                  Planned for Alerts
                  module.
                </p>

              </div>

            </div>

          </section>

          {/* EXECUTION */}

          <section className="ha-panel p-5">

            <div className="flex items-center gap-2">

              <CircleAlert
                size={13}
                className="text-violet-400"
              />

              <h2 className="text-[11px] font-medium text-zinc-200">
                Execution Desk
              </h2>

            </div>

            <div className="mt-4 flex min-h-[94px] items-center justify-center rounded-xl border border-dashed border-white/[0.06] bg-white/[0.01]">

              <div className="text-center">

                <ShieldCheck
                  size={17}
                  className="mx-auto text-zinc-700"
                />

                <p className="mt-2 text-[9px] text-zinc-600">
                  Automated execution
                  is disabled.
                </p>

                <p className="mt-1 text-[7px] text-zinc-800">
                  No live order will be
                  placed from this
                  dashboard.
                </p>

              </div>

            </div>

          </section>

        </div>

      </div>

    </HiddenAlphaShell>
  );
}

function StatusCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  tone:
    | "green"
    | "purple"
    | "neutral";
}) {
  const valueClass =
    tone === "green"
      ? "text-emerald-400"
      : tone === "purple"
      ? "text-violet-400"
      : "text-zinc-400";

  return (
    <div className="rounded-xl border border-white/[0.055] bg-[#090c12] px-3 py-3">

      <div className="flex items-center gap-2">

        <Icon
          size={12}
          className="text-zinc-700"
        />

        <span className="text-[8px] uppercase tracking-[0.1em] text-zinc-700">
          {label}
        </span>

      </div>

      <p
        className={`mt-2 text-[10px] font-medium ${valueClass}`}
      >
        {value}
      </p>

    </div>
  );
}

function IntelligenceRow({
  icon: Icon,
  title,
  value,
  positive = false,
  negative = false,
}: {
  icon: typeof Activity;
  title: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
}) {
  const valueClass =
    positive
      ? "text-emerald-400"
      : negative
      ? "text-red-400"
      : "text-zinc-400";

  return (
    <div className="flex items-center justify-between rounded-xl border border-white/[0.045] bg-white/[0.012] px-3 py-2.5">

      <div className="flex items-center gap-2">

        <Icon
          size={11}
          className="text-zinc-700"
        />

        <span className="text-[8px] text-zinc-600">
          {title}
        </span>

      </div>

      <span
        className={`text-[8px] font-medium ${valueClass}`}
      >
        {value}
      </span>

    </div>
  );
}

function MetricCard({
  label,
  value,
  positive = false,
  negative = false,
}: {
  label: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
}) {
  const valueClass =
    positive
      ? "text-emerald-400"
      : negative
      ? "text-red-400"
      : "text-zinc-100";

  return (
    <div className="rounded-xl border border-white/[0.05] bg-white/[0.012] p-3">

      <p className="text-[8px] text-zinc-700">
        {label}
      </p>

      <p
        className={`ha-number mt-2 text-[17px] font-semibold ${valueClass}`}
      >
        {value}
      </p>

    </div>
  );
}

function MiniMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "green" | "red";
}) {
  const valueClass =
    tone === "green"
      ? "text-emerald-400"
      : tone === "red"
      ? "text-red-400"
      : "text-zinc-400";

  return (
    <div className="rounded-lg border border-white/[0.045] bg-white/[0.01] px-3 py-2">

      <p className="text-[7px] text-zinc-700">
        {label}
      </p>

      <p
        className={`mt-1 text-[10px] font-medium ${valueClass}`}
      >
        {value}
      </p>

    </div>
  );
}
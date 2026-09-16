"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Crosshair,
  LoaderCircle,
  Radar,
  RefreshCw,
  Shield,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";

import SetupCandleChart from "@/components/setup-candle-chart";

type LifecyclePhase =
  | "WAITING_ENTRY"
  | "ENTRY_TRIGGERED"
  | "TP1_HIT"
  | "TP2_HIT"
  | "STOPPED"
  | "INVALIDATED"
  | "EXPIRED";

type ActiveSignal = {
  id: string;

  symbol: string;

  timeframe: string;

  direction:
    | "LONG"
    | "SHORT";

  confidence: number;

  confidenceLevel: string;

  quality: string;

  summary: string;

  status: string;

  lifecyclePhase:
    LifecyclePhase;

  publishedAt: string;

  entryTriggeredAt:
    | string
    | null;

  tp1HitAt:
    | string
    | null;

  tp2HitAt:
    | string
    | null;

  stopHitAt:
    | string
    | null;

  entryPrice: number;

  stopLossPrice: number;

  takeProfit1Price: number;

  takeProfit2Price: number;

  currentPrice: number;

  progressR: number;

  distanceFromEntryPercent:
    number;

  ageMinutes: number;
};

type ActiveSignalResponse = {
  success: boolean;

  activeSignal:
    | ActiveSignal
    | null;

  error?: string;
};

type Props = {
  signal?: unknown;

  setup?: unknown;

  onViewSignal?: () => void;
};

function formatPrice(
  value: number
) {
  if (
    !Number.isFinite(value)
  ) {
    return "—";
  }

  if (value >= 1000) {
    return value.toLocaleString(
      "en-US",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    );
  }

  if (value >= 1) {
    return value.toLocaleString(
      "en-US",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      }
    );
  }

  return value.toLocaleString(
    "en-US",
    {
      minimumFractionDigits: 4,
      maximumFractionDigits: 6,
    }
  );
}

function lifecycleLabel(
  phase: LifecyclePhase
) {
  switch (phase) {
    case "WAITING_ENTRY":
      return "WAITING FOR ENTRY";

    case "ENTRY_TRIGGERED":
      return "POSITION ACTIVE";

    case "TP1_HIT":
      return "TP1 HIT";

    case "TP2_HIT":
      return "TP2 HIT";

    case "STOPPED":
      return "STOPPED";

    case "INVALIDATED":
      return "INVALIDATED";

    case "EXPIRED":
      return "EXPIRED";

    default:
      return phase;
  }
}

function lifecycleClass(
  phase: LifecyclePhase
) {
  if (
    phase ===
      "ENTRY_TRIGGERED" ||
    phase === "TP1_HIT"
  ) {
    return "border-emerald-500/15 bg-emerald-500/[0.08] text-emerald-400";
  }

  if (
    phase === "TP2_HIT"
  ) {
    return "border-cyan-500/15 bg-cyan-500/[0.08] text-cyan-400";
  }

  if (
    phase ===
    "WAITING_ENTRY"
  ) {
    return "border-violet-500/15 bg-violet-500/[0.08] text-violet-400";
  }

  if (
    phase === "STOPPED" ||
    phase ===
      "INVALIDATED"
  ) {
    return "border-red-500/15 bg-red-500/[0.08] text-red-400";
  }

  return "border-amber-500/15 bg-amber-500/[0.08] text-amber-400";
}

function directionClass(
  direction:
    | "LONG"
    | "SHORT"
) {
  return direction === "LONG"
    ? "text-emerald-400"
    : "text-red-400";
}

export default function DashboardTopSignal({
  onViewSignal,
}: Props) {
  const [
    activeSignal,
    setActiveSignal,
  ] =
    useState<ActiveSignal | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  /*
   * ========================================
   * LOAD PERSISTENT ACTIVE SIGNAL
   * ========================================
   */

  const loadActiveSignal =
    useCallback(
      async (
        manual = false
      ) => {
        if (manual) {
          setRefreshing(true);
        }

        try {
          const response =
            await fetch(
              "/api/trading/signals/active",
              {
                cache:
                  "no-store",
              }
            );

          const data =
            (await response.json()) as ActiveSignalResponse;

          if (
            !response.ok ||
            !data.success
          ) {
            throw new Error(
              data.error ??
                "Failed to load active signal"
            );
          }

          setActiveSignal(
            data.activeSignal
          );

          setError("");
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load active signal"
          );
        } finally {
          setLoading(false);

          setRefreshing(false);
        }
      },
      []
    );

  /*
   * ========================================
   * REFRESH STRATEGY
   * ========================================
   *
   * This endpoint does NOT regenerate
   * the trading signal.
   *
   * It only reads the frozen signal
   * from database + current live price.
   *
   * Therefore 10s refresh is cheap and
   * cannot make the signal disappear
   * because scanner changed its mind.
   */

  useEffect(() => {
    loadActiveSignal();

    const priceRefresh =
      window.setInterval(
        () => {
          loadActiveSignal();
        },
        10_000
      );

    /*
     * Immediately refresh after the
     * authoritative signal pipeline
     * finishes.
     */

    function handlePipelineComplete() {
      loadActiveSignal();
    }

    window.addEventListener(
      "hiddenalpha:signal-pipeline-complete",
      handlePipelineComplete
    );

    return () => {
      window.clearInterval(
        priceRefresh
      );

      window.removeEventListener(
        "hiddenalpha:signal-pipeline-complete",
        handlePipelineComplete
      );
    };
  }, [
    loadActiveSignal,
  ]);

  /*
   * ========================================
   * LOADING
   * ========================================
   */

  if (loading) {
    return (
      <section className="ha-panel ha-purple-glow">

        <div className="flex min-h-[420px] items-center justify-center">

          <div className="text-center">

            <LoaderCircle
              size={22}
              className="mx-auto animate-spin text-violet-400"
            />

            <p className="mt-3 text-[9px] text-zinc-600">
              Loading signal desk...
            </p>

          </div>

        </div>

      </section>
    );
  }

  /*
   * ========================================
   * NO ACTIVE SIGNAL
   * ========================================
   */

  if (!activeSignal) {
    return (
      <section className="ha-panel relative overflow-hidden">

        <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-violet-600/[0.06] blur-3xl" />

        <div className="relative">

          <Header
            refreshing={
              refreshing
            }
            onRefresh={() =>
              loadActiveSignal(
                true
              )
            }
          />

          <div className="p-5">

            {error && (
              <div className="mb-4 rounded-xl border border-red-500/10 bg-red-500/[0.04] p-3 text-[8px] text-red-400">
                {error}
              </div>
            )}

            <div className="flex min-h-[305px] items-center justify-center rounded-xl border border-dashed border-white/[0.06] bg-white/[0.01]">

              <div className="max-w-[420px] text-center">

                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.025]">

                  <Radar
                    size={19}
                    className="text-violet-400"
                  />

                </div>

                <h3 className="mt-4 text-[13px] font-medium text-zinc-300">
                  No confirmed signal
                </h3>

                <p className="mt-2 text-[9px] leading-5 text-zinc-600">
                  HiddenAlpha is scanning BTC, ETH and SOL.
                  Only opportunities that pass the quality,
                  freshness and risk gates will be published.
                </p>

                <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-emerald-500/10 bg-emerald-500/[0.04] px-3 py-2">

                  <Shield
                    size={10}
                    className="text-emerald-400"
                  />

                  <span className="text-[7px] font-semibold uppercase tracking-[0.1em] text-emerald-400">
                    Capital Preservation Mode
                  </span>

                </div>

              </div>

            </div>

          </div>

        </div>

      </section>
    );
  }

  const signal =
    activeSignal;

  return (
    <section className="ha-panel ha-purple-glow relative overflow-hidden">

      <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-violet-600/[0.07] blur-3xl" />

      <div className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 rounded-full bg-cyan-500/[0.025] blur-3xl" />

      <div className="relative">

        <Header
          refreshing={
            refreshing
          }
          onRefresh={() =>
            loadActiveSignal(
              true
            )
          }
        />

        <div className="p-5">

          {error && (
            <div className="mb-4 rounded-xl border border-red-500/10 bg-red-500/[0.04] p-3 text-[8px] text-red-400">
              {error}
            </div>
          )}

          <div className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">

            {/* SIGNAL DETAILS */}

            <div>

              <div className="flex flex-wrap items-start justify-between gap-4">

                <div>

                  <p className="text-[8px] font-medium uppercase tracking-[0.14em] text-zinc-700">
                    Confirmed Signal
                  </p>

                  <div className="mt-1 flex items-end gap-2">

                    <h3 className="ha-number text-[28px] font-semibold tracking-[-0.04em] text-zinc-100">

                      {signal.symbol.replace(
                        "USDT",
                        ""
                      )}

                      <span className="ml-1 text-[12px] font-medium text-zinc-600">
                        / USDT
                      </span>

                    </h3>

                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2">

                    <span
                      className={`text-[11px] font-semibold ${directionClass(
                        signal.direction
                      )}`}
                    >
                      {signal.direction}
                    </span>

                    <span className="text-zinc-800">
                      •
                    </span>

                    <span className="text-[9px] text-zinc-500">
                      {signal.timeframe}
                    </span>

                    <span
                      className={`rounded-md border px-2 py-1 text-[7px] font-semibold ${lifecycleClass(
                        signal.lifecyclePhase
                      )}`}
                    >
                      {lifecycleLabel(
                        signal.lifecyclePhase
                      )}
                    </span>

                  </div>

                </div>

                <div className="text-right">

                  <p className="text-[7px] uppercase tracking-[0.12em] text-zinc-700">
                    Live Price
                  </p>

                  <p className="ha-number mt-1 text-[21px] font-semibold text-zinc-100">
                    {formatPrice(
                      signal.currentPrice
                    )}
                  </p>

                </div>

              </div>

              {/* SIGNAL METRICS */}

              <div className="mt-5 grid grid-cols-3 gap-2">

                <MetricCard
                  label="Confidence"
                  value={`${signal.confidence}%`}
                />

                <MetricCard
                  label="Quality"
                  value={
                    signal.quality
                  }
                  accent
                />

                <MetricCard
                  label="Progress"
                  value={`${signal.progressR.toFixed(
                    2
                  )}R`}
                  positive={
                    signal.progressR >
                    0
                  }
                  negative={
                    signal.progressR <
                    0
                  }
                />

              </div>

              {/* LEVELS */}

              <div className="mt-3 grid grid-cols-2 gap-2">

                <LevelCard
                  icon={Crosshair}
                  label="Entry"
                  value={formatPrice(
                    signal.entryPrice
                  )}
                />

                <LevelCard
                  icon={Shield}
                  label="Stop Loss"
                  value={formatPrice(
                    signal.stopLossPrice
                  )}
                  tone="red"
                />

                <LevelCard
                  icon={Target}
                  label="Take Profit 1"
                  value={formatPrice(
                    signal.takeProfit1Price
                  )}
                  tone="green"
                />

                <LevelCard
                  icon={Target}
                  label="Take Profit 2"
                  value={formatPrice(
                    signal.takeProfit2Price
                  )}
                  tone="cyan"
                />

              </div>

              {/* TRACKING */}

              <div className="mt-3 rounded-xl border border-white/[0.05] bg-white/[0.012] p-3">

                <div className="flex items-center justify-between gap-3">

                  <div className="flex items-center gap-2">

                    <Activity
                      size={11}
                      className="text-violet-400"
                    />

                    <span className="text-[8px] font-medium text-zinc-500">
                      Lifecycle Tracking
                    </span>

                  </div>

                  <span className="flex items-center gap-1.5 text-[7px] font-medium text-emerald-400">

                    <span className="ha-live-dot" />

                    TRACKING

                  </span>

                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">

                  <SmallMetric
                    label="Published"
                    value={`${Math.round(
                      signal.ageMinutes
                    )} min ago`}
                  />

                  <SmallMetric
                    label="Entry Distance"
                    value={`${signal.distanceFromEntryPercent.toFixed(
                      2
                    )}%`}
                  />

                </div>

                <p className="mt-3 text-[8px] leading-4 text-zinc-700">
                  {signal.summary}
                </p>

              </div>

              <button
                onClick={
                  onViewSignal
                }
                className="mt-4 flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-violet-600 text-[9px] font-medium text-white transition hover:bg-violet-500"
              >
                Open Signal Command Center

                <ArrowRight
                  size={12}
                />

              </button>

            </div>

            {/* LIVE CHART */}

            <SetupCandleChart
              symbol={
                signal.symbol
              }
              signalTimeframe={
                signal.timeframe
              }
              direction={
                signal.direction
              }
              livePrice={
                signal.currentPrice
              }
              entryPrice={
                signal.entryPrice
              }
              stopLossPrice={
                signal.stopLossPrice
              }
              takeProfit1Price={
                signal.takeProfit1Price
              }
              takeProfit2Price={
                signal.takeProfit2Price
              }
            />

          </div>

        </div>

      </div>

    </section>
  );
}

function Header({
  refreshing,
  onRefresh,
}: {
  refreshing: boolean;

  onRefresh: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/[0.05] px-5 py-4">

      <div className="flex items-center gap-3">

        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet-500/10 bg-violet-500/[0.08]">

          <Zap
            size={14}
            className="text-violet-400"
          />

        </div>

        <div>

          <div className="flex items-center gap-2">

            <h2 className="text-[12px] font-medium text-zinc-100">
              Active Signal
            </h2>

            <span className="rounded border border-emerald-500/10 bg-emerald-500/[0.06] px-1.5 py-0.5 text-[6px] font-semibold uppercase tracking-[0.14em] text-emerald-400">
              Persistent
            </span>

          </div>

          <p className="mt-0.5 text-[8px] text-zinc-700">
            Published signal & lifecycle tracking
          </p>

        </div>

      </div>

      <div className="flex items-center gap-3">

        <span className="hidden items-center gap-1.5 text-[7px] font-medium text-emerald-400 sm:flex">

          <CheckCircle2
            size={9}
          />

          DATABASE

        </span>

        <button
          onClick={
            onRefresh
          }
          disabled={
            refreshing
          }
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.055] bg-white/[0.015] transition hover:bg-white/[0.035]"
        >

          <RefreshCw
            size={12}
            className={`text-zinc-500 ${
              refreshing
                ? "animate-spin"
                : ""
            }`}
          />

        </button>

      </div>

    </div>
  );
}

function MetricCard({
  label,
  value,
  accent = false,
  positive = false,
  negative = false,
}: {
  label: string;

  value: string;

  accent?: boolean;

  positive?: boolean;

  negative?: boolean;
}) {
  let valueClass =
    "text-zinc-100";

  if (accent) {
    valueClass =
      "text-violet-400";
  }

  if (positive) {
    valueClass =
      "text-emerald-400";
  }

  if (negative) {
    valueClass =
      "text-red-400";
  }

  return (
    <div className="rounded-xl border border-white/[0.05] bg-white/[0.012] p-3">

      <p className="text-[7px] uppercase tracking-[0.1em] text-zinc-700">
        {label}
      </p>

      <p
        className={`ha-number mt-2 text-[16px] font-semibold ${valueClass}`}
      >
        {value}
      </p>

    </div>
  );
}

function LevelCard({
  icon: Icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: typeof Target;

  label: string;

  value: string;

  tone?:
    | "neutral"
    | "green"
    | "red"
    | "cyan";
}) {
  const valueClass =
    tone === "green"
      ? "text-emerald-400"
      : tone === "red"
      ? "text-red-400"
      : tone === "cyan"
      ? "text-cyan-400"
      : "text-zinc-300";

  return (
    <div className="rounded-xl border border-white/[0.05] bg-white/[0.012] p-3">

      <div className="flex items-center gap-2">

        <Icon
          size={10}
          className="text-zinc-700"
        />

        <span className="text-[7px] uppercase tracking-[0.1em] text-zinc-700">
          {label}
        </span>

      </div>

      <p
        className={`ha-number mt-2 text-[12px] font-medium ${valueClass}`}
      >
        {value}
      </p>

    </div>
  );
}

function SmallMetric({
  label,
  value,
}: {
  label: string;

  value: string;
}) {
  return (
    <div className="rounded-lg border border-white/[0.04] bg-white/[0.01] px-3 py-2">

      <p className="text-[7px] text-zinc-700">
        {label}
      </p>

      <p className="ha-number mt-1 text-[9px] text-zinc-400">
        {value}
      </p>

    </div>
  );
}
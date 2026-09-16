"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  Activity,
  CheckCircle2,
  Crosshair,
  Database,
  History,
  Radio,
  RefreshCw,
  ShieldCheck,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";

import HiddenAlphaShell from "@/components/hiddenalpha-shell";
import SetupCandleChart from "@/components/setup-candle-chart";
import SignalMarketComparison from "@/components/signal-market-comparison";

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

type HistorySignal = {
  id: string;

  symbol: string;
  timeframe: string;

  timestamp: string;

  direction:
    | "LONG"
    | "SHORT"
    | "WAIT";

  summary?:
    | string
    | null;

  confidence?:
    | number
    | null;

  confidence_level?:
    | string
    | null;

  quality?:
    | string
    | null;

  status:
    | string
    | null;

  lifecycle_phase?:
    | LifecyclePhase
    | null;

  entry_price?:
    | number
    | string
    | null;

  stop_loss_price?:
    | number
    | string
    | null;

  take_profit_price?:
    | number
    | string
    | null;

  entry_triggered_at?:
    | string
    | null;

  tp1_hit_at?:
    | string
    | null;

  tp2_hit_at?:
    | string
    | null;

  stop_hit_at?:
    | string
    | null;

  expired_at?:
    | string
    | null;

  last_price?:
    | number
    | string
    | null;

  result?:
    | string
    | null;

  realized_r_multiple?:
    | number
    | string
    | null;

  closed_at?:
    | string
    | null;
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

type SignalFilter =
  | "ALL"
  | "ACTIVE"
  | "WINS"
  | "LOSSES"
  | "EXPIRED"
  | "INVALIDATED";

const FILTERS: SignalFilter[] = [
  "ALL",
  "ACTIVE",
  "WINS",
  "LOSSES",
  "EXPIRED",
  "INVALIDATED",
];

const emptyPerformance: Performance = {
  totalTrades: 0,
  wins: 0,
  losses: 0,
  breakevens: 0,
  winRate: 0,
  totalR: 0,
  averageR: 0,
};

function numberValue(
  value:
    | number
    | string
    | null
    | undefined
) {
  const parsed =
    Number(value);

  return Number.isFinite(
    parsed
  )
    ? parsed
    : null;
}

function formatPrice(
  value:
    | number
    | string
    | null
    | undefined
) {
  const parsed =
    numberValue(value);

  if (parsed === null) {
    return "—";
  }

  if (parsed >= 1000) {
    return parsed.toLocaleString(
      "en-US",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    );
  }

  if (parsed >= 1) {
    return parsed.toLocaleString(
      "en-US",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      }
    );
  }

  return parsed.toLocaleString(
    "en-US",
    {
      minimumFractionDigits: 4,
      maximumFractionDigits: 6,
    }
  );
}

function formatR(
  value:
    | number
    | string
    | null
    | undefined
) {
  const parsed =
    numberValue(value);

  if (parsed === null) {
    return "—";
  }

  return `${
    parsed >= 0
      ? "+"
      : ""
  }${parsed.toFixed(2)}R`;
}

function formatDate(
  value?:
    | string
    | null
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return date.toLocaleString(
    undefined,
    {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function lifecycleLabel(
  phase?:
    | LifecyclePhase
    | null
) {
  switch (phase) {
    case "WAITING_ENTRY":
      return "Waiting Entry";

    case "ENTRY_TRIGGERED":
      return "Position Active";

    case "TP1_HIT":
      return "TP1 Hit";

    case "TP2_HIT":
      return "TP2 Hit";

    case "STOPPED":
      return "Stopped";

    case "INVALIDATED":
      return "Invalidated";

    case "EXPIRED":
      return "Expired";

    default:
      return "Unknown";
  }
}

function getTp1(
  signal: HistorySignal
) {
  const entry =
    numberValue(
      signal.entry_price
    );

  const stop =
    numberValue(
      signal.stop_loss_price
    );

  if (
    entry === null ||
    stop === null
  ) {
    return null;
  }

  const risk =
    Math.abs(
      entry - stop
    );

  if (
    signal.direction ===
    "LONG"
  ) {
    return entry + risk;
  }

  if (
    signal.direction ===
    "SHORT"
  ) {
    return entry - risk;
  }

  return null;
}

export default function SignalsPage() {
  const router =
    useRouter();

  const [
    activeSignal,
    setActiveSignal,
  ] =
    useState<ActiveSignal | null>(
      null
    );

  const [
    history,
    setHistory,
  ] =
    useState<HistorySignal[]>(
      []
    );

  const [
    performance,
    setPerformance,
  ] =
    useState<Performance>(
      emptyPerformance
    );

  const [
    filter,
    setFilter,
  ] =
    useState<SignalFilter>(
      "ALL"
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

  const [
    lastUpdated,
    setLastUpdated,
  ] =
    useState<Date | null>(
      null
    );

  function openSignal(
    signalId: string
  ) {
    router.push(
      `/signals/${signalId}`
    );
  }

  const loadDesk =
    useCallback(
      async (
        manual = false
      ) => {
        if (manual) {
          setRefreshing(true);
        }

        try {
          const [
            activeResponse,
            historyResponse,
            performanceResponse,
          ] =
            await Promise.all([
              fetch(
                "/api/trading/signals/active",
                {
                  cache:
                    "no-store",
                }
              ),

              fetch(
                "/api/trading/signals/history?limit=100",
                {
                  cache:
                    "no-store",
                }
              ),

              fetch(
                "/api/trading/performance",
                {
                  cache:
                    "no-store",
                }
              ),
            ]);

          const [
            activeData,
            historyData,
            performanceData,
          ] =
            await Promise.all([
              activeResponse.json(),
              historyResponse.json(),
              performanceResponse.json(),
            ]);

          if (
            !activeResponse.ok ||
            !activeData.success
          ) {
            throw new Error(
              activeData.error ??
                "Failed to load active signal"
            );
          }

          setActiveSignal(
            activeData.activeSignal ??
              null
          );

          if (
            historyResponse.ok &&
            historyData.success &&
            Array.isArray(
              historyData.signals
            )
          ) {
            setHistory(
              historyData.signals
            );
          }

          if (
            performanceResponse.ok &&
            performanceData.success &&
            performanceData.summary
          ) {
            setPerformance({
              totalTrades:
                performanceData
                  .summary
                  .totalTrades ??
                0,

              wins:
                performanceData
                  .summary
                  .wins ?? 0,

              losses:
                performanceData
                  .summary
                  .losses ?? 0,

              breakevens:
                performanceData
                  .summary
                  .breakevens ??
                0,

              winRate:
                performanceData
                  .summary
                  .winRate ?? 0,

              totalR:
                performanceData
                  .summary
                  .totalR ?? 0,

              averageR:
                performanceData
                  .summary
                  .averageR ?? 0,
            });
          }

          setLastUpdated(
            new Date()
          );

          setError("");
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load Signals Command Center"
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      []
    );

  useEffect(() => {
    loadDesk();

    const interval =
      window.setInterval(
        () => {
          loadDesk();
        },
        15_000
      );

    function handlePipelineComplete() {
      loadDesk();
    }

    window.addEventListener(
      "hiddenalpha:signal-pipeline-complete",
      handlePipelineComplete
    );

    return () => {
      window.clearInterval(
        interval
      );

      window.removeEventListener(
        "hiddenalpha:signal-pipeline-complete",
        handlePipelineComplete
      );
    };
  }, [
    loadDesk,
  ]);

  const filteredHistory =
    useMemo(() => {
      return history.filter(
        (signal) => {
          const result =
            signal.result?.toUpperCase();

          const phase =
            signal.lifecycle_phase;

          switch (filter) {
            case "ACTIVE":
              return (
                signal.status ===
                "ACTIVE"
              );

            case "WINS":
              return (
                result === "WIN"
              );

            case "LOSSES":
              return (
                result === "LOSS"
              );

            case "EXPIRED":
              return (
                signal.status ===
                  "EXPIRED" ||
                phase ===
                  "EXPIRED"
              );

            case "INVALIDATED":
              return (
                phase ===
                  "INVALIDATED" ||
                (
                  signal.status ===
                    "INVALIDATED" &&
                  !signal.result
                )
              );

            default:
              return true;
          }
        }
      );
    }, [
      history,
      filter,
    ]);

  return (
    <HiddenAlphaShell>

      <div className="mx-auto max-w-[1700px] px-4 py-5 lg:px-5">

        {/* HEADER */}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

          <div>

            <div className="flex items-center gap-2">

              <h1 className="text-[20px] font-semibold tracking-[-0.03em] text-zinc-100">
                Signals
              </h1>

              <span className="rounded-md border border-violet-500/10 bg-violet-500/[0.08] px-2 py-1 text-[7px] font-semibold uppercase tracking-[0.12em] text-violet-400">
                Command Center
              </span>

            </div>

            <p className="mt-1 text-[9px] text-zinc-600">
              Published signals, lifecycle tracking and realized outcomes.
            </p>

          </div>

          <div className="flex items-center gap-3">

            {lastUpdated && (
              <span className="hidden text-[8px] text-zinc-700 sm:block">
                Updated{" "}
                {lastUpdated.toLocaleTimeString()}
              </span>
            )}

            <button
              onClick={() =>
                loadDesk(true)
              }
              disabled={
                refreshing
              }
              className="flex h-9 items-center gap-2 rounded-lg border border-white/[0.055] bg-[#0a0d13] px-3 text-[8px] text-zinc-500 transition hover:text-zinc-300"
            >

              <RefreshCw
                size={11}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />

              Refresh

            </button>

          </div>

        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/10 bg-red-500/[0.04] px-4 py-3 text-[9px] text-red-400">
            {error}
          </div>
        )}

        {/* SUMMARY */}

        <div className="mt-5 grid grid-cols-2 gap-2 xl:grid-cols-4">

          <SummaryCard
            icon={Radio}
            label="Active Signal"
            value={
              loading
                ? "Loading"
                : activeSignal
                ? `${activeSignal.symbol.replace(
                    "USDT",
                    ""
                  )} ${activeSignal.direction}`
                : "None"
            }
            tone={
              activeSignal
                ? "purple"
                : "neutral"
            }
          />

          <SummaryCard
            icon={
              CheckCircle2
            }
            label="Closed Trades"
            value={`${performance.totalTrades}`}
          />

          <SummaryCard
            icon={
              TrendingUp
            }
            label="Win Rate"
            value={`${performance.winRate.toFixed(
              1
            )}%`}
            tone={
              performance.winRate >
              50
                ? "green"
                : "neutral"
            }
          />

          <SummaryCard
            icon={Activity}
            label="Total R"
            value={formatR(
              performance.totalR
            )}
            tone={
              performance.totalR >
              0
                ? "green"
                : performance.totalR <
                  0
                ? "red"
                : "neutral"
            }
          />

        </div>

        {/* ACTIVE SIGNAL */}

        <section className="ha-panel ha-purple-glow mt-3 overflow-hidden">

          <div className="flex items-center justify-between border-b border-white/[0.05] px-5 py-4">

            <div className="flex items-center gap-3">

              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet-500/10 bg-violet-500/[0.08]">

                <Zap
                  size={14}
                  className="text-violet-400"
                />

              </div>

              <div>

                <h2 className="text-[12px] font-medium text-zinc-100">
                  Active Published Signal
                </h2>

                <p className="mt-0.5 text-[8px] text-zinc-700">
                  Frozen trade plan tracked by lifecycle engine
                </p>

              </div>

            </div>

            {activeSignal && (
              <span className="flex items-center gap-2 text-[7px] font-medium text-emerald-400">

                <span className="ha-live-dot" />

                TRACKING

              </span>
            )}

          </div>

          {!activeSignal ? (

            <div className="flex min-h-[260px] items-center justify-center p-5">

              <div className="max-w-[420px] text-center">

                <Radio
                  size={22}
                  className="mx-auto text-zinc-700"
                />

                <h3 className="mt-3 text-[12px] font-medium text-zinc-400">
                  No signal is currently active
                </h3>

                <p className="mt-2 text-[8px] leading-5 text-zinc-700">
                  HiddenAlpha continues scanning the market.
                  Only qualified opportunities are published here.
                </p>

              </div>

            </div>

          ) : (

            <div className="grid gap-5 p-5 xl:grid-cols-[0.9fr_1.1fr]">

              <div>

                <div className="flex items-start justify-between gap-4">

                  <div>

                    <p className="text-[7px] uppercase tracking-[0.14em] text-zinc-700">
                      Published Signal
                    </p>

                    <h3 className="ha-number mt-1 text-[28px] font-semibold tracking-[-0.04em] text-zinc-100">

                      {activeSignal.symbol.replace(
                        "USDT",
                        ""
                      )}

                      <span className="ml-1 text-[12px] font-medium text-zinc-600">
                        / USDT
                      </span>

                    </h3>

                    <div className="mt-2 flex items-center gap-2">

                      <DirectionBadge
                        direction={
                          activeSignal.direction
                        }
                      />

                      <span className="text-[8px] text-zinc-600">
                        {activeSignal.timeframe}
                      </span>

                      <LifecycleBadge
                        phase={
                          activeSignal.lifecyclePhase
                        }
                      />

                    </div>

                  </div>

                  <div className="text-right">

                    <p className="text-[7px] uppercase tracking-[0.1em] text-zinc-700">
                      Live Price
                    </p>

                    <p className="ha-number mt-1 text-[18px] font-semibold text-zinc-100">
                      {formatPrice(
                        activeSignal.currentPrice
                      )}
                    </p>

                  </div>

                </div>

                <div className="mt-5 grid grid-cols-3 gap-2">

                  <Metric
                    label="Confidence"
                    value={`${activeSignal.confidence}%`}
                  />

                  <Metric
                    label="Quality"
                    value={
                      activeSignal.quality
                    }
                    tone="purple"
                  />

                  <Metric
                    label="Progress"
                    value={`${activeSignal.progressR >=
                    0
                      ? "+"
                      : ""}${activeSignal.progressR.toFixed(
                      2
                    )}R`}
                    tone={
                      activeSignal.progressR >
                      0
                        ? "green"
                        : activeSignal.progressR <
                          0
                        ? "red"
                        : "neutral"
                    }
                  />

                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">

                  <PriceCard
                    icon={
                      Crosshair
                    }
                    label="Entry"
                    value={formatPrice(
                      activeSignal.entryPrice
                    )}
                  />

                  <PriceCard
                    icon={
                      ShieldCheck
                    }
                    label="Stop Loss"
                    value={formatPrice(
                      activeSignal.stopLossPrice
                    )}
                    tone="red"
                  />

                  <PriceCard
                    icon={Target}
                    label="TP1"
                    value={formatPrice(
                      activeSignal.takeProfit1Price
                    )}
                    tone="green"
                  />

                  <PriceCard
                    icon={Target}
                    label="TP2"
                    value={formatPrice(
                      activeSignal.takeProfit2Price
                    )}
                    tone="cyan"
                  />

                </div>

                <div className="mt-3 rounded-xl border border-white/[0.05] bg-white/[0.012] p-3">

                  <p className="text-[7px] uppercase tracking-[0.1em] text-zinc-700">
                    Signal Thesis
                  </p>

                  <p className="mt-2 text-[9px] leading-5 text-zinc-500">
                    {activeSignal.summary}
                  </p>

                </div>

              </div>

              <SetupCandleChart
                symbol={
                  activeSignal.symbol
                }
                signalTimeframe={
                  activeSignal.timeframe
                }
                direction={
                  activeSignal.direction
                }
                livePrice={
                  activeSignal.currentPrice
                }
                entryPrice={
                  activeSignal.entryPrice
                }
                stopLossPrice={
                  activeSignal.stopLossPrice
                }
                takeProfit1Price={
                  activeSignal.takeProfit1Price
                }
                takeProfit2Price={
                  activeSignal.takeProfit2Price
                }
              />

            </div>
          )}

        </section>

        {/* LIFECYCLE */}

        {activeSignal && (
          <section className="ha-panel mt-3 p-5">

            <div className="flex items-center gap-2">

              <Activity
                size={13}
                className="text-violet-400"
              />

              <div>

                <h2 className="text-[11px] font-medium text-zinc-200">
                  Signal Lifecycle
                </h2>

                <p className="mt-0.5 text-[7px] text-zinc-700">
                  Persistent progression of the published setup
                </p>

              </div>

            </div>

            <div className="mt-5 grid gap-2 md:grid-cols-4">

              <LifecycleStep
                label="Published"
                time={
                  activeSignal.publishedAt
                }
                complete
              />

              <LifecycleStep
                label="Entry Triggered"
                time={
                  activeSignal.entryTriggeredAt
                }
                complete={
                  Boolean(
                    activeSignal.entryTriggeredAt
                  )
                }
              />

              <LifecycleStep
                label="TP1"
                time={
                  activeSignal.tp1HitAt
                }
                complete={
                  Boolean(
                    activeSignal.tp1HitAt
                  )
                }
              />

              <LifecycleStep
                label="TP2"
                time={
                  activeSignal.tp2HitAt
                }
                complete={
                  Boolean(
                    activeSignal.tp2HitAt
                  )
                }
              />

            </div>

            {activeSignal.stopHitAt && (
              <div className="mt-3 rounded-xl border border-red-500/10 bg-red-500/[0.04] px-3 py-2 text-[8px] text-red-400">
                Stop level reached{" "}
                {formatDate(
                  activeSignal.stopHitAt
                )}
              </div>
            )}

          </section>
        )}

        {/* CURRENT MARKET VS PUBLISHED SIGNAL */}

        {activeSignal && (
          <div className="mt-3">

            <SignalMarketComparison
              symbol={
                activeSignal.symbol
              }
              timeframe={
                activeSignal.timeframe
              }
              publishedDirection={
                activeSignal.direction
              }
            />

          </div>
        )}

        {/* PERFORMANCE */}

        <div className="mt-3 grid gap-3 md:grid-cols-4">

          <PerformanceCard
            label="Wins"
            value={`${performance.wins}`}
            tone="green"
          />

          <PerformanceCard
            label="Losses"
            value={`${performance.losses}`}
            tone="red"
          />

          <PerformanceCard
            label="Average R"
            value={formatR(
              performance.averageR
            )}
          />

          <PerformanceCard
            label="Total R"
            value={formatR(
              performance.totalR
            )}
            tone={
              performance.totalR >
              0
                ? "green"
                : performance.totalR <
                  0
                ? "red"
                : "neutral"
            }
          />

        </div>

        {/* HISTORY */}

        <section className="ha-panel mt-3 overflow-hidden">

          <div className="flex flex-col gap-4 border-b border-white/[0.05] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">

            <div className="flex items-center gap-3">

              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.025]">

                <History
                  size={13}
                  className="text-zinc-500"
                />

              </div>

              <div>

                <h2 className="text-[11px] font-medium text-zinc-200">
                  Signal History
                </h2>

                <p className="mt-0.5 text-[7px] text-zinc-700">
                  Click any published signal to open its audit record
                </p>

              </div>

            </div>

            <div className="flex flex-wrap gap-1">

              {FILTERS.map(
                (item) => (
                  <button
                    key={item}
                    onClick={() =>
                      setFilter(
                        item
                      )
                    }
                    className={`rounded-lg px-3 py-2 text-[7px] font-medium transition ${
                      filter === item
                        ? "bg-violet-600 text-white"
                        : "border border-white/[0.05] bg-white/[0.015] text-zinc-600 hover:text-zinc-300"
                    }`}
                  >
                    {item}
                  </button>
                )
              )}

            </div>

          </div>

          {/* DESKTOP */}

          <div className="hidden overflow-x-auto md:block">

            <table className="w-full border-collapse">

              <thead>

                <tr className="border-b border-white/[0.04] text-left">

                  {[
                    "Signal",
                    "Direction",
                    "Lifecycle",
                    "Entry",
                    "TP2",
                    "Result",
                    "Realized R",
                    "Published",
                  ].map(
                    (heading) => (
                      <th
                        key={
                          heading
                        }
                        className="px-5 py-3 text-[7px] font-medium uppercase tracking-[0.1em] text-zinc-700"
                      >
                        {heading}
                      </th>
                    )
                  )}

                </tr>

              </thead>

              <tbody>

                {filteredHistory.map(
                  (signal) => {

                    const phase =
                      signal.lifecycle_phase;

                    const realizedR =
                      numberValue(
                        signal.realized_r_multiple
                      );

                    return (
                      <tr
                        key={
                          signal.id
                        }
                        onClick={() =>
                          openSignal(
                            signal.id
                          )
                        }
                        className="group cursor-pointer border-b border-white/[0.035] transition last:border-0 hover:bg-violet-500/[0.025]"
                      >

                        <td className="px-5 py-4">

                          <p className="text-[10px] font-medium text-zinc-300">
                            {signal.symbol}
                          </p>

                          <p className="mt-1 text-[7px] text-zinc-700">
                            {signal.timeframe}
                          </p>

                        </td>

                        <td className="px-5 py-4">

                          {signal.direction ===
                            "LONG" ||
                          signal.direction ===
                            "SHORT" ? (

                            <DirectionBadge
                              direction={
                                signal.direction
                              }
                            />

                          ) : (

                            <span className="text-[8px] text-zinc-600">
                              WAIT
                            </span>

                          )}

                        </td>

                        <td className="px-5 py-4 text-[8px] text-zinc-500">
                          {lifecycleLabel(
                            phase
                          )}
                        </td>

                        <td className="ha-number px-5 py-4 text-[8px] text-zinc-400">
                          {formatPrice(
                            signal.entry_price
                          )}
                        </td>

                        <td className="ha-number px-5 py-4 text-[8px] text-emerald-400">
                          {formatPrice(
                            signal.take_profit_price
                          )}
                        </td>

                        <td className="px-5 py-4">

                          <ResultBadge
                            result={
                              signal.result
                            }
                          />

                        </td>

                        <td className="ha-number px-5 py-4 text-[8px]">

                          <span
                            className={
                              realizedR !==
                                null &&
                              realizedR > 0
                                ? "text-emerald-400"
                                : realizedR !==
                                    null &&
                                  realizedR < 0
                                ? "text-red-400"
                                : "text-zinc-500"
                            }
                          >
                            {formatR(
                              signal.realized_r_multiple
                            )}
                          </span>

                        </td>

                        <td className="px-5 py-4">

                          <div className="flex items-center justify-between gap-4">

                            <span className="text-[8px] text-zinc-700">
                              {formatDate(
                                signal.timestamp
                              )}
                            </span>

                            <span className="whitespace-nowrap text-[7px] font-medium text-violet-400 opacity-0 transition group-hover:opacity-100">
                              VIEW →
                            </span>

                          </div>

                        </td>

                      </tr>
                    );
                  }
                )}

              </tbody>

            </table>

          </div>

          {/* MOBILE */}

          <div className="space-y-2 p-4 md:hidden">

            {filteredHistory.map(
              (signal) => (
                <div
                  key={
                    signal.id
                  }
                  onClick={() =>
                    openSignal(
                      signal.id
                    )
                  }
                  className="cursor-pointer rounded-xl border border-white/[0.045] bg-white/[0.012] p-3 transition hover:border-violet-500/20 hover:bg-violet-500/[0.025]"
                >

                  <div className="flex items-center justify-between">

                    <div>

                      <p className="text-[10px] font-medium text-zinc-300">
                        {signal.symbol}
                      </p>

                      <p className="mt-1 text-[7px] text-zinc-700">
                        {signal.timeframe}
                      </p>

                    </div>

                    {signal.direction ===
                      "LONG" ||
                    signal.direction ===
                      "SHORT" ? (

                      <DirectionBadge
                        direction={
                          signal.direction
                        }
                      />

                    ) : null}

                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">

                    <SmallValue
                      label="Entry"
                      value={formatPrice(
                        signal.entry_price
                      )}
                    />

                    <SmallValue
                      label="TP1"
                      value={formatPrice(
                        getTp1(
                          signal
                        )
                      )}
                    />

                    <SmallValue
                      label="R"
                      value={formatR(
                        signal.realized_r_multiple
                      )}
                    />

                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-white/[0.04] pt-3">

                    <span className="text-[7px] text-zinc-700">
                      {lifecycleLabel(
                        signal.lifecycle_phase
                      )}
                    </span>

                    <span className="text-[7px] font-medium text-violet-400">
                      View Signal →
                    </span>

                  </div>

                </div>
              )
            )}

          </div>

          {filteredHistory.length ===
            0 && (

            <div className="flex min-h-[140px] items-center justify-center">

              <div className="text-center">

                <Database
                  size={17}
                  className="mx-auto text-zinc-700"
                />

                <p className="mt-2 text-[9px] text-zinc-600">
                  No signals match this filter.
                </p>

              </div>

            </div>
          )}

        </section>

        {/* FOOTER */}

        <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/[0.045] bg-white/[0.01] px-4 py-3">

          <ShieldCheck
            size={11}
            className="text-amber-400"
          />

          <p className="text-[7px] text-zinc-700">
            Scanner candidates are not signals. Only published setups shown in this command center are tracked as official HiddenAlpha signals.
          </p>

        </div>

      </div>

    </HiddenAlphaShell>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: typeof Activity;

  label: string;

  value: string;

  tone?:
    | "neutral"
    | "green"
    | "red"
    | "purple";
}) {
  const valueClass =
    tone === "green"
      ? "text-emerald-400"
      : tone === "red"
      ? "text-red-400"
      : tone === "purple"
      ? "text-violet-400"
      : "text-zinc-300";

  return (
    <div className="rounded-xl border border-white/[0.055] bg-[#090c12] p-3">

      <div className="flex items-center gap-2">

        <Icon
          size={11}
          className="text-zinc-700"
        />

        <span className="text-[7px] uppercase tracking-[0.1em] text-zinc-700">
          {label}
        </span>

      </div>

      <p
        className={`ha-number mt-2 text-[13px] font-semibold ${valueClass}`}
      >
        {value}
      </p>

    </div>
  );
}

function DirectionBadge({
  direction,
}: {
  direction:
    | "LONG"
    | "SHORT";
}) {
  const long =
    direction === "LONG";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[7px] font-semibold ${
        long
          ? "border-emerald-500/10 bg-emerald-500/[0.07] text-emerald-400"
          : "border-red-500/10 bg-red-500/[0.07] text-red-400"
      }`}
    >

      {long ? (
        <TrendingUp
          size={8}
        />
      ) : (
        <TrendingDown
          size={8}
        />
      )}

      {direction}

    </span>
  );
}

function LifecycleBadge({
  phase,
}: {
  phase: LifecyclePhase;
}) {
  const className =
    phase ===
      "ENTRY_TRIGGERED" ||
    phase ===
      "TP1_HIT"
      ? "border-emerald-500/10 bg-emerald-500/[0.06] text-emerald-400"
      : phase ===
        "WAITING_ENTRY"
      ? "border-violet-500/10 bg-violet-500/[0.06] text-violet-400"
      : "border-white/[0.06] bg-white/[0.02] text-zinc-500";

  return (
    <span
      className={`rounded-md border px-2 py-1 text-[7px] font-medium ${className}`}
    >
      {lifecycleLabel(
        phase
      )}
    </span>
  );
}

function Metric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;

  value: string;

  tone?:
    | "neutral"
    | "green"
    | "red"
    | "purple";
}) {
  const valueClass =
    tone === "green"
      ? "text-emerald-400"
      : tone === "red"
      ? "text-red-400"
      : tone === "purple"
      ? "text-violet-400"
      : "text-zinc-100";

  return (
    <div className="rounded-xl border border-white/[0.05] bg-white/[0.012] p-3">

      <p className="text-[7px] uppercase tracking-[0.1em] text-zinc-700">
        {label}
      </p>

      <p
        className={`ha-number mt-2 text-[14px] font-semibold ${valueClass}`}
      >
        {value}
      </p>

    </div>
  );
}

function PriceCard({
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
        className={`ha-number mt-2 text-[11px] font-medium ${valueClass}`}
      >
        {value}
      </p>

    </div>
  );
}

function LifecycleStep({
  label,
  time,
  complete,
}: {
  label: string;

  time:
    | string
    | null;

  complete: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        complete
          ? "border-emerald-500/10 bg-emerald-500/[0.035]"
          : "border-white/[0.045] bg-white/[0.01]"
      }`}
    >

      <div className="flex items-center gap-2">

        <span
          className={`h-2 w-2 rounded-full ${
            complete
              ? "bg-emerald-400 shadow-[0_0_9px_rgba(52,211,153,0.35)]"
              : "bg-zinc-700"
          }`}
        />

        <span
          className={`text-[8px] font-medium ${
            complete
              ? "text-zinc-300"
              : "text-zinc-700"
          }`}
        >
          {label}
        </span>

      </div>

      <p className="mt-2 text-[7px] text-zinc-700">
        {complete
          ? formatDate(
              time
            )
          : "Pending"}
      </p>

    </div>
  );
}

function PerformanceCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;

  value: string;

  tone?:
    | "neutral"
    | "green"
    | "red";
}) {
  const valueClass =
    tone === "green"
      ? "text-emerald-400"
      : tone === "red"
      ? "text-red-400"
      : "text-zinc-200";

  return (
    <div className="ha-panel p-4">

      <p className="text-[7px] uppercase tracking-[0.1em] text-zinc-700">
        {label}
      </p>

      <p
        className={`ha-number mt-2 text-[18px] font-semibold ${valueClass}`}
      >
        {value}
      </p>

    </div>
  );
}

function ResultBadge({
  result,
}: {
  result?:
    | string
    | null;
}) {
  if (!result) {
    return (
      <span className="text-[7px] text-zinc-700">
        —
      </span>
    );
  }

  const upper =
    result.toUpperCase();

  const className =
    upper === "WIN"
      ? "bg-emerald-500/[0.07] text-emerald-400"
      : upper === "LOSS"
      ? "bg-red-500/[0.07] text-red-400"
      : "bg-white/[0.03] text-zinc-500";

  return (
    <span
      className={`rounded-md px-2 py-1 text-[7px] font-semibold ${className}`}
    >
      {upper}
    </span>
  );
}

function SmallValue({
  label,
  value,
}: {
  label: string;

  value: string;
}) {
  return (
    <div>

      <p className="text-[6px] uppercase tracking-[0.1em] text-zinc-700">
        {label}
      </p>

      <p className="ha-number mt-1 text-[8px] text-zinc-400">
        {value}
      </p>

    </div>
  );
}
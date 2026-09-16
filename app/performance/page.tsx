"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Activity,
  BarChart3,
  CheckCircle2,
  Clock3,
  Crosshair,
  Database,
  Gauge,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  XCircle,
  Zap,
} from "lucide-react";

import HiddenAlphaShell from "@/components/hiddenalpha-shell";

type Direction =
  | "LONG"
  | "SHORT";

type SignalResult =
  | "WIN"
  | "LOSS"
  | "CANCELLED"
  | "OPEN";

type PerformanceSignal = {
  id: string;

  symbol: string;

  timeframe: string;

  direction: Direction;

  status: string;

  lifecyclePhase: string;

  result: SignalResult;

  realizedR: number | null;

  confidence: number | null;

  publishedAt: string | null;

  closedAt: string | null;
};

type AssetStat = {
  symbol: string;

  trades: number;

  wins: number;

  losses: number;

  winRate: number;

  realizedR: number;

  expectancy: number;
};

type DirectionStat = {
  direction: Direction;

  trades: number;

  wins: number;

  losses: number;

  winRate: number;

  realizedR: number;
};

type CurvePoint = {
  value: number;

  drawdown: number;
};

const ASSETS = [
  "ALL",
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
];

function numeric(
  value: unknown
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed =
    Number(value);

  return Number.isFinite(
    parsed
  )
    ? parsed
    : null;
}

function stringValue(
  value: unknown
) {
  return typeof value ===
    "string"
    ? value
    : null;
}

function normalizeDirection(
  value: unknown
): Direction {
  return value === "SHORT"
    ? "SHORT"
    : "LONG";
}

function normalizeResult(
  value: unknown,
  lifecycle: string,
  status: string
): SignalResult {
  if (
    value === "WIN" ||
    value === "LOSS" ||
    value === "CANCELLED" ||
    value === "OPEN"
  ) {
    return value;
  }

  if (
    lifecycle ===
      "TP2_HIT" ||
    status ===
      "COMPLETED"
  ) {
    return "WIN";
  }

  if (
    lifecycle ===
    "STOPPED"
  ) {
    return "LOSS";
  }

  if (
    lifecycle ===
      "EXPIRED" ||
    lifecycle ===
      "INVALIDATED" ||
    status ===
      "EXPIRED"
  ) {
    return "CANCELLED";
  }

  return "OPEN";
}

function normalizeSignal(
  raw: Record<
    string,
    unknown
  >
): PerformanceSignal {
  const status =
    stringValue(
      raw.status
    ) ?? "ACTIVE";

  const lifecyclePhase =
    stringValue(
      raw.lifecyclePhase
    ) ??
    stringValue(
      raw.lifecycle_phase
    ) ??
    "WAITING_ENTRY";

  const result =
    normalizeResult(
      raw.result,
      lifecyclePhase,
      status
    );

  return {
    id:
      stringValue(
        raw.id
      ) ??
      `${Date.now()}-${Math.random()}`,

    symbol:
      stringValue(
        raw.symbol
      ) ??
      "UNKNOWN",

    timeframe:
      stringValue(
        raw.timeframe
      ) ??
      "—",

    direction:
      normalizeDirection(
        raw.direction
      ),

    status,

    lifecyclePhase,

    result,

    realizedR:
      numeric(
        raw.realizedR
      ) ??
      numeric(
        raw.realized_r
      ),

    confidence:
      numeric(
        raw.confidence
      ),

    publishedAt:
      stringValue(
        raw.publishedAt
      ) ??
      stringValue(
        raw.timestamp
      ) ??
      stringValue(
        raw.created_at
      ),

    closedAt:
      stringValue(
        raw.closedAt
      ) ??
      stringValue(
        raw.closed_at
      ) ??
      stringValue(
        raw.tp2HitAt
      ) ??
      stringValue(
        raw.tp2_hit_at
      ) ??
      stringValue(
        raw.stopHitAt
      ) ??
      stringValue(
        raw.stop_hit_at
      ) ??
      stringValue(
        raw.expiredAt
      ) ??
      stringValue(
        raw.expired_at
      ),
  };
}

function formatPercent(
  value: number
) {
  return `${value.toFixed(
    1
  )}%`;
}

function formatR(
  value:
    | number
    | null
) {
  if (
    value === null ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  return `${
    value > 0
      ? "+"
      : ""
  }${value.toFixed(
    2
  )}R`;
}

function formatDate(
  value:
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

function resultTone(
  result: SignalResult
) {
  if (
    result === "WIN"
  ) {
    return "text-emerald-400";
  }

  if (
    result === "LOSS"
  ) {
    return "text-red-400";
  }

  if (
    result ===
    "CANCELLED"
  ) {
    return "text-amber-400";
  }

  return "text-zinc-600";
}

export default function PerformancePage() {
  const [
    signals,
    setSignals,
  ] =
    useState<
      PerformanceSignal[]
    >([]);

  const [
    selectedAsset,
    setSelectedAsset,
  ] =
    useState("ALL");

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    lastUpdated,
    setLastUpdated,
  ] =
    useState<Date | null>(
      null
    );

  const loadPerformance =
    useCallback(
      async (
        manual = false
      ) => {
        if (manual) {
          setRefreshing(
            true
          );
        }

        try {
          const response =
            await fetch(
              "/api/trading/signals/history?limit=200",
              {
                cache:
                  "no-store",
              }
            );

          const data =
            await response.json();

          if (
            !response.ok ||
            !data.success
          ) {
            throw new Error(
              data.error ??
                "Failed to load performance history"
            );
          }

          const rawSignals =
            Array.isArray(
              data.signals
            )
              ? data.signals
              : Array.isArray(
                  data.history
                )
              ? data.history
              : [];

          setSignals(
            rawSignals.map(
              (
                item: Record<
                  string,
                  unknown
                >
              ) =>
                normalizeSignal(
                  item
                )
            )
          );

          setLastUpdated(
            new Date()
          );

          setError("");
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load performance"
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      []
    );

  useEffect(() => {
    loadPerformance();

    const interval =
      window.setInterval(
        () => {
          loadPerformance();
        },
        30_000
      );

    function handlePipelineComplete() {
      loadPerformance();
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
    loadPerformance,
  ]);

  const filteredSignals =
    useMemo(
      () =>
        selectedAsset ===
        "ALL"
          ? signals
          : signals.filter(
              (
                signal
              ) =>
                signal.symbol ===
                selectedAsset
            ),
      [
        signals,
        selectedAsset,
      ]
    );

  const closedTrades =
    useMemo(
      () =>
        filteredSignals.filter(
          (
            signal
          ) =>
            (
              signal.result ===
                "WIN" ||
              signal.result ===
                "LOSS"
            ) &&
            signal.realizedR !==
              null
        ),
      [
        filteredSignals,
      ]
    );

  const chronologicalTrades =
    useMemo(
      () =>
        [
          ...closedTrades,
        ].sort(
          (
            a,
            b
          ) =>
            new Date(
              a.closedAt ??
                a.publishedAt ??
                0
            ).getTime() -
            new Date(
              b.closedAt ??
                b.publishedAt ??
                0
            ).getTime()
        ),
      [
        closedTrades,
      ]
    );

  const wins =
    closedTrades.filter(
      (
        signal
      ) =>
        signal.result ===
        "WIN"
    );

  const losses =
    closedTrades.filter(
      (
        signal
      ) =>
        signal.result ===
        "LOSS"
    );

  const cancelled =
    filteredSignals.filter(
      (
        signal
      ) =>
        signal.result ===
        "CANCELLED"
    );

  const open =
    filteredSignals.filter(
      (
        signal
      ) =>
        signal.result ===
        "OPEN"
    );

  const totalR =
    closedTrades.reduce(
      (
        total,
        signal
      ) =>
        total +
        (
          signal.realizedR ??
          0
        ),
      0
    );

  const winRate =
    closedTrades.length >
    0
      ? (
          wins.length /
          closedTrades.length
        ) *
        100
      : 0;

  const averageWin =
    wins.length >
    0
      ? wins.reduce(
          (
            total,
            signal
          ) =>
            total +
            (
              signal.realizedR ??
              0
            ),
          0
        ) /
        wins.length
      : 0;

  const averageLoss =
    losses.length >
    0
      ? losses.reduce(
          (
            total,
            signal
          ) =>
            total +
            (
              signal.realizedR ??
              0
            ),
          0
        ) /
        losses.length
      : 0;

  const expectancy =
    closedTrades.length >
    0
      ? totalR /
        closedTrades.length
      : 0;

  const grossWinR =
    wins.reduce(
      (
        total,
        signal
      ) =>
        total +
        Math.max(
          signal.realizedR ??
            0,
          0
        ),
      0
    );

  const grossLossR =
    Math.abs(
      losses.reduce(
        (
          total,
          signal
        ) =>
          total +
          Math.min(
            signal.realizedR ??
              0,
            0
          ),
        0
      )
    );

  const profitFactor =
    grossLossR >
    0
      ? grossWinR /
        grossLossR
      : grossWinR >
        0
      ? Infinity
      : 0;

  const payoffRatio =
    averageLoss !==
      0
      ? averageWin /
        Math.abs(
          averageLoss
        )
      : averageWin >
        0
      ? Infinity
      : 0;

  /*
   * ========================================
   * EQUITY / DRAWDOWN CURVE
   * ========================================
   */

  const curveData =
    useMemo(() => {
      let running =
        0;

      let peak =
        0;

      let maxDrawdown =
        0;

      const points: CurvePoint[] =
        chronologicalTrades.map(
          (
            signal
          ) => {
            running +=
              signal.realizedR ??
              0;

            if (
              running >
              peak
            ) {
              peak =
                running;
            }

            const drawdown =
              peak -
              running;

            if (
              drawdown >
              maxDrawdown
            ) {
              maxDrawdown =
                drawdown;
            }

            return {
              value:
                running,

              drawdown,
            };
          }
        );

      return {
        points,
        maxDrawdown,
        peak,
      };
    }, [
      chronologicalTrades,
    ]);

  const recoveryFactor =
    curveData.maxDrawdown >
    0
      ? totalR /
        curveData.maxDrawdown
      : totalR > 0
      ? Infinity
      : 0;

  /*
   * ========================================
   * STREAKS
   * ========================================
   */

  const streaks =
    useMemo(() => {
      let longestWin =
        0;

      let longestLoss =
        0;

      let currentType:
        | SignalResult
        | null =
          null;

      let currentCount =
        0;

      chronologicalTrades.forEach(
        (
          signal
        ) => {
          if (
            signal.result ===
            currentType
          ) {
            currentCount +=
              1;
          } else {
            currentType =
              signal.result;

            currentCount =
              1;
          }

          if (
            signal.result ===
            "WIN"
          ) {
            longestWin =
              Math.max(
                longestWin,
                currentCount
              );
          }

          if (
            signal.result ===
            "LOSS"
          ) {
            longestLoss =
              Math.max(
                longestLoss,
                currentCount
              );
          }
        }
      );

      return {
        longestWin,
        longestLoss,

        currentType:
          chronologicalTrades.length >
          0
            ? currentType
            : null,

        currentCount:
          chronologicalTrades.length >
          0
            ? currentCount
            : 0,
      };
    }, [
      chronologicalTrades,
    ]);

  /*
   * ========================================
   * ASSET STATS
   * ========================================
   */

  const assetStats =
    useMemo(() => {
      return [
        "BTCUSDT",
        "ETHUSDT",
        "SOLUSDT",
      ].map(
        (
          symbol
        ): AssetStat => {
          const trades =
            signals.filter(
              (
                signal
              ) =>
                signal.symbol ===
                  symbol &&
                (
                  signal.result ===
                    "WIN" ||
                  signal.result ===
                    "LOSS"
                ) &&
                signal.realizedR !==
                  null
            );

          const assetWins =
            trades.filter(
              (
                signal
              ) =>
                signal.result ===
                "WIN"
            );

          const assetLosses =
            trades.filter(
              (
                signal
              ) =>
                signal.result ===
                "LOSS"
            );

          const realizedR =
            trades.reduce(
              (
                total,
                signal
              ) =>
                total +
                (
                  signal.realizedR ??
                    0
                ),
              0
            );

          return {
            symbol,

            trades:
              trades.length,

            wins:
              assetWins.length,

            losses:
              assetLosses.length,

            winRate:
              trades.length >
              0
                ? (
                    assetWins.length /
                    trades.length
                  ) *
                  100
                : 0,

            realizedR,

            expectancy:
              trades.length >
              0
                ? realizedR /
                  trades.length
                : 0,
          };
        }
      );
    }, [
      signals,
    ]);

  const directionStats =
    useMemo(() => {
      return (
        [
          "LONG",
          "SHORT",
        ] as Direction[]
      ).map(
        (
          direction
        ): DirectionStat => {
          const trades =
            filteredSignals.filter(
              (
                signal
              ) =>
                signal.direction ===
                  direction &&
                (
                  signal.result ===
                    "WIN" ||
                  signal.result ===
                    "LOSS"
                ) &&
                signal.realizedR !==
                  null
            );

          const directionWins =
            trades.filter(
              (
                signal
              ) =>
                signal.result ===
                "WIN"
            );

          return {
            direction,

            trades:
              trades.length,

            wins:
              directionWins.length,

            losses:
              trades.length -
              directionWins.length,

            winRate:
              trades.length >
              0
                ? (
                    directionWins.length /
                    trades.length
                  ) *
                  100
                : 0,

            realizedR:
              trades.reduce(
                (
                  total,
                  signal
                ) =>
                  total +
                  (
                    signal.realizedR ??
                      0
                  ),
                0
              ),
          };
        }
      );
    }, [
      filteredSignals,
    ]);

  const strongestAsset =
    [
      ...assetStats,
    ].sort(
      (
        a,
        b
      ) =>
        b.realizedR -
        a.realizedR
    )[0];

  const weakestAsset =
    [
      ...assetStats,
    ].sort(
      (
        a,
        b
      ) =>
        a.realizedR -
        b.realizedR
    )[0];

  const recentSignals =
    [
      ...filteredSignals,
    ]
      .sort(
        (
          a,
          b
        ) =>
          new Date(
            b.closedAt ??
              b.publishedAt ??
              0
          ).getTime() -
          new Date(
            a.closedAt ??
              a.publishedAt ??
              0
          ).getTime()
      )
      .slice(
        0,
        12
      );

  const sampleSizeState =
    closedTrades.length >=
    30
      ? "MEANINGFUL"
      : closedTrades.length >=
        10
      ? "EARLY"
      : "INSUFFICIENT";

  /*
   * Observational diagnostic only.
   * This does not claim future edge.
   */

  const observedEdge =
    closedTrades.length <
    10
      ? "INSUFFICIENT DATA"
      : expectancy >
          0 &&
        profitFactor >
          1
      ? "POSITIVE OBSERVED"
      : expectancy <
        0
      ? "NEGATIVE OBSERVED"
      : "MIXED";

  const edgeTone =
    observedEdge ===
    "POSITIVE OBSERVED"
      ? "green"
      : observedEdge ===
        "NEGATIVE OBSERVED"
      ? "red"
      : observedEdge ===
        "MIXED"
      ? "amber"
      : "neutral";

  return (
    <HiddenAlphaShell>

      <div className="mx-auto max-w-[1700px] px-4 py-5 lg:px-5">

        {/* HEADER */}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

          <div>

            <div className="flex items-center gap-2">

              <h1 className="text-[20px] font-semibold tracking-[-0.03em] text-zinc-100">
                Performance
              </h1>

              <span className="rounded-md border border-emerald-500/10 bg-emerald-500/[0.06] px-2 py-1 text-[7px] font-semibold uppercase tracking-[0.12em] text-emerald-400">
                Edge Diagnostics
              </span>

            </div>

            <p className="mt-1 text-[9px] text-zinc-600">
              Realized outcomes, drawdown and system-quality diagnostics.
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
                loadPerformance(
                  true
                )
              }
              disabled={
                refreshing
              }
              className="flex h-9 items-center gap-2 rounded-lg border border-white/[0.055] bg-[#090c12] px-3 text-[8px] text-zinc-500 transition hover:text-zinc-300"
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
          <div className="mt-4 rounded-xl border border-red-500/10 bg-red-500/[0.04] px-4 py-3 text-[8px] text-red-400">
            {error}
          </div>
        )}

        {/* FILTER */}

        <div className="mt-5 flex flex-wrap gap-1">

          {ASSETS.map(
            (
              asset
            ) => (
              <button
                key={
                  asset
                }
                onClick={() =>
                  setSelectedAsset(
                    asset
                  )
                }
                className={`rounded-lg border px-3 py-2 text-[7px] font-medium transition ${
                  selectedAsset ===
                  asset
                    ? "border-violet-500/15 bg-violet-500/[0.07] text-violet-400"
                    : "border-white/[0.05] bg-white/[0.01] text-zinc-600 hover:text-zinc-300"
                }`}
              >
                {asset ===
                "ALL"
                  ? "ALL MARKETS"
                  : asset}
              </button>
            )
          )}

        </div>

        {/* KPI */}

        <div className="mt-3 grid grid-cols-2 gap-2 xl:grid-cols-5">

          <MetricCard
            icon={Trophy}
            label="Win Rate"
            value={
              closedTrades.length >
              0
                ? formatPercent(
                    winRate
                  )
                : "—"
            }
            detail={`${wins.length}W / ${losses.length}L`}
            tone={
              winRate >=
              50
                ? "green"
                : closedTrades.length >
                  0
                ? "red"
                : "neutral"
            }
          />

          <MetricCard
            icon={TrendingUp}
            label="Realized R"
            value={
              closedTrades.length >
              0
                ? formatR(
                    totalR
                  )
                : "—"
            }
            detail={`${closedTrades.length} closed trades`}
            tone={
              totalR > 0
                ? "green"
                : totalR < 0
                ? "red"
                : "neutral"
            }
          />

          <MetricCard
            icon={Activity}
            label="Expectancy"
            value={
              closedTrades.length >
              0
                ? formatR(
                    expectancy
                  )
                : "—"
            }
            detail="Average R / trade"
            tone={
              expectancy > 0
                ? "green"
                : expectancy < 0
                ? "red"
                : "neutral"
            }
          />

          <MetricCard
            icon={BarChart3}
            label="Profit Factor"
            value={
              closedTrades.length ===
              0
                ? "—"
                : profitFactor ===
                  Infinity
                ? "∞"
                : profitFactor.toFixed(
                    2
                  )
            }
            detail="Gross win R / loss R"
            tone={
              profitFactor >=
              1.5
                ? "green"
                : profitFactor >
                  0
                ? "amber"
                : "neutral"
            }
          />

          <MetricCard
            icon={Database}
            label="Sample Size"
            value={`${closedTrades.length}`}
            detail={
              sampleSizeState
            }
            tone={
              sampleSizeState ===
              "MEANINGFUL"
                ? "green"
                : sampleSizeState ===
                  "EARLY"
                ? "amber"
                : "neutral"
            }
          />

        </div>

        {/* EDGE DIAGNOSTIC HERO */}

        <section className="ha-panel ha-purple-glow mt-3 overflow-hidden">

          <div className="flex flex-col gap-4 border-b border-white/[0.05] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">

            <div className="flex items-center gap-3">

              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet-500/10 bg-violet-500/[0.07]">

                <Gauge
                  size={13}
                  className="text-violet-400"
                />

              </div>

              <div>

                <h2 className="text-[11px] font-medium text-zinc-200">
                  Edge Diagnostic
                </h2>

                <p className="mt-0.5 text-[7px] text-zinc-700">
                  Observed performance — not a forward guarantee
                </p>

              </div>

            </div>

            <DiagnosticBadge
              value={
                observedEdge
              }
              tone={
                edgeTone
              }
            />

          </div>

          <div className="grid grid-cols-2 gap-2 p-5 lg:grid-cols-4">

            <DiagnosticMetric
              label="Max Drawdown"
              value={
                closedTrades.length >
                0
                  ? `-${curveData.maxDrawdown.toFixed(
                      2
                    )}R`
                  : "—"
              }
              tone="red"
            />

            <DiagnosticMetric
              label="Payoff Ratio"
              value={
                closedTrades.length >
                0
                  ? payoffRatio ===
                    Infinity
                    ? "∞"
                    : payoffRatio.toFixed(
                        2
                      )
                  : "—"
              }
              detail="Avg win / avg loss"
            />

            <DiagnosticMetric
              label="Recovery Factor"
              value={
                closedTrades.length >
                0
                  ? recoveryFactor ===
                    Infinity
                    ? "∞"
                    : recoveryFactor.toFixed(
                        2
                      )
                  : "—"
              }
              detail="Net R / max drawdown"
              tone={
                recoveryFactor >
                1
                  ? "green"
                  : "neutral"
              }
            />

            <DiagnosticMetric
              label="Current Streak"
              value={
                streaks.currentCount >
                0
                  ? `${streaks.currentCount} ${
                      streaks.currentType ===
                      "WIN"
                        ? "WIN"
                        : "LOSS"
                    }`
                  : "—"
              }
              tone={
                streaks.currentType ===
                "WIN"
                  ? "green"
                  : streaks.currentType ===
                    "LOSS"
                  ? "red"
                  : "neutral"
              }
            />

          </div>

        </section>

        {/* CURVE */}

        <div className="mt-3 grid gap-3 xl:grid-cols-[1.35fr_0.65fr]">

          <section className="ha-panel overflow-hidden">

            <div className="flex items-center justify-between border-b border-white/[0.05] px-5 py-4">

              <div>

                <h2 className="text-[11px] font-medium text-zinc-200">
                  Cumulative R Curve
                </h2>

                <p className="mt-0.5 text-[7px] text-zinc-700">
                  Realized outcomes only
                </p>

              </div>

              <span
                className={`ha-number text-[11px] font-semibold ${
                  totalR >
                  0
                    ? "text-emerald-400"
                    : totalR <
                      0
                    ? "text-red-400"
                    : "text-zinc-600"
                }`}
              >
                {closedTrades.length >
                0
                  ? formatR(
                      totalR
                    )
                  : "NO DATA"}
              </span>

            </div>

            <div className="p-5">

              <PerformanceCurve
                values={curveData.points.map(
                  (
                    point
                  ) =>
                    point.value
                )}
              />

            </div>

          </section>

          <section className="ha-panel p-5">

            <div className="flex items-center gap-2">

              <ShieldAlert
                size={12}
                className="text-amber-400"
              />

              <h2 className="text-[10px] font-medium text-zinc-300">
                Risk Diagnostics
              </h2>

            </div>

            <div className="mt-4 space-y-2">

              <BreakdownRow
                label="Max Drawdown"
                value={
                  closedTrades.length >
                  0
                    ? `-${curveData.maxDrawdown.toFixed(
                        2
                      )}R`
                    : "—"
                }
                tone="red"
              />

              <BreakdownRow
                label="Longest Win Streak"
                value={`${streaks.longestWin}`}
                tone="green"
              />

              <BreakdownRow
                label="Longest Loss Streak"
                value={`${streaks.longestLoss}`}
                tone="red"
              />

              <BreakdownRow
                label="Average Win"
                value={
                  wins.length >
                  0
                    ? formatR(
                        averageWin
                      )
                    : "—"
                }
                tone="green"
              />

              <BreakdownRow
                label="Average Loss"
                value={
                  losses.length >
                  0
                    ? formatR(
                        averageLoss
                      )
                    : "—"
                }
                tone="red"
              />

              <BreakdownRow
                label="Cancelled"
                value={`${cancelled.length}`}
                tone="amber"
              />

              <BreakdownRow
                label="Open"
                value={`${open.length}`}
                tone="purple"
              />

            </div>

          </section>

        </div>

        {/* ASSET EDGE */}

        <section className="ha-panel mt-3 p-5">

          <div className="flex items-center justify-between">

            <div className="flex items-center gap-2">

              <BarChart3
                size={12}
                className="text-cyan-400"
              />

              <div>

                <h2 className="text-[10px] font-medium text-zinc-300">
                  Edge by Asset
                </h2>

                <p className="mt-0.5 text-[7px] text-zinc-700">
                  Find where HiddenAlpha is actually performing
                </p>

              </div>

            </div>

            <div className="hidden gap-4 text-right sm:flex">

              <div>

                <p className="text-[6px] uppercase tracking-[0.08em] text-zinc-800">
                  Strongest
                </p>

                <p className="mt-1 text-[8px] text-emerald-400">
                  {strongestAsset &&
                  strongestAsset.trades >
                    0
                    ? strongestAsset.symbol
                    : "—"}
                </p>

              </div>

              <div>

                <p className="text-[6px] uppercase tracking-[0.08em] text-zinc-800">
                  Weakest
                </p>

                <p className="mt-1 text-[8px] text-red-400">
                  {weakestAsset &&
                  weakestAsset.trades >
                    0
                    ? weakestAsset.symbol
                    : "—"}
                </p>

              </div>

            </div>

          </div>

          <div className="mt-4 grid gap-2 lg:grid-cols-3">

            {assetStats.map(
              (
                asset
              ) => (
                <AssetPerformanceCard
                  key={
                    asset.symbol
                  }
                  asset={
                    asset
                  }
                />
              )
            )}

          </div>

        </section>

        {/* DIRECTION */}

        <section className="ha-panel mt-3 p-5">

          <div className="flex items-center gap-2">

            <Zap
              size={12}
              className="text-violet-400"
            />

            <div>

              <h2 className="text-[10px] font-medium text-zinc-300">
                Directional Performance
              </h2>

              <p className="mt-0.5 text-[7px] text-zinc-700">
                LONG versus SHORT realized performance
              </p>

            </div>

          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">

            {directionStats.map(
              (
                stat
              ) => (
                <DirectionPerformanceCard
                  key={
                    stat.direction
                  }
                  stat={
                    stat
                  }
                />
              )
            )}

          </div>

        </section>

        {/* RECENT */}

        <section className="ha-panel mt-3 overflow-hidden">

          <div className="flex items-center justify-between border-b border-white/[0.05] px-5 py-4">

            <div>

              <h2 className="text-[11px] font-medium text-zinc-200">
                Recent Signal Outcomes
              </h2>

              <p className="mt-0.5 text-[7px] text-zinc-700">
                Published signal audit trail
              </p>

            </div>

            <span className="text-[7px] text-zinc-700">
              {filteredSignals.length} records
            </span>

          </div>

          {loading ? (
            <div className="flex min-h-[220px] items-center justify-center">

              <RefreshCw
                size={17}
                className="animate-spin text-violet-400"
              />

            </div>
          ) : recentSignals.length ===
            0 ? (
            <div className="flex min-h-[220px] items-center justify-center">

              <div className="text-center">

                <Database
                  size={20}
                  className="mx-auto text-zinc-700"
                />

                <p className="mt-3 text-[8px] text-zinc-700">
                  No published signal history yet.
                </p>

              </div>

            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full min-w-[900px]">

                <thead>

                  <tr className="border-b border-white/[0.04] text-left">

                    {[
                      "Market",
                      "Direction",
                      "Timeframe",
                      "Result",
                      "Realized",
                      "Lifecycle",
                      "Published",
                      "Closed",
                    ].map(
                      (
                        heading
                      ) => (
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

                  {recentSignals.map(
                    (
                      signal
                    ) => (
                      <tr
                        key={
                          signal.id
                        }
                        className="border-b border-white/[0.035] last:border-0 hover:bg-white/[0.01]"
                      >

                        <td className="px-5 py-4 text-[9px] font-medium text-zinc-300">
                          {signal.symbol}
                        </td>

                        <td className="px-5 py-4">

                          <DirectionBadge
                            direction={
                              signal.direction
                            }
                          />

                        </td>

                        <td className="px-5 py-4 text-[8px] text-zinc-600">
                          {signal.timeframe}
                        </td>

                        <td className="px-5 py-4">

                          <ResultBadge
                            result={
                              signal.result
                            }
                          />

                        </td>

                        <td
                          className={`ha-number px-5 py-4 text-[9px] font-medium ${
                            (
                              signal.realizedR ??
                              0
                            ) > 0
                              ? "text-emerald-400"
                              : (
                                  signal.realizedR ??
                                  0
                                ) < 0
                              ? "text-red-400"
                              : "text-zinc-700"
                          }`}
                        >
                          {signal.realizedR !==
                          null
                            ? formatR(
                                signal.realizedR
                              )
                            : "—"}
                        </td>

                        <td className="px-5 py-4 text-[7px] text-zinc-600">
                          {
                            signal.lifecyclePhase
                          }
                        </td>

                        <td className="px-5 py-4 text-[7px] text-zinc-700">
                          {formatDate(
                            signal.publishedAt
                          )}
                        </td>

                        <td className="px-5 py-4 text-[7px] text-zinc-700">
                          {formatDate(
                            signal.closedAt
                          )}
                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>
          )}

        </section>

        {/* POLICY */}

        <div className="mt-3 flex items-start gap-3 rounded-xl border border-white/[0.05] bg-white/[0.01] p-4">

          <ShieldCheck
            size={11}
            className="mt-0.5 shrink-0 text-emerald-400"
          />

          <p className="text-[7px] leading-4 text-zinc-700">
            Edge Diagnostics describes historical realized outcomes only. OPEN signals are excluded, and signals invalidated or expired before entry are treated as cancelled rather than losses. A positive historical expectancy does not guarantee future profitability, especially while the sample remains small.
          </p>

        </div>

      </div>

    </HiddenAlphaShell>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = "neutral",
}: {
  icon: typeof Activity;

  label: string;

  value: string;

  detail?: string;

  tone?:
    | "neutral"
    | "green"
    | "red"
    | "purple"
    | "amber";
}) {
  const className =
    tone === "green"
      ? "text-emerald-400"
      : tone === "red"
      ? "text-red-400"
      : tone === "purple"
      ? "text-violet-400"
      : tone === "amber"
      ? "text-amber-400"
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
        className={`ha-number mt-2 text-[13px] font-semibold ${className}`}
      >
        {value}
      </p>

      {detail && (
        <p className="mt-1 text-[7px] text-zinc-700">
          {detail}
        </p>
      )}

    </div>
  );
}

function DiagnosticBadge({
  value,
  tone,
}: {
  value: string;

  tone:
    | "neutral"
    | "green"
    | "red"
    | "amber";
}) {
  const className =
    tone === "green"
      ? "border-emerald-500/10 bg-emerald-500/[0.06] text-emerald-400"
      : tone === "red"
      ? "border-red-500/10 bg-red-500/[0.06] text-red-400"
      : tone === "amber"
      ? "border-amber-500/10 bg-amber-500/[0.06] text-amber-400"
      : "border-white/[0.05] bg-white/[0.02] text-zinc-600";

  return (
    <span
      className={`rounded-lg border px-3 py-2 text-[7px] font-semibold uppercase tracking-[0.1em] ${className}`}
    >
      {value}
    </span>
  );
}

function DiagnosticMetric({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;

  value: string;

  detail?: string;

  tone?:
    | "neutral"
    | "green"
    | "red";
}) {
  const className =
    tone === "green"
      ? "text-emerald-400"
      : tone === "red"
      ? "text-red-400"
      : "text-zinc-300";

  return (
    <div className="rounded-xl border border-white/[0.045] bg-white/[0.01] p-3">

      <p className="text-[7px] uppercase tracking-[0.1em] text-zinc-700">
        {label}
      </p>

      <p
        className={`ha-number mt-2 text-[14px] font-semibold ${className}`}
      >
        {value}
      </p>

      {detail && (
        <p className="mt-1 text-[6px] text-zinc-800">
          {detail}
        </p>
      )}

    </div>
  );
}

function BreakdownRow({
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
    | "purple"
    | "amber";
}) {
  const className =
    tone === "green"
      ? "text-emerald-400"
      : tone === "red"
      ? "text-red-400"
      : tone === "purple"
      ? "text-violet-400"
      : tone === "amber"
      ? "text-amber-400"
      : "text-zinc-400";

  return (
    <div className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.01] px-3 py-2.5">

      <span className="text-[7px] text-zinc-700">
        {label}
      </span>

      <span
        className={`ha-number text-[8px] font-medium ${className}`}
      >
        {value}
      </span>

    </div>
  );
}

function AssetPerformanceCard({
  asset,
}: {
  asset: AssetStat;
}) {
  return (
    <div className="rounded-xl border border-white/[0.05] bg-white/[0.012] p-4">

      <div className="flex items-center justify-between">

        <div>

          <p className="text-[10px] font-medium text-zinc-300">
            {asset.symbol}
          </p>

          <p className="mt-1 text-[7px] text-zinc-700">
            {asset.trades} closed trades
          </p>

        </div>

        <p
          className={`ha-number text-[12px] font-semibold ${
            asset.realizedR >
            0
              ? "text-emerald-400"
              : asset.realizedR <
                0
              ? "text-red-400"
              : "text-zinc-600"
          }`}
        >
          {asset.trades >
          0
            ? formatR(
                asset.realizedR
              )
            : "—"}
        </p>

      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">

        <SmallStat
          label="Win Rate"
          value={
            asset.trades >
            0
              ? formatPercent(
                  asset.winRate
                )
              : "—"
          }
        />

        <SmallStat
          label="Expectancy"
          value={
            asset.trades >
            0
              ? formatR(
                  asset.expectancy
                )
              : "—"
          }
        />

        <SmallStat
          label="Wins"
          value={`${asset.wins}`}
        />

        <SmallStat
          label="Losses"
          value={`${asset.losses}`}
        />

      </div>

    </div>
  );
}

function DirectionPerformanceCard({
  stat,
}: {
  stat: DirectionStat;
}) {
  const long =
    stat.direction ===
    "LONG";

  return (
    <div
      className={`rounded-xl border p-4 ${
        long
          ? "border-emerald-500/10 bg-emerald-500/[0.025]"
          : "border-red-500/10 bg-red-500/[0.025]"
      }`}
    >

      <div className="flex items-center justify-between">

        <div className="flex items-center gap-2">

          {long ? (
            <TrendingUp
              size={12}
              className="text-emerald-400"
            />
          ) : (
            <TrendingDown
              size={12}
              className="text-red-400"
            />
          )}

          <span
            className={`text-[10px] font-medium ${
              long
                ? "text-emerald-400"
                : "text-red-400"
            }`}
          >
            {stat.direction}
          </span>

        </div>

        <span
          className={`ha-number text-[12px] font-semibold ${
            stat.realizedR >
            0
              ? "text-emerald-400"
              : stat.realizedR <
                0
              ? "text-red-400"
              : "text-zinc-600"
          }`}
        >
          {stat.trades >
          0
            ? formatR(
                stat.realizedR
              )
            : "—"}
        </span>

      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">

        <SmallStat
          label="Trades"
          value={`${stat.trades}`}
        />

        <SmallStat
          label="Win Rate"
          value={
            stat.trades >
            0
              ? formatPercent(
                  stat.winRate
                )
              : "—"
          }
        />

        <SmallStat
          label="W / L"
          value={`${stat.wins} / ${stat.losses}`}
        />

      </div>

    </div>
  );
}

function SmallStat({
  label,
  value,
}: {
  label: string;

  value: string;
}) {
  return (
    <div>

      <p className="text-[6px] uppercase tracking-[0.08em] text-zinc-700">
        {label}
      </p>

      <p className="ha-number mt-1 text-[8px] font-medium text-zinc-400">
        {value}
      </p>

    </div>
  );
}

function DirectionBadge({
  direction,
}: {
  direction: Direction;
}) {
  if (
    direction === "LONG"
  ) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/10 bg-emerald-500/[0.05] px-2 py-1 text-[7px] font-medium text-emerald-400">

        <TrendingUp
          size={8}
        />

        LONG

      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-red-500/10 bg-red-500/[0.05] px-2 py-1 text-[7px] font-medium text-red-400">

      <TrendingDown
        size={8}
      />

      SHORT

    </span>
  );
}

function ResultBadge({
  result,
}: {
  result: SignalResult;
}) {
  const Icon =
    result === "WIN"
      ? CheckCircle2
      : result ===
        "LOSS"
      ? XCircle
      : result ===
        "OPEN"
      ? Clock3
      : ShieldCheck;

  return (
    <span
      className={`inline-flex items-center gap-1 text-[7px] font-medium ${resultTone(
        result
      )}`}
    >

      <Icon
        size={8}
      />

      {result}

    </span>
  );
}

function PerformanceCurve({
  values,
}: {
  values: number[];
}) {
  if (
    values.length === 0
  ) {
    return (
      <div className="flex h-[260px] items-center justify-center rounded-xl border border-dashed border-white/[0.05]">

        <div className="text-center">

          <Activity
            size={20}
            className="mx-auto text-zinc-800"
          />

          <p className="mt-3 text-[8px] text-zinc-700">
            No realized outcomes yet.
          </p>

        </div>

      </div>
    );
  }

  const width =
    1000;

  const height =
    250;

  const padding =
    20;

  const allValues = [
    0,
    ...values,
  ];

  const minimum =
    Math.min(
      ...allValues
    );

  const maximum =
    Math.max(
      ...allValues
    );

  const range =
    maximum -
      minimum ||
    1;

  const points =
    values.map(
      (
        value,
        index
      ) => {
        const x =
          values.length ===
          1
            ? width / 2
            : padding +
              (
                index /
                (
                  values.length -
                  1
                )
              ) *
                (
                  width -
                  padding * 2
                );

        const y =
          height -
          padding -
          (
            (
              value -
              minimum
            ) /
            range
          ) *
            (
              height -
              padding * 2
            );

        return `${x},${y}`;
      }
    );

  const zeroY =
    height -
    padding -
    (
      (
        0 -
        minimum
      ) /
      range
    ) *
      (
        height -
        padding * 2
      );

  return (
    <div className="relative h-[260px] overflow-hidden rounded-xl border border-white/[0.045] bg-[#080b10]">

      <div className="absolute left-4 top-3 z-10">

        <p className="text-[6px] uppercase tracking-[0.1em] text-zinc-800">
          Peak
        </p>

        <p className="ha-number mt-1 text-[8px] text-zinc-600">
          {formatR(
            maximum
          )}
        </p>

      </div>

      <div className="absolute bottom-3 left-4 z-10">

        <p className="text-[6px] uppercase tracking-[0.1em] text-zinc-800">
          Low
        </p>

        <p className="ha-number mt-1 text-[8px] text-zinc-600">
          {formatR(
            minimum
          )}
        </p>

      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="h-full w-full"
      >

        <defs>

          <linearGradient
            id="curveArea"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >

            <stop
              offset="0%"
              stopColor="rgb(139 92 246)"
              stopOpacity="0.20"
            />

            <stop
              offset="100%"
              stopColor="rgb(139 92 246)"
              stopOpacity="0"
            />

          </linearGradient>

        </defs>

        <line
          x1="0"
          y1={zeroY}
          x2={width}
          y2={zeroY}
          stroke="rgba(255,255,255,0.06)"
          strokeDasharray="5 5"
        />

        {points.length >
          1 && (
          <polygon
            points={`${points.join(
              " "
            )} ${width - padding},${height - padding} ${padding},${height - padding}`}
            fill="url(#curveArea)"
          />
        )}

        <polyline
          points={
            points.join(
              " "
            )
          }
          fill="none"
          stroke="rgb(139 92 246)"
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
        />

      </svg>

    </div>
  );
}
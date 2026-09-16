"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Activity,
  CheckCircle2,
  Crosshair,
  Database,
  Radar,
  RefreshCw,
  ShieldCheck,
  Target,
  TrendingDown,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react";

import HiddenAlphaShell from "@/components/hiddenalpha-shell";

type TradeDirection =
  | "LONG"
  | "SHORT"
  | "WAIT";

type ScannerSignal = {
  direction?: TradeDirection;

  confidence?: number;

  confidenceLevel?: string;

  quality?: string;

  summary?: unknown;

  /*
   * IMPORTANT:
   * TradingSignal reasons can contain
   * structured objects, not only strings.
   */
  reasons?: unknown[];

  timestamp?: string;
};

type ScannerSetup = {
  timeframe?: string;

  entryPrice?: number;

  stopLossPrice?: number;

  takeProfit1Price?: number;

  takeProfit2Price?: number;

  riskRewardRatioTP1?: number;

  riskRewardRatioTP2?: number;
};

type ScannerFreshness = {
  status?: string;

  actionable?: boolean;

  distanceFromEntryPercent?: number;

  progressR?: number;

  reason?: unknown;
};

type ScannerAsset = {
  symbol: string;

  available: boolean;

  signal:
    | ScannerSignal
    | null;

  setup:
    | ScannerSetup
    | null;

  risk:
    | unknown
    | null;

  livePrice:
    | number
    | null;

  freshness:
    | ScannerFreshness
    | null;

  baseRankingScore:
    | number
    | null;

  scannerScore:
    | number
    | null;

  actionable: boolean;

  error:
    | string
    | null;
};

type ScannerResult = {
  timestamp: string;

  universe: string[];

  best:
    | ScannerAsset
    | null;

  assets: ScannerAsset[];
};

type ScannerResponse = {
  success: boolean;

  timestamp?: string;

  universe?: string[];

  best?:
    | ScannerAsset
    | null;

  assets?: ScannerAsset[];

  error?: string;
};

type ActiveSignal = {
  id: string;

  symbol: string;

  direction:
    | "LONG"
    | "SHORT";

  lifecyclePhase: string;

  status: string;

  entryPrice: number;

  stopLossPrice: number;

  takeProfit1Price: number;

  takeProfit2Price: number;
};

const SYMBOLS = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
];

const MIN_CONFIDENCE =
  55;

const MIN_SCANNER_SCORE =
  75;

const MIN_RR =
  1.5;

function numeric(
  value: unknown
) {
  const parsed =
    Number(value);

  return Number.isFinite(
    parsed
  )
    ? parsed
    : null;
}

/*
 * ========================================
 * SAFE TEXT RENDERER
 * ========================================
 *
 * Never send raw API objects directly
 * into JSX.
 */

function safeText(
  value: unknown,
  fallback = "—"
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return fallback;
  }

  if (
    typeof value === "string"
  ) {
    return value;
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  if (
    typeof value === "object"
  ) {
    const object =
      value as Record<
        string,
        unknown
      >;

    if (
      typeof object.message ===
      "string"
    ) {
      return object.message;
    }

    if (
      typeof object.reason ===
      "string"
    ) {
      return object.reason;
    }

    if (
      typeof object.summary ===
      "string"
    ) {
      return object.summary;
    }

    if (
      typeof object.label ===
      "string"
    ) {
      return object.label;
    }

    try {
      return JSON.stringify(
        value
      );
    } catch {
      return fallback;
    }
  }

  return fallback;
}

function reasonDetails(
  value: unknown
) {
  if (
    typeof value === "string"
  ) {
    return {
      message: value,

      factor: null,

      direction: null,
    };
  }

  if (
    value &&
    typeof value === "object"
  ) {
    const object =
      value as Record<
        string,
        unknown
      >;

    return {
      message:
        safeText(
          object.message ??
            object.reason ??
            value,
          "No explanation available"
        ),

      factor:
        typeof object.factor ===
        "string"
          ? object.factor
          : null,

      direction:
        typeof object.direction ===
        "string"
          ? object.direction
          : null,
    };
  }

  return {
    message:
      safeText(
        value,
        "No explanation available"
      ),

    factor: null,

    direction: null,
  };
}

function formatPrice(
  value:
    | number
    | null
    | undefined
) {
  const parsed =
    numeric(value);

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

function directionClass(
  direction?: TradeDirection
) {
  if (
    direction === "LONG"
  ) {
    return "text-emerald-400";
  }

  if (
    direction === "SHORT"
  ) {
    return "text-red-400";
  }

  return "text-zinc-500";
}

function freshnessClass(
  status?: string
) {
  if (
    status === "FRESH" ||
    status ===
      "NEAR_ENTRY"
  ) {
    return "border-emerald-500/10 bg-emerald-500/[0.06] text-emerald-400";
  }

  if (
    status === "EXTENDED" ||
    status === "STALE"
  ) {
    return "border-amber-500/10 bg-amber-500/[0.06] text-amber-400";
  }

  if (
    status ===
      "INVALIDATED" ||
    status === "TP1_HIT" ||
    status === "TP2_HIT"
  ) {
    return "border-red-500/10 bg-red-500/[0.05] text-red-400";
  }

  return "border-white/[0.05] bg-white/[0.02] text-zinc-500";
}

function getRR(
  asset:
    | ScannerAsset
    | null
    | undefined
) {
  return (
    numeric(
      asset?.setup
        ?.riskRewardRatioTP2
    ) ?? null
  );
}

export default function ScannerPage() {
  const [
    scanner,
    setScanner,
  ] =
    useState<ScannerResult | null>(
      null
    );

  const [
    activeSignal,
    setActiveSignal,
  ] =
    useState<ActiveSignal | null>(
      null
    );

  const [
    selectedSymbol,
    setSelectedSymbol,
  ] =
    useState("BTCUSDT");

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

  const loadActiveSignal =
    useCallback(
      async () => {
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
            await response.json();

          if (
            response.ok &&
            data.success
          ) {
            setActiveSignal(
              data.activeSignal ??
                null
            );
          }
        } catch {
          // Scanner can still work.
        }
      },
      []
    );

  const loadScanner =
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
              `/api/trading/scanner?symbols=${SYMBOLS.join(
                ","
              )}&accountBalance=10000&riskPercent=1&leverage=1`,
              {
                cache:
                  "no-store",
              }
            );

          const data =
            (await response.json()) as ScannerResponse;

          if (
            !response.ok ||
            !data.success ||
            !Array.isArray(
              data.assets
            )
          ) {
            throw new Error(
              data.error ??
                "Opportunity scanner failed"
            );
          }

          const nextScanner: ScannerResult =
            {
              timestamp:
                data.timestamp ??
                new Date().toISOString(),

              universe:
                data.universe ??
                SYMBOLS,

              best:
                data.best ??
                null,

              assets:
                data.assets,
            };

          setScanner(
            nextScanner
          );

          setSelectedSymbol(
            (
              current
            ) => {
              const exists =
                nextScanner.assets.some(
                  (
                    asset
                  ) =>
                    asset.symbol ===
                    current
                );

              if (exists) {
                return current;
              }

              return (
                nextScanner.best
                  ?.symbol ??
                nextScanner.assets[0]
                  ?.symbol ??
                "BTCUSDT"
              );
            }
          );

          setLastUpdated(
            new Date()
          );

          setError("");
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Opportunity scanner failed"
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      []
    );

  useEffect(() => {
    loadScanner();
    loadActiveSignal();

    const interval =
      window.setInterval(
        () => {
          loadScanner();
          loadActiveSignal();
        },
        60_000
      );

    function handlePipelineComplete(
      event: Event
    ) {
      const customEvent =
        event as CustomEvent;

      const pipeline =
        customEvent.detail
          ?.result;

      const pipelineScanner =
        pipeline?.publisher
          ?.scanner;

      if (
        pipelineScanner &&
        Array.isArray(
          pipelineScanner.assets
        )
      ) {
        setScanner({
          timestamp:
            pipelineScanner.timestamp ??
            new Date().toISOString(),

          universe:
            pipelineScanner.universe ??
            SYMBOLS,

          best:
            pipelineScanner.best ??
            null,

          assets:
            pipelineScanner.assets,
        });

        setLastUpdated(
          new Date()
        );

        setLoading(false);
      }

      loadActiveSignal();
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
    loadScanner,
    loadActiveSignal,
  ]);

  const sortedAssets =
    useMemo(() => {
      if (!scanner) {
        return [];
      }

      return [
        ...scanner.assets,
      ].sort(
        (
          a,
          b
        ) =>
          (
            b.scannerScore ??
            -999
          ) -
          (
            a.scannerScore ??
            -999
          )
      );
    }, [
      scanner,
    ]);

  const best =
    scanner?.best ??
    sortedAssets.find(
      (
        asset
      ) =>
        asset.actionable
    ) ??
    null;

  const selectedAsset =
    sortedAssets.find(
      (
        asset
      ) =>
        asset.symbol ===
        selectedSymbol
    ) ??
    sortedAssets[0] ??
    null;

  const actionableCount =
    sortedAssets.filter(
      (
        asset
      ) =>
        asset.actionable
    ).length;

  const availableCount =
    sortedAssets.filter(
      (
        asset
      ) =>
        asset.available
    ).length;

  return (
    <HiddenAlphaShell>

      <div className="mx-auto max-w-[1700px] px-4 py-5 lg:px-5">

        {/* HEADER */}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

          <div>

            <div className="flex items-center gap-2">

              <h1 className="text-[20px] font-semibold tracking-[-0.03em] text-zinc-100">
                Scanner
              </h1>

              <span className="rounded-md border border-violet-500/10 bg-violet-500/[0.08] px-2 py-1 text-[7px] font-semibold uppercase tracking-[0.12em] text-violet-400">
                Opportunity Engine
              </span>

            </div>

            <p className="mt-1 text-[9px] text-zinc-600">
              Ranked trading opportunities before publication.
            </p>

          </div>

          <div className="flex items-center gap-3">

            {lastUpdated && (
              <span className="hidden text-[8px] text-zinc-700 sm:block">
                Last scan{" "}
                {lastUpdated.toLocaleTimeString()}
              </span>
            )}

            <button
              onClick={() => {
                loadScanner(
                  true
                );

                loadActiveSignal();
              }}
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

              Run Scan

            </button>

          </div>

        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/10 bg-red-500/[0.04] px-4 py-3 text-[8px] text-red-400">
            {error}
          </div>
        )}

        {/* STATUS */}

        <div className="mt-5 grid grid-cols-2 gap-2 xl:grid-cols-4">

          <SummaryCard
            icon={Radar}
            label="Universe"
            value={`${scanner?.universe.length ?? SYMBOLS.length} Assets`}
          />

          <SummaryCard
            icon={Database}
            label="Available"
            value={
              loading
                ? "Scanning"
                : `${availableCount} / ${sortedAssets.length}`
            }
          />

          <SummaryCard
            icon={Zap}
            label="Actionable"
            value={
              loading
                ? "Scanning"
                : `${actionableCount}`
            }
            tone={
              actionableCount >
              0
                ? "green"
                : "neutral"
            }
          />

          <SummaryCard
            icon={
              ShieldCheck
            }
            label="Official Signal"
            value={
              activeSignal
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

        </div>

        {/* BEST */}

        <section className="ha-panel ha-purple-glow mt-3 overflow-hidden">

          <div className="flex items-center justify-between border-b border-white/[0.05] px-5 py-4">

            <div className="flex items-center gap-3">

              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet-500/10 bg-violet-500/[0.08]">

                <Radar
                  size={14}
                  className="text-violet-400"
                />

              </div>

              <div>

                <h2 className="text-[12px] font-medium text-zinc-100">
                  Best Current Opportunity
                </h2>

                <p className="mt-0.5 text-[8px] text-zinc-700">
                  Highest ranked actionable scanner candidate
                </p>

              </div>

            </div>

            <span className="rounded-md border border-amber-500/10 bg-amber-500/[0.05] px-2 py-1 text-[7px] font-medium text-amber-400">
              CANDIDATE ONLY
            </span>

          </div>

          {loading ? (

            <div className="flex min-h-[300px] items-center justify-center">

              <div className="text-center">

                <RefreshCw
                  size={18}
                  className="mx-auto animate-spin text-violet-400"
                />

                <p className="mt-3 text-[8px] text-zinc-700">
                  Scanning BTC, ETH and SOL...
                </p>

              </div>

            </div>

          ) : !best ? (

            <div className="flex min-h-[300px] items-center justify-center p-5">

              <div className="max-w-[440px] text-center">

                <ShieldCheck
                  size={24}
                  className="mx-auto text-emerald-400"
                />

                <h3 className="mt-4 text-[12px] font-medium text-zinc-300">
                  No actionable opportunity
                </h3>

                <p className="mt-2 text-[8px] leading-5 text-zinc-700">
                  None of the current candidates passed enough scanner conditions to become an actionable setup.
                </p>

                <span className="mt-4 inline-flex rounded-lg border border-emerald-500/10 bg-emerald-500/[0.04] px-3 py-2 text-[7px] font-semibold uppercase tracking-[0.1em] text-emerald-400">
                  Capital Preservation Mode
                </span>

              </div>

            </div>

          ) : (

            <div className="grid gap-5 p-5 xl:grid-cols-[1fr_0.85fr]">

              <div>

                <div className="flex items-start justify-between gap-4">

                  <div>

                    <p className="text-[7px] uppercase tracking-[0.12em] text-zinc-700">
                      Ranked #1
                    </p>

                    <h3 className="ha-number mt-1 text-[28px] font-semibold tracking-[-0.04em] text-zinc-100">

                      {best.symbol.replace(
                        "USDT",
                        ""
                      )}

                      <span className="ml-1 text-[12px] text-zinc-600">
                        / USDT
                      </span>

                    </h3>

                    <div className="mt-2 flex flex-wrap items-center gap-2">

                      <DirectionBadge
                        direction={
                          best.signal
                            ?.direction
                        }
                      />

                      <FreshnessBadge
                        status={
                          best.freshness
                            ?.status
                        }
                      />

                      <span className="text-[8px] text-zinc-600">
                        {best.setup
                          ?.timeframe ??
                          "—"}
                      </span>

                    </div>

                  </div>

                  <div className="text-right">

                    <p className="text-[7px] uppercase tracking-[0.1em] text-zinc-700">
                      Scanner Score
                    </p>

                    <p className="ha-number mt-1 text-[25px] font-semibold text-violet-400">
                      {best.scannerScore ??
                        "—"}
                    </p>

                    <p className="mt-1 text-[7px] text-zinc-700">
                      / 100
                    </p>

                  </div>

                </div>

                <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">

                  <Metric
                    label="Confidence"
                    value={
                      best.signal
                        ?.confidence !==
                      undefined
                        ? `${best.signal.confidence}%`
                        : "—"
                    }
                  />

                  <Metric
                    label="RR Target"
                    value={
                      getRR(
                        best
                      ) !== null
                        ? `1:${getRR(
                            best
                          )?.toFixed(
                            2
                          )}`
                        : "—"
                    }
                  />

                  <Metric
                    label="Live Price"
                    value={formatPrice(
                      best.livePrice
                    )}
                  />

                  <Metric
                    label="Quality"
                    value={
                      best.signal
                        ?.quality ??
                      "—"
                    }
                    tone={
                      best.signal
                        ?.quality ===
                      "VALID"
                        ? "green"
                        : "neutral"
                    }
                  />

                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">

                  <PriceLevel
                    icon={Crosshair}
                    label="Entry"
                    value={formatPrice(
                      best.setup
                        ?.entryPrice
                    )}
                  />

                  <PriceLevel
                    icon={
                      ShieldCheck
                    }
                    label="Stop Loss"
                    value={formatPrice(
                      best.setup
                        ?.stopLossPrice
                    )}
                    tone="red"
                  />

                  <PriceLevel
                    icon={Target}
                    label="TP1"
                    value={formatPrice(
                      best.setup
                        ?.takeProfit1Price
                    )}
                    tone="green"
                  />

                  <PriceLevel
                    icon={Target}
                    label="TP2"
                    value={formatPrice(
                      best.setup
                        ?.takeProfit2Price
                    )}
                    tone="cyan"
                  />

                </div>

                {best.signal
                  ?.summary !==
                  undefined && (
                  <div className="mt-3 rounded-xl border border-white/[0.05] bg-white/[0.012] p-3">

                    <p className="text-[7px] uppercase tracking-[0.1em] text-zinc-700">
                      Candidate Thesis
                    </p>

                    <p className="mt-2 text-[8px] leading-5 text-zinc-500">
                      {safeText(
                        best.signal
                          .summary,
                        "No thesis available"
                      )}
                    </p>

                  </div>
                )}

              </div>

              <QualityGatePanel
                asset={
                  best
                }
                activeSignal={
                  activeSignal
                }
              />

            </div>
          )}

        </section>

        {/* RANKING */}

        <section className="ha-panel mt-3 overflow-hidden">

          <div className="flex flex-col gap-4 border-b border-white/[0.05] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <h2 className="text-[11px] font-medium text-zinc-200">
                Ranked Opportunities
              </h2>

              <p className="mt-0.5 text-[7px] text-zinc-700">
                Full current scanner universe
              </p>

            </div>

            <span className="text-[7px] text-zinc-700">
              Click an asset for gate analysis
            </span>

          </div>

          <div className="overflow-x-auto">

            <table className="w-full min-w-[1000px]">

              <thead>

                <tr className="border-b border-white/[0.04] text-left">

                  {[
                    "#",
                    "Market",
                    "Direction",
                    "Scanner",
                    "Confidence",
                    "Quality",
                    "Freshness",
                    "RR",
                    "Live",
                    "State",
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

                {sortedAssets.map(
                  (
                    asset,
                    index
                  ) => {

                    const selected =
                      asset.symbol ===
                      selectedSymbol;

                    return (
                      <tr
                        key={
                          asset.symbol
                        }
                        onClick={() =>
                          setSelectedSymbol(
                            asset.symbol
                          )
                        }
                        className={`cursor-pointer border-b border-white/[0.035] transition last:border-0 ${
                          selected
                            ? "bg-violet-500/[0.035]"
                            : "hover:bg-white/[0.012]"
                        }`}
                      >

                        <td className="px-5 py-4 text-[8px] text-zinc-700">
                          {index + 1}
                        </td>

                        <td className="px-5 py-4">

                          <p className="text-[9px] font-medium text-zinc-300">
                            {
                              asset.symbol
                            }
                          </p>

                          <p className="mt-1 text-[7px] text-zinc-700">
                            {asset.setup
                              ?.timeframe ??
                              "—"}
                          </p>

                        </td>

                        <td className="px-5 py-4">

                          <DirectionBadge
                            direction={
                              asset.signal
                                ?.direction
                            }
                          />

                        </td>

                        <td className="ha-number px-5 py-4 text-[10px] font-semibold text-violet-400">
                          {asset.scannerScore ??
                            "—"}
                        </td>

                        <td className="px-5 py-4 text-[8px] text-zinc-400">
                          {asset.signal
                            ?.confidence !==
                          undefined
                            ? `${asset.signal.confidence}%`
                            : "—"}
                        </td>

                        <td className="px-5 py-4 text-[8px] text-zinc-500">
                          {asset.signal
                            ?.quality ??
                            "—"}
                        </td>

                        <td className="px-5 py-4">

                          <FreshnessBadge
                            status={
                              asset
                                .freshness
                                ?.status
                            }
                          />

                        </td>

                        <td className="ha-number px-5 py-4 text-[8px] text-zinc-400">
                          {getRR(
                            asset
                          ) !== null
                            ? `1:${getRR(
                                asset
                              )?.toFixed(
                                2
                              )}`
                            : "—"}
                        </td>

                        <td className="ha-number px-5 py-4 text-[8px] text-zinc-400">
                          {formatPrice(
                            asset.livePrice
                          )}
                        </td>

                        <td className="px-5 py-4">

                          {asset.actionable ? (
                            <span className="rounded-md border border-emerald-500/10 bg-emerald-500/[0.06] px-2 py-1 text-[7px] font-medium text-emerald-400">
                              ACTIONABLE
                            </span>
                          ) : asset.error ? (
                            <span className="rounded-md border border-red-500/10 bg-red-500/[0.05] px-2 py-1 text-[7px] text-red-400">
                              ERROR
                            </span>
                          ) : (
                            <span className="rounded-md border border-white/[0.05] bg-white/[0.02] px-2 py-1 text-[7px] text-zinc-600">
                              FILTERED
                            </span>
                          )}

                        </td>

                      </tr>
                    );
                  }
                )}

              </tbody>

            </table>

          </div>

        </section>

        {/* SELECTED ASSET */}

        {selectedAsset && (
          <div className="mt-3 grid gap-3 xl:grid-cols-[0.8fr_1.2fr]">

            <section className="ha-panel p-5">

              <div className="flex items-center justify-between">

                <div>

                  <p className="text-[7px] uppercase tracking-[0.1em] text-zinc-700">
                    Selected Candidate
                  </p>

                  <h2 className="mt-1 text-[15px] font-semibold text-zinc-200">
                    {
                      selectedAsset.symbol
                    }
                  </h2>

                </div>

                <DirectionBadge
                  direction={
                    selectedAsset
                      .signal
                      ?.direction
                  }
                />

              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">

                <Metric
                  label="Base Ranking"
                  value={
                    selectedAsset.baseRankingScore !==
                    null
                      ? selectedAsset.baseRankingScore.toFixed(
                          0
                        )
                      : "—"
                  }
                />

                <Metric
                  label="Scanner Score"
                  value={
                    selectedAsset.scannerScore !==
                    null
                      ? selectedAsset.scannerScore.toFixed(
                          0
                        )
                      : "—"
                  }
                  tone="purple"
                />

                <Metric
                  label="Progress"
                  value={
                    numeric(
                      selectedAsset
                        .freshness
                        ?.progressR
                    ) !== null
                      ? `${
                          (
                            numeric(
                              selectedAsset
                                .freshness
                                ?.progressR
                            ) ??
                            0
                          ) >= 0
                            ? "+"
                            : ""
                        }${(
                          numeric(
                            selectedAsset
                              .freshness
                              ?.progressR
                          ) ??
                          0
                        ).toFixed(
                          2
                        )}R`
                      : "—"
                  }
                />

                <Metric
                  label="Entry Distance"
                  value={
                    numeric(
                      selectedAsset
                        .freshness
                        ?.distanceFromEntryPercent
                    ) !== null
                      ? `${(
                          numeric(
                            selectedAsset
                              .freshness
                              ?.distanceFromEntryPercent
                          ) ??
                          0
                        ).toFixed(
                          2
                        )}%`
                      : "—"
                  }
                />

              </div>

              {selectedAsset
                .freshness
                ?.reason !==
                undefined && (
                <div className="mt-3 rounded-xl border border-white/[0.045] bg-white/[0.01] p-3">

                  <p className="text-[7px] uppercase tracking-[0.1em] text-zinc-700">
                    Freshness Analysis
                  </p>

                  <p className="mt-2 text-[8px] leading-4 text-zinc-600">
                    {safeText(
                      selectedAsset
                        .freshness
                        .reason
                    )}
                  </p>

                </div>
              )}

              {selectedAsset.error && (
                <div className="mt-3 rounded-xl border border-red-500/10 bg-red-500/[0.04] p-3 text-[8px] text-red-400">
                  {
                    selectedAsset.error
                  }
                </div>
              )}

              {Array.isArray(
                selectedAsset
                  .signal
                  ?.reasons
              ) &&
                (
                  selectedAsset
                    .signal
                    ?.reasons
                    ?.length ??
                  0
                ) >
                  0 && (
                  <div className="mt-4">

                    <p className="text-[7px] uppercase tracking-[0.1em] text-zinc-700">
                      Engine Reasons
                    </p>

                    <div className="mt-2 space-y-2">

                      {selectedAsset.signal?.reasons
                        ?.slice(
                          0,
                          6
                        )
                        .map(
                          (
                            reason,
                            index
                          ) => {
                            const details =
                              reasonDetails(
                                reason
                              );

                            return (
                              <div
                                key={
                                  index
                                }
                                className="rounded-lg border border-white/[0.04] bg-white/[0.01] p-2.5"
                              >

                                <div className="flex gap-2">

                                  <Activity
                                    size={9}
                                    className="mt-0.5 shrink-0 text-violet-400"
                                  />

                                  <div className="min-w-0">

                                    <p className="text-[7px] leading-4 text-zinc-500">
                                      {
                                        details.message
                                      }
                                    </p>

                                    {(details.factor ||
                                      details.direction) && (
                                      <div className="mt-1.5 flex flex-wrap gap-1">

                                        {details.factor && (
                                          <span className="rounded bg-white/[0.025] px-1.5 py-0.5 text-[6px] uppercase tracking-[0.08em] text-zinc-700">
                                            {
                                              details.factor
                                            }
                                          </span>
                                        )}

                                        {details.direction && (
                                          <span
                                            className={`rounded px-1.5 py-0.5 text-[6px] font-medium uppercase ${
                                              details.direction ===
                                                "BULLISH" ||
                                              details.direction ===
                                                "LONG"
                                                ? "bg-emerald-500/[0.05] text-emerald-400"
                                                : details.direction ===
                                                    "BEARISH" ||
                                                  details.direction ===
                                                    "SHORT"
                                                ? "bg-red-500/[0.05] text-red-400"
                                                : "bg-white/[0.025] text-zinc-600"
                                            }`}
                                          >
                                            {
                                              details.direction
                                            }
                                          </span>
                                        )}

                                      </div>
                                    )}

                                  </div>

                                </div>

                              </div>
                            );
                          }
                        )}

                    </div>

                  </div>
                )}

            </section>

            <QualityGatePanel
              asset={
                selectedAsset
              }
              activeSignal={
                activeSignal
              }
            />

          </div>
        )}

        {/* PIPELINE */}

        <section className="ha-panel mt-3 p-5">

          <div className="flex items-center gap-2">

            <ShieldCheck
              size={12}
              className="text-amber-400"
            />

            <h2 className="text-[10px] font-medium text-zinc-300">
              Scanner Publication Policy
            </h2>

          </div>

          <div className="mt-4 grid gap-2 md:grid-cols-4">

            <PipelineStep
              number="01"
              title="Scanner"
              description="Discovers and ranks opportunities."
              active
            />

            <PipelineStep
              number="02"
              title="Quality Gate"
              description="Confidence, RR and freshness validation."
            />

            <PipelineStep
              number="03"
              title="Publisher"
              description="Freezes the approved trade plan."
            />

            <PipelineStep
              number="04"
              title="Lifecycle"
              description="Tracks official signal outcome."
            />

          </div>

          <div className="mt-4 rounded-xl border border-amber-500/10 bg-amber-500/[0.025] px-4 py-3">

            <p className="text-[7px] leading-4 text-zinc-600">
              A Scanner Score does not automatically mean an official trade signal. Only Publisher-approved setups appear in the Signals Command Center.
            </p>

          </div>

        </section>

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
    | "purple";
}) {
  const valueClass =
    tone === "green"
      ? "text-emerald-400"
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
        className={`mt-2 text-[10px] font-medium ${valueClass}`}
      >
        {value}
      </p>

    </div>
  );
}

function DirectionBadge({
  direction,
}: {
  direction?:
    TradeDirection;
}) {
  if (
    direction === "LONG"
  ) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/10 bg-emerald-500/[0.06] px-2 py-1 text-[7px] font-medium text-emerald-400">

        <TrendingUp
          size={8}
        />

        LONG

      </span>
    );
  }

  if (
    direction === "SHORT"
  ) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-red-500/10 bg-red-500/[0.06] px-2 py-1 text-[7px] font-medium text-red-400">

        <TrendingDown
          size={8}
        />

        SHORT

      </span>
    );
  }

  return (
    <span className="inline-flex rounded-md border border-white/[0.05] bg-white/[0.02] px-2 py-1 text-[7px] text-zinc-600">
      WAIT
    </span>
  );
}

function FreshnessBadge({
  status,
}: {
  status?: string;
}) {
  return (
    <span
      className={`inline-flex rounded-md border px-2 py-1 text-[7px] font-medium ${freshnessClass(
        status
      )}`}
    >
      {status ??
        "NO SETUP"}
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
    | "purple";
}) {
  const valueClass =
    tone === "green"
      ? "text-emerald-400"
      : tone === "purple"
      ? "text-violet-400"
      : "text-zinc-300";

  return (
    <div className="rounded-xl border border-white/[0.05] bg-white/[0.012] p-3">

      <p className="text-[7px] uppercase tracking-[0.1em] text-zinc-700">
        {label}
      </p>

      <p
        className={`ha-number mt-2 text-[12px] font-semibold ${valueClass}`}
      >
        {value}
      </p>

    </div>
  );
}

function PriceLevel({
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
          size={9}
          className="text-zinc-700"
        />

        <p className="text-[7px] uppercase tracking-[0.1em] text-zinc-700">
          {label}
        </p>

      </div>

      <p
        className={`ha-number mt-2 text-[11px] font-medium ${valueClass}`}
      >
        {value}
      </p>

    </div>
  );
}

function QualityGatePanel({
  asset,
  activeSignal,
}: {
  asset: ScannerAsset;

  activeSignal:
    | ActiveSignal
    | null;
}) {
  const setupComplete =
    Boolean(
      asset.setup &&
        numeric(
          asset.setup
            .entryPrice
        ) !== null &&
        numeric(
          asset.setup
            .stopLossPrice
        ) !== null &&
        numeric(
          asset.setup
            .takeProfit2Price
        ) !== null
    );

  const qualityValid =
    asset.signal?.quality ===
    "VALID";

  const confidence =
    numeric(
      asset.signal
        ?.confidence
    );

  const confidencePass =
    confidence !== null &&
    confidence >=
      MIN_CONFIDENCE;

  const scannerPass =
    asset.scannerScore !==
      null &&
    asset.scannerScore >=
      MIN_SCANNER_SCORE;

  const rr =
    getRR(asset);

  const rrPass =
    rr !== null &&
    rr >= MIN_RR;

  const freshnessStatus =
    asset.freshness
      ?.status;

  const freshnessPass =
    Boolean(
      asset.freshness
        ?.actionable &&
        (
          freshnessStatus ===
            "FRESH" ||
          freshnessStatus ===
            "NEAR_ENTRY"
        )
    );

  const sameActive =
    Boolean(
      activeSignal &&
        activeSignal.symbol ===
          asset.symbol &&
        activeSignal.direction ===
          asset.signal
            ?.direction
    );

  const gates = [
    {
      label:
        "Setup Complete",

      value:
        setupComplete
          ? "PASS"
          : "FAIL",

      pass:
        setupComplete,
    },

    {
      label:
        "Quality = VALID",

      value:
        asset.signal
          ?.quality ??
        "—",

      pass:
        qualityValid,
    },

    {
      label:
        `Confidence ≥ ${MIN_CONFIDENCE}%`,

      value:
        confidence !==
        null
          ? `${confidence}%`
          : "—",

      pass:
        confidencePass,
    },

    {
      label:
        `Scanner ≥ ${MIN_SCANNER_SCORE}`,

      value:
        asset.scannerScore !==
        null
          ? `${asset.scannerScore}`
          : "—",

      pass:
        scannerPass,
    },

    {
      label:
        `RR ≥ ${MIN_RR}`,

      value:
        rr !== null
          ? `1:${rr.toFixed(
              2
            )}`
          : "—",

      pass:
        rrPass,
    },

    {
      label:
        "Fresh / Near Entry",

      value:
        freshnessStatus ??
        "—",

      pass:
        freshnessPass,
    },
  ];

  const passed =
    gates.filter(
      (
        gate
      ) =>
        gate.pass
    ).length;

  const allPass =
    passed ===
    gates.length;

  return (
    <section className="rounded-xl border border-white/[0.055] bg-[#090c12] p-5">

      <div className="flex items-start justify-between gap-4">

        <div>

          <p className="text-[7px] uppercase tracking-[0.12em] text-zinc-700">
            Publication Gate
          </p>

          <h3 className="mt-1 text-[12px] font-medium text-zinc-200">
            Candidate Quality Check
          </h3>

        </div>

        <div className="text-right">

          <p
            className={`ha-number text-[17px] font-semibold ${
              allPass
                ? "text-emerald-400"
                : "text-zinc-400"
            }`}
          >
            {passed}/
            {gates.length}
          </p>

          <p className="mt-1 text-[6px] uppercase tracking-[0.1em] text-zinc-700">
            Gates Passed
          </p>

        </div>

      </div>

      <div className="mt-4 space-y-2">

        {gates.map(
          (
            gate
          ) => (
            <div
              key={
                gate.label
              }
              className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.01] px-3 py-2.5"
            >

              <div className="flex items-center gap-2">

                {gate.pass ? (
                  <CheckCircle2
                    size={10}
                    className="text-emerald-400"
                  />
                ) : (
                  <XCircle
                    size={10}
                    className="text-zinc-700"
                  />
                )}

                <span className="text-[7px] text-zinc-600">
                  {gate.label}
                </span>

              </div>

              <span
                className={`text-[7px] font-medium ${
                  gate.pass
                    ? "text-emerald-400"
                    : "text-zinc-600"
                }`}
              >
                {gate.value}
              </span>

            </div>
          )
        )}

      </div>

      {sameActive ? (
        <div className="mt-4 rounded-xl border border-violet-500/10 bg-violet-500/[0.04] p-3">

          <div className="flex items-center gap-2">

            <Database
              size={10}
              className="text-violet-400"
            />

            <span className="text-[8px] font-medium text-violet-400">
              ACTIVE SIGNAL EXISTS
            </span>

          </div>

          <p className="mt-2 text-[7px] leading-4 text-zinc-600">
            Publisher will not duplicate this symbol and direction while the official signal remains active.
          </p>

        </div>
      ) : allPass ? (
        <div className="mt-4 rounded-xl border border-emerald-500/10 bg-emerald-500/[0.04] p-3">

          <div className="flex items-center gap-2">

            <Zap
              size={10}
              className="text-emerald-400"
            />

            <span className="text-[8px] font-medium text-emerald-400">
              PUBLICATION ELIGIBLE
            </span>

          </div>

          <p className="mt-2 text-[7px] leading-4 text-zinc-600">
            Candidate satisfies the current HiddenAlpha Publisher v1 quality gates.
          </p>

        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-amber-500/10 bg-amber-500/[0.035] p-3">

          <div className="flex items-center gap-2">

            <ShieldCheck
              size={10}
              className="text-amber-400"
            />

            <span className="text-[8px] font-medium text-amber-400">
              NOT PUBLICATION READY
            </span>

          </div>

          <p className="mt-2 text-[7px] leading-4 text-zinc-600">
            Scanner candidate remains research-only until every required publication gate passes.
          </p>

        </div>
      )}

    </section>
  );
}

function PipelineStep({
  number,
  title,
  description,
  active = false,
}: {
  number: string;

  title: string;

  description: string;

  active?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        active
          ? "border-violet-500/10 bg-violet-500/[0.035]"
          : "border-white/[0.045] bg-white/[0.01]"
      }`}
    >

      <p
        className={`ha-number text-[8px] ${
          active
            ? "text-violet-400"
            : "text-zinc-700"
        }`}
      >
        {number}
      </p>

      <p className="mt-2 text-[9px] font-medium text-zinc-400">
        {title}
      </p>

      <p className="mt-1 text-[7px] leading-4 text-zinc-700">
        {description}
      </p>

    </div>
  );
}
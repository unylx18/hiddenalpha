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
  Check,
  Crosshair,
  Eye,
  Plus,
  Radar,
  RefreshCw,
  Star,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";

import HiddenAlphaShell from "@/components/hiddenalpha-shell";

import {
  createBybitTickerSocket,
  BybitLiveTicker,
} from "@/lib/market-data/bybit-live";

type Direction =
  | "BULLISH"
  | "BEARISH"
  | "NEUTRAL";

type TradeDirection =
  | "LONG"
  | "SHORT"
  | "WAIT";

type WatchlistAsset = {
  symbol: string;

  price:
    | number
    | null;

  change24h:
    | number
    | null;

  bias: Direction;

  alphaScore:
    | number
    | null;

  alphaConfidence:
    | number
    | null;

  scannerScore:
    | number
    | null;

  signalDirection:
    TradeDirection;

  signalConfidence:
    | number
    | null;

  quality:
    | string
    | null;

  freshness:
    | string
    | null;

  actionable: boolean;

  activeSignal: boolean;

  activeSignalDirection:
    | "LONG"
    | "SHORT"
    | null;

  activeLifecycle:
    | string
    | null;
};

type ScannerAsset = {
  symbol: string;

  available: boolean;

  signal:
    | {
        direction?:
          TradeDirection;

        confidence?:
          number;

        quality?:
          string;
      }
    | null;

  livePrice:
    | number
    | null;

  scannerScore:
    | number
    | null;

  freshness:
    | {
        status?:
          string;

        actionable?:
          boolean;
      }
    | null;

  actionable: boolean;
};

type ActiveSignal = {
  id: string;

  symbol: string;

  direction:
    | "LONG"
    | "SHORT";

  lifecyclePhase:
    string;
};

const UNIVERSE = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
];

const STORAGE_KEY =
  "hiddenalpha:watchlist";

const DEFAULT_WATCHLIST = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
];

function numberValue(
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

function normalizeDirection(
  value: unknown
): Direction {
  if (
    value === "BULLISH"
  ) {
    return "BULLISH";
  }

  if (
    value === "BEARISH"
  ) {
    return "BEARISH";
  }

  return "NEUTRAL";
}

function normalizeTradeDirection(
  value: unknown
): TradeDirection {
  if (
    value === "LONG"
  ) {
    return "LONG";
  }

  if (
    value === "SHORT"
  ) {
    return "SHORT";
  }

  return "WAIT";
}

function formatPrice(
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

function directionClass(
  direction: Direction
) {
  if (
    direction ===
    "BULLISH"
  ) {
    return "text-emerald-400";
  }

  if (
    direction ===
    "BEARISH"
  ) {
    return "text-red-400";
  }

  return "text-zinc-500";
}

function prettyDirection(
  direction: Direction
) {
  if (
    direction ===
    "BULLISH"
  ) {
    return "Bullish";
  }

  if (
    direction ===
    "BEARISH"
  ) {
    return "Bearish";
  }

  return "Neutral";
}

function freshnessClass(
  status:
    | string
    | null
) {
  if (
    status === "FRESH" ||
    status ===
      "NEAR_ENTRY"
  ) {
    return "text-emerald-400";
  }

  if (
    status === "STALE" ||
    status ===
      "EXTENDED"
  ) {
    return "text-amber-400";
  }

  if (
    status ===
      "INVALIDATED"
  ) {
    return "text-red-400";
  }

  return "text-zinc-600";
}

export default function WatchlistPage() {
  const [
    watchedSymbols,
    setWatchedSymbols,
  ] =
    useState<string[]>(
      DEFAULT_WATCHLIST
    );

  const [
    assets,
    setAssets,
  ] =
    useState<
      WatchlistAsset[]
    >([]);

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

  const [
    liveStatus,
    setLiveStatus,
  ] = useState<
    | "CONNECTING"
    | "OPEN"
    | "CLOSED"
    | "ERROR"
  >("CONNECTING");

  /*
   * ========================================
   * LOAD LOCAL WATCHLIST
   * ========================================
   */

  useEffect(() => {
    try {
      const stored =
        window.localStorage.getItem(
          STORAGE_KEY
        );

      if (!stored) {
        return;
      }

      const parsed =
        JSON.parse(
          stored
        );

      if (
        Array.isArray(parsed)
      ) {
        const safe =
          parsed.filter(
            (
              symbol
            ) =>
              typeof symbol ===
                "string" &&
              UNIVERSE.includes(
                symbol
              )
          );

        setWatchedSymbols(
          safe
        );
      }
    } catch {
      // Use defaults.
    }
  }, []);

  /*
   * ========================================
   * SAVE LOCAL WATCHLIST
   * ========================================
   */

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
          watchedSymbols
        )
      );
    } catch {
      // Browser storage unavailable.
    }
  }, [
    watchedSymbols,
  ]);

  /*
   * ========================================
   * FETCH DESK DATA
   * ========================================
   */

  const loadDesk =
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
          const [
            scannerResponse,
            activeResponse,
            ...contextResponses
          ] =
            await Promise.all([
              fetch(
                `/api/trading/scanner?symbols=${UNIVERSE.join(
                  ","
                )}&accountBalance=10000&riskPercent=1&leverage=1`,
                {
                  cache:
                    "no-store",
                }
              ),

              fetch(
                "/api/trading/signals/active",
                {
                  cache:
                    "no-store",
                }
              ),

              ...UNIVERSE.map(
                (
                  symbol
                ) =>
                  fetch(
                    `/api/trading/context?symbol=${symbol}&timeframe=1h`,
                    {
                      cache:
                        "no-store",
                    }
                  )
              ),
            ]);

          const scannerData =
            await scannerResponse.json();

          const activeData =
            await activeResponse.json();

          const contextData =
            await Promise.all(
              contextResponses.map(
                (
                  response
                ) =>
                  response.json()
              )
            );

          const scannerAssets: ScannerAsset[] =
            scannerResponse.ok &&
            scannerData.success &&
            Array.isArray(
              scannerData.assets
            )
              ? scannerData.assets
              : [];

          const activeSignal: ActiveSignal | null =
            activeResponse.ok &&
            activeData.success
              ? activeData.activeSignal ??
                null
              : null;

          const nextAssets =
            UNIVERSE.map(
              (
                symbol,
                index
              ) => {
                const scanner =
                  scannerAssets.find(
                    (
                      item
                    ) =>
                      item.symbol ===
                      symbol
                  );

                const alpha =
                  contextData[
                    index
                  ]?.alpha;

                return {
                  symbol,

                  price:
                    numberValue(
                      scanner
                        ?.livePrice
                    ),

                  change24h:
                    null,

                  bias:
                    normalizeDirection(
                      alpha
                        ?.market
                        ?.bias
                    ),

                  alphaScore:
                    numberValue(
                      alpha
                        ?.market
                        ?.score
                    ),

                  alphaConfidence:
                    numberValue(
                      alpha
                        ?.market
                        ?.confidence
                    ),

                  scannerScore:
                    numberValue(
                      scanner
                        ?.scannerScore
                    ),

                  signalDirection:
                    normalizeTradeDirection(
                      scanner
                        ?.signal
                        ?.direction
                    ),

                  signalConfidence:
                    numberValue(
                      scanner
                        ?.signal
                        ?.confidence
                    ),

                  quality:
                    typeof scanner
                      ?.signal
                      ?.quality ===
                    "string"
                      ? scanner
                          .signal
                          .quality
                      : null,

                  freshness:
                    typeof scanner
                      ?.freshness
                      ?.status ===
                    "string"
                      ? scanner
                          .freshness
                          .status
                      : null,

                  actionable:
                    Boolean(
                      scanner
                        ?.actionable
                    ),

                  activeSignal:
                    activeSignal
                      ?.symbol ===
                    symbol,

                  activeSignalDirection:
                    activeSignal
                      ?.symbol ===
                    symbol
                      ? activeSignal.direction
                      : null,

                  activeLifecycle:
                    activeSignal
                      ?.symbol ===
                    symbol
                      ? activeSignal.lifecyclePhase
                      : null,
                } satisfies WatchlistAsset;
              }
            );

          setAssets(
            (
              current
            ) =>
              nextAssets.map(
                (
                  next
                ) => {
                  const previous =
                    current.find(
                      (
                        item
                      ) =>
                        item.symbol ===
                        next.symbol
                    );

                  return {
                    ...next,

                    price:
                      previous
                        ?.price ??
                      next.price,

                    change24h:
                      previous
                        ?.change24h ??
                      next.change24h,
                  };
                }
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
              : "Failed to load watchlist"
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
   * REFRESH
   * ========================================
   */

  useEffect(() => {
    loadDesk();

    const interval =
      window.setInterval(
        () => {
          loadDesk();
        },
        60_000
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

  /*
   * ========================================
   * LIVE PRICE FEED
   * ========================================
   */

  useEffect(() => {
    const connection =
      createBybitTickerSocket(
        UNIVERSE,

        (
          ticker: BybitLiveTicker
        ) => {
          setAssets(
            (
              current
            ) =>
              current.map(
                (
                  asset
                ) => {
                  if (
                    asset.symbol !==
                    ticker.symbol
                  ) {
                    return asset;
                  }

                  return {
                    ...asset,

                    price:
                      ticker.lastPrice,

                    change24h:
                      ticker.price24hChange,
                  };
                }
              )
          );

          setLastUpdated(
            new Date()
          );
        },

        setLiveStatus,

        (
          socketError
        ) => {
          setError(
            socketError.message
          );
        }
      );

    return () => {
      connection.close();
    };
  }, []);

  /*
   * ========================================
   * ACTIONS
   * ========================================
   */

  function toggleWatch(
    symbol: string
  ) {
    setWatchedSymbols(
      (
        current
      ) => {
        if (
          current.includes(
            symbol
          )
        ) {
          return current.filter(
            (
              item
            ) =>
              item !==
              symbol
          );
        }

        return [
          ...current,
          symbol,
        ];
      }
    );
  }

  function resetWatchlist() {
    setWatchedSymbols(
      DEFAULT_WATCHLIST
    );
  }

  /*
   * ========================================
   * DERIVED
   * ========================================
   */

  const watchedAssets =
    useMemo(
      () =>
        watchedSymbols
          .map(
            (
              symbol
            ) =>
              assets.find(
                (
                  asset
                ) =>
                  asset.symbol ===
                  symbol
              )
          )
          .filter(
            (
              asset
            ): asset is WatchlistAsset =>
              Boolean(asset)
          ),
      [
        assets,
        watchedSymbols,
      ]
    );

  const actionableCount =
    watchedAssets.filter(
      (
        asset
      ) =>
        asset.actionable
    ).length;

  const bullishCount =
    watchedAssets.filter(
      (
        asset
      ) =>
        asset.bias ===
        "BULLISH"
    ).length;

  const bearishCount =
    watchedAssets.filter(
      (
        asset
      ) =>
        asset.bias ===
        "BEARISH"
    ).length;

  const bestScanner =
    watchedAssets.length >
    0
      ? [
          ...watchedAssets,
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
        )[0]
      : null;

  return (
    <HiddenAlphaShell>

      <div className="mx-auto max-w-[1700px] px-4 py-5 lg:px-5">

        {/* HEADER */}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

          <div>

            <div className="flex items-center gap-2">

              <h1 className="text-[20px] font-semibold tracking-[-0.03em] text-zinc-100">
                Watchlist
              </h1>

              <span className="rounded-md border border-amber-500/10 bg-amber-500/[0.06] px-2 py-1 text-[7px] font-semibold uppercase tracking-[0.12em] text-amber-400">
                Focus Desk
              </span>

            </div>

            <p className="mt-1 text-[9px] text-zinc-600">
              Personal monitoring queue for markets you care about most.
            </p>

          </div>

          <div className="flex items-center gap-3">

            <span
              className={`hidden items-center gap-2 text-[8px] sm:flex ${
                liveStatus ===
                "OPEN"
                  ? "text-emerald-400"
                  : "text-zinc-600"
              }`}
            >

              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  liveStatus ===
                  "OPEN"
                    ? "animate-pulse bg-emerald-400"
                    : "bg-zinc-700"
                }`}
              />

              {liveStatus ===
              "OPEN"
                ? "Live"
                : liveStatus}

            </span>

            <button
              onClick={() =>
                loadDesk(
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

        {/* SUMMARY */}

        <div className="mt-5 grid grid-cols-2 gap-2 xl:grid-cols-4">

          <SummaryCard
            icon={Star}
            label="Watching"
            value={`${watchedAssets.length} Assets`}
            tone="amber"
          />

          <SummaryCard
            icon={Zap}
            label="Actionable"
            value={`${actionableCount}`}
            tone={
              actionableCount >
              0
                ? "green"
                : "neutral"
            }
          />

          <SummaryCard
            icon={Activity}
            label="Market Split"
            value={`${bullishCount}B / ${bearishCount}S`}
          />

          <SummaryCard
            icon={Radar}
            label="Best Scanner"
            value={
              bestScanner
                ? `${bestScanner.symbol.replace(
                    "USDT",
                    ""
                  )} ${
                    bestScanner.scannerScore ??
                    "—"
                  }`
                : "None"
            }
            tone={
              (
                bestScanner
                  ?.scannerScore ??
                0
              ) >= 75
                ? "purple"
                : "neutral"
            }
          />

        </div>

        {/* MY FOCUS */}

        <section className="ha-panel mt-3 overflow-hidden">

          <div className="flex flex-col gap-4 border-b border-white/[0.05] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex items-center gap-3">

              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-500/10 bg-amber-500/[0.06]">

                <Star
                  size={13}
                  className="text-amber-400"
                />

              </div>

              <div>

                <h2 className="text-[11px] font-medium text-zinc-200">
                  My Focus
                </h2>

                <p className="mt-0.5 text-[7px] text-zinc-700">
                  Saved locally on this browser
                </p>

              </div>

            </div>

            <button
              onClick={
                resetWatchlist
              }
              className="text-[7px] font-medium text-zinc-600 transition hover:text-zinc-300"
            >
              Reset Watchlist
            </button>

          </div>

          {/* PICKER */}

          <div className="border-b border-white/[0.04] p-4">

            <div className="flex flex-wrap gap-2">

              {UNIVERSE.map(
                (
                  symbol
                ) => {
                  const watched =
                    watchedSymbols.includes(
                      symbol
                    );

                  return (
                    <button
                      key={
                        symbol
                      }
                      onClick={() =>
                        toggleWatch(
                          symbol
                        )
                      }
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[8px] transition ${
                        watched
                          ? "border-amber-500/15 bg-amber-500/[0.06] text-amber-400"
                          : "border-white/[0.05] bg-white/[0.015] text-zinc-600 hover:text-zinc-300"
                      }`}
                    >

                      {watched ? (
                        <Check
                          size={10}
                        />
                      ) : (
                        <Plus
                          size={10}
                        />
                      )}

                      {symbol}

                    </button>
                  );
                }
              )}

            </div>

          </div>

          {/* EMPTY */}

          {!loading &&
            watchedAssets.length ===
              0 && (
              <div className="flex min-h-[260px] items-center justify-center p-5">

                <div className="max-w-[380px] text-center">

                  <Star
                    size={22}
                    className="mx-auto text-zinc-700"
                  />

                  <h3 className="mt-3 text-[11px] font-medium text-zinc-400">
                    Watchlist is empty
                  </h3>

                  <p className="mt-2 text-[8px] leading-5 text-zinc-700">
                    Select BTC, ETH or SOL above to begin monitoring it.
                  </p>

                </div>

              </div>
            )}

          {/* CARDS */}

          {watchedAssets.length >
            0 && (
            <div className="grid gap-3 p-4 xl:grid-cols-3">

              {watchedAssets.map(
                (
                  asset
                ) => (
                  <WatchCard
                    key={
                      asset.symbol
                    }
                    asset={
                      asset
                    }
                    onRemove={() =>
                      toggleWatch(
                        asset.symbol
                      )
                    }
                  />
                )
              )}

            </div>
          )}

        </section>

        {/* MONITOR TABLE */}

        <section className="ha-panel mt-3 overflow-hidden">

          <div className="flex items-center justify-between border-b border-white/[0.05] px-5 py-4">

            <div>

              <h2 className="text-[11px] font-medium text-zinc-200">
                Focus Monitor
              </h2>

              <p className="mt-0.5 text-[7px] text-zinc-700">
                Market context + scanner intelligence + official signal state
              </p>

            </div>

            {lastUpdated && (
              <span className="text-[7px] text-zinc-700">
                {lastUpdated.toLocaleTimeString()}
              </span>
            )}

          </div>

          <div className="overflow-x-auto">

            <table className="w-full min-w-[1050px]">

              <thead>

                <tr className="border-b border-white/[0.04] text-left">

                  {[
                    "Market",
                    "Price",
                    "24H",
                    "Alpha Bias",
                    "Confidence",
                    "Scanner",
                    "Candidate",
                    "Freshness",
                    "Official Signal",
                    "",
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

                {watchedAssets.map(
                  (
                    asset
                  ) => {
                    const positive =
                      (
                        asset.change24h ??
                        0
                      ) >= 0;

                    return (
                      <tr
                        key={
                          asset.symbol
                        }
                        className="border-b border-white/[0.035] last:border-0 hover:bg-white/[0.01]"
                      >

                        <td className="px-5 py-4">

                          <p className="text-[9px] font-medium text-zinc-300">
                            {asset.symbol}
                          </p>

                          <p className="mt-1 text-[7px] text-zinc-700">
                            Bybit Perpetual
                          </p>

                        </td>

                        <td className="ha-number px-5 py-4 text-[9px] text-zinc-300">
                          {formatPrice(
                            asset.price
                          )}
                        </td>

                        <td className="px-5 py-4">

                          <span
                            className={`text-[8px] ${
                              asset.change24h ===
                              null
                                ? "text-zinc-700"
                                : positive
                                ? "text-emerald-400"
                                : "text-red-400"
                            }`}
                          >
                            {asset.change24h !==
                            null
                              ? `${
                                  positive
                                    ? "+"
                                    : ""
                                }${asset.change24h.toFixed(
                                  2
                                )}%`
                              : "—"}
                          </span>

                        </td>

                        <td className="px-5 py-4">

                          <span
                            className={`text-[8px] font-medium ${directionClass(
                              asset.bias
                            )}`}
                          >
                            {prettyDirection(
                              asset.bias
                            )}
                          </span>

                        </td>

                        <td className="px-5 py-4 text-[8px] text-zinc-500">
                          {asset.alphaConfidence !==
                          null
                            ? `${asset.alphaConfidence}%`
                            : "—"}
                        </td>

                        <td className="ha-number px-5 py-4 text-[9px] font-medium text-violet-400">
                          {asset.scannerScore ??
                            "—"}
                        </td>

                        <td className="px-5 py-4">

                          <TradeBadge
                            direction={
                              asset.signalDirection
                            }
                          />

                        </td>

                        <td
                          className={`px-5 py-4 text-[7px] font-medium ${freshnessClass(
                            asset.freshness
                          )}`}
                        >
                          {asset.freshness ??
                            "—"}
                        </td>

                        <td className="px-5 py-4">

                          {asset.activeSignal ? (
                            <span className="rounded-md border border-violet-500/10 bg-violet-500/[0.06] px-2 py-1 text-[7px] font-medium text-violet-400">
                              {asset.activeSignalDirection} •{" "}
                              {asset.activeLifecycle}
                            </span>
                          ) : (
                            <span className="text-[7px] text-zinc-700">
                              None
                            </span>
                          )}

                        </td>

                        <td className="px-5 py-4">

                          <button
                            onClick={() =>
                              toggleWatch(
                                asset.symbol
                              )
                            }
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.05] bg-white/[0.01] text-zinc-700 transition hover:text-red-400"
                          >

                            <X
                              size={10}
                            />

                          </button>

                        </td>

                      </tr>
                    );
                  }
                )}

              </tbody>

            </table>

          </div>

        </section>

        {/* DESK EXPLANATION */}

        <div className="mt-3 grid gap-3 lg:grid-cols-3">

          <InfoCard
            icon={BarChart3}
            title="Market Context"
            description="Tracks the current 1H Alpha bias and confidence without rewriting published signals."
          />

          <InfoCard
            icon={Radar}
            title="Scanner State"
            description="Shows the latest opportunity score and freshness for each focused market."
          />

          <InfoCard
            icon={Zap}
            title="Official Signal"
            description="Makes it clear when a watched asset already has an official published HiddenAlpha signal."
          />

        </div>

      </div>

    </HiddenAlphaShell>
  );
}

function WatchCard({
  asset,
  onRemove,
}: {
  asset: WatchlistAsset;

  onRemove: () => void;
}) {
  const positive =
    (
      asset.change24h ??
      0
    ) >= 0;

  return (
    <div className="rounded-xl border border-white/[0.055] bg-[#090c12] p-4 transition hover:border-white/[0.09]">

      <div className="flex items-start justify-between gap-3">

        <div className="flex items-center gap-3">

          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-500/10 bg-amber-500/[0.05] text-[8px] font-semibold text-amber-400">
            {asset.symbol.replace(
              "USDT",
              ""
            )}
          </div>

          <div>

            <p className="text-[10px] font-medium text-zinc-200">
              {asset.symbol}
            </p>

            <p className="mt-1 text-[7px] text-zinc-700">
              Focus Asset
            </p>

          </div>

        </div>

        <button
          onClick={
            onRemove
          }
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.05] bg-white/[0.01] text-zinc-700 transition hover:text-red-400"
        >

          <X
            size={10}
          />

        </button>

      </div>

      <div className="mt-5 flex items-end justify-between">

        <div>

          <p className="ha-number text-[19px] font-semibold text-zinc-100">
            {formatPrice(
              asset.price
            )}
          </p>

          <p
            className={`mt-1 flex items-center gap-1 text-[8px] ${
              asset.change24h ===
              null
                ? "text-zinc-700"
                : positive
                ? "text-emerald-400"
                : "text-red-400"
            }`}
          >
            {asset.change24h !==
            null ? (
              <>
                {positive ? (
                  <TrendingUp
                    size={9}
                  />
                ) : (
                  <TrendingDown
                    size={9}
                  />
                )}

                {positive
                  ? "+"
                  : ""}

                {asset.change24h.toFixed(
                  2
                )}
                %
              </>
            ) : (
              "24H —"
            )}
          </p>

        </div>

        <div className="text-right">

          <p className="text-[6px] uppercase tracking-[0.1em] text-zinc-700">
            Alpha
          </p>

          <p
            className={`mt-1 text-[9px] font-medium ${directionClass(
              asset.bias
            )}`}
          >
            {prettyDirection(
              asset.bias
            )}
          </p>

        </div>

      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/[0.04] pt-3">

        <SmallMetric
          label="Alpha"
          value={
            asset.alphaScore !==
            null
              ? `${
                  asset.alphaScore >
                  0
                    ? "+"
                    : ""
                }${asset.alphaScore}`
              : "—"
          }
        />

        <SmallMetric
          label="Scanner"
          value={
            asset.scannerScore !==
            null
              ? `${asset.scannerScore}`
              : "—"
          }
        />

        <SmallMetric
          label="Confidence"
          value={
            asset.alphaConfidence !==
            null
              ? `${asset.alphaConfidence}%`
              : "—"
          }
        />

      </div>

      <div className="mt-3 flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.01] px-3 py-2">

        <div>

          <p className="text-[6px] uppercase tracking-[0.1em] text-zinc-700">
            Scanner Candidate
          </p>

          <div className="mt-1">
            <TradeBadge
              direction={
                asset.signalDirection
              }
            />
          </div>

        </div>

        <div className="text-right">

          <p className="text-[6px] uppercase tracking-[0.1em] text-zinc-700">
            Freshness
          </p>

          <p
            className={`mt-1 text-[7px] font-medium ${freshnessClass(
              asset.freshness
            )}`}
          >
            {asset.freshness ??
              "—"}
          </p>

        </div>

      </div>

      {asset.activeSignal && (
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-violet-500/10 bg-violet-500/[0.04] px-3 py-2">

          <Zap
            size={9}
            className="text-violet-400"
          />

          <p className="text-[7px] font-medium text-violet-400">
            Official{" "}
            {
              asset.activeSignalDirection
            }{" "}
            •{" "}
            {
              asset.activeLifecycle
            }
          </p>

        </div>
      )}

    </div>
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
    | "purple"
    | "amber";
}) {
  const className =
    tone === "green"
      ? "text-emerald-400"
      : tone ===
        "purple"
      ? "text-violet-400"
      : tone ===
        "amber"
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
        className={`mt-2 text-[10px] font-medium ${className}`}
      >
        {value}
      </p>

    </div>
  );
}

function TradeBadge({
  direction,
}: {
  direction:
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
    <span className="rounded-md border border-white/[0.05] bg-white/[0.02] px-2 py-1 text-[7px] text-zinc-600">
      WAIT
    </span>
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

function InfoCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Activity;

  title: string;

  description: string;
}) {
  return (
    <div className="ha-panel p-4">

      <div className="flex items-center gap-2">

        <Icon
          size={11}
          className="text-violet-400"
        />

        <p className="text-[9px] font-medium text-zinc-400">
          {title}
        </p>

      </div>

      <p className="mt-2 text-[7px] leading-4 text-zinc-700">
        {description}
      </p>

    </div>
  );
}
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  BrainCircuit,
  Gauge,
  Radio,
  RefreshCw,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  Waves,
} from "lucide-react";

import HiddenAlphaShell from "@/components/hiddenalpha-shell";
import MarketCandleChart from "@/components/markets/market-candle-chart";

import {
  createBybitTickerSocket,
  BybitLiveTicker,
} from "@/lib/market-data/bybit-live";

type Direction =
  | "BULLISH"
  | "BEARISH"
  | "NEUTRAL";

type Market = {
  symbol: string;

  price: number | null;
  change24h: number | null;

  bidPrice: number | null;
  askPrice: number | null;
  markPrice: number | null;

  bias: Direction;

  score: number | null;
  confidence: number | null;

  trendDirection: Direction;
  trendStrength: number | null;

  momentumDirection: Direction;
  momentumStrength: number | null;

  volumeCondition: string;
  volumeRatio: number | null;

  volatilityLevel: string;
  volatilityPercentage: number | null;

  rsi: number | null;
  ema20: number | null;
  ema50: number | null;
  atr: number | null;
};

type MtfContext = {
  timeframe: string;

  bias: Direction;

  score: number | null;
  confidence: number | null;

  trendDirection: Direction;
  momentumDirection: Direction;

  volumeCondition: string;
  volatilityLevel: string;

  success: boolean;
};

type BreadthAsset = {
  symbol: string;

  contexts: MtfContext[];

  dominantBias: Direction;

  alignment: number;

  compositeScore: number;
};

const SYMBOLS = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
];

const CHART_TIMEFRAMES = [
  "1m",
  "5m",
  "15m",
  "1h",
];

const MTF_TIMEFRAMES = [
  "1m",
  "5m",
  "15m",
  "1h",
];

const emptyMarkets: Market[] =
  SYMBOLS.map(
    (symbol) => ({
      symbol,

      price: null,
      change24h: null,

      bidPrice: null,
      askPrice: null,
      markPrice: null,

      bias: "NEUTRAL",

      score: null,
      confidence: null,

      trendDirection:
        "NEUTRAL",

      trendStrength: null,

      momentumDirection:
        "NEUTRAL",

      momentumStrength:
        null,

      volumeCondition:
        "—",

      volumeRatio: null,

      volatilityLevel:
        "—",

      volatilityPercentage:
        null,

      rsi: null,
      ema20: null,
      ema50: null,
      atr: null,
    })
  );

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

function formatNumber(
  value:
    | number
    | null,
  digits = 1
) {
  if (
    value === null ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  return value.toFixed(
    digits
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

function directionBg(
  direction: Direction
) {
  if (
    direction ===
    "BULLISH"
  ) {
    return "border-emerald-500/10 bg-emerald-500/[0.06]";
  }

  if (
    direction ===
    "BEARISH"
  ) {
    return "border-red-500/10 bg-red-500/[0.06]";
  }

  return "border-white/[0.05] bg-white/[0.015]";
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

function calculateBreadthAsset(
  symbol: string,
  contexts: MtfContext[]
): BreadthAsset {
  const valid =
    contexts.filter(
      (item) =>
        item.success
    );

  if (
    valid.length === 0
  ) {
    return {
      symbol,
      contexts,
      dominantBias:
        "NEUTRAL",
      alignment: 0,
      compositeScore: 0,
    };
  }

  const bullish =
    valid.filter(
      (item) =>
        item.bias ===
        "BULLISH"
    ).length;

  const bearish =
    valid.filter(
      (item) =>
        item.bias ===
        "BEARISH"
    ).length;

  const neutral =
    valid.filter(
      (item) =>
        item.bias ===
        "NEUTRAL"
    ).length;

  let dominantBias:
    Direction =
      "NEUTRAL";

  let dominantCount =
    neutral;

  if (
    bullish >
      bearish &&
    bullish >
      neutral
  ) {
    dominantBias =
      "BULLISH";

    dominantCount =
      bullish;
  } else if (
    bearish >
      bullish &&
    bearish >
      neutral
  ) {
    dominantBias =
      "BEARISH";

    dominantCount =
      bearish;
  }

  const alignment =
    (
      dominantCount /
      valid.length
    ) *
    100;

  const scores =
    valid
      .map(
        (item) =>
          item.score
      )
      .filter(
        (
          value
        ): value is number =>
          value !== null
      );

  const compositeScore =
    scores.length > 0
      ? scores.reduce(
          (
            total,
            score
          ) =>
            total +
            score,
          0
        ) /
        scores.length
      : 0;

  return {
    symbol,
    contexts,
    dominantBias,
    alignment,
    compositeScore,
  };
}

export default function MarketsPage() {
  const [
    markets,
    setMarkets,
  ] =
    useState<Market[]>(
      emptyMarkets
    );

  const [
    selectedSymbol,
    setSelectedSymbol,
  ] =
    useState(
      "BTCUSDT"
    );

  const [
    selectedTimeframe,
    setSelectedTimeframe,
  ] =
    useState("15m");

  const [
    selectedMtf,
    setSelectedMtf,
  ] =
    useState<MtfContext[]>(
      []
    );

  const [
    breadthAssets,
    setBreadthAssets,
  ] =
    useState<BreadthAsset[]>(
      []
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    mtfLoading,
    setMtfLoading,
  ] = useState(true);

  const [
    breadthLoading,
    setBreadthLoading,
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
   * FETCH CONTEXT
   * ========================================
   */

  const fetchContext =
    useCallback(
      async (
        symbol: string,
        timeframe: string
      ): Promise<MtfContext> => {
        try {
          const response =
            await fetch(
              `/api/trading/context?symbol=${symbol}&timeframe=${timeframe}`,
              {
                cache:
                  "no-store",
              }
            );

          const data =
            await response.json();

          if (
            !response.ok ||
            !data.success ||
            !data.alpha
          ) {
            return {
              timeframe,

              bias:
                "NEUTRAL",

              score: null,

              confidence:
                null,

              trendDirection:
                "NEUTRAL",

              momentumDirection:
                "NEUTRAL",

              volumeCondition:
                "—",

              volatilityLevel:
                "—",

              success:
                false,
            };
          }

          const alpha =
            data.alpha;

          return {
            timeframe,

            bias:
              normalizeDirection(
                alpha.market
                  ?.bias
              ),

            score:
              numberValue(
                alpha.market
                  ?.score
              ),

            confidence:
              numberValue(
                alpha.market
                  ?.confidence
              ),

            trendDirection:
              normalizeDirection(
                alpha.trend
                  ?.direction
              ),

            momentumDirection:
              normalizeDirection(
                alpha.momentum
                  ?.direction
              ),

            volumeCondition:
              String(
                alpha.volume
                  ?.condition ??
                  "—"
              ),

            volatilityLevel:
              String(
                alpha.volatility
                  ?.level ??
                  "—"
              ),

            success:
              true,
          };
        } catch {
          return {
            timeframe,

            bias:
              "NEUTRAL",

            score: null,

            confidence: null,

            trendDirection:
              "NEUTRAL",

            momentumDirection:
              "NEUTRAL",

            volumeCondition:
              "—",

            volatilityLevel:
              "—",

            success:
              false,
          };
        }
      },
      []
    );

  /*
   * ========================================
   * MARKET INTELLIGENCE
   * ========================================
   */

  const loadMarkets =
    useCallback(
      async (
        manual = false
      ) => {
        if (manual) {
          setRefreshing(true);
        }

        try {
          const results =
            await Promise.all(
              SYMBOLS.map(
                async (
                  symbol
                ) => {
                  const [
                    contextResponse,
                    indicatorsResponse,
                  ] =
                    await Promise.all([
                      fetch(
                        `/api/trading/context?symbol=${symbol}&timeframe=1h`,
                        {
                          cache:
                            "no-store",
                        }
                      ),

                      fetch(
                        `/api/trading/indicators?symbol=${symbol}&timeframe=1h`,
                        {
                          cache:
                            "no-store",
                        }
                      ),
                    ]);

                  const [
                    contextData,
                    indicatorsData,
                  ] =
                    await Promise.all([
                      contextResponse.json(),
                      indicatorsResponse.json(),
                    ]);

                  if (
                    !contextResponse.ok ||
                    !contextData.success ||
                    !contextData.alpha
                  ) {
                    throw new Error(
                      contextData.error ??
                        `Failed to load ${symbol}`
                    );
                  }

                  const alpha =
                    contextData.alpha;

                  const indicators =
                    indicatorsData
                      ?.indicators ??
                    {};

                  return {
                    symbol,

                    price:
                      numberValue(
                        indicators.price
                      ),

                    change24h:
                      null,

                    bidPrice:
                      null,

                    askPrice:
                      null,

                    markPrice:
                      null,

                    bias:
                      normalizeDirection(
                        alpha.market
                          ?.bias
                      ),

                    score:
                      numberValue(
                        alpha.market
                          ?.score
                      ),

                    confidence:
                      numberValue(
                        alpha.market
                          ?.confidence
                      ),

                    trendDirection:
                      normalizeDirection(
                        alpha.trend
                          ?.direction
                      ),

                    trendStrength:
                      numberValue(
                        alpha.trend
                          ?.strength
                      ),

                    momentumDirection:
                      normalizeDirection(
                        alpha.momentum
                          ?.direction
                      ),

                    momentumStrength:
                      numberValue(
                        alpha.momentum
                          ?.strength
                      ),

                    volumeCondition:
                      String(
                        alpha.volume
                          ?.condition ??
                          "—"
                      ),

                    volumeRatio:
                      numberValue(
                        alpha.volume
                          ?.ratio
                      ),

                    volatilityLevel:
                      String(
                        alpha.volatility
                          ?.level ??
                          "—"
                      ),

                    volatilityPercentage:
                      numberValue(
                        alpha.volatility
                          ?.percentage
                      ),

                    rsi:
                      numberValue(
                        indicators.rsi14
                      ),

                    ema20:
                      numberValue(
                        indicators.ema20
                      ),

                    ema50:
                      numberValue(
                        indicators.ema50
                      ),

                    atr:
                      numberValue(
                        indicators.atr14
                      ),
                  } satisfies Market;
                }
              )
            );

          setMarkets(
            (
              current
            ) =>
              results.map(
                (
                  nextMarket
                ) => {
                  const previous =
                    current.find(
                      (
                        item
                      ) =>
                        item.symbol ===
                        nextMarket.symbol
                    );

                  return {
                    ...nextMarket,

                    price:
                      previous
                        ?.price ??
                      nextMarket.price,

                    change24h:
                      previous
                        ?.change24h ??
                      null,

                    bidPrice:
                      previous
                        ?.bidPrice ??
                      null,

                    askPrice:
                      previous
                        ?.askPrice ??
                      null,

                    markPrice:
                      previous
                        ?.markPrice ??
                      null,
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
              : "Failed to load market intelligence"
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
   * SELECTED MARKET MTF
   * ========================================
   */

  const loadSelectedMtf =
    useCallback(
      async () => {
        setMtfLoading(
          true
        );

        try {
          const results =
            await Promise.all(
              MTF_TIMEFRAMES.map(
                (
                  timeframe
                ) =>
                  fetchContext(
                    selectedSymbol,
                    timeframe
                  )
              )
            );

          setSelectedMtf(
            results
          );
        } finally {
          setMtfLoading(
            false
          );
        }
      },
      [
        fetchContext,
        selectedSymbol,
      ]
    );

  /*
   * ========================================
   * GLOBAL MARKET BREADTH
   * ========================================
   *
   * BTC / ETH / SOL
   * ×
   * 1m / 5m / 15m / 1h
   */

  const loadBreadth =
    useCallback(
      async () => {
        setBreadthLoading(
          true
        );

        try {
          const assets =
            await Promise.all(
              SYMBOLS.map(
                async (
                  symbol
                ) => {
                  const contexts =
                    await Promise.all(
                      MTF_TIMEFRAMES.map(
                        (
                          timeframe
                        ) =>
                          fetchContext(
                            symbol,
                            timeframe
                          )
                      )
                    );

                  return calculateBreadthAsset(
                    symbol,
                    contexts
                  );
                }
              )
            );

          setBreadthAssets(
            assets
          );
        } finally {
          setBreadthLoading(
            false
          );
        }
      },
      [
        fetchContext,
      ]
    );

  /*
   * ========================================
   * REFRESH
   * ========================================
   */

  useEffect(() => {
    loadMarkets();
    loadBreadth();

    const interval =
      window.setInterval(
        () => {
          loadMarkets();
          loadBreadth();
        },
        60_000
      );

    function handlePipelineComplete() {
      loadMarkets();
      loadBreadth();
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
    loadMarkets,
    loadBreadth,
  ]);

  useEffect(() => {
    loadSelectedMtf();

    function handlePipelineComplete() {
      loadSelectedMtf();
    }

    window.addEventListener(
      "hiddenalpha:signal-pipeline-complete",
      handlePipelineComplete
    );

    return () => {
      window.removeEventListener(
        "hiddenalpha:signal-pipeline-complete",
        handlePipelineComplete
      );
    };
  }, [
    loadSelectedMtf,
  ]);

  /*
   * ========================================
   * BYBIT WEBSOCKET
   * ========================================
   */

  useEffect(() => {
    const connection =
      createBybitTickerSocket(
        SYMBOLS,

        (
          ticker: BybitLiveTicker
        ) => {
          setMarkets(
            (
              current
            ) =>
              current.map(
                (
                  market
                ) => {
                  if (
                    market.symbol !==
                    ticker.symbol
                  ) {
                    return market;
                  }

                  return {
                    ...market,

                    price:
                      ticker.lastPrice,

                    change24h:
                      ticker.price24hChange,

                    bidPrice:
                      ticker.bidPrice,

                    askPrice:
                      ticker.askPrice,

                    markPrice:
                      ticker.markPrice,
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
   * DERIVED MARKET STATE
   * ========================================
   */

  const selectedMarket =
    useMemo(
      () =>
        markets.find(
          (
            market
          ) =>
            market.symbol ===
            selectedSymbol
        ) ??
        markets[0],
      [
        markets,
        selectedSymbol,
      ]
    );

  const bullishCount =
    markets.filter(
      (
        market
      ) =>
        market.bias ===
        "BULLISH"
    ).length;

  const bearishCount =
    markets.filter(
      (
        market
      ) =>
        market.bias ===
        "BEARISH"
    ).length;

  const neutralCount =
    markets.filter(
      (
        market
      ) =>
        market.bias ===
        "NEUTRAL"
    ).length;

  const deskBias:
    Direction =
      bullishCount >
      bearishCount &&
      bullishCount >
      neutralCount
        ? "BULLISH"
        : bearishCount >
            bullishCount &&
          bearishCount >
            neutralCount
        ? "BEARISH"
        : "NEUTRAL";

  const marketAlignment =
    breadthAssets.length >
    0
      ? breadthAssets.reduce(
          (
            total,
            asset
          ) =>
            total +
            asset.alignment,
          0
        ) /
        breadthAssets.length
      : 0;

  const strongestAsset =
    breadthAssets.length >
    0
      ? [
          ...breadthAssets,
        ].sort(
          (
            a,
            b
          ) =>
            b.compositeScore -
            a.compositeScore
        )[0]
      : null;

  const weakestAsset =
    breadthAssets.length >
    0
      ? [
          ...breadthAssets,
        ].sort(
          (
            a,
            b
          ) =>
            a.compositeScore -
            b.compositeScore
        )[0]
      : null;

  const highVolatilityCount =
    markets.filter(
      (
        market
      ) =>
        market.volatilityLevel ===
        "HIGH"
    ).length;

  const lowVolatilityCount =
    markets.filter(
      (
        market
      ) =>
        market.volatilityLevel ===
        "LOW"
    ).length;

  const riskEnvironment =
    highVolatilityCount >= 2
      ? "ELEVATED"
      : lowVolatilityCount ===
        markets.length
      ? "CALM"
      : "NORMAL";

  const participation =
    marketAlignment >= 75 &&
    riskEnvironment !==
      "ELEVATED"
      ? "BROAD"
      : "SELECTIVE";

  const deskCondition =
    `${
      deskBias ===
      "NEUTRAL"
        ? "MIXED"
        : deskBias
    } / ${participation}`;

  return (
    <HiddenAlphaShell>

      <div className="mx-auto max-w-[1700px] px-4 py-5 lg:px-5">

        {/* HEADER */}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

          <div>

            <div className="flex items-center gap-2">

              <h1 className="text-[20px] font-semibold tracking-[-0.03em] text-zinc-100">
                Market
              </h1>

              <span className="rounded-md border border-cyan-500/10 bg-cyan-500/[0.06] px-2 py-1 text-[7px] font-semibold uppercase tracking-[0.12em] text-cyan-400">
                Intelligence Desk
              </span>

            </div>

            <p className="mt-1 text-[9px] text-zinc-600">
              Live market data, alpha context, breadth and multi-timeframe intelligence.
            </p>

          </div>

          <div className="flex items-center gap-3">

            <span
              className={`flex items-center gap-2 text-[8px] ${
                liveStatus ===
                "OPEN"
                  ? "text-emerald-400"
                  : liveStatus ===
                    "ERROR"
                  ? "text-red-400"
                  : "text-zinc-600"
              }`}
            >

              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  liveStatus ===
                  "OPEN"
                    ? "animate-pulse bg-emerald-400"
                    : liveStatus ===
                      "ERROR"
                    ? "bg-red-400"
                    : "bg-zinc-600"
                }`}
              />

              Bybit{" "}
              {liveStatus ===
              "OPEN"
                ? "Live"
                : liveStatus}

            </span>

            <button
              onClick={() => {
                loadMarkets(
                  true
                );

                loadSelectedMtf();

                loadBreadth();
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

              Refresh

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
            icon={Radio}
            label="Live Feed"
            value={
              liveStatus ===
              "OPEN"
                ? "Connected"
                : liveStatus
            }
            tone={
              liveStatus ===
              "OPEN"
                ? "green"
                : "neutral"
            }
          />

          <SummaryCard
            icon={
              BrainCircuit
            }
            label="Desk Bias"
            value={prettyDirection(
              deskBias
            )}
            direction={
              deskBias
            }
          />

          <SummaryCard
            icon={
              Activity
            }
            label="MTF Alignment"
            value={
              breadthLoading
                ? "Analyzing"
                : `${marketAlignment.toFixed(
                    0
                  )}%`
            }
            tone={
              marketAlignment >=
              70
                ? "green"
                : "neutral"
            }
          />

          <SummaryCard
            icon={
              ShieldAlert
            }
            label="Risk Environment"
            value={
              riskEnvironment
            }
            tone={
              riskEnvironment ===
              "CALM"
                ? "green"
                : riskEnvironment ===
                  "ELEVATED"
                ? "red"
                : "neutral"
            }
          />

        </div>

        {/* MARKET BREADTH */}

        <section className="ha-panel ha-purple-glow mt-3 overflow-hidden">

          <div className="flex flex-col gap-4 border-b border-white/[0.05] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">

            <div className="flex items-center gap-3">

              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet-500/10 bg-violet-500/[0.07]">

                <BrainCircuit
                  size={13}
                  className="text-violet-400"
                />

              </div>

              <div>

                <h2 className="text-[11px] font-medium text-zinc-200">
                  Crypto Market State
                </h2>

                <p className="mt-0.5 text-[7px] text-zinc-700">
                  Cross-asset breadth across BTC, ETH and SOL
                </p>

              </div>

            </div>

            <div className="text-left lg:text-right">

              <p className="text-[7px] uppercase tracking-[0.1em] text-zinc-700">
                Desk Condition
              </p>

              <p
                className={`mt-1 text-[12px] font-semibold ${
                  deskBias ===
                  "BULLISH"
                    ? "text-emerald-400"
                    : deskBias ===
                      "BEARISH"
                    ? "text-red-400"
                    : "text-amber-400"
                }`}
              >
                {breadthLoading
                  ? "ANALYZING"
                  : deskCondition}
              </p>

            </div>

          </div>

          <div className="p-5">

            <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">

              <BreadthMetric
                label="Breadth"
                value={`${bullishCount}B / ${bearishCount}S / ${neutralCount}N`}
              />

              <BreadthMetric
                label="MTF Alignment"
                value={
                  breadthLoading
                    ? "—"
                    : `${marketAlignment.toFixed(
                        0
                      )}%`
                }
              />

              <BreadthMetric
                label="Strongest"
                value={
                  strongestAsset
                    ? strongestAsset.symbol.replace(
                        "USDT",
                        ""
                      )
                    : "—"
                }
                detail={
                  strongestAsset
                    ? `Score ${strongestAsset.compositeScore.toFixed(
                        1
                      )}`
                    : undefined
                }
              />

              <BreadthMetric
                label="Weakest"
                value={
                  weakestAsset
                    ? weakestAsset.symbol.replace(
                        "USDT",
                        ""
                      )
                    : "—"
                }
                detail={
                  weakestAsset
                    ? `Score ${weakestAsset.compositeScore.toFixed(
                        1
                      )}`
                    : undefined
                }
              />

              <BreadthMetric
                label="Environment"
                value={
                  riskEnvironment
                }
              />

            </div>

            <div className="mt-3 grid gap-2 lg:grid-cols-3">

              {breadthAssets.map(
                (
                  asset
                ) => (
                  <div
                    key={
                      asset.symbol
                    }
                    className={`rounded-xl border p-4 ${directionBg(
                      asset.dominantBias
                    )}`}
                  >

                    <div className="flex items-start justify-between">

                      <div>

                        <p className="text-[10px] font-medium text-zinc-300">
                          {asset.symbol}
                        </p>

                        <p className="mt-1 text-[7px] text-zinc-700">
                          Cross-timeframe state
                        </p>

                      </div>

                      <DirectionBadge
                        direction={
                          asset.dominantBias
                        }
                      />

                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">

                      <MiniStat
                        label="Alignment"
                        value={`${asset.alignment.toFixed(
                          0
                        )}%`}
                      />

                      <MiniStat
                        label="Composite"
                        value={`${
                          asset.compositeScore >
                          0
                            ? "+"
                            : ""
                        }${asset.compositeScore.toFixed(
                          1
                        )}`}
                      />

                    </div>

                    <div className="mt-4 flex gap-1">

                      {MTF_TIMEFRAMES.map(
                        (
                          timeframe
                        ) => {
                          const context =
                            asset.contexts.find(
                              (
                                item
                              ) =>
                                item.timeframe ===
                                timeframe
                            );

                          const bias =
                            context?.bias ??
                            "NEUTRAL";

                          return (
                            <div
                              key={
                                timeframe
                              }
                              className="flex-1"
                            >

                              <div
                                className={`h-1 rounded-full ${
                                  bias ===
                                  "BULLISH"
                                    ? "bg-emerald-400"
                                    : bias ===
                                      "BEARISH"
                                    ? "bg-red-400"
                                    : "bg-zinc-700"
                                }`}
                              />

                              <p className="mt-1 text-center text-[6px] text-zinc-700">
                                {timeframe}
                              </p>

                            </div>
                          );
                        }
                      )}

                    </div>

                  </div>
                )
              )}

            </div>

          </div>

        </section>

        {/* ASSET SELECTOR */}

        <div className="mt-3 grid gap-3 lg:grid-cols-3">

          {markets.map(
            (
              market
            ) => {
              const selected =
                market.symbol ===
                selectedSymbol;

              const positive =
                (
                  market.change24h ??
                  0
                ) >= 0;

              return (
                <button
                  key={
                    market.symbol
                  }
                  onClick={() =>
                    setSelectedSymbol(
                      market.symbol
                    )
                  }
                  className={`rounded-xl border p-4 text-left transition ${
                    selected
                      ? "border-violet-500/25 bg-violet-500/[0.055]"
                      : "border-white/[0.055] bg-[#090c12] hover:border-white/[0.09]"
                  }`}
                >

                  <div className="flex items-start justify-between">

                    <div>

                      <p className="text-[11px] font-medium text-zinc-200">
                        {market.symbol}
                      </p>

                      <p className="mt-1 text-[7px] text-zinc-700">
                        Bybit Perpetual
                      </p>

                    </div>

                    <DirectionBadge
                      direction={
                        market.bias
                      }
                    />

                  </div>

                  <div className="mt-5 flex items-end justify-between">

                    <div>

                      <p className="ha-number text-[20px] font-semibold text-zinc-100">
                        {formatPrice(
                          market.price
                        )}
                      </p>

                      <p
                        className={`mt-1 flex items-center gap-1 text-[8px] ${
                          market.change24h ===
                          null
                            ? "text-zinc-700"
                            : positive
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >

                        {market.change24h !==
                        null ? (
                          <>
                            {positive ? (
                              <ArrowUpRight
                                size={9}
                              />
                            ) : (
                              <ArrowDownRight
                                size={9}
                              />
                            )}

                            {positive
                              ? "+"
                              : ""}

                            {market.change24h.toFixed(
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

                      <p className="text-[7px] uppercase tracking-[0.1em] text-zinc-700">
                        Alpha Score
                      </p>

                      <p
                        className={`ha-number mt-1 text-[13px] font-semibold ${directionClass(
                          market.bias
                        )}`}
                      >
                        {market.score !==
                        null
                          ? `${
                              market.score >
                              0
                                ? "+"
                                : ""
                            }${market.score}`
                          : "—"}
                      </p>

                    </div>

                  </div>

                </button>
              );
            }
          )}

        </div>

        {selectedMarket && (
          <>
            {/* CHART + CONTEXT */}

            <div className="mt-3 grid gap-3 xl:grid-cols-[1.5fr_0.7fr]">

              <section className="ha-panel overflow-hidden">

                <div className="flex flex-col gap-3 border-b border-white/[0.05] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

                  <div>

                    <div className="flex items-center gap-2">

                      <h2 className="text-[12px] font-medium text-zinc-100">
                        {selectedMarket.symbol}
                      </h2>

                      <DirectionBadge
                        direction={
                          selectedMarket.bias
                        }
                      />

                    </div>

                    <p className="mt-1 text-[8px] text-zinc-700">
                      Live price action • Bybit perpetual
                    </p>

                  </div>

                  <div className="flex items-center gap-1 rounded-lg border border-white/[0.05] bg-white/[0.015] p-1">

                    {CHART_TIMEFRAMES.map(
                      (
                        timeframe
                      ) => (
                        <button
                          key={
                            timeframe
                          }
                          onClick={() =>
                            setSelectedTimeframe(
                              timeframe
                            )
                          }
                          className={`rounded-md px-3 py-1.5 text-[7px] font-medium ${
                            selectedTimeframe ===
                            timeframe
                              ? "bg-violet-600 text-white"
                              : "text-zinc-600"
                          }`}
                        >
                          {timeframe}
                        </button>
                      )
                    )}

                  </div>

                </div>

                <div className="p-2">

                  <MarketCandleChart
                    symbol={
                      selectedMarket.symbol
                    }
                    timeframe={
                      selectedTimeframe
                    }
                    livePrice={
                      selectedMarket.price
                    }
                  />

                </div>

              </section>

              <section className="ha-panel p-5">

                <div className="flex items-center gap-2">

                  <BrainCircuit
                    size={13}
                    className="text-violet-400"
                  />

                  <div>

                    <h2 className="text-[11px] font-medium text-zinc-200">
                      Alpha Context
                    </h2>

                    <p className="mt-0.5 text-[7px] text-zinc-700">
                      Current 1H analytical state
                    </p>

                  </div>

                </div>

                <div className="mt-5 rounded-xl border border-white/[0.05] bg-white/[0.012] p-4">

                  <p className="text-[7px] uppercase tracking-[0.1em] text-zinc-700">
                    Current Bias
                  </p>

                  <div className="mt-2 flex items-end justify-between">

                    <div>

                      <p
                        className={`text-[21px] font-semibold ${directionClass(
                          selectedMarket.bias
                        )}`}
                      >
                        {prettyDirection(
                          selectedMarket.bias
                        )}
                      </p>

                      <p className="mt-1 text-[7px] text-zinc-700">
                        {selectedMarket.confidence !==
                        null
                          ? `${selectedMarket.confidence}% confidence`
                          : "—"}
                      </p>

                    </div>

                    <p
                      className={`ha-number text-[18px] font-semibold ${directionClass(
                        selectedMarket.bias
                      )}`}
                    >
                      {selectedMarket.score !==
                      null
                        ? `${
                            selectedMarket.score >
                            0
                              ? "+"
                              : ""
                          }${selectedMarket.score}`
                        : "—"}
                    </p>

                  </div>

                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">

                  <ContextStat
                    icon={Activity}
                    label="Trend"
                    value={prettyDirection(
                      selectedMarket.trendDirection
                    )}
                    detail={
                      selectedMarket.trendStrength !==
                      null
                        ? `${formatNumber(
                            selectedMarket.trendStrength,
                            0
                          )}% strength`
                        : "—"
                    }
                    direction={
                      selectedMarket.trendDirection
                    }
                  />

                  <ContextStat
                    icon={Gauge}
                    label="Momentum"
                    value={prettyDirection(
                      selectedMarket.momentumDirection
                    )}
                    detail={
                      selectedMarket.momentumStrength !==
                      null
                        ? `${formatNumber(
                            selectedMarket.momentumStrength,
                            0
                          )}% strength`
                        : "—"
                    }
                    direction={
                      selectedMarket.momentumDirection
                    }
                  />

                  <ContextStat
                    icon={Waves}
                    label="Volume"
                    value={
                      selectedMarket.volumeCondition
                    }
                    detail={
                      selectedMarket.volumeRatio !==
                      null
                        ? `${selectedMarket.volumeRatio.toFixed(
                            2
                          )}x average`
                        : "—"
                    }
                  />

                  <ContextStat
                    icon={Gauge}
                    label="Volatility"
                    value={
                      selectedMarket.volatilityLevel
                    }
                    detail={
                      selectedMarket.volatilityPercentage !==
                      null
                        ? `${selectedMarket.volatilityPercentage.toFixed(
                            2
                          )}%`
                        : "ATR context"
                    }
                  />

                </div>

              </section>

            </div>

            {/* TECHNICAL + FEED */}

            <div className="mt-3 grid gap-3 lg:grid-cols-2">

              <section className="ha-panel p-5">

                <div className="flex items-center gap-2">

                  <BarChart3
                    size={12}
                    className="text-cyan-400"
                  />

                  <h2 className="text-[11px] font-medium text-zinc-200">
                    Technical Context
                  </h2>

                </div>

                <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">

                  <TechnicalStat
                    label="RSI 14"
                    value={formatNumber(
                      selectedMarket.rsi,
                      1
                    )}
                  />

                  <TechnicalStat
                    label="EMA 20"
                    value={formatPrice(
                      selectedMarket.ema20
                    )}
                  />

                  <TechnicalStat
                    label="EMA 50"
                    value={formatPrice(
                      selectedMarket.ema50
                    )}
                  />

                  <TechnicalStat
                    label="ATR 14"
                    value={formatNumber(
                      selectedMarket.atr,
                      2
                    )}
                  />

                </div>

              </section>

              <section className="ha-panel p-5">

                <div className="flex items-center gap-2">

                  <Radio
                    size={12}
                    className="text-violet-400"
                  />

                  <h2 className="text-[11px] font-medium text-zinc-200">
                    Live Market Feed
                  </h2>

                </div>

                <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">

                  <TechnicalStat
                    label="Last"
                    value={formatPrice(
                      selectedMarket.price
                    )}
                  />

                  <TechnicalStat
                    label="Bid"
                    value={formatPrice(
                      selectedMarket.bidPrice
                    )}
                  />

                  <TechnicalStat
                    label="Ask"
                    value={formatPrice(
                      selectedMarket.askPrice
                    )}
                  />

                  <TechnicalStat
                    label="Mark"
                    value={formatPrice(
                      selectedMarket.markPrice
                    )}
                  />

                </div>

              </section>

            </div>

            {/* SELECTED MTF */}

            <section className="ha-panel mt-3 p-5">

              <div className="flex items-center justify-between">

                <div className="flex items-center gap-2">

                  <Activity
                    size={13}
                    className="text-violet-400"
                  />

                  <div>

                    <h2 className="text-[11px] font-medium text-zinc-200">
                      Multi-Timeframe Intelligence
                    </h2>

                    <p className="mt-0.5 text-[7px] text-zinc-700">
                      {selectedMarket.symbol}
                    </p>

                  </div>

                </div>

                <span className="text-[7px] text-zinc-700">
                  1m → 5m → 15m → 1h
                </span>

              </div>

              <div className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-4">

                {MTF_TIMEFRAMES.map(
                  (
                    timeframe
                  ) => {
                    const context =
                      selectedMtf.find(
                        (
                          item
                        ) =>
                          item.timeframe ===
                          timeframe
                      );

                    const bias =
                      context?.bias ??
                      "NEUTRAL";

                    return (
                      <div
                        key={
                          timeframe
                        }
                        className={`rounded-xl border p-4 ${directionBg(
                          bias
                        )}`}
                      >

                        <div className="flex items-center justify-between">

                          <span className="text-[9px] font-semibold text-zinc-300">
                            {timeframe}
                          </span>

                          {bias ===
                          "BULLISH" ? (
                            <TrendingUp
                              size={11}
                              className="text-emerald-400"
                            />
                          ) : bias ===
                            "BEARISH" ? (
                            <TrendingDown
                              size={11}
                              className="text-red-400"
                            />
                          ) : (
                            <Activity
                              size={11}
                              className="text-zinc-600"
                            />
                          )}

                        </div>

                        <p
                          className={`mt-4 text-[12px] font-semibold ${directionClass(
                            bias
                          )}`}
                        >
                          {mtfLoading
                            ? "..."
                            : context?.success
                            ? prettyDirection(
                                bias
                              )
                            : "Unavailable"}
                        </p>

                        <div className="mt-4 space-y-2 border-t border-white/[0.04] pt-3">

                          <MtfRow
                            label="Score"
                            value={
                              context?.score !==
                                null &&
                              context?.score !==
                                undefined
                                ? `${
                                    context.score >
                                    0
                                      ? "+"
                                      : ""
                                  }${context.score}`
                                : "—"
                            }
                          />

                          <MtfRow
                            label="Confidence"
                            value={
                              context?.confidence !==
                                null &&
                              context?.confidence !==
                                undefined
                                ? `${context.confidence}%`
                                : "—"
                            }
                          />

                          <MtfRow
                            label="Trend"
                            value={
                              context
                                ? prettyDirection(
                                    context.trendDirection
                                  )
                                : "—"
                            }
                          />

                          <MtfRow
                            label="Momentum"
                            value={
                              context
                                ? prettyDirection(
                                    context.momentumDirection
                                  )
                                : "—"
                            }
                          />

                        </div>

                      </div>
                    );
                  }
                )}

              </div>

            </section>

            {/* MONITOR */}

            <section className="ha-panel mt-3 overflow-hidden">

              <div className="flex items-center justify-between border-b border-white/[0.05] px-5 py-4">

                <div>

                  <h2 className="text-[11px] font-medium text-zinc-200">
                    Market Monitor
                  </h2>

                  <p className="mt-0.5 text-[7px] text-zinc-700">
                    Live prices and analytical state
                  </p>

                </div>

                <span className="flex items-center gap-1.5 text-[7px] text-emerald-400">

                  <span className="ha-live-dot" />

                  BYBIT

                </span>

              </div>

              <div className="overflow-x-auto">

                <table className="w-full min-w-[850px]">

                  <thead>

                    <tr className="border-b border-white/[0.04] text-left">

                      {[
                        "Market",
                        "Price",
                        "24H",
                        "Bias",
                        "Score",
                        "Confidence",
                        "Volume",
                        "RSI",
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

                    {markets.map(
                      (
                        market
                      ) => {
                        const positive =
                          (
                            market.change24h ??
                            0
                          ) >= 0;

                        return (
                          <tr
                            key={
                              market.symbol
                            }
                            onClick={() =>
                              setSelectedSymbol(
                                market.symbol
                              )
                            }
                            className={`cursor-pointer border-b border-white/[0.035] transition last:border-0 ${
                              selectedSymbol ===
                              market.symbol
                                ? "bg-violet-500/[0.025]"
                                : "hover:bg-white/[0.012]"
                            }`}
                          >

                            <td className="px-5 py-4 text-[9px] font-medium text-zinc-300">
                              {market.symbol}
                            </td>

                            <td className="ha-number px-5 py-4 text-[9px] text-zinc-300">
                              {formatPrice(
                                market.price
                              )}
                            </td>

                            <td className="px-5 py-4">

                              <span
                                className={`text-[8px] ${
                                  market.change24h ===
                                  null
                                    ? "text-zinc-700"
                                    : positive
                                    ? "text-emerald-400"
                                    : "text-red-400"
                                }`}
                              >
                                {market.change24h !==
                                null
                                  ? `${
                                      positive
                                        ? "+"
                                        : ""
                                    }${market.change24h.toFixed(
                                      2
                                    )}%`
                                  : "—"}
                              </span>

                            </td>

                            <td className="px-5 py-4">

                              <DirectionBadge
                                direction={
                                  market.bias
                                }
                              />

                            </td>

                            <td
                              className={`ha-number px-5 py-4 text-[9px] ${directionClass(
                                market.bias
                              )}`}
                            >
                              {market.score !==
                              null
                                ? `${
                                    market.score >
                                    0
                                      ? "+"
                                      : ""
                                  }${market.score}`
                                : "—"}
                            </td>

                            <td className="px-5 py-4 text-[8px] text-zinc-500">
                              {market.confidence !==
                              null
                                ? `${market.confidence}%`
                                : "—"}
                            </td>

                            <td className="px-5 py-4 text-[8px] text-zinc-500">
                              {market.volumeRatio !==
                              null
                                ? `${market.volumeRatio.toFixed(
                                    2
                                  )}x`
                                : "—"}
                            </td>

                            <td className="px-5 py-4 text-[8px] text-zinc-500">
                              {formatNumber(
                                market.rsi,
                                1
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

            {/* POLICY */}

            <div className="mt-3 flex items-start gap-2 rounded-xl border border-white/[0.045] bg-white/[0.01] px-4 py-3">

              <BrainCircuit
                size={11}
                className="mt-0.5 shrink-0 text-violet-400"
              />

              <p className="text-[7px] leading-4 text-zinc-700">
                Market Intelligence is a research layer. Breadth, regime and current bias do not directly publish trades. Official signals remain controlled by Scanner → Quality Gate → Publisher → Lifecycle.
              </p>

            </div>

          </>
        )}

      </div>

    </HiddenAlphaShell>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone = "neutral",
  direction,
}: {
  icon: typeof Activity;

  label: string;

  value: string;

  tone?:
    | "neutral"
    | "green"
    | "red";

  direction?: Direction;
}) {
  let valueClass =
    "text-zinc-300";

  if (
    tone === "green"
  ) {
    valueClass =
      "text-emerald-400";
  }

  if (
    tone === "red"
  ) {
    valueClass =
      "text-red-400";
  }

  if (direction) {
    valueClass =
      directionClass(
        direction
      );
  }

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

function BreadthMetric({
  label,
  value,
  detail,
}: {
  label: string;

  value: string;

  detail?: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.05] bg-white/[0.012] p-3">

      <p className="text-[7px] uppercase tracking-[0.1em] text-zinc-700">
        {label}
      </p>

      <p className="ha-number mt-2 text-[13px] font-semibold text-zinc-300">
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

function DirectionBadge({
  direction,
}: {
  direction: Direction;
}) {
  return (
    <span
      className={`inline-flex rounded-md border px-2 py-1 text-[7px] font-medium ${directionBg(
        direction
      )} ${directionClass(
        direction
      )}`}
    >
      {direction}
    </span>
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

      <p className="text-[6px] uppercase tracking-[0.1em] text-zinc-700">
        {label}
      </p>

      <p className="ha-number mt-1 text-[8px] text-zinc-400">
        {value}
      </p>

    </div>
  );
}

function ContextStat({
  icon: Icon,
  label,
  value,
  detail,
  direction,
}: {
  icon: typeof Activity;

  label: string;

  value: string;

  detail: string;

  direction?: Direction;
}) {
  return (
    <div className="rounded-xl border border-white/[0.045] bg-white/[0.01] p-3">

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
        className={`mt-2 text-[9px] font-medium ${
          direction
            ? directionClass(
                direction
              )
            : "text-zinc-400"
        }`}
      >
        {value}
      </p>

      <p className="mt-1 text-[7px] text-zinc-700">
        {detail}
      </p>

    </div>
  );
}

function TechnicalStat({
  label,
  value,
}: {
  label: string;

  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.045] bg-white/[0.01] p-3">

      <p className="text-[7px] uppercase tracking-[0.1em] text-zinc-700">
        {label}
      </p>

      <p className="ha-number mt-2 text-[10px] font-medium text-zinc-300">
        {value}
      </p>

    </div>
  );
}

function MtfRow({
  label,
  value,
}: {
  label: string;

  value: string;
}) {
  return (
    <div className="flex items-center justify-between">

      <span className="text-[7px] text-zinc-700">
        {label}
      </span>

      <span className="text-[7px] font-medium text-zinc-500">
        {value}
      </span>

    </div>
  );
}
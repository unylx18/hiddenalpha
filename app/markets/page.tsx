"use client";

import { useEffect, useState } from "react";
import MarketCandleChart from "@/components/markets/market-candle-chart";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Bell,
  Bot,
  ChevronDown,
  Home,
  LineChart,
  Search,
  Settings,
  ShieldCheck,
  Star,
  TrendingDown,
  TrendingUp,
  Wallet,
  Wifi,
  Zap,
} from "lucide-react";

import {
  createBybitTickerSocket,
  BybitLiveTicker,
} from "@/lib/market-data/bybit-live";

type Market = {
  symbol: string;
  exchange: string;
  marketType: string;
  price: number | null;
  change24h: number | null;
  bidPrice: number | null;
  askPrice: number | null;
  markPrice: number | null;
  regime: "BULLISH" | "BEARISH" | "NEUTRAL";
  score: number | null;
  confidence: number | null;
  volumeRatio: number | null;
  rsi: number | null;
  ema20: number | null;
  ema50: number | null;
  atr: number | null;
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

const symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];

const timeframes = ["1m", "5m", "15m", "1h"];

const emptyMarkets: Market[] = symbols.map((symbol) => ({
  symbol,
  exchange: "Bybit",
  marketType: "PERPETUAL",
  price: null,
  change24h: null,
  bidPrice: null,
  askPrice: null,
  markPrice: null,
  regime: "NEUTRAL",
  score: null,
  confidence: null,
  volumeRatio: null,
  rsi: null,
  ema20: null,
  ema50: null,
  atr: null,
}));

function formatPrice(value: number | null) {
  if (value === null) return "—";

  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatNumber(value: number | null, digits = 2) {
  if (value === null) return "—";

  return value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export default function MarketsPage() {
  const [markets, setMarkets] = useState<Market[]>(emptyMarkets);

  const [loading, setLoading] = useState(true);

  const [liveStatus, setLiveStatus] = useState<
    "CONNECTING" | "OPEN" | "CLOSED" | "ERROR"
  >("CONNECTING");

  const [lastUpdate, setLastUpdate] =
    useState<number | null>(null);

  const [error, setError] = useState("");

  const [selectedTimeframe, setSelectedTimeframe] =
    useState("1m");

  /*
   * MARKET CONTEXT
   */

  useEffect(() => {
    async function loadMarketContext() {
      try {
        setLoading(true);
        setError("");

        const results = await Promise.all(
          symbols.map(async (symbol) => {
            const [
              contextResponse,
              indicatorsResponse,
            ] = await Promise.all([
              fetch(
                `/api/trading/context?symbol=${symbol}&timeframe=1h`,
                {
                  cache: "no-store",
                }
              ),
              fetch(
                `/api/trading/indicators?symbol=${symbol}&timeframe=1h`,
                {
                  cache: "no-store",
                }
              ),
            ]);

            const contextData =
              await contextResponse.json();

            const indicatorsData =
              await indicatorsResponse.json();

            if (
              !contextResponse.ok ||
              !contextData.success ||
              !contextData.alpha
            ) {
              throw new Error(
                contextData.error ||
                  `Failed to load ${symbol} context`
              );
            }

            if (
              !indicatorsResponse.ok ||
              !indicatorsData.success ||
              !indicatorsData.indicators
            ) {
              throw new Error(
                indicatorsData.error ||
                  `Failed to load ${symbol} indicators`
              );
            }

            const alpha = contextData.alpha;
            const indicators =
              indicatorsData.indicators;

            return {
              symbol,
              exchange: "Bybit",
              marketType: "PERPETUAL",

              price: Number(indicators.price),

              change24h: null,
              bidPrice: null,
              askPrice: null,
              markPrice: null,

              regime:
                alpha.market.bias ?? "NEUTRAL",

              score:
                Number(alpha.market.score),

              confidence:
                Number(alpha.market.confidence),

              volumeRatio:
                Number(alpha.volume.ratio),

              rsi:
                indicators.rsi14 !== null
                  ? Number(indicators.rsi14)
                  : null,

              ema20:
                indicators.ema20 !== null
                  ? Number(indicators.ema20)
                  : null,

              ema50:
                indicators.ema50 !== null
                  ? Number(indicators.ema50)
                  : null,

              atr:
                indicators.atr14 !== null
                  ? Number(indicators.atr14)
                  : null,
            } as Market;
          })
        );

        setMarkets(results);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load market data"
        );
      } finally {
        setLoading(false);
      }
    }

    loadMarketContext();
  }, []);

  /*
   * LATEST CANDLE
   */

  useEffect(() => {
    let cancelled = false;

    async function loadLatestCandles() {
      try {
        const results = await Promise.all(
          symbols.map(async (symbol) => {
            const response = await fetch(
              `/api/market/candles?symbol=${symbol}&timeframe=1m&limit=1`,
              {
                cache: "no-store",
              }
            );

            const data = await response.json();

            if (
              !response.ok ||
              !data.success ||
              !data.candles?.length
            ) {
              throw new Error(
                data.error ||
                  `Failed to load ${symbol} candle`
              );
            }

            const candle = data.candles[0];

            return {
              symbol,
              price: Number(candle.close),
            };
          })
        );

        if (cancelled) return;

        setMarkets((current) =>
          current.map((market) => {
            const latest = results.find(
              (item) =>
                item.symbol === market.symbol
            );

            if (!latest) return market;

            return {
              ...market,
              price: latest.price,
            };
          })
        );

        setLastUpdate(Date.now());
        setLiveStatus("OPEN");
        setError("");
      } catch (err) {
        if (cancelled) return;

        setLiveStatus("ERROR");

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load candle data"
        );
      }
    }

    loadLatestCandles();

    const interval = window.setInterval(
      loadLatestCandles,
      5_000
    );

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  /*
   * BYBIT LIVE TICKER
   */

  useEffect(() => {
    const connection =
      createBybitTickerSocket(
        symbols,
        (ticker: BybitLiveTicker) => {
          setMarkets((current) =>
            current.map((market) => {
              if (
                market.symbol !== ticker.symbol
              ) {
                return market;
              }

              return {
                ...market,
                price: ticker.lastPrice,
                change24h:
                  ticker.price24hChange,
                bidPrice: ticker.bidPrice,
                askPrice: ticker.askPrice,
                markPrice: ticker.markPrice,
              };
            })
          );

          setLastUpdate(Date.now());
        },
        setLiveStatus,
        (socketError) => {
          setError(socketError.message);
        }
      );

    return () => {
      connection.close();
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#06070a] text-white">
      <div className="flex min-h-screen">

        {/* SIDEBAR */}

        <aside className="hidden w-[240px] shrink-0 border-r border-white/[0.06] bg-[#08090d] lg:flex lg:flex-col">
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

          <div className="px-3 pt-5">
            <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-700">
              Workspace
            </p>

            <nav className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const active =
                  item.label === "Markets";

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

                    <span>{item.label}</span>

                    {item.label ===
                      "Signals" && (
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
            <div className="mb-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-zinc-500">
                  Data engine
                </span>

                <span className="flex items-center gap-1.5 text-[10px] text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

                  {liveStatus === "OPEN"
                    ? "Live"
                    : liveStatus}
                </span>
              </div>

              <div className="mt-3 h-px bg-white/[0.05]" />

              <div className="mt-3 flex items-center justify-between text-[10px]">
                <span className="text-zinc-600">
                  Market source
                </span>

                <span className="text-zinc-400">
                  Bybit
                </span>
              </div>
            </div>

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

          {/* CONTENT */}

          <div className="mx-auto max-w-[1500px] p-5 lg:p-8">

            {/* HEADER */}

            <div className="mb-7 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
              <div>
                <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-400">
                  <BarChart3 size={13} />
                  Market intelligence
                </div>

                <div className="flex items-center gap-3">
                  <h1 className="text-[30px] font-semibold tracking-[-0.03em]">
                    Markets
                  </h1>

                  <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/10 bg-emerald-500/[0.04] px-2.5 py-1.5">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />

                    <Wifi
                      size={11}
                      className="text-emerald-400"
                    />

                    <span className="text-[9px] text-emerald-400">
                      {liveStatus === "OPEN"
                        ? "LIVE"
                        : liveStatus}
                    </span>
                  </div>
                </div>

                <p className="mt-1.5 max-w-xl text-[12px] leading-5 text-zinc-600">
                  Live market prices combined with
                  Hiddenalpha&apos;s analytical context.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {lastUpdate && (
                  <div className="hidden text-right sm:block">
                    <p className="text-[9px] text-zinc-700">
                      Last tick
                    </p>

                    <p className="mt-1 text-[10px] text-zinc-500">
                      {new Date(
                        lastUpdate
                      ).toLocaleTimeString()}
                    </p>
                  </div>
                )}

                <button className="flex h-10 items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3.5 text-[11px] text-zinc-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Live
                </button>

                <button className="flex h-10 items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3.5 text-[11px] text-zinc-400">
                  All Markets
                  <ChevronDown size={13} />
                </button>
              </div>
            </div>

            {/* ERROR */}

            {error && (
              <div className="mb-3 rounded-xl border border-red-500/10 bg-red-500/[0.03] px-4 py-3 text-[10px] text-red-400">
                {error}
              </div>
            )}

            {/* MARKET CARDS */}

            <div className="grid gap-3 xl:grid-cols-3">
              {markets.map((market) => {
                const bullish =
                  market.regime === "BULLISH";

                const bearish =
                  market.regime === "BEARISH";

                const positive =
                  (market.change24h ?? 0) >= 0;

                return (
                  <div
                    key={market.symbol}
                    className="group rounded-2xl border border-white/[0.06] bg-[#0a0c10] p-5 transition hover:border-violet-500/20"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.05] bg-white/[0.03] text-[11px] font-semibold text-zinc-300">
                          {market.symbol.slice(0, 3)}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-[13px] font-semibold">
                              {market.symbol}
                            </p>

                            <span className="rounded-md bg-white/[0.03] px-1.5 py-0.5 text-[8px] text-zinc-600">
                              PERP
                            </span>
                          </div>

                          <div className="mt-1 flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />

                            <p className="text-[9px] text-zinc-600">
                              Live · {market.exchange}
                            </p>
                          </div>
                        </div>
                      </div>

                      <span
                        className={`rounded-lg px-2.5 py-1.5 text-[9px] ${
                          bullish
                            ? "bg-emerald-500/10 text-emerald-400"
                            : bearish
                              ? "bg-red-500/10 text-red-400"
                              : "bg-zinc-500/10 text-zinc-500"
                        }`}
                      >
                        {market.regime}
                      </span>
                    </div>

                    <div className="mt-7 flex items-end justify-between">
                      <div>
                        <p className="text-[28px] font-semibold tracking-[-0.04em]">
                          {loading
                            ? "Loading..."
                            : formatPrice(
                                market.price
                              )}
                        </p>

                        <div className="mt-1.5 flex items-center gap-2">
                          <span
                            className={`text-[10px] ${
                              positive
                                ? "text-emerald-400"
                                : "text-red-400"
                            }`}
                          >
                            {market.change24h !== null
                              ? `${positive ? "+" : ""}${market.change24h.toFixed(2)}%`
                              : "—"}
                          </span>

                          <span className="text-[9px] text-zinc-700">
                            24H
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-[8px] uppercase tracking-wider text-zinc-700">
                          Alpha
                        </p>

                        <p
                          className={`mt-1 text-[14px] font-semibold ${
                            (market.score ?? 0) > 0
                              ? "text-emerald-400"
                              : (market.score ?? 0) < 0
                                ? "text-red-400"
                                : "text-zinc-500"
                          }`}
                        >
                          {market.score !== null
                            ? `${market.score > 0 ? "+" : ""}${market.score}`
                            : "—"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-3 gap-2">
                      {[
                        ["Bid", market.bidPrice],
                        ["Ask", market.askPrice],
                        ["Mark", market.markPrice],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className="rounded-xl border border-white/[0.05] bg-white/[0.015] p-3"
                        >
                          <p className="text-[8px] uppercase tracking-wider text-zinc-700">
                            {label}
                          </p>

                          <p className="mt-2 text-[11px] font-medium text-zinc-300">
                            {formatPrice(
                              value as number | null
                            )}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-white/[0.05] bg-white/[0.015] p-3">
                        <p className="text-[8px] uppercase tracking-wider text-zinc-700">
                          Confidence
                        </p>

                        <p className="mt-2 text-[13px] font-medium">
                          {market.confidence !== null
                            ? `${market.confidence}%`
                            : "—"}
                        </p>
                      </div>

                      <div className="rounded-xl border border-white/[0.05] bg-white/[0.015] p-3">
                        <p className="text-[8px] uppercase tracking-wider text-zinc-700">
                          Volume
                        </p>

                        <p className="mt-2 text-[13px] font-medium">
                          {market.volumeRatio !== null
                            ? `${market.volumeRatio.toFixed(2)}x`
                            : "—"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-white/[0.05] pt-3">
                      <div className="flex items-center gap-1.5">
                        {bullish ? (
                          <TrendingUp
                            size={12}
                            className="text-emerald-400"
                          />
                        ) : bearish ? (
                          <TrendingDown
                            size={12}
                            className="text-red-400"
                          />
                        ) : (
                          <Activity
                            size={12}
                            className="text-zinc-600"
                          />
                        )}

                        <span className="text-[9px] text-zinc-600">
                          Market regime
                        </span>
                      </div>

                      <button className="flex items-center gap-1 rounded-lg px-2 py-1 text-[9px] text-zinc-600 transition hover:bg-violet-500/10 hover:text-violet-400">
                        Analyze
                        <ArrowUpRight size={11} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CHART HEADER */}

            <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-[#0a0c10] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[12px] font-medium">
                  Price Action
                </p>

                <p className="mt-1 text-[9px] text-zinc-700">
                  Multi-timeframe market structure
                </p>
              </div>

              <div className="flex items-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1">
                {timeframes.map((timeframe) => {
                  const active =
                    selectedTimeframe === timeframe;

                  return (
                    <button
                      key={timeframe}
                      onClick={() =>
                        setSelectedTimeframe(
                          timeframe
                        )
                      }
                      className={`rounded-lg px-3 py-1.5 text-[9px] font-medium transition ${
                        active
                          ? "bg-violet-500/15 text-violet-400"
                          : "text-zinc-600 hover:text-zinc-300"
                      }`}
                    >
                      {timeframe === "1h"
                        ? "1H"
                        : timeframe}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CANDLE CHARTS */}

            <div className="mt-3 grid gap-3 xl:grid-cols-3">
              {symbols.map((symbol) => {
                const market = markets.find(
                  (item) =>
                    item.symbol === symbol
                );

                return (
                  <div
                    key={`${symbol}-chart`}
                    className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0a0c10]"
                  >
                    <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.035] text-[8px] font-semibold text-zinc-400">
                          {symbol.slice(0, 3)}
                        </div>

                        <div>
                          <p className="text-[11px] font-medium">
                            {symbol}
                          </p>

                          <p className="mt-0.5 text-[8px] text-zinc-700">
                            Bybit Perpetual
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-[10px] font-medium text-zinc-300">
                          {formatPrice(
                            market?.price ?? null
                          )}
                        </p>

                        <p className="mt-0.5 text-[8px] text-zinc-700">
                          {selectedTimeframe === "1h"
                            ? "1H"
                            : selectedTimeframe}
                        </p>
                      </div>
                    </div>

                    <div className="px-1 pb-1">
                      <MarketCandleChart
                        symbol={symbol}
                        timeframe={
                          selectedTimeframe
                        }
                        livePrice={
                          market?.price ?? null
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* TECHNICAL CONTEXT */}

            <div className="mt-3 grid gap-3 xl:grid-cols-3">
              {markets.map((market) => (
                <div
                  key={`${market.symbol}-technical`}
                  className="rounded-2xl border border-white/[0.06] bg-[#0a0c10] p-4"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity
                        size={14}
                        className="text-cyan-400"
                      />

                      <span className="text-[11px] font-medium">
                        {market.symbol}
                      </span>
                    </div>

                    <span className="text-[9px] text-zinc-700">
                      1H technical context
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <p className="text-[8px] text-zinc-700">
                        RSI
                      </p>

                      <p className="mt-1.5 text-[11px] font-medium">
                        {formatNumber(
                          market.rsi,
                          1
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-[8px] text-zinc-700">
                        EMA 20
                      </p>

                      <p className="mt-1.5 text-[11px] font-medium">
                        {formatPrice(
                          market.ema20
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-[8px] text-zinc-700">
                        EMA 50
                      </p>

                      <p className="mt-1.5 text-[11px] font-medium">
                        {formatPrice(
                          market.ema50
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-[8px] text-zinc-700">
                        ATR
                      </p>

                      <p className="mt-1.5 text-[11px] font-medium">
                        {formatNumber(
                          market.atr,
                          2
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* MARKET MONITOR */}

            <div className="mt-3 overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0a0c10]">
              <div className="flex items-center justify-between border-b border-white/[0.05] px-5 py-4">
                <div>
                  <h2 className="text-[13px] font-medium">
                    Market monitor
                  </h2>

                  <p className="mt-1 text-[10px] text-zinc-700">
                    Live prices + analytical context
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-[9px] text-emerald-400">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                    Live feed
                  </span>

                  <ArrowUpRight
                    size={12}
                    className="text-zinc-700"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px]">
                  <thead>
                    <tr className="border-b border-white/[0.05] text-left">
                      {[
                        "Market",
                        "Live Price",
                        "24H",
                        "Regime",
                        "Alpha",
                        "Confidence",
                        "Volume",
                        "RSI",
                        "Action",
                      ].map((heading) => (
                        <th
                          key={heading}
                          className={`px-5 py-3 text-[9px] font-medium uppercase tracking-wider text-zinc-700 ${
                            heading === "Action"
                              ? "text-right"
                              : ""
                          }`}
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {markets.map((market) => {
                      const bullish =
                        market.regime ===
                        "BULLISH";

                      const bearish =
                        market.regime ===
                        "BEARISH";

                      const positive =
                        (market.change24h ?? 0) >=
                        0;

                      return (
                        <tr
                          key={market.symbol}
                          className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.015]"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.035] text-[9px] font-semibold text-zinc-400">
                                {market.symbol.slice(
                                  0,
                                  3
                                )}
                              </div>

                              <div>
                                <p className="text-[11px] font-medium">
                                  {market.symbol}
                                </p>

                                <p className="mt-0.5 text-[8px] text-zinc-700">
                                  Bybit Perpetual
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4 text-[11px] font-medium">
                            {formatPrice(
                              market.price
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={
                                positive
                                  ? "text-[11px] text-emerald-400"
                                  : "text-[11px] text-red-400"
                              }
                            >
                              {market.change24h !==
                              null
                                ? `${positive ? "+" : ""}${market.change24h.toFixed(2)}%`
                                : "—"}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`rounded-md px-2 py-1 text-[9px] ${
                                bullish
                                  ? "bg-emerald-500/10 text-emerald-400"
                                  : bearish
                                    ? "bg-red-500/10 text-red-400"
                                    : "bg-zinc-500/10 text-zinc-500"
                              }`}
                            >
                              {market.regime}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`text-[11px] font-medium ${
                                (market.score ??
                                  0) > 0
                                  ? "text-emerald-400"
                                  : (market.score ??
                                        0) < 0
                                    ? "text-red-400"
                                    : "text-zinc-500"
                              }`}
                            >
                              {market.score !==
                              null
                                ? `${market.score > 0 ? "+" : ""}${market.score}`
                                : "—"}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-[11px] text-zinc-400">
                            {market.confidence !==
                            null
                              ? `${market.confidence}%`
                              : "—"}
                          </td>

                          <td className="px-5 py-4 text-[11px] text-zinc-400">
                            {market.volumeRatio !==
                            null
                              ? `${market.volumeRatio.toFixed(2)}x`
                              : "—"}
                          </td>

                          <td className="px-5 py-4 text-[11px] text-zinc-400">
                            {formatNumber(
                              market.rsi,
                              1
                            )}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <button className="rounded-lg border border-white/[0.06] px-3 py-1.5 text-[9px] text-zinc-600 transition hover:border-violet-500/20 hover:text-violet-400">
                              Analyze
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* INTELLIGENCE */}

            <div className="mt-3 grid gap-3 lg:grid-cols-3">
              <div className="rounded-2xl border border-violet-500/10 bg-violet-500/[0.025] p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                    <Bot size={17} />
                  </div>

                  <div>
                    <p className="text-[12px] font-medium">
                      Alpha Context
                    </p>

                    <p className="mt-1 text-[9px] text-zinc-700">
                      Analytical layer
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-[10px] leading-5 text-zinc-600">
                  Live market data is combined with
                  trend, momentum, volume and
                  volatility context.
                </p>
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-[#0a0c10] p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
                    <LineChart size={17} />
                  </div>

                  <div>
                    <p className="text-[12px] font-medium">
                      Multi-timeframe
                    </p>

                    <p className="mt-1 text-[9px] text-zinc-700">
                      Macro → entry
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-[10px] leading-5 text-zinc-600">
                  1H, 15M, 5M and 1M provide layered
                  market structure for future signals.
                </p>
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-[#0a0c10] p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                    <ShieldCheck size={17} />
                  </div>

                  <div>
                    <p className="text-[12px] font-medium">
                      Risk first
                    </p>

                    <p className="mt-1 text-[9px] text-zinc-700">
                      Before execution
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-[10px] leading-5 text-zinc-600">
                  Confirmed signals will pass through
                  the deterministic risk engine before
                  execution.
                </p>
              </div>
            </div>

          </div>
        </section>
      </div>
    </main>
  );
}
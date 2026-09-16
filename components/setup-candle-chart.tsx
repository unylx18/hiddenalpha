"use client";

import {
  CandlestickSeries,
  ColorType,
  LineStyle,
  createChart,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  BarChart3,
  LoaderCircle,
  Wifi,
} from "lucide-react";

type CandleRow = {
  timestamp: string;

  open:
    | number
    | string;

  high:
    | number
    | string;

  low:
    | number
    | string;

  close:
    | number
    | string;

  volume?:
    | number
    | string;
};

type CandleResponse = {
  success: boolean;

  symbol?: string;
  timeframe?: string;

  candles?: CandleRow[];

  error?: string;
};

type Direction =
  | "LONG"
  | "SHORT";

type Props = {
  symbol: string;

  signalTimeframe?: string;

  direction: Direction;

  livePrice: number;

  entryPrice: number;

  stopLossPrice: number;

  takeProfit1Price: number;

  takeProfit2Price: number;
};

const TIMEFRAMES = [
  "1m",
  "5m",
  "15m",
  "1h",
];

function toUnixTime(
  timestamp: string
): Time {
  return Math.floor(
    new Date(
      timestamp
    ).getTime() / 1000
  ) as Time;
}

function getPrecision(
  price: number
) {
  if (price < 1) {
    return {
      precision: 5,
      minMove: 0.00001,
    };
  }

  if (price < 100) {
    return {
      precision: 3,
      minMove: 0.001,
    };
  }

  return {
    precision: 2,
    minMove: 0.01,
  };
}

function formatPrice(
  value: number
) {
  return value.toLocaleString(
    "en-US",
    {
      minimumFractionDigits:
        value < 100
          ? 3
          : 2,

      maximumFractionDigits:
        value < 100
          ? 3
          : 2,
    }
  );
}

export default function SetupCandleChart({
  symbol,

  signalTimeframe = "1h",

  direction,

  livePrice,

  entryPrice,

  stopLossPrice,

  takeProfit1Price,

  takeProfit2Price,
}: Props) {
  const containerRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const chartRef =
    useRef<IChartApi | null>(
      null
    );

  const seriesRef =
    useRef<ISeriesApi<"Candlestick"> | null>(
      null
    );

  const priceLinesRef =
    useRef<IPriceLine[]>(
      []
    );

  const [
    timeframe,
    setTimeframe,
  ] = useState(
    TIMEFRAMES.includes(
      signalTimeframe
    )
      ? signalTimeframe
      : "1h"
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    candleCount,
    setCandleCount,
  ] = useState(0);

  /*
   * ========================================
   * CREATE CHART
   * ========================================
   */

  useEffect(() => {
    if (
      !containerRef.current
    ) {
      return;
    }

    const container =
      containerRef.current;

    const chart =
      createChart(
        container,
        {
          width:
            container.clientWidth,

          height: 292,

          layout: {
            background: {
              type:
                ColorType.Solid,

              color:
                "#07090d",
            },

            textColor:
              "#52525b",

            fontSize: 10,
          },

          grid: {
            vertLines: {
              color:
                "rgba(255,255,255,0.025)",
            },

            horzLines: {
              color:
                "rgba(255,255,255,0.025)",
            },
          },

          rightPriceScale: {
            borderColor:
              "rgba(255,255,255,0.055)",

            scaleMargins: {
              top: 0.12,
              bottom: 0.12,
            },
          },

          timeScale: {
            borderColor:
              "rgba(255,255,255,0.055)",

            timeVisible: true,

            secondsVisible:
              false,

            rightOffset: 4,

            barSpacing: 7,
          },

          crosshair: {
            vertLine: {
              color:
                "rgba(139,92,246,0.35)",

              labelBackgroundColor:
                "#7c3aed",
            },

            horzLine: {
              color:
                "rgba(139,92,246,0.35)",

              labelBackgroundColor:
                "#7c3aed",
            },
          },
        }
      );

    const precision =
      getPrecision(
        livePrice
      );

    const series =
      chart.addSeries(
        CandlestickSeries,
        {
          upColor:
            "#34d399",

          downColor:
            "#fb7185",

          borderUpColor:
            "#34d399",

          borderDownColor:
            "#fb7185",

          wickUpColor:
            "#34d399",

          wickDownColor:
            "#fb7185",

          priceLineVisible:
            false,

          lastValueVisible:
            false,

          priceFormat: {
            type: "price",

            precision:
              precision.precision,

            minMove:
              precision.minMove,
          },
        }
      );

    chartRef.current =
      chart;

    seriesRef.current =
      series;

    const observer =
      new ResizeObserver(
        (entries) => {
          const entry =
            entries[0];

          if (!entry) {
            return;
          }

          chart.applyOptions({
            width:
              entry.contentRect
                .width,
          });
        }
      );

    observer.observe(
      container
    );

    return () => {
      observer.disconnect();

      chart.remove();

      chartRef.current =
        null;

      seriesRef.current =
        null;
    };
  }, []);

  /*
   * ========================================
   * LOAD CANDLES
   * ========================================
   */

  useEffect(() => {
    let cancelled =
      false;

    async function loadCandles() {
      try {
        setLoading(true);

        setError("");

        const response =
          await fetch(
            `/api/market/candles?symbol=${symbol}&timeframe=${timeframe}&limit=180`,
            {
              cache:
                "no-store",
            }
          );

        const data =
          (await response.json()) as CandleResponse;

        if (
          !response.ok ||
          !data.success ||
          !data.candles
        ) {
          throw new Error(
            data.error ??
              "Failed to load candles"
          );
        }

        if (cancelled) {
          return;
        }

        /*
         * API returns newest first.
         *
         * Lightweight Charts needs
         * oldest → newest.
         */

        const sorted =
          [...data.candles]
            .map(
              (candle) => ({
                time:
                  toUnixTime(
                    candle.timestamp
                  ),

                open:
                  Number(
                    candle.open
                  ),

                high:
                  Number(
                    candle.high
                  ),

                low:
                  Number(
                    candle.low
                  ),

                close:
                  Number(
                    candle.close
                  ),
              })
            )
            .filter(
              (candle) =>
                Number.isFinite(
                  candle.open
                ) &&
                Number.isFinite(
                  candle.high
                ) &&
                Number.isFinite(
                  candle.low
                ) &&
                Number.isFinite(
                  candle.close
                )
            )
            .sort(
              (a, b) =>
                Number(
                  a.time
                ) -
                Number(
                  b.time
                )
            );

        /*
         * Defensive duplicate removal.
         */

        const unique =
          sorted.filter(
            (
              candle,
              index,
              array
            ) =>
              index === 0 ||
              candle.time !==
                array[
                  index - 1
                ].time
          );

        seriesRef.current?.setData(
          unique
        );

        setCandleCount(
          unique.length
        );

        /*
         * Show latest ~70 candles
         * rather than zooming all the
         * way out.
         */

        if (
          chartRef.current &&
          unique.length > 0
        ) {
          chartRef.current
            .timeScale()
            .setVisibleLogicalRange(
              {
                from:
                  Math.max(
                    0,
                    unique.length -
                      70
                  ),

                to:
                  unique.length +
                  4,
              }
            );
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load candles"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadCandles();

    return () => {
      cancelled = true;
    };
  }, [
    symbol,
    timeframe,
  ]);

  /*
   * ========================================
   * TRADE LEVELS
   * ========================================
   */

  useEffect(() => {
    const series =
      seriesRef.current;

    if (!series) {
      return;
    }

    /*
     * Remove previous signal lines.
     */

    priceLinesRef.current.forEach(
      (line) => {
        try {
          series.removePriceLine(
            line
          );
        } catch {
          // Ignore already removed lines.
        }
      }
    );

    priceLinesRef.current =
      [];

    const live =
      series.createPriceLine({
        price:
          livePrice,

        color:
          "#f4f4f5",

        lineWidth: 1,

        lineStyle:
          LineStyle.Dashed,

        axisLabelVisible:
          true,

        title:
          "LIVE",
      });

    const entry =
      series.createPriceLine({
        price:
          entryPrice,

        color:
          "#8b5cf6",

        lineWidth: 2,

        lineStyle:
          LineStyle.Solid,

        axisLabelVisible:
          true,

        title:
          "ENTRY",
      });

    const stop =
      series.createPriceLine({
        price:
          stopLossPrice,

        color:
          "#fb7185",

        lineWidth: 1,

        lineStyle:
          LineStyle.Dashed,

        axisLabelVisible:
          true,

        title:
          "SL",
      });

    const tp1 =
      series.createPriceLine({
        price:
          takeProfit1Price,

        color:
          "#34d399",

        lineWidth: 1,

        lineStyle:
          LineStyle.Dashed,

        axisLabelVisible:
          true,

        title:
          "TP1",
      });

    const tp2 =
      series.createPriceLine({
        price:
          takeProfit2Price,

        color:
          "#22d3ee",

        lineWidth: 1,

        lineStyle:
          LineStyle.Dashed,

        axisLabelVisible:
          true,

        title:
          "TP2",
      });

    priceLinesRef.current =
      [
        live,
        entry,
        stop,
        tp1,
        tp2,
      ];

    return () => {
      priceLinesRef.current.forEach(
        (line) => {
          try {
            series.removePriceLine(
              line
            );
          } catch {
            // Ignore cleanup race.
          }
        }
      );

      priceLinesRef.current =
        [];
    };
  }, [
    livePrice,
    entryPrice,
    stopLossPrice,
    takeProfit1Price,
    takeProfit2Price,
  ]);

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.055] bg-[#07090d]">

      {/* HEADER */}

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.05] px-4 py-3">

        <div className="flex items-center gap-3">

          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-violet-500/10 bg-violet-500/[0.07]">

            <BarChart3
              size={12}
              className="text-violet-400"
            />

          </div>

          <div>

            <div className="flex items-center gap-2">

              <p className="text-[10px] font-medium text-zinc-300">
                {symbol}
              </p>

              <span
                className={`text-[7px] font-semibold ${
                  direction ===
                  "LONG"
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {direction}
              </span>

            </div>

            <div className="mt-0.5 flex items-center gap-1.5 text-[7px] text-zinc-700">

              <Wifi
                size={8}
                className="text-emerald-400"
              />

              Bybit Perpetual

              <span>
                •
              </span>

              {candleCount} candles

            </div>

          </div>

        </div>

        {/* TIMEFRAMES */}

        <div className="flex rounded-lg border border-white/[0.05] bg-white/[0.012] p-1">

          {TIMEFRAMES.map(
            (item) => (
              <button
                key={item}
                type="button"
                onClick={() =>
                  setTimeframe(
                    item
                  )
                }
                className={`rounded-md px-2.5 py-1.5 text-[7px] font-medium transition ${
                  timeframe ===
                  item
                    ? "bg-violet-600 text-white"
                    : "text-zinc-600 hover:text-zinc-300"
                }`}
              >
                {item.toUpperCase()}
              </button>
            )
          )}

        </div>

      </div>

      {/* CHART */}

      <div className="relative">

        <div
          ref={containerRef}
          className="h-[292px] w-full"
        />

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#07090d]/70 backdrop-blur-[1px]">

            <div className="text-center">

              <LoaderCircle
                size={18}
                className="mx-auto animate-spin text-violet-400"
              />

              <p className="mt-2 text-[8px] text-zinc-600">
                Loading {symbol}{" "}
                {timeframe} chart...
              </p>

            </div>

          </div>
        )}

        {!loading &&
          error && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#07090d]">

              <div className="max-w-[300px] text-center">

                <p className="text-[9px] text-red-400">
                  Chart unavailable
                </p>

                <p className="mt-2 text-[8px] leading-4 text-zinc-700">
                  {error}
                </p>

              </div>

            </div>
          )}

      </div>

      {/* LEVEL LEGEND */}

      <div className="grid grid-cols-2 gap-px border-t border-white/[0.05] bg-white/[0.04] sm:grid-cols-5">

        <Legend
          label="LIVE"
          value={formatPrice(
            livePrice
          )}
          className="text-zinc-200"
        />

        <Legend
          label="ENTRY"
          value={formatPrice(
            entryPrice
          )}
          className="text-violet-400"
        />

        <Legend
          label="SL"
          value={formatPrice(
            stopLossPrice
          )}
          className="text-red-400"
        />

        <Legend
          label="TP1"
          value={formatPrice(
            takeProfit1Price
          )}
          className="text-emerald-400"
        />

        <Legend
          label="TP2"
          value={formatPrice(
            takeProfit2Price
          )}
          className="text-cyan-400"
        />

      </div>

    </div>
  );
}

function Legend({
  label,
  value,
  className,
}: {
  label: string;

  value: string;

  className: string;
}) {
  return (
    <div className="bg-[#07090d] px-3 py-2">

      <p className="text-[6px] font-semibold uppercase tracking-[0.12em] text-zinc-700">
        {label}
      </p>

      <p
        className={`ha-number mt-1 text-[8px] font-medium ${className}`}
      >
        {value}
      </p>

    </div>
  );
}
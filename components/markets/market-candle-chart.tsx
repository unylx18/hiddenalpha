"use client";

import { useEffect, useRef, useState } from "react";
import {
  CandlestickSeries,
  ColorType,
  HistogramSeries,
  LineSeries,
  LineStyle,
  createChart,
  createSeriesMarkers,
  type CandlestickData,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type LineData,
  type SeriesMarker,
  type Time,
} from "lightweight-charts";

type Candle = {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

type StructureSwing = {
  timestamp: string;
  index: number;
  price: number;
  type: "HIGH" | "LOW";
  label: "HH" | "HL" | "LH" | "LL" | null;
};

type StructureBreak = {
  timestamp: string;
  index: number;
  price: number;
  type: "BOS" | "CHoCH";
  direction: "BULLISH" | "BEARISH";
  brokenSwing: "HIGH" | "LOW";
  brokenPrice: number;
};

const TIMEFRAMES = [
  "1m", "3m", "5m", "15m", "30m",
  "1h", "2h", "4h", "6h", "12h",
  "1d", "1w", "1M",
];

type MarketCandleChartProps = {
  symbol: string;
  timeframe?: string;
  livePrice?: number | null;
  entryPrice?: number;
  stopLossPrice?: number;
  takeProfit1Price?: number;
  takeProfit2Price?: number;
  signalDirection?: "LONG" | "SHORT" | "WAIT";
};

const TIMEFRAME_LIMITS: Record<
  string,
  { chart: number; structure: number }
> = {
  "1m": { chart: 1000, structure: 2000 },
  "3m": { chart: 1000, structure: 2000 },
  "5m": { chart: 1000, structure: 2000 },
  "15m": { chart: 1000, structure: 2000 },
  "30m": { chart: 1000, structure: 2000 },
  "1h": { chart: 500, structure: 1000 },
  "2h": { chart: 500, structure: 1000 },
  "4h": { chart: 500, structure: 1000 },
  "6h": { chart: 500, structure: 1000 },
  "12h": { chart: 500, structure: 1000 },
  "1d": { chart: 500, structure: 1000 },
  "1w": { chart: 300, structure: 500 },
  "1M": { chart: 300, structure: 500 },
};

function getTimeframeLimits(timeframe: string) {
  return TIMEFRAME_LIMITS[timeframe] ?? {
    chart: 500,
    structure: 1000,
  };
}

function calculateEMA(
  candles: CandlestickData<Time>[],
  period: number
): LineData<Time>[] {
  if (candles.length < period) return [];

  const multiplier = 2 / (period + 1);
  let ema = Number(candles[0].close);

  return candles
    .map((candle, index) => {
      const close = Number(candle.close);

      if (index === 0) {
        ema = close;
      } else {
        ema =
          (close - ema) * multiplier + ema;
      }

      return {
        time: candle.time,
        value: ema,
      };
    })
    .filter((_, index) => index >= period - 1);
}

function calculateRSI(
  candles: CandlestickData<Time>[],
  period = 14
): LineData<Time>[] {
  if (candles.length <= period) return [];

  const closes = candles.map((candle) =>
    Number(candle.close)
  );

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change =
      closes[i] - closes[i - 1];

    if (change >= 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }

  let averageGain = gains / period;
  let averageLoss = losses / period;

  const result: LineData<Time>[] = [];

  const getRSI = () => {
    if (averageLoss === 0) return 100;

    const rs =
      averageGain / averageLoss;

    return 100 - 100 / (1 + rs);
  };

  result.push({
    time: candles[period].time,
    value: getRSI(),
  });

  for (
    let i = period + 1;
    i < candles.length;
    i++
  ) {
    const change =
      closes[i] - closes[i - 1];

    const gain =
      change > 0 ? change : 0;

    const loss =
      change < 0 ? Math.abs(change) : 0;

    averageGain =
      (averageGain * (period - 1) +
        gain) /
      period;

    averageLoss =
      (averageLoss * (period - 1) +
        loss) /
      period;

    result.push({
      time: candles[i].time,
      value: getRSI(),
    });
  }

  return result;
}

export default function MarketCandleChart({
  symbol,
  timeframe = "1m",
  livePrice = null,
  entryPrice,
  stopLossPrice,
  takeProfit1Price,
  takeProfit2Price,
  signalDirection = "WAIT",
}: MarketCandleChartProps) {
  const [selectedTimeframe, setSelectedTimeframe] =
    useState(timeframe);

  const [showEMA20, setShowEMA20] = useState(true);
  const [showEMA50, setShowEMA50] = useState(true);
  const [showBullishStructure, setShowBullishStructure] = useState(false);
  const [showBearishStructure, setShowBearishStructure] = useState(false);
  const [showBOS, setShowBOS] = useState(false);
  const [showCHoCH, setShowCHoCH] = useState(false);
  const [showVolume, setShowVolume] = useState(true);
  const [showRSI, setShowRSI] = useState(true);

  const structureMarkersRef =
    useRef<SeriesMarker<Time>[]>([]);

  const priceContainerRef =
    useRef<HTMLDivElement | null>(null);

  const volumeContainerRef =
    useRef<HTMLDivElement | null>(null);

  const rsiContainerRef =
    useRef<HTMLDivElement | null>(null);

  const priceChartRef =
    useRef<IChartApi | null>(null);

  const volumeChartRef =
    useRef<IChartApi | null>(null);

  const rsiChartRef =
    useRef<IChartApi | null>(null);

  const candleSeriesRef =
    useRef<ISeriesApi<"Candlestick"> | null>(
      null
    );

  const ema20SeriesRef =
    useRef<ISeriesApi<"Line"> | null>(null);

  const ema50SeriesRef =
    useRef<ISeriesApi<"Line"> | null>(null);

  const volumeSeriesRef =
    useRef<ISeriesApi<"Histogram"> | null>(
      null
    );

  const rsiSeriesRef =
    useRef<ISeriesApi<"Line"> | null>(null);

  const candlesRef =
    useRef<CandlestickData<Time>[]>([]);

  const markersRef =
    useRef<ReturnType<
      typeof createSeriesMarkers<Time>
    > | null>(null);

  const tradePriceLinesRef =
    useRef<IPriceLine[]>([]);

  const syncingTimeScaleRef =
    useRef(false);

  const hasFittedTimeframeRef =
    useRef<string | null>(null);

  const visibilityRef = useRef({
    showBullishStructure: true,
    showBearishStructure: true,
    showBOS: true,
    showCHoCH: true,
  });

  /*
   * CREATE CHARTS
   */
  useEffect(() => {
    if (
      !priceContainerRef.current ||
      !volumeContainerRef.current ||
      !rsiContainerRef.current
    ) {
      return;
    }

    const commonOptions = {
      layout: {
        background: {
          type: ColorType.Solid,
          color: "#0a0c10",
        },
        textColor: "#71717a",
      },

      grid: {
        vertLines: {
          color:
            "rgba(255,255,255,0.04)",
        },
        horzLines: {
          color:
            "rgba(255,255,255,0.04)",
        },
      },

      rightPriceScale: {
        borderColor:
          "rgba(255,255,255,0.06)",
      },

      timeScale: {
        borderColor:
          "rgba(255,255,255,0.06)",
        timeVisible: true,
        secondsVisible: false,
      },
    };

    /*
     * PRICE CHART
     */
    const priceChart = createChart(
      priceContainerRef.current,
      {
        ...commonOptions,
        width:
          priceContainerRef.current
            .clientWidth,
        height: 360,
      }
    );

    const candleSeries =
      priceChart.addSeries(
        CandlestickSeries,
        {
          upColor: "#34d399",
          downColor: "#f87171",
          borderVisible: false,
          wickUpColor: "#34d399",
          wickDownColor: "#f87171",
        }
      );

    const ema20Series =
      priceChart.addSeries(
        LineSeries,
        {
          color: "#a78bfa",
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: true,
        }
      );

    const ema50Series =
      priceChart.addSeries(
        LineSeries,
        {
          color: "#22d3ee",
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: true,
        }
      );

    /*
     * MARKET STRUCTURE MARKERS
     */
    const markers =
      createSeriesMarkers<Time>(
        candleSeries,
        []
      );

    /*
     * VOLUME
     */
    const volumeChart = createChart(
      volumeContainerRef.current,
      {
        ...commonOptions,
        width:
          volumeContainerRef.current
            .clientWidth,
        height: 110,
      }
    );

    const volumeSeries =
      volumeChart.addSeries(
        HistogramSeries,
        {
          priceFormat: {
            type: "volume",
          },
          priceScaleId: "",
        }
      );

    volumeChart
      .priceScale("")
      .applyOptions({
        scaleMargins: {
          top: 0.1,
          bottom: 0,
        },
      });

    /*
     * RSI
     */
    const rsiChart = createChart(
      rsiContainerRef.current,
      {
        ...commonOptions,
        width:
          rsiContainerRef.current
            .clientWidth,
        height: 140,
      }
    );

    const rsiSeries =
      rsiChart.addSeries(
        LineSeries,
        {
          color: "#f59e0b",
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: true,
        }
      );

    const rsi70Series =
      rsiChart.addSeries(
        LineSeries,
        {
          color:
            "rgba(248,113,113,0.35)",
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
        }
      );

    const rsi30Series =
      rsiChart.addSeries(
        LineSeries,
        {
          color:
            "rgba(52,211,153,0.35)",
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
        }
      );

    const rsiTimes = [
      Math.floor(Date.now() / 1000) -
        86400,
      Math.floor(Date.now() / 1000) +
        86400,
    ] as Time[];

    rsi70Series.setData(
      rsiTimes.map((time) => ({
        time,
        value: 70,
      }))
    );

    rsi30Series.setData(
      rsiTimes.map((time) => ({
        time,
        value: 30,
      }))
    );

    priceChartRef.current = priceChart;
    volumeChartRef.current = volumeChart;
    rsiChartRef.current = rsiChart;

    candleSeriesRef.current =
      candleSeries;

    ema20SeriesRef.current =
      ema20Series;

    ema50SeriesRef.current =
      ema50Series;

    volumeSeriesRef.current =
      volumeSeries;

    rsiSeriesRef.current =
      rsiSeries;

    markersRef.current = markers;

    /*
     * SYNC PRICE / VOLUME / RSI TIME SCALES
     */
    const charts = [
      priceChart,
      volumeChart,
      rsiChart,
    ];

    const syncTimeScale = (source: IChartApi) => {
      if (syncingTimeScaleRef.current) return;

      const range =
        source.timeScale().getVisibleLogicalRange();

      if (!range) return;

      syncingTimeScaleRef.current = true;

      charts.forEach((chart) => {
        if (chart === source) return;
        chart.timeScale().setVisibleLogicalRange(range);
      });

      requestAnimationFrame(() => {
        syncingTimeScaleRef.current = false;
      });
    };

    const unsubscribers = charts.map((chart) => {
      const handler = () => syncTimeScale(chart);
      chart.timeScale().subscribeVisibleLogicalRangeChange(handler);
      return () =>
        chart.timeScale().unsubscribeVisibleLogicalRangeChange(handler);
    });

    /*
     * RESPONSIVE
     */
    const resizeObserver =
      new ResizeObserver(() => {
        if (
          !priceContainerRef.current
        ) {
          return;
        }

        const width =
          priceContainerRef.current
            .clientWidth;

        priceChart.applyOptions({
          width,
        });

        volumeChart.applyOptions({
          width,
        });

        rsiChart.applyOptions({
          width,
        });
      });

    resizeObserver.observe(
      priceContainerRef.current
    );

    return () => {
      resizeObserver.disconnect();
      unsubscribers.forEach((unsubscribe) => unsubscribe());

      tradePriceLinesRef.current.forEach((line) => {
        candleSeries.removePriceLine(line);
      });
      tradePriceLinesRef.current = [];

      priceChart.remove();
      volumeChart.remove();
      rsiChart.remove();

      priceChartRef.current = null;
      volumeChartRef.current = null;
      rsiChartRef.current = null;

      candleSeriesRef.current = null;
      ema20SeriesRef.current = null;
      ema50SeriesRef.current = null;
      volumeSeriesRef.current = null;
      rsiSeriesRef.current = null;
      markersRef.current = null;

      candlesRef.current = [];
    };
  }, []);

  /*
   * LOAD MARKET DATA
   */
  useEffect(() => {
    let cancelled = false;

    async function loadCandles() {
      try {
        const limits = getTimeframeLimits(selectedTimeframe);

        const response = await fetch(
          `/api/market/candles?symbol=${symbol}&timeframe=${selectedTimeframe}&limit=${limits.chart}`,
          {
            cache: "no-store",
          }
        );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success ||
          !data.candles
        ) {
          throw new Error(
            data.error ||
              "Failed to load candles"
          );
        }

        if (cancelled) return;

        const candles: CandlestickData<Time>[] =
          data.candles
            .map((candle: Candle) => ({
              time: Math.floor(
                new Date(
                  candle.timestamp
                ).getTime() / 1000
              ) as Time,

              open: Number(candle.open),
              high: Number(candle.high),
              low: Number(candle.low),
              close: Number(candle.close),
            }))
            .sort(
              (
                a: CandlestickData<Time>,
                b: CandlestickData<Time>
              ) =>
                Number(a.time) -
                Number(b.time)
            );

        candlesRef.current =
          candles;

        candleSeriesRef.current?.setData(
          candles
        );

        ema20SeriesRef.current?.setData(
          calculateEMA(candles, 20)
        );

        ema50SeriesRef.current?.setData(
          calculateEMA(candles, 50)
        );

        /*
         * VOLUME
         */
        const volumeData = data.candles
          .map((candle: Candle) => ({
            time: Math.floor(
              new Date(
                candle.timestamp
              ).getTime() / 1000
            ) as Time,

            value: Number(
              candle.volume ?? 0
            ),

            color:
              Number(candle.close) >=
              Number(candle.open)
                ? "#34d399"
                : "#f87171",
          }))
          .sort(
            (
              a: {
                time: Time;
                value: number;
              },
              b: {
                time: Time;
                value: number;
              }
            ) =>
              Number(a.time) -
              Number(b.time)
          );

        volumeSeriesRef.current?.setData(
          volumeData
        );

        /*
         * RSI
         */
        rsiSeriesRef.current?.setData(
          calculateRSI(candles, 14)
        );

        /*
         * MARKET STRUCTURE
         */
        const structureResponse =
          await fetch(
            `/api/market/structure?symbol=${symbol}&timeframe=${selectedTimeframe}&limit=${limits.structure}`,
            {
              cache: "no-store",
            }
          );

        const structureData =
          await structureResponse.json();

        if (cancelled) return;

        if (
          structureResponse.ok &&
          structureData.success &&
          Array.isArray(
            structureData.swings
          )
        ) {
          const candleTimes =
            new Set(
              candles.map(
                (candle) =>
                  Number(candle.time)
              )
            );

          /*
           * HH / HL / LH / LL
           */
          const swingMarkers:
            SeriesMarker<Time>[] =
            structureData.swings
              .filter(
                (
                  swing: StructureSwing
                ) =>
                  swing.label !== null
              )
              .filter(
                (
                  swing: StructureSwing
                ) => {
                  const time =
                    Math.floor(
                      new Date(
                        swing.timestamp
                      ).getTime() /
                        1000
                    );

                  return candleTimes.has(
                    time
                  );
                }
              )
              .map(
                (
                  swing: StructureSwing
                ) => {
                  const time =
                    Math.floor(
                      new Date(
                        swing.timestamp
                      ).getTime() /
                        1000
                    ) as Time;

                  const isHigh =
                    swing.type ===
                    "HIGH";

                  return {
                    time,

                    position: isHigh
                      ? "aboveBar"
                      : "belowBar",

                    color:
                      swing.label ===
                        "HH" ||
                      swing.label ===
                        "HL"
                        ? "#34d399"
                        : "#f87171",

                    shape: isHigh
                      ? "arrowDown"
                      : "arrowUp",

                    text:
                      swing.label ?? "",
                  };
                }
              );

          /*
           * BOS / CHoCH
           */
          const breakMarkers:
            SeriesMarker<Time>[] =
            Array.isArray(
              structureData.breaks
            )
              ? structureData.breaks
                  .filter(
                    (
                      structureBreak: StructureBreak
                    ) => {
                      const time =
                        Math.floor(
                          new Date(
                            structureBreak.timestamp
                          ).getTime() /
                            1000
                        );

                      return candleTimes.has(
                        time
                      );
                    }
                  )
                  .map(
                    (
                      structureBreak: StructureBreak
                    ) => {
                      const time =
                        Math.floor(
                          new Date(
                            structureBreak.timestamp
                          ).getTime() /
                            1000
                        ) as Time;

                      const isBullish =
                        structureBreak.direction ===
                        "BULLISH";

                      return {
                        time,

                        position:
                          isBullish
                            ? "belowBar"
                            : "aboveBar",

                        color:
                          isBullish
                            ? "#34d399"
                            : "#f87171",

                        shape:
                          isBullish
                            ? "arrowUp"
                            : "arrowDown",

                        text:
                          structureBreak.type,
                      };
                    }
                  )
              : [];

          /*
           * COMBINE ALL STRUCTURE MARKERS
           */
          const structureMarkers:
            SeriesMarker<Time>[] = [
              ...swingMarkers,
              ...breakMarkers,
            ].sort(
              (
                a: SeriesMarker<Time>,
                b: SeriesMarker<Time>
              ) =>
                Number(a.time) -
                Number(b.time)
            );

          structureMarkersRef.current = structureMarkers;

          const visibleMarkers =
            structureMarkers.filter((marker) => {
              const text = marker.text ?? "";

              if (["HH", "HL"].includes(text)) {
                return visibilityRef.current.showBullishStructure;
              }

              if (["LH", "LL"].includes(text)) {
                return visibilityRef.current.showBearishStructure;
              }

              if (text === "BOS") {
                return visibilityRef.current.showBOS;
              }

              if (text === "CHoCH") {
                return visibilityRef.current.showCHoCH;
              }

              return true;
            });

          markersRef.current?.setMarkers(visibleMarkers);
        }

        if (
          hasFittedTimeframeRef.current !==
          selectedTimeframe
        ) {
          priceChartRef.current
            ?.timeScale()
            .fitContent();

          volumeChartRef.current
            ?.timeScale()
            .fitContent();

          rsiChartRef.current
            ?.timeScale()
            .fitContent();

          hasFittedTimeframeRef.current =
            selectedTimeframe;
        }
      } catch (error) {
        console.error(
          "Failed to load market data:",
          error
        );
      }
    }

    loadCandles();

    const interval =
      window.setInterval(
        loadCandles,
        5_000
      );

    return () => {
      cancelled = true;
      window.clearInterval(
        interval
      );
    };
  }, [symbol, selectedTimeframe]);

  /*
   * TRADE SETUP PRICE LEVELS
   */
  useEffect(() => {
    const series = candleSeriesRef.current;
    if (!series) return;

    tradePriceLinesRef.current.forEach((line) => {
      series.removePriceLine(line);
    });
    tradePriceLinesRef.current = [];

    if (signalDirection === "WAIT") {
      return;
    }

    const levels = [
      {
        price: entryPrice,
        title: "ENTRY",
        color: "#a1a1aa",
      },
      {
        price: stopLossPrice,
        title: "SL",
        color: "#f87171",
      },
      {
        price: takeProfit1Price,
        title: "TP1",
        color: "#34d399",
      },
      {
        price: takeProfit2Price,
        title: "TP2",
        color: "#34d399",
      },
    ];

    levels.forEach((level) => {
      if (
        level.price === undefined ||
        !Number.isFinite(level.price) ||
        level.price <= 0
      ) {
        return;
      }

      const line = series.createPriceLine({
        price: level.price,
        color: level.color,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: level.title,
      });

      tradePriceLinesRef.current.push(line);
    });
  }, [
    entryPrice,
    stopLossPrice,
    takeProfit1Price,
    takeProfit2Price,
    signalDirection,
  ]);

  /*
   * LIVE PRICE
   */
  useEffect(() => {
    if (
      livePrice === null ||
      livePrice <= 0 ||
      !candleSeriesRef.current ||
      candlesRef.current.length === 0
    ) {
      return;
    }

    const candles = [
      ...candlesRef.current,
    ];

    const lastCandle =
      candles[candles.length - 1];

    if (!lastCandle) return;

    const currentTime =
      Math.floor(Date.now() / 1000);

    const timeframeSeconds: Record<
      string,
      number
    > = {
      "1m": 60,
      "3m": 180,
      "5m": 300,
      "15m": 900,
      "30m": 1800,
      "1h": 3600,
      "2h": 7200,
      "4h": 14400,
      "6h": 21600,
      "12h": 43200,
      "1d": 86400,
    };

    const duration =
      timeframeSeconds[
        selectedTimeframe
      ] ?? 60;

    const lastTime =
      Number(lastCandle.time);

    const currentCandleStart =
      Math.floor(
        currentTime / duration
      ) * duration;

    /*
     * NEW CANDLE
     */
    if (
      currentCandleStart >
      lastTime
    ) {
      const newCandle:
        CandlestickData<Time> = {
        time:
          currentCandleStart as Time,
        open: livePrice,
        high: livePrice,
        low: livePrice,
        close: livePrice,
      };

      candles.push(newCandle);

      const chartLimit =
        getTimeframeLimits(selectedTimeframe).chart;

      const trimmed =
        candles.length > chartLimit
          ? candles.slice(-chartLimit)
          : candles;

      candlesRef.current =
        trimmed;

      candleSeriesRef.current.setData(
        trimmed
      );

      ema20SeriesRef.current?.setData(
        calculateEMA(trimmed, 20)
      );

      ema50SeriesRef.current?.setData(
        calculateEMA(trimmed, 50)
      );

      rsiSeriesRef.current?.setData(
        calculateRSI(trimmed, 14)
      );

      return;
    }

    /*
     * UPDATE CURRENT CANDLE
     */
    const updatedCandle:
      CandlestickData<Time> = {
      time: lastCandle.time,

      open: lastCandle.open,

      high: Math.max(
        lastCandle.high,
        livePrice
      ),

      low: Math.min(
        lastCandle.low,
        livePrice
      ),

      close: livePrice,
    };

    candles[
      candles.length - 1
    ] = updatedCandle;

    candlesRef.current =
      candles;

    candleSeriesRef.current.update(
      updatedCandle
    );

    ema20SeriesRef.current?.setData(
      calculateEMA(candles, 20)
    );

    ema50SeriesRef.current?.setData(
      calculateEMA(candles, 50)
    );

    rsiSeriesRef.current?.setData(
      calculateRSI(candles, 14)
    );
  }, [
    livePrice,
    selectedTimeframe,
  ]);

  /*
   * INDICATOR VISIBILITY
   */
  useEffect(() => {
    ema20SeriesRef.current?.applyOptions({
      visible: showEMA20,
    });

    ema50SeriesRef.current?.applyOptions({
      visible: showEMA50,
    });

    rsiSeriesRef.current?.applyOptions({
      visible: showRSI,
    });

    volumeSeriesRef.current?.applyOptions({
      visible: showVolume,
    });
  }, [showEMA20, showEMA50, showRSI, showVolume]);

  useEffect(() => {
    visibilityRef.current = {
      showBullishStructure,
      showBearishStructure,
      showBOS,
      showCHoCH,
    };

    const filteredMarkers = structureMarkersRef.current.filter(
      (marker) => {
        const text = marker.text ?? "";

        if (["HH", "HL"].includes(text)) {
          return showBullishStructure;
        }

        if (["LH", "LL"].includes(text)) {
          return showBearishStructure;
        }

        if (text === "BOS") {
          return showBOS;
        }

        if (text === "CHoCH") {
          return showCHoCH;
        }

        return true;
      }
    );

    markersRef.current?.setMarkers(filteredMarkers);
  }, [
    showBullishStructure,
    showBearishStructure,
    showBOS,
    showCHoCH,
  ]);

  /*
   * TIMEFRAME / INDICATOR CONTROLS
   */
  const IndicatorToggle = ({
    label,
    active,
    color,
    onClick,
  }: {
    label: string;
    active: boolean;
    color: string;
    onClick: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-[9px] transition ${
        active
          ? "border-white/[0.08] bg-white/[0.035] text-zinc-300"
          : "border-white/[0.04] bg-transparent text-zinc-700"
      }`}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{
          backgroundColor: active ? color : "#3f3f46",
        }}
      />
      {label}
    </button>
  );

  return (
    <div className="w-full">
      <div className="mb-3 rounded-lg border border-white/[0.05] bg-white/[0.015] p-2">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[9px] uppercase tracking-wider text-zinc-600">
            Timeframe
          </span>
          <span className="text-[8px] text-zinc-700">
            {selectedTimeframe}
          </span>
        </div>

        <div className="flex flex-wrap gap-1">
          {TIMEFRAMES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setSelectedTimeframe(item)}
              className={`rounded-md px-2 py-1 text-[8px] transition ${
                selectedTimeframe === item
                  ? "bg-violet-500/15 text-violet-400"
                  : "text-zinc-600 hover:bg-white/[0.03] hover:text-zinc-400"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        <IndicatorToggle label="EMA 20" active={showEMA20} color="#a78bfa" onClick={() => setShowEMA20((v) => !v)} />
        <IndicatorToggle label="EMA 50" active={showEMA50} color="#22d3ee" onClick={() => setShowEMA50((v) => !v)} />
        <IndicatorToggle label="HH / HL" active={showBullishStructure} color="#34d399" onClick={() => setShowBullishStructure((v) => !v)} />
        <IndicatorToggle label="LH / LL" active={showBearishStructure} color="#f87171" onClick={() => setShowBearishStructure((v) => !v)} />
        <IndicatorToggle label="BOS" active={showBOS} color="#34d399" onClick={() => setShowBOS((v) => !v)} />
        <IndicatorToggle label="CHoCH" active={showCHoCH} color="#f87171" onClick={() => setShowCHoCH((v) => !v)} />
        <IndicatorToggle label="Volume" active={showVolume} color="#71717a" onClick={() => setShowVolume((v) => !v)} />
        <IndicatorToggle label="RSI" active={showRSI} color="#f59e0b" onClick={() => setShowRSI((v) => !v)} />
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-4 px-1 text-xs">
        {showEMA20 && <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#a78bfa]" /><span className="text-zinc-400">EMA 20</span></div>}
        {showEMA50 && <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#22d3ee]" /><span className="text-zinc-400">EMA 50</span></div>}
        {showBullishStructure && <div className="flex items-center gap-2"><span className="text-emerald-400">HH / HL</span><span className="text-zinc-600">Bullish Structure</span></div>}
        {showBearishStructure && <div className="flex items-center gap-2"><span className="text-red-400">LH / LL</span><span className="text-zinc-600">Bearish Structure</span></div>}
        {showBOS && <div className="flex items-center gap-2"><span className="text-emerald-400">BOS</span><span className="text-zinc-600">Break of Structure</span></div>}
        {showCHoCH && <div className="flex items-center gap-2"><span className="text-red-400">CHoCH</span><span className="text-zinc-600">Change of Character</span></div>}
      </div>

      <div ref={priceContainerRef} className="w-full overflow-hidden rounded-xl" />

      <div className={showVolume ? "block" : "h-0 overflow-hidden"}>
        <div className="mt-2 px-1 text-xs text-zinc-500">VOLUME</div>
        <div ref={volumeContainerRef} className="w-full overflow-hidden rounded-xl" />
      </div>

      <div className={showRSI ? "block" : "h-0 overflow-hidden"}>
        <div className="mt-2 flex items-center gap-3 px-1 text-xs">
          <span className="text-zinc-500">RSI 14</span>
          <span className="text-zinc-600">70 Overbought</span>
          <span className="text-zinc-600">30 Oversold</span>
        </div>
        <div ref={rsiContainerRef} className="w-full overflow-hidden rounded-xl" />
      </div>
    </div>
  );
}

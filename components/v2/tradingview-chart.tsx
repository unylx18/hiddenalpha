"use client";

import { useEffect, useRef } from "react";
import type { SymbolKey } from "./instruments";

/**
 * The TradingView free hosted widget displays chart data only.
 * It is deliberately NEVER used as a market-data API for Hidden Alpha's engine.
 * TradingView's iframe, logo and attribution must not be removed or obscured.
 */
const chartSymbols: Record<SymbolKey, string> = {
  BTCUSDT: "BYBIT:BTCUSDT.P",
  ETHUSDT: "BYBIT:ETHUSDT.P",
  SOLUSDT: "BYBIT:SOLUSDT.P",
  XRPUSDT: "BYBIT:XRPUSDT.P",
  BNBUSDT: "BYBIT:BNBUSDT.P",
  DOGEUSDT: "BYBIT:DOGEUSDT.P",
  ADAUSDT: "BYBIT:ADAUSDT.P",
  AVAXUSDT: "BYBIT:AVAXUSDT.P",
  LINKUSDT: "BYBIT:LINKUSDT.P",
  SUIUSDT: "BYBIT:SUIUSDT.P",
  LTCUSDT: "BYBIT:LTCUSDT.P",
  DOTUSDT: "BYBIT:DOTUSDT.P",
  XAUUSD: "OANDA:XAUUSD",
  EURUSD: "OANDA:EURUSD",
  GBPUSD: "OANDA:GBPUSD",
};

const tvIntervals: Record<string, string> = {
  "1m": "1",
  "3m": "3",
  "5m": "5",
  "15m": "15",
  "1h": "60",
  "4h": "240",
  "1d": "D",
};

export default function TradingViewChart({
  symbol,
  timeframe,
  focus=false,
}: {
  symbol: SymbolKey;
  timeframe: string;
  focus?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const widgetSymbol = chartSymbols[symbol];
  const interval = tvIntervals[timeframe.toLowerCase()] ?? "15";

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    host.replaceChildren();

    const container = document.createElement("div");
    container.className = "tradingview-widget-container";
    container.style.height = "100%";
    container.style.width = "100%";

    const slot = document.createElement("div");
    slot.className = "tradingview-widget-container__widget";
    slot.style.height = "calc(100% - 32px)";
    slot.style.width = "100%";
    container.appendChild(slot);

    const attribution = document.createElement("div");
    attribution.className = "tradingview-widget-copyright";
    attribution.style.height = "32px";
    attribution.style.display = "flex";
    attribution.style.alignItems = "center";
    attribution.style.paddingLeft = "8px";
    attribution.style.fontSize = "11px";

    const link = document.createElement("a");
    link.href = "https://www.tradingview.com/";
    link.target = "_blank";
    link.rel = "noopener nofollow";
    link.textContent = "Chart by TradingView";
    link.style.color = "#73cdef";
    attribution.appendChild(link);
    container.appendChild(attribution);

    // Attach the widget container before the external loader so the script
    // always runs against a connected DOM subtree.
    host.appendChild(container);

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: widgetSymbol,
      interval,
      timezone: "Asia/Makassar",
      theme: "dark",
      style: "1",
      locale: "en",
      allow_symbol_change: false,
      save_image: false,
      hide_top_toolbar: false,
      hide_side_toolbar: false,
      hide_legend: false,
      hide_volume: false,
      details: false,
      calendar: false,
      hotlist: false,
      support_host: "https://www.tradingview.com",
      backgroundColor: "#061724",
      gridColor: "rgba(41,95,124,0.12)",
      withdateranges: true,
      studies: [],
    });
    container.appendChild(script);

    return () => {
      host.replaceChildren();
    };
  }, [widgetSymbol, interval]);

  return (
    <div className={focus?"relative h-[min(74vh,860px)] min-h-[450px] w-full":"relative h-[365px] w-full md:h-[400px] 2xl:h-[410px]"}>
      <div ref={hostRef} className="absolute inset-0" aria-label={"TradingView chart " + widgetSymbol}/>
      <noscript>JavaScript is required to display the TradingView chart.</noscript>
    </div>
  );
}

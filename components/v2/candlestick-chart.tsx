"use client";

import { useEffect, useState } from "react";
import type { SymbolKey } from "./instruments";

type Candle = {
  timestamp: string;
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};
type CandleFeed =
  | { key: string; status: "ok"; candles: Candle[]; fetchedAt: string }
  | { key: string; status: "error"; error: string };

function isCandle(value: unknown): value is Candle {
  if (!value || typeof value !== "object") return false;
  const c = value as Partial<Candle>;
  return typeof c.timestamp === "string" &&
    typeof c.openTime === "number" &&
    [c.open, c.high, c.low, c.close, c.volume].every(
      (v) => typeof v === "number" && Number.isFinite(v)
    );
}

function renderPrice(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: value < 10 ? 4 : 2,
    maximumFractionDigits: value < 10 ? 5 : 2,
  });
}

export function CandlestickChart({
  symbol, timeframe, indicators,
}: {
  symbol: SymbolKey;
  timeframe: string;
  indicators: boolean;
}) {
  const [feed, setFeed] = useState<CandleFeed | null>(null);
  const key = symbol + ":" + timeframe.toLowerCase();
  const crypto = symbol === "BTCUSDT" || symbol === "ETHUSDT" || symbol === "SOLUSDT";

  useEffect(() => {
    if (!crypto) return;
    const controller = new AbortController();
    const query = new URLSearchParams({ symbol, timeframe: timeframe.toLowerCase() });
    fetch("/api/v2/market/candles?" + query.toString(), {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        const payload: unknown = await response.json();
        if (!payload || typeof payload !== "object") throw new Error("Invalid feed response");
        const x = payload as Record<string, unknown>;
        if (!response.ok || x.success !== true) {
          throw new Error(typeof x.error === "string" ? x.error : "Candle feed unavailable");
        }
        if (x.symbol !== symbol || x.timeframe !== timeframe.toLowerCase() || !Array.isArray(x.candles)) {
          throw new Error("Candle feed does not match selected symbol/timeframe");
        }
        const candles = x.candles.filter(isCandle);
        if (candles.length < 10) throw new Error("Not enough valid completed candles");
        if (controller.signal.aborted) return;
        setFeed({ key, status: "ok", candles, fetchedAt: String(x.fetchedAt ?? "") });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setFeed({
          key,
          status: "error",
          error: error instanceof Error ? error.message : "Candle feed unavailable",
        });
      });
    return () => controller.abort();
  }, [crypto, symbol, timeframe, key]);

  if (!crypto) {
    return <div className="flex min-h-[270px] flex-col items-center justify-center gap-3 rounded-lg border border-[#20495e] bg-[#061724] px-4 text-center">
      <span className="text-lg text-[#1bcaf5]">◈</span>
      <strong className="text-[13px]">Forex market data not connected</strong>
      <span className="max-w-sm text-[11px] text-[#96bacb]">XAUUSD and currency-pair candles require a separate verified forex data provider. No prices are fabricated.</span>
    </div>;
  }

  const current = feed?.key === key ? feed : null;
  if (!current) {
    return <div role="status" className="grid min-h-[270px] place-items-center rounded-lg bg-[#061724] text-[12px] text-[#8fb5c7]">Loading completed Bybit candles for {symbol}...</div>;
  }
  if (current.status === "error") {
    return <div role="alert" className="flex min-h-[270px] flex-col items-center justify-center gap-2 rounded-lg border border-[#673645] bg-[#131d2b] px-3 text-center">
      <span className="font-semibold text-[#ff8c9c]">Live candle data unavailable</span>
      <span className="text-[11px] text-[#a7bac7]">{current.error}</span>
      <span className="text-[10px] text-[#7d9aaa]">The chart will not fall back to synthetic candles.</span>
    </div>;
  }

  const candles = current.candles.slice(-80);
  const left = 39, right = 737;
  const slot = (right - left) / candles.length;
  const rawLow = Math.min(...candles.map((c) => c.low));
  const rawHigh = Math.max(...candles.map((c) => c.high));
  const padding = Math.max((rawHigh - rawLow) * 0.10, rawHigh * 0.0001);
  const lo = rawLow - padding, hi = rawHigh + padding;
  const y = (v: number) => 29 + (hi - v) / (hi - lo) * 214;
  const maxVolume = Math.max(1, ...candles.map((c) => c.volume));
  const ma = (period: number) => candles.map((c, i) => {
    if (i < period - 1) return null;
    const chunk = candles.slice(i - period + 1, i + 1);
    const average = chunk.reduce((n, row) => n + row.close, 0) / chunk.length;
    return (left + i * slot + slot / 2).toFixed(1) + "," + y(average).toFixed(1);
  }).filter((point): point is string => point !== null).join(" ");
  const labelIndices = [0, .2, .4, .6, .8, 1].map((fraction) =>
    Math.min(candles.length - 1, Math.floor((candles.length - 1) * fraction))
  );

  return <div>
    <svg viewBox="0 0 820 342" className="block h-auto w-full" role="img" aria-label={symbol + " historical completed Bybit candles (" + timeframe + ")"}>
      <rect width="820" height="342" fill="#061724"/>
      {Array.from({length:6}, (_,i) => {
        const value=hi-(hi-lo)*i/5;
        const rowY=29+214*i/5;
        return <g key={i}>
          <line x1="28" x2="742" y1={rowY} y2={rowY} stroke="#214456" opacity=".55"/>
          <text x="750" y={rowY+3} fill="#8aaabc" fontSize="11">{renderPrice(value)}</text>
        </g>;
      })}
      {labelIndices.map((idx,i)=><g key={i}>
        <line x1={left+idx*slot} x2={left+idx*slot} y1="24" y2="289" stroke="#1b3645" opacity=".4"/>
        <text x={Math.min(696,left+idx*slot)} y="326" fill="#82a8ba" fontSize="11">
          {new Date(candles[idx].openTime).toLocaleDateString("en-GB",{day:"2-digit",month:"short"})}
        </text>
      </g>)}
      {candles.map((c,i)=>{
        const x=left+i*slot+slot*.15;
        const green=c.close>=c.open;
        const color=green?"#19d9a5":"#f35c76";
        const barWidth=Math.max(2,slot*.7);
        const upper=Math.min(y(c.open),y(c.close));
        const height=Math.max(1.5,Math.abs(y(c.open)-y(c.close)));
        const volumeHeight=32*c.volume/maxVolume;
        return <g key={c.openTime}>
          <line x1={x+barWidth/2} x2={x+barWidth/2} y1={y(c.high)} y2={y(c.low)} stroke={color} strokeWidth="1"/>
          <rect x={x} y={upper} width={barWidth} height={height} rx=".5" fill={color}/>
          <rect x={x} y={289-volumeHeight} width={barWidth} height={volumeHeight} fill={color} opacity=".38"/>
        </g>;
      })}
      {indicators && <>
        <polyline points={ma(20)} fill="none" stroke="#1bcaf5" strokeWidth="1.7"/>
        <polyline points={ma(50)} fill="none" stroke="#ac7cec" strokeWidth="1.7"/>
      </>}
      <line x1="28" x2="743" y1="290" y2="290" stroke="#1c4e62"/>
    </svg>
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#174255] px-2 pt-2 text-[10px] text-[#8fb4c5]">
      <span>BYBIT · {candles.length} completed candles · No synthetic values</span>
      <span>Latest closed: {new Date(candles[candles.length-1].openTime).toLocaleString()}</span>
    </div>
  </div>;
}

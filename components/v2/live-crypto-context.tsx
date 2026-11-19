"use client";

import { useState } from "react";
import { Activity, AlertTriangle, ArrowUpRight, RefreshCw, ShieldCheck } from "lucide-react";
import type { Market, SymbolKey } from "./instruments";

type AlphaContext = {
  symbol: string;
  timeframe: string;
  timestamp: string;
  market: { bias: "BULLISH" | "BEARISH" | "NEUTRAL"; score: number; confidence: number };
  trend: { direction: string; strength: number };
  momentum: { direction: string; strength: number };
  volume: { condition: string; ratio: number };
  volatility: { level: string; percentage: number | null };
};

type AlphaApiResponse = { success: boolean; alpha?: unknown; error?: string };

function isAlphaContext(value: unknown): value is AlphaContext {
  if (!value || typeof value !== "object") return false;
  const x = value as Record<string, unknown>;
  if (typeof x.symbol !== "string" || typeof x.timeframe !== "string" || typeof x.timestamp !== "string") return false;
  if (!x.market || typeof x.market !== "object") return false;
  if (!x.trend || typeof x.trend !== "object") return false;
  if (!x.momentum || typeof x.momentum !== "object") return false;
  if (!x.volume || typeof x.volume !== "object") return false;
  if (!x.volatility || typeof x.volatility !== "object") return false;
  const market = x.market as Record<string, unknown>;
  const volume = x.volume as Record<string, unknown>;
  const volatility = x.volatility as Record<string, unknown>;
  return ["BULLISH", "BEARISH", "NEUTRAL"].includes(String(market.bias)) &&
    typeof market.score === "number" && Number.isFinite(market.score) &&
    typeof market.confidence === "number" && Number.isFinite(market.confidence) &&
    typeof volume.ratio === "number" && Number.isFinite(volume.ratio) &&
    (volatility.percentage === null || (typeof volatility.percentage === "number" && Number.isFinite(volatility.percentage)));
}

function readableTime(timestamp: string): string {
  const parsed = new Date(timestamp);
  return Number.isNaN(parsed.getTime()) ? "Invalid timestamp" : parsed.toLocaleString();
}

export default function LiveCryptoContext({
  symbol, timeframe, market,
}: {
  symbol: SymbolKey;
  timeframe: string;
  market: Market;
}) {
  const [context, setContext] = useState<AlphaContext | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  async function load() {
    if (market !== "crypto" || loading) return;
    setLoading(true);
    setError("");
    setContext(null);
    try {
      const params = new URLSearchParams({ symbol, timeframe: timeframe.toLowerCase() });
      const response = await fetch("/api/trading/context?" + params.toString(), { cache: "no-store" });
      const payload = (await response.json()) as AlphaApiResponse;
      if (!response.ok || payload.success !== true || !isAlphaContext(payload.alpha)) {
        throw new Error(payload.error || "Alpha Context response unavailable or invalid");
      }
      if (payload.alpha.symbol !== symbol || payload.alpha.timeframe.toLowerCase() !== timeframe.toLowerCase()) {
        throw new Error("Alpha Context response does not match selected instrument/timeframe");
      }
      setContext(payload.alpha);
      setFetchedAt(new Date().toISOString());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load Alpha Context");
      setFetchedAt(null);
    } finally {
      setLoading(false);
    }
  }

  const notSupported = market === "forex";
  const tone = context?.market.bias === "BULLISH" ? "text-[#17dfae]" :
    context?.market.bias === "BEARISH" ? "text-[#ff7589]" : "text-[#b0c8d7]";

  return <section className="rounded-xl border border-[#14506a] bg-[#061b29] p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="rounded-lg border border-[#0b6f91] bg-[#06405b] p-2 text-[#1bcaf5]"><Activity size={17}/></div>
        <div>
          <h2 className="text-[13px] font-bold">Live Alpha Context <span className="ml-2 rounded border border-[#1a5670] px-2 py-0.5 text-[9px] font-normal text-[#9bc4d5]">Read-only</span></h2>
          <p className="mt-1 text-[10px] text-[#8eb1c3]">Existing Bybit context endpoint · Manual refresh · No order execution</p>
        </div>
      </div>
      <button type="button" onClick={load} disabled={loading || notSupported} className="inline-flex items-center gap-2 rounded-lg border border-[#0baee0] bg-[#075b7c] px-4 py-2 text-[11px] font-semibold text-[#e2f9ff] disabled:cursor-not-allowed disabled:opacity-40 hover:bg-[#08769d]">
        <RefreshCw size={13} className={loading ? "animate-spin" : ""}/>{loading ? "Loading..." : "Load Live Crypto Context"}
      </button>
    </div>
    {notSupported ? <div className="mt-3 rounded-lg border border-[#26516a] bg-[#0a2638] p-3 text-[11px] text-[#a9c9d8]"><AlertTriangle className="mr-2 inline" size={14}/>Forex live adapter is not connected yet. The other dashboard figures remain explicitly synthetic.</div>
      : error ? <div role="alert" className="mt-3 rounded-lg border border-[#7e3948] bg-[#3a1724] p-3 text-[11px] text-[#ffc9d3]"><AlertTriangle className="mr-2 inline" size={14}/>Live context unavailable: {error}</div>
      : context ? <div className="mt-3 grid gap-3 border-t border-[#174457] pt-3 sm:grid-cols-3 lg:grid-cols-6">
          <div><div className="text-[10px] text-[#87aebf]">Engine bias</div><div className={"mt-1 text-[16px] font-extrabold "+tone}>{context.market.bias}</div></div>
          <div><div className="text-[10px] text-[#87aebf]">Score</div><div className="mt-1 font-bold">{context.market.score} / 100</div></div>
          <div><div className="text-[10px] text-[#87aebf]">Engine confidence*</div><div className="mt-1 font-bold">{context.market.confidence}%</div></div>
          <div><div className="text-[10px] text-[#87aebf]">Trend / Momentum</div><div className="mt-1 text-[11px] font-bold">{context.trend.direction} / {context.momentum.direction}</div></div>
          <div><div className="text-[10px] text-[#87aebf]">Relative volume</div><div className="mt-1 font-bold">{context.volume.ratio.toFixed(2)}×</div></div>
          <div><div className="text-[10px] text-[#87aebf]">Volatility</div><div className="mt-1 font-bold">{context.volatility.level} {context.volatility.percentage === null ? "" : "(" + context.volatility.percentage.toFixed(2) + "%)"}</div></div>
          <div className="sm:col-span-3 lg:col-span-6 flex flex-wrap gap-3 text-[10px] text-[#87aabb]"><span><ShieldCheck size={12} className="mr-1 inline text-[#12d9a0]"/>Result from existing Alpha Context API</span><span>Market candle timestamp: {readableTime(context.timestamp)}</span><span>Fetched: {fetchedAt ? readableTime(fetchedAt) : "—"}</span><span>*Confidence is engine score, not outcome probability.</span></div>
        </div>
      : <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-[#80a6b9]"><ArrowUpRight size={13}/>Select a crypto instrument, then load its actual calculated context. Synthetic cards above remain demo-only.</div>}
  </section>;
}

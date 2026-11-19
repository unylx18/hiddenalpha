"use client";

import { useEffect, useState } from "react";
import { number, type SymbolKey } from "./instruments";

type Quote = { key: SymbolKey; price: number; change24h: number; fetchedAt: string };
type QuoteState = { symbol: SymbolKey; value: Quote | null; error: string };

export default function LiveMarketQuote({symbol}: { symbol: SymbolKey }) {
  const [state, setState] = useState<QuoteState | null>(null);
  const crypto = symbol === "BTCUSDT" || symbol === "ETHUSDT" || symbol === "SOLUSDT";

  useEffect(() => {
    if (!crypto) return;
    const controller = new AbortController();
    fetch("/api/market/ticker?symbol=" + encodeURIComponent(symbol), {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        const body: unknown = await response.json();
        if (!body || typeof body !== "object") throw new Error("Ticker response invalid");
        const data = body as Record<string, unknown>;
        if (!response.ok || data.success !== true || !data.ticker || typeof data.ticker !== "object") {
          throw new Error("Ticker feed unavailable");
        }
        const ticker = data.ticker as Record<string, unknown>;
        const price = ticker.lastPrice;
        const change24h = ticker.price24hChange;
        if (ticker.symbol !== symbol ||
            typeof price !== "number" || !Number.isFinite(price) || price <= 0 ||
            typeof change24h !== "number" || !Number.isFinite(change24h)) {
          throw new Error("Ticker payload invalid");
        }
        if (!controller.signal.aborted) {
          setState({symbol, value:{key:symbol,price,change24h,fetchedAt:new Date().toISOString()},error:""});
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          symbol,
          value:null,
          error:error instanceof Error ? error.message : "Ticker feed unavailable",
        });
      });
    return () => controller.abort();
  }, [crypto, symbol]);

  if (!crypto) {
    return <div className="text-right"><div className="text-[12px] font-semibold text-[#a2bac9]">No forex quote</div><div className="text-[10px] text-[#789dae]">Provider not connected</div></div>;
  }
  if (!state || state.symbol !== symbol) {
    return <div className="text-right text-[11px] text-[#98b8c8]">Loading Bybit quote...</div>;
  }
  if (!state.value) {
    return <div className="text-right"><div className="text-[11px] font-semibold text-[#ff8090]">Quote unavailable</div><div className="text-[10px] text-[#829fb0]">{state.error}</div></div>;
  }
  const q = state.value;
  return <div className="text-right">
    <div className="text-[20px] font-bold">{number(q.price)}</div>
    <div className={"text-[12px] font-semibold "+(q.change24h>=0?"text-[#19dba6]":"text-[#ff657a]")}>
      {q.change24h>=0?"+":""}{q.change24h.toFixed(2)}% · Bybit 24h
    </div>
    <div className="text-[9px] text-[#84aabc]">Fetched {new Date(q.fetchedAt).toLocaleTimeString()}</div>
  </div>;
}

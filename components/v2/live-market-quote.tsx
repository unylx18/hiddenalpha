"use client";

import { useEffect, useState } from "react";
import { createBybitTickerSocket } from "@/lib/market-data/bybit-live";
import { number, type SymbolKey } from "./instruments";

type Quote = {
  price: number;
  change24h: number;
  fetchedAt: string;
  source: "WEBSOCKET" | "REST";
};

type QuoteState = {
  symbol: SymbolKey;
  value: Quote | null;
  error: string;
};

export default function LiveMarketQuote({ symbol }: { symbol: SymbolKey }) {
  const crypto = symbol === "BTCUSDT" || symbol === "ETHUSDT" || symbol === "SOLUSDT";
  const [state, setState] = useState<QuoteState | null>(null);

  useEffect(() => {
    if (!crypto) return;
    let active = true;
    let lastSocketUpdate = 0;
    let fallback: ReturnType<typeof setInterval> | undefined;
    const controller = new AbortController();

    async function fetchSnapshot() {
      try {
        const res = await fetch("/api/market/ticker?symbol=" + encodeURIComponent(symbol), {
          signal: controller.signal,
          cache: "no-store",
        });
        const payload: unknown = await res.json();
        if (!payload || typeof payload !== "object") throw new Error("Invalid ticker response");
        const data = payload as Record<string, unknown>;
        if (!res.ok || data.success !== true || !data.ticker || typeof data.ticker !== "object") {
          throw new Error("Bybit ticker temporarily unavailable");
        }
        const ticker = data.ticker as Record<string, unknown>;
        const price = ticker.lastPrice;
        const change = ticker.price24hChange;
        if (ticker.symbol !== symbol || typeof price !== "number" || !Number.isFinite(price) ||
            price <= 0 || typeof change !== "number" || !Number.isFinite(change)) {
          throw new Error("Invalid Bybit market quote");
        }
        if (!active) return;
        // A newer WebSocket update must not be overwritten by a slower REST response.
        setState(previous => previous?.symbol === symbol && previous.value?.source === "WEBSOCKET"
          ? previous
          : { symbol, value: { price, change24h: change, fetchedAt: new Date().toISOString(), source: "REST" }, error: "" });
      } catch (error) {
        if (!active || controller.signal.aborted) return;
        setState(previous => previous?.symbol === symbol && previous.value
          ? previous
          : { symbol, value: null, error: error instanceof Error ? error.message : "Quote unavailable" });
      }
    }

    void fetchSnapshot();

    const connection = createBybitTickerSocket(
      [symbol],
      ticker => {
        if (!active || ticker.symbol !== symbol ||
            !Number.isFinite(ticker.lastPrice) || ticker.lastPrice <= 0 ||
            !Number.isFinite(ticker.price24hChange)) return;
        const now = Date.now();
        if (now - lastSocketUpdate < 1_000) return;
        lastSocketUpdate = now;
        setState({
          symbol,
          value: {
            price: ticker.lastPrice,
            change24h: ticker.price24hChange,
            fetchedAt: new Date(now).toISOString(),
            source: "WEBSOCKET",
          },
          error: "",
        });
      },
      status => {
        if (!active) return;
        if (status === "OPEN") {
          if (fallback) clearInterval(fallback);
          fallback = undefined;
        } else if ((status === "ERROR" || status === "CLOSED") && !fallback) {
          // One read-only REST snapshot every 30 seconds only if the socket fails.
          void fetchSnapshot();
          fallback = setInterval(() => {
            if (document.visibilityState === "visible") void fetchSnapshot();
          }, 30_000);
        }
      }
    );

    return () => {
      active = false;
      controller.abort();
      connection.close();
      if (fallback) clearInterval(fallback);
    };
  }, [crypto, symbol]);

  if (!crypto) {
    return <div className="text-right">
      <div className="text-[12px] font-semibold text-[#a2bac9]">Forex chart only</div>
      <div className="text-[10px] text-[#789dae]">Broker quote not connected</div>
    </div>;
  }

  if (!state || state.symbol !== symbol) {
    return <div className="text-right text-[11px] text-[#98b8c8]">Loading Bybit quote...</div>;
  }
  if (!state.value) {
    return <div className="text-right">
      <div className="text-[11px] font-semibold text-[#ff8090]">Quote unavailable</div>
      <div className="text-[10px] text-[#829fb0]">{state.error}</div>
    </div>;
  }

  const q = state.value;
  return <div className="text-right">
    <div className="text-[20px] font-bold">{number(q.price)}</div>
    <div className={"text-[12px] font-semibold " + (q.change24h >= 0 ? "text-[#19dba6]" : "text-[#ff657a]")}>
      {q.change24h >= 0 ? "+" : ""}{q.change24h.toFixed(2)}% · Bybit 24h
    </div>
    <div className="text-[9px] text-[#84aabc]">{q.source === "WEBSOCKET" ? "Live ticker" : "Snapshot"} · {new Date(q.fetchedAt).toLocaleTimeString()}</div>
  </div>;
}

"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Wifi,
  WifiOff,
} from "lucide-react";

import {
  createBybitTickerSocket,
  BybitLiveTicker,
} from "@/lib/market-data/bybit-live";

const symbols = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
];

export default function LiveTestPage() {
  const [tickers, setTickers] =
    useState<Record<string, BybitLiveTicker>>({});

  const [status, setStatus] =
    useState<
      "CONNECTING" | "OPEN" | "CLOSED" | "ERROR"
    >("CONNECTING");

  const [lastUpdate, setLastUpdate] =
    useState<number | null>(null);

  useEffect(() => {
    const connection = createBybitTickerSocket(
      symbols,
      (ticker) => {
        setTickers((current) => ({
          ...current,
          [ticker.symbol]: ticker,
        }));

        setLastUpdate(Date.now());
      },
      setStatus
    );

    return () => {
      connection.close();
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#06070a] p-8 text-white">

      <div className="mx-auto max-w-4xl">

        <div className="mb-8">

          <div className="flex items-center gap-3">

            {status === "OPEN" ? (
              <Wifi
                size={20}
                className="text-emerald-400"
              />
            ) : (
              <WifiOff
                size={20}
                className="text-red-400"
              />
            )}

            <h1 className="text-2xl font-semibold">
              Bybit Live Data Test
            </h1>

          </div>

          <div className="mt-3 flex items-center gap-3">

            <span
              className={`rounded-lg px-3 py-1.5 text-xs ${
                status === "OPEN"
                  ? "bg-emerald-500/10 text-emerald-400"
                  : status === "ERROR"
                    ? "bg-red-500/10 text-red-400"
                    : "bg-zinc-500/10 text-zinc-500"
              }`}
            >
              {status}
            </span>

            {lastUpdate && (
              <span className="text-xs text-zinc-600">
                Last update{" "}
                {new Date(
                  lastUpdate
                ).toLocaleTimeString()}
              </span>
            )}

          </div>

        </div>

        <div className="grid gap-3 md:grid-cols-3">

          {symbols.map((symbol) => {

            const ticker = tickers[symbol];

            return (
              <div
                key={symbol}
                className="rounded-2xl border border-white/[0.06] bg-[#0a0c10] p-5"
              >

                <div className="flex items-center gap-2">

                  <Activity
                    size={14}
                    className="text-violet-400"
                  />

                  <span className="text-sm font-medium">
                    {symbol}
                  </span>

                </div>

                <p className="mt-6 text-3xl font-semibold">
                  {ticker
                    ? ticker.lastPrice.toLocaleString(
                        undefined,
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }
                      )
                    : "Connecting..."}
                </p>

                <p
                  className={`mt-2 text-xs ${
                    (ticker?.price24hChange ?? 0) >= 0
                      ? "text-emerald-400"
                      : "text-red-400"
                  }`}
                >
                  {ticker
                    ? `${
                        ticker.price24hChange >= 0
                          ? "+"
                          : ""
                      }${ticker.price24hChange.toFixed(2)}% 24H`
                    : "Waiting for ticker"}
                </p>

                <div className="mt-5 space-y-2 border-t border-white/[0.05] pt-4">

                  <div className="flex justify-between text-xs">

                    <span className="text-zinc-600">
                      Bid
                    </span>

                    <span className="text-zinc-400">
                      {ticker?.bidPrice
                        ? ticker.bidPrice.toLocaleString()
                        : "—"}
                    </span>

                  </div>

                  <div className="flex justify-between text-xs">

                    <span className="text-zinc-600">
                      Ask
                    </span>

                    <span className="text-zinc-400">
                      {ticker?.askPrice
                        ? ticker.askPrice.toLocaleString()
                        : "—"}
                    </span>

                  </div>

                  <div className="flex justify-between text-xs">

                    <span className="text-zinc-600">
                      Mark
                    </span>

                    <span className="text-zinc-400">
                      {ticker?.markPrice
                        ? ticker.markPrice.toLocaleString()
                        : "—"}
                    </span>

                  </div>

                </div>

              </div>
            );
          })}

        </div>

      </div>

    </main>
  );
}
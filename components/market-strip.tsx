"use client";

import { useEffect, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Bitcoin,
  CircleDollarSign,
  LoaderCircle,
} from "lucide-react";

type Ticker = {
  symbol: string;
  lastPrice: number;
  price24hChange: number;
};

const SYMBOLS = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
];

function shortSymbol(symbol: string) {
  return symbol.replace("USDT", "");
}

function formatPrice(value: number) {
  if (!Number.isFinite(value)) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits:
      value < 10 ? 4 : 2,
  }).format(value);
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) {
    return "—";
  }

  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export default function MarketStrip() {
  const [tickers, setTickers] =
    useState<Record<string, Ticker>>({});

  const [loading, setLoading] =
    useState(true);

  async function loadTickers() {
    try {
      const results = await Promise.all(
        SYMBOLS.map(async (symbol) => {
          try {
            const response = await fetch(
              `/api/market/ticker?symbol=${symbol}`,
              {
                cache: "no-store",
              }
            );

            const data =
              await response.json();

            if (
              !response.ok ||
              !data.success ||
              !data.ticker
            ) {
              return null;
            }

            return data.ticker as Ticker;
          } catch {
            return null;
          }
        })
      );

      const next: Record<string, Ticker> =
        {};

      results.forEach((ticker) => {
        if (ticker) {
          next[ticker.symbol] = ticker;
        }
      });

      setTickers(next);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTickers();

    const interval =
      window.setInterval(
        loadTickers,
        15000
      );

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  return (
    <div className="border-b border-white/[0.055] bg-[#07090d] px-4 py-3 lg:px-5">

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">

        {SYMBOLS.map((symbol) => {
          const ticker =
            tickers[symbol];

          const change =
            ticker?.price24hChange ?? 0;

          const positive =
            change >= 0;

          return (
            <div
              key={symbol}
              className="ha-panel-hover rounded-xl border border-white/[0.055] bg-[#090c12] px-4 py-3"
            >

              <div className="flex items-center justify-between">

                <div className="flex items-center gap-2">

                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.04]">

                    {symbol ===
                    "BTCUSDT" ? (
                      <Bitcoin
                        size={13}
                        className="text-amber-400"
                      />
                    ) : (
                      <CircleDollarSign
                        size={13}
                        className="text-violet-400"
                      />
                    )}

                  </div>

                  <div>

                    <p className="text-[10px] font-semibold text-zinc-300">
                      {shortSymbol(
                        symbol
                      )}
                    </p>

                    <p className="text-[7px] text-zinc-700">
                      Bybit Perpetual
                    </p>

                  </div>

                </div>

                {loading &&
                !ticker ? (
                  <LoaderCircle
                    size={12}
                    className="animate-spin text-zinc-700"
                  />
                ) : positive ? (
                  <ArrowUpRight
                    size={12}
                    className="text-emerald-400"
                  />
                ) : (
                  <ArrowDownRight
                    size={12}
                    className="text-red-400"
                  />
                )}

              </div>

              <div className="mt-3 flex items-end justify-between">

                <span className="ha-number text-[16px] font-semibold text-zinc-100">
                  {ticker
                    ? formatPrice(
                        ticker.lastPrice
                      )
                    : "—"}
                </span>

                <span
                  className={`text-[9px] font-medium ${
                    positive
                      ? "text-emerald-400"
                      : "text-red-400"
                  }`}
                >
                  {ticker
                    ? formatPercent(
                        change
                      )
                    : "—"}
                </span>

              </div>

            </div>
          );
        })}

      </div>

    </div>
  );
}
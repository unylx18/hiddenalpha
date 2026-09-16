"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  Gauge,
  TrendingDown,
  TrendingUp,
  Waves,
} from "lucide-react";

type Direction =
  | "BULLISH"
  | "BEARISH"
  | "NEUTRAL";

type AlphaContext = {
  symbol: string;
  timeframe: string;
  timestamp: string;

  market: {
    bias: Direction;
    score: number;
    confidence: number;
  };

  trend: {
    direction: Direction;
    strength: number;
  };

  momentum: {
    direction: Direction;
    strength: number;
  };

  volume: {
    condition: "HIGH" | "NORMAL" | "LOW";
    ratio: number;
  };

  volatility: {
    level: "LOW" | "NORMAL" | "HIGH";
    value: number | null;
    percentage: number | null;
  };
};

type ContextResponse = {
  success: boolean;
  provider?: string;
  alpha?: AlphaContext;
  error?: string;
};

function directionLabel(direction?: Direction) {
  if (direction === "BULLISH") {
    return "Bullish";
  }

  if (direction === "BEARISH") {
    return "Bearish";
  }

  return "Neutral";
}

function directionClass(direction?: Direction) {
  if (direction === "BULLISH") {
    return "text-emerald-400";
  }

  if (direction === "BEARISH") {
    return "text-red-400";
  }

  return "text-zinc-400";
}

function scoreClass(score: number) {
  if (score >= 20) {
    return "text-emerald-400";
  }

  if (score <= -20) {
    return "text-red-400";
  }

  return "text-zinc-300";
}

function scoreBarClass(score: number) {
  if (score >= 20) {
    return "bg-emerald-400";
  }

  if (score <= -20) {
    return "bg-red-400";
  }

  return "bg-zinc-500";
}

function strengthLabel(value: number) {
  if (!Number.isFinite(value)) {
    return "—";
  }

  if (value >= 70) {
    return "Strong";
  }

  if (value >= 40) {
    return "Moderate";
  }

  return "Weak";
}

function formatNumber(
  value: number | null | undefined,
  digits = 2
) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  return value.toFixed(digits);
}

export default function DashboardMarketOverview() {
  const [context, setContext] =
    useState<AlphaContext | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  async function loadContext() {
    try {
      const response = await fetch(
        "/api/trading/context?symbol=BTCUSDT&timeframe=1h",
        {
          cache: "no-store",
        }
      );

      const data =
        (await response.json()) as ContextResponse;

      if (
        !response.ok ||
        !data.success ||
        !data.alpha
      ) {
        throw new Error(
          data.error ??
            "Failed to load market context"
        );
      }

      setContext(data.alpha);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load market context"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadContext();

    const interval =
      window.setInterval(
        loadContext,
        15000
      );

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const market =
    context?.market;

  const score =
    market?.score ?? 0;

  const confidence =
    market?.confidence ?? 0;

  const scoreWidth =
    Math.min(
      100,
      Math.max(
        4,
        Math.abs(score)
      )
    );

  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#090b0f]">

      <div className="pointer-events-none absolute -left-20 -top-24 h-52 w-52 rounded-full bg-violet-500/[0.04] blur-3xl" />

      <div className="relative p-5">

        {/* HEADER */}

        <div className="flex items-start justify-between gap-4">

          <div className="flex items-center gap-3">

            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet-500/10 bg-violet-500/[0.07]">

              <BarChart3
                size={15}
                className="text-violet-400"
              />

            </div>

            <div>

              <h2 className="text-[13px] font-medium text-zinc-100">
                Market Overview
              </h2>

              <p className="mt-0.5 text-[9px] text-zinc-600">
                Alpha Context Engine
              </p>

            </div>

          </div>

          <div className="flex items-center gap-1.5 text-[8px] text-emerald-400">

            <span className="relative flex h-2 w-2">

              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-30" />

              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />

            </span>

            LIVE

          </div>

        </div>

        {/* ERROR */}

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/10 bg-red-500/[0.04] px-3 py-2 text-[9px] text-red-400">
            {error}
          </div>
        )}

        {/* MAIN SCORE */}

        <div className="mt-4 grid gap-3 md:grid-cols-[1.15fr_0.85fr]">

          <div className="rounded-xl border border-white/[0.05] bg-[#07090c] p-4">

            <div className="flex items-start justify-between">

              <div>

                <p className="text-[8px] font-medium uppercase tracking-[0.14em] text-zinc-600">
                  Alpha Score
                </p>

                <div className="mt-2 flex items-end gap-3">

                  <span
                    className={`text-[30px] font-semibold tracking-[-0.04em] ${scoreClass(
                      score
                    )}`}
                  >
                    {loading
                      ? "..."
                      : score > 0
                      ? `+${score}`
                      : score}
                  </span>

                  <span
                    className={`mb-1 rounded-md border border-white/[0.05] bg-white/[0.025] px-2 py-1 text-[8px] font-medium ${directionClass(
                      market?.bias
                    )}`}
                  >
                    {loading
                      ? "ANALYZING"
                      : directionLabel(
                          market?.bias
                        ).toUpperCase()}
                  </span>

                </div>

              </div>

              <Gauge
                size={22}
                className="text-violet-400"
              />

            </div>

            <div className="mt-4">

              <div className="h-1 overflow-hidden rounded-full bg-white/[0.05]">

                <div
                  className={`h-full rounded-full transition-all duration-500 ${scoreBarClass(
                    score
                  )}`}
                  style={{
                    width: `${scoreWidth}%`,
                  }}
                />

              </div>

              <div className="mt-2 flex items-center justify-between text-[7px] text-zinc-700">

                <span>
                  -100
                </span>

                <span>
                  Neutral
                </span>

                <span>
                  +100
                </span>

              </div>

            </div>

          </div>

          {/* CONFIDENCE */}

          <div className="rounded-xl border border-white/[0.05] bg-[#07090c] p-4">

            <p className="text-[8px] font-medium uppercase tracking-[0.14em] text-zinc-600">
              Confidence
            </p>

            <div className="mt-2 flex items-end gap-2">

              <span className="text-[26px] font-semibold tracking-[-0.03em] text-zinc-100">
                {loading
                  ? "..."
                  : `${confidence}%`}
              </span>

            </div>

            <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/[0.05]">

              <div
                className="h-full rounded-full bg-violet-500 transition-all duration-500"
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(
                      0,
                      confidence
                    )
                  )}%`,
                }}
              />

            </div>

            <p className="mt-3 text-[8px] text-zinc-600">
              Engine conviction
            </p>

          </div>

        </div>

        {/* CONTEXT */}

        <div className="mt-3 grid grid-cols-2 gap-2">

          <Metric
            icon={TrendingUp}
            label="Trend"
            value={directionLabel(
              context?.trend.direction
            )}
            subValue={
              context
                ? `${strengthLabel(
                    context.trend.strength
                  )} · ${formatNumber(
                    context.trend.strength,
                    0
                  )}`
                : "—"
            }
            tone={context?.trend.direction}
          />

          <Metric
            icon={Activity}
            label="Momentum"
            value={directionLabel(
              context?.momentum.direction
            )}
            subValue={
              context
                ? `${strengthLabel(
                    context.momentum
                      .strength
                  )} · ${formatNumber(
                    context.momentum
                      .strength,
                    0
                  )}`
                : "—"
            }
            tone={
              context?.momentum.direction
            }
          />

          <Metric
            icon={Waves}
            label="Volume"
            value={
              context?.volume.condition ??
              "—"
            }
            subValue={
              context
                ? `${formatNumber(
                    context.volume.ratio,
                    2
                  )}x average`
                : "—"
            }
          />

          <Metric
            icon={Gauge}
            label="Volatility"
            value={
              context?.volatility.level ??
              "—"
            }
            subValue={
              context?.volatility
                .percentage !== null &&
              context?.volatility
                .percentage !== undefined
                ? `${formatNumber(
                    context.volatility
                      .percentage,
                    2
                  )}%`
                : "ATR context"
            }
          />

        </div>

        {/* BIAS */}

        <div className="mt-3 flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.012] px-3 py-3">

          <div>

            <p className="text-[8px] uppercase tracking-[0.12em] text-zinc-700">
              Market Bias
            </p>

            <p className="mt-1 text-[8px] text-zinc-600">
              Combined trend, momentum,
              volume & volatility
            </p>

          </div>

          <div className="flex items-center gap-2">

            <span
              className={`text-[10px] font-medium ${directionClass(
                market?.bias
              )}`}
            >
              {directionLabel(
                market?.bias
              )}
            </span>

            {market?.bias ===
            "BULLISH" ? (
              <TrendingUp
                size={13}
                className="text-emerald-400"
              />
            ) : market?.bias ===
              "BEARISH" ? (
              <TrendingDown
                size={13}
                className="text-red-400"
              />
            ) : (
              <Activity
                size={13}
                className="text-zinc-500"
              />
            )}

          </div>

        </div>

        {/* FOOTER */}

        <div className="mt-3 flex items-center justify-between border-t border-white/[0.04] pt-3 text-[8px]">

          <span className="text-zinc-700">
            {context?.symbol ??
              "BTCUSDT"}
            {" · "}
            {context?.timeframe ??
              "1h"}
          </span>

          <span className="text-zinc-700">
            Source{" "}
            <span className="text-zinc-500">
              Bybit
            </span>
          </span>

        </div>

      </div>

    </section>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  subValue,
  tone,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  subValue: string;
  tone?: Direction;
}) {
  let valueClass =
    "text-zinc-300";

  if (tone === "BULLISH") {
    valueClass =
      "text-emerald-400";
  }

  if (tone === "BEARISH") {
    valueClass =
      "text-red-400";
  }

  if (
    value === "HIGH" &&
    !tone
  ) {
    valueClass =
      "text-amber-400";
  }

  return (
    <div className="rounded-xl border border-white/[0.05] bg-white/[0.012] p-3">

      <div className="flex items-center gap-2">

        <Icon
          size={12}
          className="text-zinc-600"
        />

        <span className="text-[8px] font-medium uppercase tracking-[0.1em] text-zinc-700">
          {label}
        </span>

      </div>

      <p
        className={`mt-2 text-[10px] font-medium ${valueClass}`}
      >
        {value}
      </p>

      <p className="mt-1 text-[8px] text-zinc-700">
        {subValue}
      </p>

    </div>
  );
}
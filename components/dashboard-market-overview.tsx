"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  Gauge,
  Layers3,
  TrendingDown,
  TrendingUp,
  Waves,
} from "lucide-react";

type ContextData = {
  symbol: string;
  timeframe: string;
  timestamp: string;

  indicators?: {
    price?: number;
  };

  alpha?: {
    trend?: {
      direction?: "BULLISH" | "BEARISH" | "NEUTRAL";
      strength?: number;
    };

    momentum?: {
      direction?: "BULLISH" | "BEARISH" | "NEUTRAL";
      strength?: number;
    };

    volume?: {
      volumeRatio?: number;
      condition?: "HIGH" | "NORMAL" | "LOW";
    };

    volatility?: {
      level?: "LOW" | "NORMAL" | "HIGH";
    };

    structure?: {
      trend?: "BULLISH" | "BEARISH" | "RANGE";
      strength?: number;
    };
  };

  alphaScore?: {
    score?: number;
    bias?: "BULLISH" | "BEARISH" | "NEUTRAL";
    confidence?: number;
  };
};

function directionLabel(
  direction?: string
) {
  if (direction === "BULLISH") {
    return "Bullish";
  }

  if (direction === "BEARISH") {
    return "Bearish";
  }

  return "Neutral";
}

function directionClass(
  direction?: string
) {
  if (direction === "BULLISH") {
    return "text-emerald-400";
  }

  if (direction === "BEARISH") {
    return "text-red-400";
  }

  return "text-zinc-500";
}

function formatScore(
  score?: number
) {
  if (
    score === undefined ||
    !Number.isFinite(score)
  ) {
    return "—";
  }

  return score > 0
    ? `+${score}`
    : String(score);
}

export default function DashboardMarketOverview() {
  const [context, setContext] =
    useState<ContextData | null>(null);

  const [loading, setLoading] =
    useState(true);

  async function loadContext() {
    try {
      const response = await fetch(
        "/api/trading/context?symbol=BTCUSDT&timeframe=1m",
        {
          cache: "no-store",
        }
      );

      const data =
        await response.json();

      if (data) {
        setContext(data);
      }
    } catch {
      // Keep previous context.
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

  const alpha =
    context?.alpha;

  const score =
    context?.alphaScore;

  const trend =
    alpha?.trend?.direction;

  const momentum =
    alpha?.momentum?.direction;

  const structure =
    alpha?.structure?.trend;

  const volume =
    alpha?.volume?.condition;

  const volatility =
    alpha?.volatility?.level;

  return (
    <section className="rounded-2xl border border-white/[0.06] bg-[#090b0f] p-5">

      {/* HEADER */}

      <div className="flex items-center justify-between">

        <div>

          <div className="flex items-center gap-2">

            <BarChart3
              size={14}
              className="text-violet-400"
            />

            <h2 className="text-[13px] font-medium">
              Market Overview
            </h2>

          </div>

          <p className="mt-1 text-[9px] text-zinc-700">
            Real-time Alpha Context
          </p>

        </div>

        <span className="flex items-center gap-1.5 text-[8px] text-emerald-400">

          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

          LIVE

        </span>

      </div>

      {/* ALPHA SCORE */}

      <div className="mt-4 rounded-xl border border-violet-500/10 bg-violet-500/[0.025] p-4">

        <div className="flex items-center justify-between">

          <div>

            <p className="text-[8px] uppercase tracking-[0.12em] text-zinc-700">
              Alpha Score
            </p>

            <div className="mt-1 flex items-end gap-2">

              <span
                className={`text-[25px] font-semibold ${
                  (score?.score ?? 0) > 0
                    ? "text-emerald-400"
                    : (score?.score ?? 0) < 0
                    ? "text-red-400"
                    : "text-zinc-400"
                }`}
              >
                {loading
                  ? "..."
                  : formatScore(
                      score?.score
                    )}
              </span>

              <span
                className={`mb-1 text-[9px] ${directionClass(
                  score?.bias
                )}`}
              >
                {directionLabel(
                  score?.bias
                )}
              </span>

            </div>

          </div>

          <Gauge
            size={22}
            className="text-violet-400"
          />

        </div>

        <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.05]">

          <div
            className={`h-full rounded-full ${
              (score?.score ?? 0) >= 0
                ? "bg-emerald-400"
                : "bg-red-400"
            }`}
            style={{
              width: `${Math.min(
                Math.abs(
                  score?.score ?? 0
                ),
                100
              )}%`,
            }}
          />

        </div>

        <div className="mt-2 flex justify-between text-[7px] text-zinc-700">

          <span>
            -100
          </span>

          <span>
            0
          </span>

          <span>
            +100
          </span>

        </div>

      </div>

      {/* CONTEXT GRID */}

      <div className="mt-3 grid grid-cols-2 gap-2">

        <ContextMetric
          icon={TrendingUp}
          label="Trend"
          value={directionLabel(
            trend
          )}
          direction={trend}
        />

        <ContextMetric
          icon={Activity}
          label="Momentum"
          value={directionLabel(
            momentum
          )}
          direction={momentum}
        />

        <ContextMetric
          icon={Waves}
          label="Volume"
          value={
            volume ?? "—"
          }
        />

        <ContextMetric
          icon={Gauge}
          label="Volatility"
          value={
            volatility ?? "—"
          }
        />

      </div>

      {/* STRUCTURE */}

      <div className="mt-2 flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.012] px-3 py-3">

        <div className="flex items-center gap-2">

          <Layers3
            size={13}
            className="text-zinc-600"
          />

          <span className="text-[9px] text-zinc-600">
            Market Structure
          </span>

        </div>

        <div className="flex items-center gap-2">

          <span
            className={`text-[9px] font-medium ${
              structure === "BULLISH"
                ? "text-emerald-400"
                : structure === "BEARISH"
                ? "text-red-400"
                : "text-zinc-500"
            }`}
          >
            {structure === "RANGE"
              ? "Range"
              : directionLabel(
                  structure
                )}
          </span>

          {structure ===
          "BULLISH" ? (
            <TrendingUp
              size={12}
              className="text-emerald-400"
            />
          ) : structure ===
            "BEARISH" ? (
            <TrendingDown
              size={12}
              className="text-red-400"
            />
          ) : (
            <Activity
              size={12}
              className="text-zinc-600"
            />
          )}

        </div>

      </div>

      {/* FOOTER */}

      <div className="mt-3 flex items-center justify-between text-[8px]">

        <span className="text-zinc-700">
          {context?.symbol ?? "BTCUSDT"}
          {" · "}
          {context?.timeframe ?? "1m"}
        </span>

        <span className="text-zinc-700">
          Confidence{" "}
          <span className="text-zinc-400">
            {score?.confidence ?? 0}%
          </span>
        </span>

      </div>

    </section>
  );
}

function ContextMetric({
  icon: Icon,
  label,
  value,
  direction,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  direction?: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.05] bg-white/[0.012] p-3">

      <div className="flex items-center gap-2">

        <Icon
          size={12}
          className="text-zinc-700"
        />

        <span className="text-[8px] uppercase tracking-[0.08em] text-zinc-700">
          {label}
        </span>

      </div>

      <p
        className={`mt-2 text-[10px] font-medium ${
          direction
            ? directionClass(
                direction
              )
            : value === "HIGH"
            ? "text-amber-400"
            : value === "LOW"
            ? "text-zinc-500"
            : "text-zinc-400"
        }`}
      >
        {value}
      </p>

    </div>
  );
}
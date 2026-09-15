"use client";

import {
  ArrowUpRight,
  Target,
  Zap,
} from "lucide-react";

type Signal = {
  symbol: string;
  timeframe: string;
  direction: "LONG" | "SHORT" | "WAIT";
  confidence: number;
  quality: "VALID" | "WEAK" | "REJECTED";
  summary: string;
};

type Setup = {
  entryPrice: number;
  stopLossPrice: number;
  takeProfit1Price: number;
  takeProfit2Price: number;
  riskRewardRatioTP1: number;
  riskRewardRatioTP2: number;
};

type Props = {
  signal?: Signal;
  setup?: Setup | null;
  onViewSignal?: () => void;
};

function formatPrice(value?: number) {
  if (
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  return new Intl.NumberFormat(
    "en-US",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  ).format(value);
}

function getConfidenceColor(
  confidence: number
) {
  if (confidence >= 70) {
    return "text-emerald-400";
  }

  if (confidence >= 45) {
    return "text-amber-400";
  }

  return "text-zinc-400";
}

function getConfidenceBar(
  confidence: number
) {
  if (confidence >= 70) {
    return "bg-emerald-400";
  }

  if (confidence >= 45) {
    return "bg-amber-400";
  }

  return "bg-zinc-500";
}

function getDirectionStyle(
  direction: Signal["direction"]
) {
  if (direction === "LONG") {
    return {
      badge:
        "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      text: "text-emerald-400",
    };
  }

  if (direction === "SHORT") {
    return {
      badge:
        "bg-red-500/10 text-red-400 border-red-500/20",
      text: "text-red-400",
    };
  }

  return {
    badge:
      "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    text: "text-zinc-400",
  };
}

export default function DashboardTopSignal({
  signal,
  setup,
  onViewSignal,
}: Props) {
  const direction =
    signal?.direction ?? "WAIT";

  const hasTrade =
    direction !== "WAIT" &&
    setup !== null &&
    setup !== undefined;

  const directionStyle =
    getDirectionStyle(direction);

  const confidence =
    signal?.confidence ?? 0;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#090b0f]">

      {/* subtle glow */}

      <div
        className={`pointer-events-none absolute -right-24 -top-24 h-52 w-52 rounded-full blur-3xl ${
          direction === "LONG"
            ? "bg-emerald-500/[0.04]"
            : direction === "SHORT"
            ? "bg-red-500/[0.04]"
            : "bg-violet-500/[0.035]"
        }`}
      />

      <div className="relative p-5">

        {/* HEADER */}

        <div className="flex items-center justify-between">

          <div className="flex items-center gap-2">

            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/[0.09]">
              <Zap
                size={13}
                className="text-violet-400"
              />
            </div>

            <div>

              <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-violet-400">
                Top Signal
              </p>

              <p className="mt-0.5 text-[8px] text-zinc-700">
                AI-assisted market intelligence
              </p>

            </div>

          </div>

          <div className="flex items-center gap-2">

            <span className="rounded-md border border-white/[0.05] bg-white/[0.02] px-2 py-1 text-[8px] text-zinc-600">
              {signal?.symbol ?? "BTCUSDT"}
            </span>

            <span className="rounded-md border border-white/[0.05] bg-white/[0.02] px-2 py-1 text-[8px] text-zinc-600">
              {signal?.timeframe ?? "1m"}
            </span>

          </div>

        </div>

        {/* SIGNAL BODY */}

        <div className="mt-5 grid gap-6 lg:grid-cols-[0.8fr_1.8fr]">

          {/* LEFT */}

          <div>

            <div className="flex items-center gap-2">

              <h2 className="text-[20px] font-semibold tracking-tight">
                {signal?.symbol?.replace(
                  "USDT",
                  " / USDT"
                ) ?? "BTC / USDT"}
              </h2>

              <span
                className={`rounded-md border px-2 py-1 text-[8px] font-semibold ${
                  directionStyle.badge
                }`}
              >
                {direction}
              </span>

            </div>

            <div className="mt-5">

              <p className="text-[8px] uppercase tracking-[0.14em] text-zinc-700">
                Confidence
              </p>

              <div className="mt-1 flex items-end gap-2">

                <span
                  className={`text-[30px] font-semibold tracking-tight ${getConfidenceColor(
                    confidence
                  )}`}
                >
                  {confidence}%
                </span>

                <span className="mb-1 text-[8px] text-zinc-600">
                  {confidence >= 70
                    ? "HIGH"
                    : confidence >= 45
                    ? "MEDIUM"
                    : "LOW"}
                </span>

              </div>

              {/* confidence bar */}

              <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.05]">

                <div
                  className={`h-full rounded-full transition-all ${getConfidenceBar(
                    confidence
                  )}`}
                  style={{
                    width: `${Math.min(
                      confidence,
                      100
                    )}%`,
                  }}
                />

              </div>

            </div>

          </div>

          {/* RIGHT — TRADE LEVELS */}

          {hasTrade ? (

            <div className="grid grid-cols-2 gap-x-5 gap-y-5 sm:grid-cols-4">

              <Level
                label="Entry"
                value={`$${formatPrice(
                  setup?.entryPrice
                )}`}
              />

              <Level
                label="Stop Loss"
                value={`$${formatPrice(
                  setup?.stopLossPrice
                )}`}
                negative
              />

              <Level
                label="Take Profit 1"
                value={`$${formatPrice(
                  setup?.takeProfit1Price
                )}`}
                positive
              />

              <Level
                label="Take Profit 2"
                value={`$${formatPrice(
                  setup?.takeProfit2Price
                )}`}
                positive
              />

            </div>

          ) : (

            <div className="flex min-h-[120px] items-center rounded-xl border border-white/[0.05] bg-white/[0.012] px-5">

              <div>

                <div className="flex items-center gap-2">

                  <Target
                    size={15}
                    className="text-zinc-600"
                  />

                  <span className="text-[11px] font-medium text-zinc-300">
                    No confirmed trade setup
                  </span>

                </div>

                <p className="mt-2 max-w-[360px] text-[9px] leading-5 text-zinc-700">
                  {signal?.summary ??
                    "The market is being analyzed for a high-quality opportunity."}
                </p>

              </div>

            </div>

          )}

        </div>

        {/* FOOTER */}

        <div className="mt-5 flex flex-col justify-between gap-4 border-t border-white/[0.05] pt-4 sm:flex-row sm:items-center">

          {hasTrade ? (

            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">

              <MiniMetric
                label="R:R TP1"
                value={`1 : ${setup?.riskRewardRatioTP1?.toFixed(
                  1
                )}`}
              />

              <MiniMetric
                label="R:R TP2"
                value={`1 : ${setup?.riskRewardRatioTP2?.toFixed(
                  1
                )}`}
              />

              <MiniMetric
                label="Quality"
                value={
                  signal?.quality ?? "—"
                }
                accent
              />

            </div>

          ) : (

            <div className="flex items-center gap-2">

              <span className="h-1.5 w-1.5 rounded-full bg-zinc-600" />

              <span className="text-[9px] text-zinc-600">
                Waiting for stronger confirmation
              </span>

            </div>

          )}

          <button
            onClick={onViewSignal}
            disabled={!hasTrade}
            className={`flex h-9 items-center justify-center gap-2 rounded-xl px-4 text-[9px] font-medium transition ${
              hasTrade
                ? "bg-violet-600 text-white hover:bg-violet-500"
                : "cursor-not-allowed bg-white/[0.03] text-zinc-700"
            }`}
          >
            {hasTrade
              ? "View Signal"
              : "No Trade"}

            {hasTrade && (
              <ArrowUpRight size={12} />
            )}
          </button>

        </div>

      </div>

    </section>
  );
}

function Level({
  label,
  value,
  negative,
  positive,
}: {
  label: string;
  value: string;
  negative?: boolean;
  positive?: boolean;
}) {
  return (
    <div>

      <p className="text-[8px] uppercase tracking-[0.12em] text-zinc-700">
        {label}
      </p>

      <p
        className={`mt-2 text-[12px] font-medium ${
          negative
            ? "text-red-400"
            : positive
            ? "text-emerald-400"
            : "text-zinc-200"
        }`}
      >
        {value}
      </p>

    </div>
  );
}

function MiniMetric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>

      <p className="text-[8px] uppercase tracking-[0.11em] text-zinc-700">
        {label}
      </p>

      <p
        className={`mt-1 text-[9px] ${
          accent
            ? "text-emerald-400"
            : "text-zinc-400"
        }`}
      >
        {value}
      </p>

    </div>
  );
}
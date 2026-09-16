"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BrainCircuit,
  Gauge,
  RefreshCw,
  Waves,
} from "lucide-react";

type Direction =
  | "BULLISH"
  | "BEARISH"
  | "NEUTRAL";

type SignalDirection =
  | "LONG"
  | "SHORT";

type AlphaContext = {
  symbol: string;

  timeframe: string;

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
    condition:
      | "HIGH"
      | "NORMAL"
      | "LOW";

    ratio: number;
  };

  volatility: {
    level:
      | "LOW"
      | "NORMAL"
      | "HIGH";

    percentage:
      | number
      | null;
  };
};

type ContextResponse = {
  success: boolean;

  alpha?:
    | AlphaContext;

  error?: string;
};

type Props = {
  symbol: string;

  timeframe: string;

  publishedDirection:
    SignalDirection;
};

function directionText(
  direction?: Direction
) {
  if (
    direction === "BULLISH"
  ) {
    return "Bullish";
  }

  if (
    direction === "BEARISH"
  ) {
    return "Bearish";
  }

  return "Neutral";
}

function directionClass(
  direction?: Direction
) {
  if (
    direction === "BULLISH"
  ) {
    return "text-emerald-400";
  }

  if (
    direction === "BEARISH"
  ) {
    return "text-red-400";
  }

  return "text-zinc-400";
}

function getAlignment(
  publishedDirection:
    SignalDirection,

  marketBias:
    Direction
) {
  if (
    marketBias ===
    "NEUTRAL"
  ) {
    return {
      state: "MIXED",

      label:
        "Current market is neutral",

      className:
        "border-amber-500/10 bg-amber-500/[0.05] text-amber-400",
    };
  }

  const aligned =
    (
      publishedDirection ===
        "LONG" &&
      marketBias ===
        "BULLISH"
    ) ||
    (
      publishedDirection ===
        "SHORT" &&
      marketBias ===
        "BEARISH"
    );

  if (aligned) {
    return {
      state: "ALIGNED",

      label:
        "Market still supports published signal",

      className:
        "border-emerald-500/10 bg-emerald-500/[0.05] text-emerald-400",
    };
  }

  return {
    state: "OPPOSED",

    label:
      "Market now opposes published signal",

    className:
      "border-red-500/10 bg-red-500/[0.05] text-red-400",
  };
}

function formatNumber(
  value:
    | number
    | null
    | undefined,

  digits = 0
) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  return value.toFixed(
    digits
  );
}

export default function SignalMarketComparison({
  symbol,

  timeframe,

  publishedDirection,
}: Props) {
  const [
    context,
    setContext,
  ] =
    useState<AlphaContext | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const loadContext =
    useCallback(
      async (
        manual = false
      ) => {
        if (manual) {
          setRefreshing(true);
        }

        try {
          const response =
            await fetch(
              `/api/trading/context?symbol=${symbol}&timeframe=${timeframe}`,
              {
                cache:
                  "no-store",
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
                "Current market context unavailable"
            );
          }

          setContext(
            data.alpha
          );

          setError("");
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Current market context unavailable"
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [
        symbol,
        timeframe,
      ]
    );

  useEffect(() => {
    loadContext();

    /*
     * Current context is monitoring data.
     * It does NOT regenerate or modify
     * the published signal.
     */

    const interval =
      window.setInterval(
        () => {
          loadContext();
        },
        30_000
      );

    function handlePipelineComplete() {
      loadContext();
    }

    window.addEventListener(
      "hiddenalpha:signal-pipeline-complete",
      handlePipelineComplete
    );

    return () => {
      window.clearInterval(
        interval
      );

      window.removeEventListener(
        "hiddenalpha:signal-pipeline-complete",
        handlePipelineComplete
      );
    };
  }, [
    loadContext,
  ]);

  const alignment =
    context
      ? getAlignment(
          publishedDirection,
          context.market.bias
        )
      : null;

  return (
    <section className="ha-panel p-5">

      {/* HEADER */}

      <div className="flex items-center justify-between gap-4">

        <div className="flex items-center gap-3">

          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet-500/10 bg-violet-500/[0.07]">

            <BrainCircuit
              size={13}
              className="text-violet-400"
            />

          </div>

          <div>

            <h2 className="text-[11px] font-medium text-zinc-200">
              Current Market vs Published Signal
            </h2>

            <p className="mt-0.5 text-[7px] text-zinc-700">
              Monitoring only — published trade levels remain frozen
            </p>

          </div>

        </div>

        <button
          onClick={() =>
            loadContext(true)
          }
          disabled={
            refreshing
          }
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.05] bg-white/[0.015]"
        >

          <RefreshCw
            size={11}
            className={`text-zinc-600 ${
              refreshing
                ? "animate-spin"
                : ""
            }`}
          />

        </button>

      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-500/10 bg-red-500/[0.04] p-3 text-[8px] text-red-400">
          {error}
        </div>
      )}

      {/* COMPARISON */}

      <div className="mt-5 grid gap-3 md:grid-cols-[0.75fr_1.25fr]">

        {/* PUBLISHED */}

        <div className="rounded-xl border border-violet-500/10 bg-violet-500/[0.025] p-4">

          <p className="text-[7px] font-medium uppercase tracking-[0.12em] text-zinc-700">
            Published Direction
          </p>

          <div className="mt-3 flex items-center gap-3">

            {publishedDirection ===
            "LONG" ? (
              <ArrowUpRight
                size={20}
                className="text-emerald-400"
              />
            ) : (
              <ArrowDownRight
                size={20}
                className="text-red-400"
              />
            )}

            <div>

              <p
                className={`text-[20px] font-semibold ${
                  publishedDirection ===
                  "LONG"
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {publishedDirection}
              </p>

              <p className="mt-1 text-[7px] text-zinc-700">
                {symbol} • {timeframe}
              </p>

            </div>

          </div>

          <div className="mt-4 border-t border-white/[0.04] pt-3">

            <p className="text-[7px] leading-4 text-zinc-700">
              This is the frozen direction that passed HiddenAlpha&apos;s publication gate.
            </p>

          </div>

        </div>

        {/* CURRENT MARKET */}

        <div className="rounded-xl border border-white/[0.05] bg-white/[0.012] p-4">

          <div className="flex items-start justify-between gap-3">

            <div>

              <p className="text-[7px] font-medium uppercase tracking-[0.12em] text-zinc-700">
                Current Alpha Bias
              </p>

              <p
                className={`mt-2 text-[18px] font-semibold ${directionClass(
                  context?.market.bias
                )}`}
              >
                {loading
                  ? "Analyzing..."
                  : directionText(
                      context?.market.bias
                    )}
              </p>

            </div>

            <div className="text-right">

              <p className="text-[7px] text-zinc-700">
                Alpha Score
              </p>

              <p className="ha-number mt-1 text-[15px] font-semibold text-zinc-300">
                {context
                  ? context.market.score >
                    0
                    ? `+${context.market.score}`
                    : context.market.score
                  : "—"}
              </p>

              <p className="mt-1 text-[7px] text-zinc-700">
                {context
                  ? `${context.market.confidence}% confidence`
                  : ""}
              </p>

            </div>

          </div>

          {alignment && (
            <div
              className={`mt-4 rounded-lg border px-3 py-2 ${alignment.className}`}
            >

              <div className="flex items-center justify-between gap-3">

                <span className="text-[8px] font-semibold">
                  {alignment.state}
                </span>

                <span className="text-[7px] opacity-80">
                  {alignment.label}
                </span>

              </div>

            </div>
          )}

        </div>

      </div>

      {/* MARKET FACTORS */}

      <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">

        <Factor
          icon={Activity}
          label="Trend"
          value={directionText(
            context?.trend.direction
          )}
          detail={
            context
              ? `${formatNumber(
                  context.trend.strength
                )}% strength`
              : "—"
          }
          direction={
            context?.trend.direction
          }
        />

        <Factor
          icon={Gauge}
          label="Momentum"
          value={directionText(
            context?.momentum.direction
          )}
          detail={
            context
              ? `${formatNumber(
                  context.momentum.strength
                )}% strength`
              : "—"
          }
          direction={
            context?.momentum.direction
          }
        />

        <Factor
          icon={Waves}
          label="Volume"
          value={
            context?.volume.condition ??
            "—"
          }
          detail={
            context
              ? `${formatNumber(
                  context.volume.ratio,
                  2
                )}x average`
              : "—"
          }
        />

        <Factor
          icon={Gauge}
          label="Volatility"
          value={
            context?.volatility.level ??
            "—"
          }
          detail={
            context?.volatility.percentage !==
              null &&
            context?.volatility.percentage !==
              undefined
              ? `${formatNumber(
                  context.volatility.percentage,
                  2
                )}%`
              : "ATR context"
          }
        />

      </div>

    </section>
  );
}

function Factor({
  icon: Icon,
  label,
  value,
  detail,
  direction,
}: {
  icon: typeof Activity;

  label: string;

  value: string;

  detail: string;

  direction?: Direction;
}) {
  return (
    <div className="rounded-xl border border-white/[0.045] bg-white/[0.01] p-3">

      <div className="flex items-center gap-2">

        <Icon
          size={10}
          className="text-zinc-700"
        />

        <span className="text-[7px] uppercase tracking-[0.1em] text-zinc-700">
          {label}
        </span>

      </div>

      <p
        className={`mt-2 text-[9px] font-medium ${
          direction
            ? directionClass(
                direction
              )
            : "text-zinc-400"
        }`}
      >
        {value}
      </p>

      <p className="mt-1 text-[7px] text-zinc-700">
        {detail}
      </p>

    </div>
  );
}
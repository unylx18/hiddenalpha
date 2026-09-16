"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  Calculator,
  Crosshair,
  DollarSign,
  Gauge,
  Info,
  Percent,
  ShieldCheck,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";

import HiddenAlphaShell from "@/components/hiddenalpha-shell";

type Direction =
  | "LONG"
  | "SHORT";

function parseNumber(
  value: string
) {
  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : 0;
}

function formatMoney(
  value: number
) {
  if (
    !Number.isFinite(value)
  ) {
    return "—";
  }

  return value.toLocaleString(
    "en-US",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );
}

function formatUnits(
  value: number
) {
  if (
    !Number.isFinite(value)
  ) {
    return "—";
  }

  if (value >= 1000) {
    return value.toLocaleString(
      "en-US",
      {
        maximumFractionDigits: 2,
      }
    );
  }

  return value.toLocaleString(
    "en-US",
    {
      minimumFractionDigits: 4,
      maximumFractionDigits: 6,
    }
  );
}

function InputField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  helper,
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  prefix?: string;
  suffix?: string;
  helper?: string;
}) {
  return (
    <div>

      <div className="mb-2 flex items-center justify-between">

        <label className="text-[7px] font-medium uppercase tracking-[0.1em] text-zinc-700">
          {label}
        </label>

        {helper && (
          <span className="text-[6px] text-zinc-800">
            {helper}
          </span>
        )}

      </div>

      <div className="flex h-10 items-center rounded-lg border border-white/[0.055] bg-[#090c12] px-3 transition focus-within:border-violet-500/25">

        {prefix && (
          <span className="mr-2 text-[9px] text-zinc-700">
            {prefix}
          </span>
        )}

        <input
          type="number"
          value={value}
          onChange={(
            event
          ) =>
            onChange(
              event.target.value
            )
          }
          className="min-w-0 flex-1 bg-transparent text-[10px] text-zinc-300 outline-none"
        />

        {suffix && (
          <span className="ml-2 text-[8px] text-zinc-700">
            {suffix}
          </span>
        )}

      </div>

    </div>
  );
}

function ResultCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = "neutral",
}: {
  icon: typeof Calculator;
  label: string;
  value: string;
  detail?: string;
  tone?:
    | "neutral"
    | "green"
    | "red"
    | "purple"
    | "cyan"
    | "amber";
}) {
  const toneClass =
    tone === "green"
      ? "text-emerald-400"
      : tone === "red"
      ? "text-red-400"
      : tone === "purple"
      ? "text-violet-400"
      : tone === "cyan"
      ? "text-cyan-400"
      : tone === "amber"
      ? "text-amber-400"
      : "text-zinc-300";

  return (
    <div className="rounded-xl border border-white/[0.05] bg-white/[0.012] p-4">

      <div className="flex items-center gap-2">

        <Icon
          size={10}
          className="text-zinc-700"
        />

        <p className="text-[7px] uppercase tracking-[0.1em] text-zinc-700">
          {label}
        </p>

      </div>

      <p
        className={`ha-number mt-3 text-[16px] font-semibold ${toneClass}`}
      >
        {value}
      </p>

      {detail && (
        <p className="mt-1 text-[7px] text-zinc-700">
          {detail}
        </p>
      )}

    </div>
  );
}

export default function ToolsPage() {
  const [
    direction,
    setDirection,
  ] =
    useState<Direction>(
      "LONG"
    );

  const [
    accountBalance,
    setAccountBalance,
  ] =
    useState("10000");

  const [
    riskPercent,
    setRiskPercent,
  ] =
    useState("1");

  const [
    entryPrice,
    setEntryPrice,
  ] =
    useState("75000");

  const [
    stopPrice,
    setStopPrice,
  ] =
    useState("74500");

  const [
    targetPrice,
    setTargetPrice,
  ] =
    useState("76000");

  const [
    leverage,
    setLeverage,
  ] =
    useState("1");

  const calculated =
    useMemo(() => {
      const balance =
        parseNumber(
          accountBalance
        );

      const riskPct =
        parseNumber(
          riskPercent
        );

      const entry =
        parseNumber(
          entryPrice
        );

      const stop =
        parseNumber(
          stopPrice
        );

      const target =
        parseNumber(
          targetPrice
        );

      const lev =
        Math.max(
          parseNumber(
            leverage
          ),
          1
        );

      const riskAmount =
        balance *
        (riskPct / 100);

      const stopDistance =
        Math.abs(
          entry - stop
        );

      const stopPercent =
        entry > 0
          ? (
              stopDistance /
              entry
            ) *
            100
          : 0;

      const quantity =
        stopDistance >
          0 &&
        riskAmount > 0
          ? riskAmount /
            stopDistance
          : 0;

      const notional =
        quantity *
        entry;

      const estimatedMargin =
        lev > 0
          ? notional /
            lev
          : notional;

      const rewardDistance =
        direction === "LONG"
          ? target - entry
          : entry - target;

      const validTarget =
        rewardDistance > 0;

      const rewardAmount =
        validTarget
          ? quantity *
            rewardDistance
          : 0;

      const rr =
        stopDistance > 0 &&
        validTarget
          ? rewardDistance /
            stopDistance
          : 0;

      const tp1 =
        direction === "LONG"
          ? entry +
            stopDistance
          : entry -
            stopDistance;

      const tp15 =
        direction === "LONG"
          ? entry +
            stopDistance *
              1.5
          : entry -
            stopDistance *
              1.5;

      const tp2 =
        direction === "LONG"
          ? entry +
            stopDistance *
              2
          : entry -
            stopDistance *
              2;

      const tp3 =
        direction === "LONG"
          ? entry +
            stopDistance *
              3
          : entry -
            stopDistance *
              3;

      const lossAtStop =
        quantity *
        stopDistance;

      const balanceAfterLoss =
        balance -
        lossAtStop;

      const marginUsage =
        balance > 0
          ? (
              estimatedMargin /
              balance
            ) *
            100
          : 0;

      return {
        balance,
        riskPct,
        entry,
        stop,
        target,
        leverage:
          lev,

        riskAmount,
        stopDistance,
        stopPercent,
        quantity,
        notional,
        estimatedMargin,
        rewardAmount,
        rr,
        tp1,
        tp15,
        tp2,
        tp3,
        lossAtStop,
        balanceAfterLoss,
        marginUsage,
        validTarget,
      };
    }, [
      accountBalance,
      riskPercent,
      entryPrice,
      stopPrice,
      targetPrice,
      leverage,
      direction,
    ]);

  const riskHealth =
    calculated.riskPct <=
    1
      ? "CONSERVATIVE"
      : calculated.riskPct <=
        2
      ? "MODERATE"
      : calculated.riskPct <=
        3
      ? "AGGRESSIVE"
      : "HIGH RISK";

  const riskTone =
    calculated.riskPct <=
    1
      ? "green"
      : calculated.riskPct <=
        2
      ? "cyan"
      : calculated.riskPct <=
        3
      ? "amber"
      : "red";

  const rrHealth =
    calculated.rr >= 2
      ? "STRONG"
      : calculated.rr >=
        1.5
      ? "ACCEPTABLE"
      : calculated.rr >
        0
      ? "WEAK"
      : "INVALID";

  return (
    <HiddenAlphaShell>

      <div className="mx-auto max-w-[1700px] px-4 py-5 lg:px-5">

        {/* HEADER */}

        <div>

          <div className="flex items-center gap-2">

            <h1 className="text-[20px] font-semibold tracking-[-0.03em] text-zinc-100">
              Tools
            </h1>

            <span className="rounded-md border border-cyan-500/10 bg-cyan-500/[0.06] px-2 py-1 text-[7px] font-semibold uppercase tracking-[0.12em] text-cyan-400">
              Risk Desk
            </span>

          </div>

          <p className="mt-1 text-[9px] text-zinc-600">
            Position sizing, risk management and trade planning utilities.
          </p>

        </div>

        {/* TOP STATUS */}

        <div className="mt-5 grid grid-cols-2 gap-2 xl:grid-cols-4">

          <ResultCard
            icon={Wallet}
            label="Account Balance"
            value={`$${formatMoney(
              calculated.balance
            )}`}
          />

          <ResultCard
            icon={ShieldCheck}
            label="Risk Amount"
            value={`$${formatMoney(
              calculated.riskAmount
            )}`}
            detail={`${calculated.riskPct.toFixed(
              2
            )}% account risk`}
            tone={
              riskTone
            }
          />

          <ResultCard
            icon={Gauge}
            label="Risk Profile"
            value={
              riskHealth
            }
            tone={
              riskTone
            }
          />

          <ResultCard
            icon={Target}
            label="Reward / Risk"
            value={
              calculated.rr >
              0
                ? `1:${calculated.rr.toFixed(
                    2
                  )}`
                : "—"
            }
            detail={
              rrHealth
            }
            tone={
              calculated.rr >=
              1.5
                ? "green"
                : calculated.rr >
                  0
                ? "amber"
                : "red"
            }
          />

        </div>

        {/* MAIN TOOL */}

        <div className="mt-3 grid gap-3 xl:grid-cols-[0.72fr_1.28fr]">

          {/* INPUT */}

          <section className="ha-panel p-5">

            <div className="flex items-center gap-3">

              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet-500/10 bg-violet-500/[0.07]">

                <Calculator
                  size={13}
                  className="text-violet-400"
                />

              </div>

              <div>

                <h2 className="text-[11px] font-medium text-zinc-200">
                  Position Size Calculator
                </h2>

                <p className="mt-0.5 text-[7px] text-zinc-700">
                  Linear USDT market model
                </p>

              </div>

            </div>

            {/* DIRECTION */}

            <div className="mt-5">

              <p className="mb-2 text-[7px] font-medium uppercase tracking-[0.1em] text-zinc-700">
                Direction
              </p>

              <div className="grid grid-cols-2 gap-2">

                <button
                  onClick={() =>
                    setDirection(
                      "LONG"
                    )
                  }
                  className={`flex h-10 items-center justify-center gap-2 rounded-lg border text-[8px] font-medium transition ${
                    direction ===
                    "LONG"
                      ? "border-emerald-500/15 bg-emerald-500/[0.07] text-emerald-400"
                      : "border-white/[0.05] bg-white/[0.01] text-zinc-600"
                  }`}
                >

                  <TrendingUp
                    size={11}
                  />

                  LONG

                </button>

                <button
                  onClick={() =>
                    setDirection(
                      "SHORT"
                    )
                  }
                  className={`flex h-10 items-center justify-center gap-2 rounded-lg border text-[8px] font-medium transition ${
                    direction ===
                    "SHORT"
                      ? "border-red-500/15 bg-red-500/[0.07] text-red-400"
                      : "border-white/[0.05] bg-white/[0.01] text-zinc-600"
                  }`}
                >

                  <TrendingDown
                    size={11}
                  />

                  SHORT

                </button>

              </div>

            </div>

            <div className="mt-4 space-y-4">

              <InputField
                label="Account Balance"
                value={
                  accountBalance
                }
                onChange={
                  setAccountBalance
                }
                prefix="$"
              />

              <InputField
                label="Risk Per Trade"
                value={
                  riskPercent
                }
                onChange={
                  setRiskPercent
                }
                suffix="%"
                helper="Capital at risk"
              />

              <div className="grid grid-cols-2 gap-3">

                <InputField
                  label="Entry Price"
                  value={
                    entryPrice
                  }
                  onChange={
                    setEntryPrice
                  }
                />

                <InputField
                  label="Stop Loss"
                  value={
                    stopPrice
                  }
                  onChange={
                    setStopPrice
                  }
                />

              </div>

              <InputField
                label="Target Price"
                value={
                  targetPrice
                }
                onChange={
                  setTargetPrice
                }
              />

              <InputField
                label="Leverage"
                value={
                  leverage
                }
                onChange={
                  setLeverage
                }
                suffix="x"
                helper="Margin estimate only"
              />

            </div>

            {!calculated.validTarget &&
              calculated.target >
                0 && (
                <div className="mt-4 rounded-xl border border-red-500/10 bg-red-500/[0.04] p-3">

                  <p className="text-[7px] leading-4 text-red-400">
                    Target direction is invalid for a {direction} setup.
                  </p>

                </div>
              )}

          </section>

          {/* RESULTS */}

          <section className="ha-panel p-5">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-[7px] uppercase tracking-[0.12em] text-zinc-700">
                  Trade Plan
                </p>

                <h2 className="mt-1 text-[12px] font-medium text-zinc-200">
                  Risk & Position Output
                </h2>

              </div>

              <span
                className={`rounded-md border px-2 py-1 text-[7px] font-medium ${
                  direction ===
                  "LONG"
                    ? "border-emerald-500/10 bg-emerald-500/[0.05] text-emerald-400"
                    : "border-red-500/10 bg-red-500/[0.05] text-red-400"
                }`}
              >
                {direction}
              </span>

            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-3">

              <ResultCard
                icon={Crosshair}
                label="Position Size"
                value={formatUnits(
                  calculated.quantity
                )}
                detail="Base asset units"
                tone="purple"
              />

              <ResultCard
                icon={DollarSign}
                label="Notional"
                value={`$${formatMoney(
                  calculated.notional
                )}`}
                detail="Position exposure"
              />

              <ResultCard
                icon={Wallet}
                label="Est. Margin"
                value={`$${formatMoney(
                  calculated.estimatedMargin
                )}`}
                detail={`${calculated.leverage.toFixed(
                  1
                )}x leverage`}
                tone="cyan"
              />

              <ResultCard
                icon={Percent}
                label="Stop Distance"
                value={`${calculated.stopPercent.toFixed(
                  2
                )}%`}
                detail={`$${formatMoney(
                  calculated.stopDistance
                )} price distance`}
                tone="red"
              />

              <ResultCard
                icon={ShieldCheck}
                label="Max Loss"
                value={`-$${formatMoney(
                  calculated.lossAtStop
                )}`}
                detail="Before fees / slippage"
                tone="red"
              />

              <ResultCard
                icon={Target}
                label="Target Profit"
                value={`+$${formatMoney(
                  calculated.rewardAmount
                )}`}
                detail={
                  calculated.rr >
                  0
                    ? `${calculated.rr.toFixed(
                        2
                      )}R`
                    : "Invalid target"
                }
                tone={
                  calculated.validTarget
                    ? "green"
                    : "red"
                }
              />

            </div>

            {/* LEVEL VISUAL */}

            <div className="mt-4 rounded-xl border border-white/[0.05] bg-[#080b10] p-4">

              <div className="flex items-center justify-between">

                <p className="text-[7px] uppercase tracking-[0.1em] text-zinc-700">
                  Price Plan
                </p>

                <p className="text-[7px] text-zinc-700">
                  Manual calculator
                </p>

              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">

                <PriceBox
                  label="STOP"
                  value={
                    calculated.stop
                  }
                  tone="red"
                />

                <PriceBox
                  label="ENTRY"
                  value={
                    calculated.entry
                  }
                  tone="purple"
                />

                <PriceBox
                  label="TARGET"
                  value={
                    calculated.target
                  }
                  tone={
                    calculated.validTarget
                      ? "green"
                      : "red"
                  }
                />

              </div>

            </div>

            {/* TP PLANNER */}

            <div className="mt-4">

              <div className="flex items-center gap-2">

                <Target
                  size={10}
                  className="text-violet-400"
                />

                <p className="text-[8px] font-medium text-zinc-400">
                  R-Multiple Target Planner
                </p>

              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">

                <TargetCard
                  label="1.0R"
                  value={
                    calculated.tp1
                  }
                />

                <TargetCard
                  label="1.5R"
                  value={
                    calculated.tp15
                  }
                />

                <TargetCard
                  label="2.0R"
                  value={
                    calculated.tp2
                  }
                  highlighted
                />

                <TargetCard
                  label="3.0R"
                  value={
                    calculated.tp3
                  }
                />

              </div>

            </div>

          </section>

        </div>

        {/* ACCOUNT IMPACT */}

        <div className="mt-3 grid gap-3 lg:grid-cols-2">

          <section className="ha-panel p-5">

            <div className="flex items-center gap-2">

              <ShieldCheck
                size={12}
                className="text-emerald-400"
              />

              <div>

                <h2 className="text-[10px] font-medium text-zinc-300">
                  Account Impact
                </h2>

                <p className="mt-0.5 text-[7px] text-zinc-700">
                  What happens if the stop is reached
                </p>

              </div>

            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">

              <ResultCard
                icon={Wallet}
                label="Balance After Loss"
                value={`$${formatMoney(
                  calculated.balanceAfterLoss
                )}`}
              />

              <ResultCard
                icon={Percent}
                label="Margin Usage"
                value={`${calculated.marginUsage.toFixed(
                  1
                )}%`}
                detail="Estimated margin / account"
                tone={
                  calculated.marginUsage >
                  100
                    ? "red"
                    : calculated.marginUsage >
                      50
                    ? "amber"
                    : "green"
                }
              />

            </div>

          </section>

          <section className="ha-panel p-5">

            <div className="flex items-center gap-2">

              <Zap
                size={12}
                className="text-violet-400"
              />

              <div>

                <h2 className="text-[10px] font-medium text-zinc-300">
                  Quick Risk Presets
                </h2>

                <p className="mt-0.5 text-[7px] text-zinc-700">
                  Change account risk instantly
                </p>

              </div>

            </div>

            <div className="mt-4 grid grid-cols-4 gap-2">

              {[
                "0.5",
                "1",
                "1.5",
                "2",
              ].map(
                (
                  value
                ) => (
                  <button
                    key={
                      value
                    }
                    onClick={() =>
                      setRiskPercent(
                        value
                      )
                    }
                    className={`rounded-xl border py-3 text-[8px] font-medium transition ${
                      riskPercent ===
                      value
                        ? "border-violet-500/15 bg-violet-500/[0.07] text-violet-400"
                        : "border-white/[0.05] bg-white/[0.01] text-zinc-600 hover:text-zinc-300"
                    }`}
                  >
                    {value}%
                  </button>
                )
              )}

            </div>

          </section>

        </div>

        {/* POLICY */}

        <div className="mt-3 flex items-start gap-3 rounded-xl border border-white/[0.05] bg-white/[0.012] p-4">

          <Info
            size={12}
            className="mt-0.5 shrink-0 text-cyan-400"
          />

          <p className="text-[7px] leading-4 text-zinc-700">
            Tools Desk performs deterministic calculations only. Position size assumes a linear USDT-quoted instrument where P&amp;L is approximately quantity × price movement. Fees, funding, slippage, liquidation rules and exchange-specific contract specifications are not included. Nothing on this page places or modifies an order.
          </p>

        </div>

      </div>

    </HiddenAlphaShell>
  );
}

function PriceBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone:
    | "red"
    | "purple"
    | "green";
}) {
  const className =
    tone === "red"
      ? "text-red-400"
      : tone === "green"
      ? "text-emerald-400"
      : "text-violet-400";

  return (
    <div className="rounded-lg border border-white/[0.04] bg-white/[0.01] p-3 text-center">

      <p className="text-[6px] uppercase tracking-[0.1em] text-zinc-700">
        {label}
      </p>

      <p
        className={`ha-number mt-2 text-[10px] font-medium ${className}`}
      >
        {formatPriceLocal(
          value
        )}
      </p>

    </div>
  );
}

function TargetCard({
  label,
  value,
  highlighted = false,
}: {
  label: string;
  value: number;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        highlighted
          ? "border-violet-500/15 bg-violet-500/[0.05]"
          : "border-white/[0.045] bg-white/[0.01]"
      }`}
    >

      <p
        className={`text-[7px] font-medium ${
          highlighted
            ? "text-violet-400"
            : "text-zinc-700"
        }`}
      >
        {label}
      </p>

      <p className="ha-number mt-2 text-[10px] text-zinc-400">
        {formatPriceLocal(
          value
        )}
      </p>

    </div>
  );
}

function formatPriceLocal(
  value: number
) {
  if (
    !Number.isFinite(value)
  ) {
    return "—";
  }

  if (value >= 1000) {
    return value.toLocaleString(
      "en-US",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    );
  }

  return value.toLocaleString(
    "en-US",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }
  );
}
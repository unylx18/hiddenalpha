"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Crosshair,
  Database,
  History,
  RefreshCw,
  ShieldCheck,
  Target,
  TrendingDown,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import HiddenAlphaShell from "@/components/hiddenalpha-shell";

type SignalDetail = {
  id: string;

  symbol: string;

  timeframe: string;

  direction:
    | "LONG"
    | "SHORT";

  status: string;

  lifecyclePhase: string;

  confidence: number;

  confidenceLevel:
    | string
    | null;

  quality:
    | string
    | null;

  summary:
    | string
    | null;

  reasons: string[];

  invalidation:
    | string
    | null;

  entryPrice:
    | number
    | null;

  stopLossPrice:
    | number
    | null;

  takeProfit1Price:
    | number
    | null;

  takeProfit2Price:
    | number
    | null;

  plannedRR:
    | number
    | null;

  result: string;

  realizedR:
    | number
    | null;

  publishedAt:
    | string
    | null;

  entryTriggeredAt:
    | string
    | null;

  tp1HitAt:
    | string
    | null;

  tp2HitAt:
    | string
    | null;

  stopHitAt:
    | string
    | null;

  expiredAt:
    | string
    | null;

  closedAt:
    | string
    | null;

  lastPrice:
    | number
    | null;

  lastCheckedAt:
    | string
    | null;
};

type DetailResponse = {
  success: boolean;

  signal?:
    SignalDetail;

  error?: string;
};

function formatPrice(
  value:
    | number
    | null
) {
  if (
    value === null ||
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

function formatDate(
  value:
    | string
    | null
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return date.toLocaleString(
    undefined,
    {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }
  );
}

function formatR(
  value:
    | number
    | null
) {
  if (
    value === null ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  return `${
    value >= 0
      ? "+"
      : ""
  }${value.toFixed(2)}R`;
}

function lifecycleLabel(
  phase: string
) {
  switch (phase) {
    case "WAITING_ENTRY":
      return "Waiting Entry";

    case "ENTRY_TRIGGERED":
      return "Position Active";

    case "TP1_HIT":
      return "TP1 Hit";

    case "TP2_HIT":
      return "TP2 Hit";

    case "STOPPED":
      return "Stopped";

    case "INVALIDATED":
      return "Invalidated";

    case "EXPIRED":
      return "Expired";

    default:
      return phase;
  }
}

export default function SignalDetailPage() {
  const params =
    useParams();

  const router =
    useRouter();

  const id =
    String(
      params.id ?? ""
    );

  const [
    signal,
    setSignal,
  ] =
    useState<SignalDetail | null>(
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

  const loadSignal =
    useCallback(
      async (
        manual = false
      ) => {
        if (!id) {
          return;
        }

        if (manual) {
          setRefreshing(true);
        }

        try {
          const response =
            await fetch(
              `/api/trading/signals/${id}`,
              {
                cache:
                  "no-store",
              }
            );

          const data =
            (await response.json()) as DetailResponse;

          if (
            !response.ok ||
            !data.success ||
            !data.signal
          ) {
            throw new Error(
              data.error ??
                "Signal not found"
            );
          }

          setSignal(
            data.signal
          );

          setError("");
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Signal not found"
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [
        id,
      ]
    );

  useEffect(() => {
    loadSignal();

    const interval =
      window.setInterval(
        () => {
          loadSignal();
        },
        15_000
      );

    function handlePipelineComplete() {
      loadSignal();
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
    loadSignal,
  ]);

  const outcomeTone =
    signal?.result === "WIN"
      ? "green"
      : signal?.result ===
        "LOSS"
      ? "red"
      : signal?.result ===
        "OPEN"
      ? "purple"
      : "neutral";

  return (
    <HiddenAlphaShell>

      <div className="mx-auto max-w-[1500px] px-4 py-5 lg:px-5">

        {/* HEADER */}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-center gap-3">

            <button
              onClick={() =>
                router.push(
                  "/signals"
                )
              }
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.055] bg-[#090c12] transition hover:bg-white/[0.03]"
            >
              <ArrowLeft
                size={13}
                className="text-zinc-500"
              />
            </button>

            <div>

              <div className="flex items-center gap-2">

                <h1 className="text-[19px] font-semibold tracking-[-0.03em] text-zinc-100">
                  Signal Detail
                </h1>

                <span className="rounded-md border border-violet-500/10 bg-violet-500/[0.07] px-2 py-1 text-[7px] font-semibold uppercase tracking-[0.1em] text-violet-400">
                  Audit
                </span>

              </div>

              <p className="mt-1 text-[8px] text-zinc-700">
                Persistent record of a published HiddenAlpha signal.
              </p>

            </div>

          </div>

          <button
            onClick={() =>
              loadSignal(true)
            }
            disabled={
              refreshing
            }
            className="flex h-9 items-center gap-2 rounded-lg border border-white/[0.055] bg-[#090c12] px-3 text-[8px] text-zinc-500"
          >
            <RefreshCw
              size={11}
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />

            Refresh
          </button>

        </div>

        {loading && (
          <div className="ha-panel mt-5 flex min-h-[350px] items-center justify-center">

            <div className="text-center">

              <RefreshCw
                size={18}
                className="mx-auto animate-spin text-violet-400"
              />

              <p className="mt-3 text-[8px] text-zinc-700">
                Loading signal audit...
              </p>

            </div>

          </div>
        )}

        {!loading &&
          error && (
            <div className="ha-panel mt-5 flex min-h-[300px] items-center justify-center">

              <div className="text-center">

                <XCircle
                  size={20}
                  className="mx-auto text-red-400"
                />

                <p className="mt-3 text-[10px] text-red-400">
                  {error}
                </p>

                <button
                  onClick={() =>
                    router.push(
                      "/signals"
                    )
                  }
                  className="mt-4 rounded-lg bg-violet-600 px-4 py-2 text-[8px] text-white"
                >
                  Back to Signals
                </button>

              </div>

            </div>
          )}

        {!loading &&
          signal && (
            <>
              {/* HERO */}

              <section className="ha-panel ha-purple-glow mt-5 overflow-hidden">

                <div className="border-b border-white/[0.05] px-5 py-4">

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                    <div>

                      <p className="text-[7px] uppercase tracking-[0.14em] text-zinc-700">
                        Published Signal
                      </p>

                      <div className="mt-1 flex flex-wrap items-center gap-3">

                        <h2 className="ha-number text-[27px] font-semibold tracking-[-0.04em] text-zinc-100">

                          {signal.symbol.replace(
                            "USDT",
                            ""
                          )}

                          <span className="ml-1 text-[11px] text-zinc-600">
                            / USDT
                          </span>

                        </h2>

                        <DirectionBadge
                          direction={
                            signal.direction
                          }
                        />

                        <span className="rounded-md border border-white/[0.05] bg-white/[0.02] px-2 py-1 text-[7px] text-zinc-500">
                          {signal.timeframe}
                        </span>

                      </div>

                    </div>

                    <div className="text-left sm:text-right">

                      <p className="text-[7px] uppercase tracking-[0.1em] text-zinc-700">
                        Outcome
                      </p>

                      <OutcomeBadge
                        result={
                          signal.result
                        }
                      />

                    </div>

                  </div>

                </div>

                <div className="grid gap-5 p-5 xl:grid-cols-[1.4fr_0.6fr]">

                  {/* LEVELS */}

                  <div>

                    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">

                      <LevelCard
                        icon={
                          Crosshair
                        }
                        label="Entry"
                        value={formatPrice(
                          signal.entryPrice
                        )}
                      />

                      <LevelCard
                        icon={
                          ShieldCheck
                        }
                        label="Stop Loss"
                        value={formatPrice(
                          signal.stopLossPrice
                        )}
                        tone="red"
                      />

                      <LevelCard
                        icon={Target}
                        label="TP1"
                        value={formatPrice(
                          signal.takeProfit1Price
                        )}
                        tone="green"
                      />

                      <LevelCard
                        icon={Target}
                        label="TP2"
                        value={formatPrice(
                          signal.takeProfit2Price
                        )}
                        tone="cyan"
                      />

                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">

                      <Metric
                        label="Confidence"
                        value={`${signal.confidence}%`}
                      />

                      <Metric
                        label="Quality"
                        value={
                          signal.quality ??
                          "—"
                        }
                        tone="purple"
                      />

                      <Metric
                        label="Planned RR"
                        value={
                          signal.plannedRR !==
                          null
                            ? `1:${signal.plannedRR.toFixed(
                                2
                              )}`
                            : "—"
                        }
                      />

                      <Metric
                        label="Realized R"
                        value={formatR(
                          signal.realizedR
                        )}
                        tone={
                          outcomeTone
                        }
                      />

                    </div>

                    <div className="mt-3 rounded-xl border border-white/[0.05] bg-white/[0.012] p-4">

                      <p className="text-[7px] uppercase tracking-[0.1em] text-zinc-700">
                        Published Thesis
                      </p>

                      <p className="mt-2 text-[9px] leading-5 text-zinc-500">
                        {signal.summary ??
                          "No signal thesis was stored."}
                      </p>

                    </div>

                  </div>

                  {/* AUDIT META */}

                  <div className="rounded-xl border border-white/[0.05] bg-white/[0.012] p-4">

                    <div className="flex items-center gap-2">

                      <Database
                        size={11}
                        className="text-violet-400"
                      />

                      <p className="text-[8px] font-medium text-zinc-400">
                        Audit Record
                      </p>

                    </div>

                    <div className="mt-4 space-y-3">

                      <AuditRow
                        label="Signal ID"
                        value={
                          signal.id
                        }
                        mono
                      />

                      <AuditRow
                        label="Published"
                        value={formatDate(
                          signal.publishedAt
                        )}
                      />

                      <AuditRow
                        label="Status"
                        value={
                          signal.status
                        }
                      />

                      <AuditRow
                        label="Lifecycle"
                        value={lifecycleLabel(
                          signal.lifecyclePhase
                        )}
                      />

                      <AuditRow
                        label="Confidence Level"
                        value={
                          signal.confidenceLevel ??
                          "—"
                        }
                      />

                      <AuditRow
                        label="Last Checked"
                        value={formatDate(
                          signal.lastCheckedAt
                        )}
                      />

                    </div>

                  </div>

                </div>

              </section>

              {/* LIFECYCLE */}

              <section className="ha-panel mt-3 p-5">

                <div className="flex items-center gap-2">

                  <History
                    size={13}
                    className="text-violet-400"
                  />

                  <div>

                    <h2 className="text-[11px] font-medium text-zinc-200">
                      Lifecycle Audit Trail
                    </h2>

                    <p className="mt-0.5 text-[7px] text-zinc-700">
                      Stored timestamps from publication to final outcome
                    </p>

                  </div>

                </div>

                <div className="mt-5 grid gap-2 md:grid-cols-4">

                  <TimelineStep
                    label="Published"
                    time={
                      signal.publishedAt
                    }
                    complete
                  />

                  <TimelineStep
                    label="Entry Triggered"
                    time={
                      signal.entryTriggeredAt
                    }
                    complete={Boolean(
                      signal.entryTriggeredAt
                    )}
                  />

                  <TimelineStep
                    label="TP1 Hit"
                    time={
                      signal.tp1HitAt
                    }
                    complete={Boolean(
                      signal.tp1HitAt
                    )}
                  />

                  <TimelineStep
                    label="TP2 Hit"
                    time={
                      signal.tp2HitAt
                    }
                    complete={Boolean(
                      signal.tp2HitAt
                    )}
                  />

                </div>

                {signal.stopHitAt && (
                  <OutcomeEvent
                    label="Stop Loss Hit"
                    time={
                      signal.stopHitAt
                    }
                    tone="red"
                  />
                )}

                {signal.expiredAt && (
                  <OutcomeEvent
                    label="Signal Expired"
                    time={
                      signal.expiredAt
                    }
                    tone="amber"
                  />
                )}

              </section>

              {/* REASONS */}

              <div className="mt-3 grid gap-3 lg:grid-cols-2">

                <section className="ha-panel p-5">

                  <div className="flex items-center gap-2">

                    <Activity
                      size={12}
                      className="text-violet-400"
                    />

                    <h2 className="text-[11px] font-medium text-zinc-200">
                      Publication Reasons
                    </h2>

                  </div>

                  {signal.reasons.length >
                  0 ? (
                    <div className="mt-4 space-y-2">

                      {signal.reasons.map(
                        (
                          reason,
                          index
                        ) => (
                          <div
                            key={`${reason}-${index}`}
                            className="flex gap-3 rounded-xl border border-white/[0.045] bg-white/[0.01] p-3"
                          >

                            <CheckCircle2
                              size={11}
                              className="mt-0.5 shrink-0 text-emerald-400"
                            />

                            <p className="text-[8px] leading-4 text-zinc-500">
                              {reason}
                            </p>

                          </div>
                        )
                      )}

                    </div>
                  ) : (
                    <p className="mt-4 text-[8px] text-zinc-700">
                      No structured publication reasons were stored for this signal.
                    </p>
                  )}

                </section>

                <section className="ha-panel p-5">

                  <div className="flex items-center gap-2">

                    <ShieldCheck
                      size={12}
                      className="text-amber-400"
                    />

                    <h2 className="text-[11px] font-medium text-zinc-200">
                      Risk & Invalidation
                    </h2>

                  </div>

                  <div className="mt-4 rounded-xl border border-white/[0.045] bg-white/[0.01] p-4">

                    <p className="text-[7px] uppercase tracking-[0.1em] text-zinc-700">
                      Invalidation Rule
                    </p>

                    <p className="mt-2 text-[9px] leading-5 text-zinc-500">
                      {signal.invalidation ??
                        "No textual invalidation rule was stored."}
                    </p>

                  </div>

                  <div className="mt-3 rounded-xl border border-violet-500/10 bg-violet-500/[0.03] p-4">

                    <div className="flex items-center gap-2">

                      <Zap
                        size={10}
                        className="text-violet-400"
                      />

                      <p className="text-[8px] font-medium text-zinc-400">
                        Frozen Signal Policy
                      </p>

                    </div>

                    <p className="mt-2 text-[8px] leading-4 text-zinc-700">
                      Entry, stop loss and take-profit levels shown here are the stored published plan. HiddenAlpha does not recalculate historical signals to make past results look better.
                    </p>

                  </div>

                </section>

              </div>

            </>
          )}

      </div>

    </HiddenAlphaShell>
  );
}

function DirectionBadge({
  direction,
}: {
  direction:
    | "LONG"
    | "SHORT";
}) {
  const long =
    direction === "LONG";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[7px] font-semibold ${
        long
          ? "border-emerald-500/10 bg-emerald-500/[0.07] text-emerald-400"
          : "border-red-500/10 bg-red-500/[0.07] text-red-400"
      }`}
    >
      {long ? (
        <TrendingUp
          size={8}
        />
      ) : (
        <TrendingDown
          size={8}
        />
      )}

      {direction}
    </span>
  );
}

function OutcomeBadge({
  result,
}: {
  result: string;
}) {
  const className =
    result === "WIN"
      ? "border-emerald-500/10 bg-emerald-500/[0.07] text-emerald-400"
      : result === "LOSS"
      ? "border-red-500/10 bg-red-500/[0.07] text-red-400"
      : result === "OPEN"
      ? "border-violet-500/10 bg-violet-500/[0.07] text-violet-400"
      : "border-amber-500/10 bg-amber-500/[0.06] text-amber-400";

  return (
    <span
      className={`mt-1 inline-flex rounded-md border px-3 py-1.5 text-[8px] font-semibold ${className}`}
    >
      {result}
    </span>
  );
}

function LevelCard({
  icon: Icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: typeof Target;

  label: string;

  value: string;

  tone?:
    | "neutral"
    | "green"
    | "red"
    | "cyan";
}) {
  const valueClass =
    tone === "green"
      ? "text-emerald-400"
      : tone === "red"
      ? "text-red-400"
      : tone === "cyan"
      ? "text-cyan-400"
      : "text-zinc-300";

  return (
    <div className="rounded-xl border border-white/[0.05] bg-white/[0.012] p-3">

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
        className={`ha-number mt-2 text-[12px] font-medium ${valueClass}`}
      >
        {value}
      </p>

    </div>
  );
}

function Metric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;

  value: string;

  tone?:
    | "neutral"
    | "green"
    | "red"
    | "purple";
}) {
  const valueClass =
    tone === "green"
      ? "text-emerald-400"
      : tone === "red"
      ? "text-red-400"
      : tone === "purple"
      ? "text-violet-400"
      : "text-zinc-300";

  return (
    <div className="rounded-xl border border-white/[0.05] bg-white/[0.012] p-3">

      <p className="text-[7px] uppercase tracking-[0.1em] text-zinc-700">
        {label}
      </p>

      <p
        className={`ha-number mt-2 text-[13px] font-semibold ${valueClass}`}
      >
        {value}
      </p>

    </div>
  );
}

function AuditRow({
  label,
  value,
  mono = false,
}: {
  label: string;

  value: string;

  mono?: boolean;
}) {
  return (
    <div className="border-b border-white/[0.04] pb-3 last:border-0 last:pb-0">

      <p className="text-[7px] text-zinc-700">
        {label}
      </p>

      <p
        className={`mt-1 break-all text-[8px] text-zinc-400 ${
          mono
            ? "font-mono"
            : ""
        }`}
      >
        {value}
      </p>

    </div>
  );
}

function TimelineStep({
  label,
  time,
  complete,
}: {
  label: string;

  time:
    | string
    | null;

  complete: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        complete
          ? "border-emerald-500/10 bg-emerald-500/[0.035]"
          : "border-white/[0.045] bg-white/[0.01]"
      }`}
    >

      <div className="flex items-center gap-2">

        <span
          className={`h-2 w-2 rounded-full ${
            complete
              ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.3)]"
              : "bg-zinc-700"
          }`}
        />

        <p
          className={`text-[8px] font-medium ${
            complete
              ? "text-zinc-300"
              : "text-zinc-700"
          }`}
        >
          {label}
        </p>

      </div>

      <p className="mt-2 text-[7px] text-zinc-700">
        {complete
          ? formatDate(
              time
            )
          : "Not reached"}
      </p>

    </div>
  );
}

function OutcomeEvent({
  label,
  time,
  tone,
}: {
  label: string;

  time: string;

  tone:
    | "red"
    | "amber";
}) {
  return (
    <div
      className={`mt-3 flex items-center justify-between rounded-xl border px-4 py-3 ${
        tone === "red"
          ? "border-red-500/10 bg-red-500/[0.04]"
          : "border-amber-500/10 bg-amber-500/[0.04]"
      }`}
    >

      <span
        className={`text-[8px] font-medium ${
          tone === "red"
            ? "text-red-400"
            : "text-amber-400"
        }`}
      >
        {label}
      </span>

      <span className="text-[7px] text-zinc-600">
        {formatDate(time)}
      </span>

    </div>
  );
}
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Activity,
  Bell,
  CheckCheck,
  CheckCircle2,
  Clock3,
  Database,
  Radar,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  TrendingDown,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react";

import HiddenAlphaShell from "@/components/hiddenalpha-shell";

type AlertCategory =
  | "SIGNAL"
  | "LIFECYCLE"
  | "SCANNER"
  | "MARKET"
  | "SYSTEM";

type AlertSeverity =
  | "INFO"
  | "SUCCESS"
  | "WARNING"
  | "DANGER";

type AlertFilter =
  | "ALL"
  | "UNREAD"
  | "SIGNAL"
  | "SCANNER"
  | "MARKET";

type AlertRecord = {
  id: string;
  key: string;
  category: AlertCategory;
  severity: AlertSeverity;
  title: string;
  message: string;
  symbol?: string;
  createdAt: string;
  read: boolean;
};

type AlertSettings = {
  signal: boolean;
  lifecycle: boolean;
  scanner: boolean;
  market: boolean;
  desktop: boolean;
};

type AlertSnapshot = {
  initialized: boolean;

  activeSignalId: string | null;

  activeLifecycle: string | null;

  scannerFingerprint: string | null;

  marketBiases: Record<
    string,
    string
  >;

  closedSignalKeys: string[];
};

type ActiveSignal = {
  id: string;

  symbol: string;

  direction:
    | "LONG"
    | "SHORT";

  lifecyclePhase: string;

  status: string;
};

type ScannerBest = {
  symbol: string;

  scannerScore:
    | number
    | null;

  actionable: boolean;

  signal: {
    direction?:
      | "LONG"
      | "SHORT"
      | "WAIT";

    confidence?: number;
  } | null;

  setup: {
    entryPrice?: number;
  } | null;

  freshness: {
    status?: string;
  } | null;
};

type ClosedSignal = {
  id: string;

  symbol: string;

  direction: string;

  lifecyclePhase: string;

  result:
    | "WIN"
    | "LOSS"
    | "CANCELLED"
    | "OPEN";
};

type ActiveApiResponse = {
  success?: boolean;

  activeSignal?: unknown;

  error?: string;
};

type HistoryApiResponse = {
  success?: boolean;

  signals?: unknown[];

  history?: unknown[];

  error?: string;
};

type ScannerApiResponse = {
  success?: boolean;

  best?: unknown;

  error?: string;
};

type ContextApiResponse = {
  success?: boolean;

  alpha?: {
    market?: {
      bias?: unknown;
    };
  };

  error?: string;
};

const ALERTS_KEY =
  "hiddenalpha:alerts:v1";

const SETTINGS_KEY =
  "hiddenalpha:alert-settings:v1";

const SNAPSHOT_KEY =
  "hiddenalpha:alert-snapshot:v1";

const SYMBOLS = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
];

const DEFAULT_SETTINGS: AlertSettings = {
  signal: true,

  lifecycle: true,

  scanner: true,

  market: true,

  desktop: false,
};

const DEFAULT_SNAPSHOT: AlertSnapshot = {
  initialized: false,

  activeSignalId: null,

  activeLifecycle: null,

  scannerFingerprint: null,

  marketBiases: {},

  closedSignalKeys: [],
};

function isRecord(
  value: unknown
): value is Record<
  string,
  unknown
> {
  return (
    typeof value ===
      "object" &&
    value !== null
  );
}

function stringValue(
  value: unknown
) {
  return typeof value ===
    "string"
    ? value
    : null;
}

function numberValue(
  value: unknown
) {
  const parsed =
    Number(value);

  return Number.isFinite(
    parsed
  )
    ? parsed
    : null;
}

function normalizeActiveSignal(
  value: unknown
): ActiveSignal | null {
  if (
    !isRecord(value)
  ) {
    return null;
  }

  const id =
    stringValue(
      value.id
    );

  const symbol =
    stringValue(
      value.symbol
    );

  const direction =
    stringValue(
      value.direction
    );

  if (
    !id ||
    !symbol ||
    (
      direction !==
        "LONG" &&
      direction !==
        "SHORT"
    )
  ) {
    return null;
  }

  return {
    id,

    symbol,

    direction,

    lifecyclePhase:
      stringValue(
        value.lifecyclePhase
      ) ??
      stringValue(
        value.lifecycle_phase
      ) ??
      "WAITING_ENTRY",

    status:
      stringValue(
        value.status
      ) ??
      "ACTIVE",
  };
}

function normalizeScannerBest(
  value: unknown
): ScannerBest | null {
  if (
    !isRecord(value)
  ) {
    return null;
  }

  const symbol =
    stringValue(
      value.symbol
    );

  if (!symbol) {
    return null;
  }

  let signal:
    ScannerBest["signal"] =
      null;

  if (
    isRecord(
      value.signal
    )
  ) {
    signal = {
      direction:
        stringValue(
          value.signal
            .direction
        ) === "SHORT"
          ? "SHORT"
          : stringValue(
              value.signal
                .direction
            ) === "LONG"
          ? "LONG"
          : "WAIT",

      confidence:
        numberValue(
          value.signal
            .confidence
        ) ??
        undefined,
    };
  }

  let setup:
    ScannerBest["setup"] =
      null;

  if (
    isRecord(
      value.setup
    )
  ) {
    setup = {
      entryPrice:
        numberValue(
          value.setup
            .entryPrice
        ) ??
        undefined,
    };
  }

  let freshness:
    ScannerBest["freshness"] =
      null;

  if (
    isRecord(
      value.freshness
    )
  ) {
    freshness = {
      status:
        stringValue(
          value.freshness
            .status
        ) ??
        undefined,
    };
  }

  return {
    symbol,

    scannerScore:
      numberValue(
        value.scannerScore
      ),

    actionable:
      value.actionable ===
      true,

    signal,

    setup,

    freshness,
  };
}

function normalizeClosedSignal(
  value: unknown
): ClosedSignal | null {
  if (
    !isRecord(value)
  ) {
    return null;
  }

  const id =
    stringValue(
      value.id
    );

  if (!id) {
    return null;
  }

  const lifecycle =
    stringValue(
      value.lifecyclePhase
    ) ??
    stringValue(
      value.lifecycle_phase
    ) ??
    "WAITING_ENTRY";

  const status =
    stringValue(
      value.status
    ) ??
    "ACTIVE";

  const rawResult =
    stringValue(
      value.result
    );

  let result:
    ClosedSignal["result"] =
      "OPEN";

  if (
    rawResult ===
      "WIN" ||
    rawResult ===
      "LOSS" ||
    rawResult ===
      "CANCELLED" ||
    rawResult ===
      "OPEN"
  ) {
    result =
      rawResult;
  } else if (
    lifecycle ===
      "TP2_HIT" ||
    status ===
      "COMPLETED"
  ) {
    result =
      "WIN";
  } else if (
    lifecycle ===
    "STOPPED"
  ) {
    result =
      "LOSS";
  } else if (
    lifecycle ===
      "INVALIDATED" ||
    lifecycle ===
      "EXPIRED" ||
    status ===
      "EXPIRED"
  ) {
    result =
      "CANCELLED";
  }

  return {
    id,

    symbol:
      stringValue(
        value.symbol
      ) ??
      "UNKNOWN",

    direction:
      stringValue(
        value.direction
      ) ??
      "—",

    lifecyclePhase:
      lifecycle,

    result,
  };
}

function lifecycleTitle(
  lifecycle: string
) {
  switch (
    lifecycle
  ) {
    case "WAITING_ENTRY":
      return "Waiting For Entry";

    case "ENTRY_TRIGGERED":
      return "Entry Triggered";

    case "TP1_HIT":
      return "TP1 Hit";

    case "TP2_HIT":
      return "TP2 Hit";

    case "STOPPED":
      return "Stop Loss Hit";

    case "INVALIDATED":
      return "Signal Invalidated";

    case "EXPIRED":
      return "Signal Expired";

    default:
      return lifecycle.replaceAll(
        "_",
        " "
      );
  }
}

function lifecycleSeverity(
  lifecycle: string
): AlertSeverity {
  if (
    lifecycle ===
      "TP1_HIT" ||
    lifecycle ===
      "TP2_HIT"
  ) {
    return "SUCCESS";
  }

  if (
    lifecycle ===
    "STOPPED"
  ) {
    return "DANGER";
  }

  if (
    lifecycle ===
      "INVALIDATED" ||
    lifecycle ===
      "EXPIRED"
  ) {
    return "WARNING";
  }

  return "INFO";
}

function lifecycleMessage(
  symbol: string,
  direction: string,
  lifecycle: string
) {
  switch (
    lifecycle
  ) {
    case "WAITING_ENTRY":
      return `${symbol} ${direction} is published and waiting for its entry condition.`;

    case "ENTRY_TRIGGERED":
      return `${symbol} ${direction} crossed the official published entry level.`;

    case "TP1_HIT":
      return `${symbol} ${direction} reached the first 1R profit milestone.`;

    case "TP2_HIT":
      return `${symbol} ${direction} reached its final published target.`;

    case "STOPPED":
      return `${symbol} ${direction} reached its official stop-loss level.`;

    case "INVALIDATED":
      return `${symbol} ${direction} was invalidated before a valid entry completed.`;

    case "EXPIRED":
      return `${symbol} ${direction} expired before a valid entry completed.`;

    default:
      return `${symbol} ${direction} lifecycle changed to ${lifecycle}.`;
  }
}

function buildClosedKey(
  signal: ClosedSignal
) {
  return `signal:${signal.id}:${signal.lifecyclePhase}`;
}

function createAlert(
  input: Omit<
    AlertRecord,
    "id" | "read"
  >
): AlertRecord {
  return {
    ...input,

    id:
      input.key,

    read: false,
  };
}

function formatTime(
  value: string
) {
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
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }
  );
}

export default function AlertsPage() {
  const [
    alerts,
    setAlerts,
  ] =
    useState<
      AlertRecord[]
    >([]);

  const [
    settings,
    setSettings,
  ] =
    useState<AlertSettings>(
      DEFAULT_SETTINGS
    );

  const [
    snapshot,
    setSnapshot,
  ] =
    useState<AlertSnapshot>(
      DEFAULT_SNAPSHOT
    );

  const snapshotRef =
    useRef<AlertSnapshot>(
      DEFAULT_SNAPSHOT
    );

  const settingsRef =
    useRef<AlertSettings>(
      DEFAULT_SETTINGS
    );

  const [
    activeSignal,
    setActiveSignal,
  ] =
    useState<ActiveSignal | null>(
      null
    );

  const [
    scannerBest,
    setScannerBest,
  ] =
    useState<ScannerBest | null>(
      null
    );

  const [
    filter,
    setFilter,
  ] =
    useState<AlertFilter>(
      "ALL"
    );

  const [
    hydrated,
    setHydrated,
  ] =
    useState(false);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    lastChecked,
    setLastChecked,
  ] =
    useState<Date | null>(
      null
    );

  /*
   * ========================================
   * HYDRATE LOCAL STATE
   * ========================================
   */

  useEffect(() => {
    try {
      const storedAlerts =
        window.localStorage.getItem(
          ALERTS_KEY
        );

      if (
        storedAlerts
      ) {
        const parsed:
          unknown =
            JSON.parse(
              storedAlerts
            );

        if (
          Array.isArray(
            parsed
          )
        ) {
          setAlerts(
            parsed as AlertRecord[]
          );
        }
      }

      const storedSettings =
        window.localStorage.getItem(
          SETTINGS_KEY
        );

      if (
        storedSettings
      ) {
        const parsed:
          unknown =
            JSON.parse(
              storedSettings
            );

        if (
          isRecord(parsed)
        ) {
          const nextSettings: AlertSettings =
            {
              ...DEFAULT_SETTINGS,

              signal:
                parsed.signal !==
                false,

              lifecycle:
                parsed.lifecycle !==
                false,

              scanner:
                parsed.scanner !==
                false,

              market:
                parsed.market !==
                false,

              desktop:
                parsed.desktop ===
                true,
            };

          settingsRef.current =
            nextSettings;

          setSettings(
            nextSettings
          );
        }
      }

      const storedSnapshot =
        window.localStorage.getItem(
          SNAPSHOT_KEY
        );

      if (
        storedSnapshot
      ) {
        const parsed:
          unknown =
            JSON.parse(
              storedSnapshot
            );

        if (
          isRecord(parsed)
        ) {
          const marketBiases =
            isRecord(
              parsed.marketBiases
            )
              ? Object.fromEntries(
                  Object.entries(
                    parsed.marketBiases
                  ).filter(
                    (
                      entry
                    ) =>
                      typeof entry[1] ===
                      "string"
                  )
                ) as Record<
                  string,
                  string
                >
              : {};

          const closedSignalKeys =
            Array.isArray(
              parsed.closedSignalKeys
            )
              ? parsed.closedSignalKeys.filter(
                  (
                    item: unknown
                  ): item is string =>
                    typeof item ===
                    "string"
                )
              : [];

          const nextSnapshot: AlertSnapshot =
            {
              initialized:
                parsed.initialized ===
                true,

              activeSignalId:
                stringValue(
                  parsed.activeSignalId
                ),

              activeLifecycle:
                stringValue(
                  parsed.activeLifecycle
                ),

              scannerFingerprint:
                stringValue(
                  parsed.scannerFingerprint
                ),

              marketBiases,

              closedSignalKeys,
            };

          snapshotRef.current =
            nextSnapshot;

          setSnapshot(
            nextSnapshot
          );
        }
      }
    } catch {
      // Defaults are safe fallback.
    }

    setHydrated(
      true
    );
  }, []);

  /*
   * ========================================
   * PERSIST STATE
   * ========================================
   */

  useEffect(() => {
    if (
      !hydrated
    ) {
      return;
    }

    try {
      window.localStorage.setItem(
        ALERTS_KEY,
        JSON.stringify(
          alerts.slice(
            0,
            150
          )
        )
      );
    } catch {
      // Ignore storage errors.
    }
  }, [
    alerts,
    hydrated,
  ]);

  useEffect(() => {
    settingsRef.current =
      settings;

    if (
      !hydrated
    ) {
      return;
    }

    try {
      window.localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify(
          settings
        )
      );
    } catch {
      // Ignore storage errors.
    }
  }, [
    settings,
    hydrated,
  ]);

  useEffect(() => {
    snapshotRef.current =
      snapshot;

    if (
      !hydrated
    ) {
      return;
    }

    try {
      window.localStorage.setItem(
        SNAPSHOT_KEY,
        JSON.stringify(
          snapshot
        )
      );
    } catch {
      // Ignore storage errors.
    }
  }, [
    snapshot,
    hydrated,
  ]);

  /*
   * ========================================
   * NOTIFICATIONS
   * ========================================
   */

  const appendAlerts =
    useCallback(
      (
        incoming: AlertRecord[]
      ) => {
        if (
          incoming.length ===
          0
        ) {
          return;
        }

        setAlerts(
          (
            current:
              AlertRecord[]
          ) => {
            const existingKeys =
              new Set(
                current.map(
                  (
                    item:
                      AlertRecord
                  ) =>
                    item.key
                )
              );

            const unique =
              incoming.filter(
                (
                  item:
                    AlertRecord
                ) =>
                  !existingKeys.has(
                    item.key
                  )
              );

            if (
              settingsRef.current
                .desktop &&
              typeof Notification !==
                "undefined" &&
              Notification.permission ===
                "granted"
            ) {
              unique.forEach(
                (
                  alert:
                    AlertRecord
                ) => {
                  try {
                    new Notification(
                      `HiddenAlpha • ${alert.title}`,
                      {
                        body:
                          alert.message,
                      }
                    );
                  } catch {
                    // Browser blocked notification.
                  }
                }
              );
            }

            return [
              ...unique,
              ...current,
            ].slice(
              0,
              150
            );
          }
        );
      },
      []
    );

  /*
   * ========================================
   * ALERT ENGINE
   * ========================================
   */

  const syncAlerts =
    useCallback(
      async (
        manual = false
      ) => {
        if (
          !hydrated
        ) {
          return;
        }

        if (
          manual
        ) {
          setRefreshing(
            true
          );
        }

        try {
          const [
            activeResponse,
            historyResponse,
            scannerResponse,
            ...contextResponses
          ] =
            await Promise.all([
              fetch(
                "/api/trading/signals/active",
                {
                  cache:
                    "no-store",
                }
              ),

              fetch(
                "/api/trading/signals/history?limit=100",
                {
                  cache:
                    "no-store",
                }
              ),

              fetch(
                `/api/trading/scanner?symbols=${SYMBOLS.join(
                  ","
                )}&accountBalance=10000&riskPercent=1&leverage=1`,
                {
                  cache:
                    "no-store",
                }
              ),

              ...SYMBOLS.map(
                (
                  symbol:
                    string
                ) =>
                  fetch(
                    `/api/trading/context?symbol=${symbol}&timeframe=1h`,
                    {
                      cache:
                        "no-store",
                    }
                  )
              ),
            ]);

          const activeData =
            (await activeResponse.json()) as ActiveApiResponse;

          const historyData =
            (await historyResponse.json()) as HistoryApiResponse;

          const scannerData =
            (await scannerResponse.json()) as ScannerApiResponse;

          const contextPayloads: ContextApiResponse[] =
            await Promise.all(
              contextResponses.map(
                async (
                  response:
                    Response
                ) =>
                  (await response.json()) as ContextApiResponse
              )
            );

          const currentActive =
            activeResponse.ok &&
            activeData.success
              ? normalizeActiveSignal(
                  activeData.activeSignal
                )
              : null;

          const currentBest =
            scannerResponse.ok &&
            scannerData.success
              ? normalizeScannerBest(
                  scannerData.best
                )
              : null;

          setActiveSignal(
            currentActive
          );

          setScannerBest(
            currentBest
          );

          const rawHistory:
            unknown[] =
              historyResponse.ok &&
              historyData.success
                ? Array.isArray(
                    historyData.signals
                  )
                  ? historyData.signals
                  : Array.isArray(
                      historyData.history
                    )
                  ? historyData.history
                  : []
                : [];

          const history:
            ClosedSignal[] =
              rawHistory
                .map(
                  (
                    item:
                      unknown
                  ) =>
                    normalizeClosedSignal(
                      item
                    )
                )
                .filter(
                  (
                    signal:
                      ClosedSignal | null
                  ): signal is ClosedSignal =>
                    signal !==
                    null
                );

          const closedHistory:
            ClosedSignal[] =
              history.filter(
                (
                  signal:
                    ClosedSignal
                ) =>
                  signal.result !==
                  "OPEN"
              );

          const closedKeys:
            string[] =
              closedHistory.map(
                (
                  signal:
                    ClosedSignal
                ) =>
                  buildClosedKey(
                    signal
                  )
              );

          const marketBiases: Record<
            string,
            string
          > = {};

          SYMBOLS.forEach(
            (
              symbol:
                string,
              index:
                number
            ) => {
              marketBiases[
                symbol
              ] =
                stringValue(
                  contextPayloads[
                    index
                  ]?.alpha
                    ?.market
                    ?.bias
                ) ??
                "NEUTRAL";
            }
          );

          const candidateDirection =
            currentBest
              ?.signal
              ?.direction;

          const candidateEntry =
            numberValue(
              currentBest
                ?.setup
                ?.entryPrice
            );

          const scannerFingerprint =
            currentBest &&
            currentBest.actionable &&
            (
              candidateDirection ===
                "LONG" ||
              candidateDirection ===
                "SHORT"
            )
              ? [
                  currentBest.symbol,

                  candidateDirection,

                  candidateEntry !==
                  null
                    ? candidateEntry.toFixed(
                        4
                      )
                    : "NA",
                ].join(
                  ":"
                )
              : null;

          const currentSnapshot =
            snapshotRef.current;

          const currentSettings =
            settingsRef.current;

          const nextAlerts:
            AlertRecord[] =
              [];

          const now =
            new Date().toISOString();

          /*
           * FIRST RUN
           */

          if (
            !currentSnapshot.initialized
          ) {
            nextAlerts.push(
              createAlert({
                key:
                  "system:alerts-initialized",

                category:
                  "SYSTEM",

                severity:
                  "INFO",

                title:
                  "Alert Desk Initialized",

                message:
                  "HiddenAlpha alert tracking is active in this browser.",

                createdAt:
                  now,
              })
            );

            if (
              currentSettings.signal &&
              currentActive
            ) {
              nextAlerts.push(
                createAlert({
                  key: `signal:${currentActive.id}:PUBLISHED`,

                  category:
                    "SIGNAL",

                  severity:
                    "INFO",

                  title:
                    "Official Signal Active",

                  message: `${currentActive.symbol} ${currentActive.direction} is currently an official published HiddenAlpha signal.`,

                  symbol:
                    currentActive.symbol,

                  createdAt:
                    now,
                })
              );
            }

            if (
              currentSettings.scanner &&
              currentBest &&
              scannerFingerprint
            ) {
              nextAlerts.push(
                createAlert({
                  key: `scanner:${scannerFingerprint}`,

                  category:
                    "SCANNER",

                  severity:
                    "INFO",

                  title:
                    "Scanner Opportunity",

                  message: `${currentBest.symbol} ${candidateDirection} is actionable with scanner score ${
                    currentBest.scannerScore ??
                    "—"
                  } and freshness ${
                    currentBest.freshness
                      ?.status ??
                    "—"
                  }.`,

                  symbol:
                    currentBest.symbol,

                  createdAt:
                    now,
                })
              );
            }

            appendAlerts(
              nextAlerts
            );

            const nextSnapshot: AlertSnapshot =
              {
                initialized:
                  true,

                activeSignalId:
                  currentActive
                    ?.id ??
                  null,

                activeLifecycle:
                  currentActive
                    ?.lifecyclePhase ??
                  null,

                scannerFingerprint,

                marketBiases,

                closedSignalKeys:
                  closedKeys,
              };

            snapshotRef.current =
              nextSnapshot;

            setSnapshot(
              nextSnapshot
            );

            setLastChecked(
              new Date()
            );

            setError("");

            return;
          }

          /*
           * NEW PUBLISHED SIGNAL
           */

          if (
            currentSettings.signal &&
            currentActive &&
            currentActive.id !==
              currentSnapshot.activeSignalId
          ) {
            nextAlerts.push(
              createAlert({
                key: `signal:${currentActive.id}:PUBLISHED`,

                category:
                  "SIGNAL",

                severity:
                  "INFO",

                title:
                  "New Official Signal",

                message: `${currentActive.symbol} ${currentActive.direction} passed Publisher quality gates and is now official.`,

                symbol:
                  currentActive.symbol,

                createdAt:
                  now,
              })
            );
          }

          /*
           * ACTIVE LIFECYCLE CHANGE
           */

          if (
            currentSettings.lifecycle &&
            currentActive &&
            currentActive.id ===
              currentSnapshot.activeSignalId &&
            currentActive.lifecyclePhase !==
              currentSnapshot.activeLifecycle
          ) {
            nextAlerts.push(
              createAlert({
                key: `signal:${currentActive.id}:${currentActive.lifecyclePhase}`,

                category:
                  "LIFECYCLE",

                severity:
                  lifecycleSeverity(
                    currentActive.lifecyclePhase
                  ),

                title:
                  lifecycleTitle(
                    currentActive.lifecyclePhase
                  ),

                message:
                  lifecycleMessage(
                    currentActive.symbol,
                    currentActive.direction,
                    currentActive.lifecyclePhase
                  ),

                symbol:
                  currentActive.symbol,

                createdAt:
                  now,
              })
            );
          }

          /*
           * CLOSED SIGNAL CATCH-UP
           */

          if (
            currentSettings.lifecycle
          ) {
            const knownClosed =
              new Set<string>(
                currentSnapshot.closedSignalKeys
              );

            closedHistory.forEach(
              (
                signal:
                  ClosedSignal
              ) => {
                const key =
                  buildClosedKey(
                    signal
                  );

                if (
                  knownClosed.has(
                    key
                  )
                ) {
                  return;
                }

                nextAlerts.push(
                  createAlert({
                    key,

                    category:
                      "LIFECYCLE",

                    severity:
                      lifecycleSeverity(
                        signal.lifecyclePhase
                      ),

                    title:
                      lifecycleTitle(
                        signal.lifecyclePhase
                      ),

                    message:
                      lifecycleMessage(
                        signal.symbol,
                        signal.direction,
                        signal.lifecyclePhase
                      ),

                    symbol:
                      signal.symbol,

                    createdAt:
                      now,
                  })
                );
              }
            );
          }

          /*
           * SCANNER CHANGE
           */

          if (
            currentSettings.scanner &&
            currentBest &&
            scannerFingerprint &&
            scannerFingerprint !==
              currentSnapshot.scannerFingerprint
          ) {
            nextAlerts.push(
              createAlert({
                key: `scanner:${scannerFingerprint}`,

                category:
                  "SCANNER",

                severity:
                  "INFO",

                title:
                  "New Scanner Opportunity",

                message: `${currentBest.symbol} ${candidateDirection} became actionable with scanner score ${
                  currentBest.scannerScore ??
                  "—"
                }, confidence ${
                  currentBest.signal
                    ?.confidence ??
                  "—"
                }% and freshness ${
                  currentBest.freshness
                    ?.status ??
                  "—"
                }.`,

                symbol:
                  currentBest.symbol,

                createdAt:
                  now,
              })
            );
          }

          /*
           * MARKET BIAS CHANGE
           */

          if (
            currentSettings.market
          ) {
            SYMBOLS.forEach(
              (
                symbol:
                  string
              ) => {
                const previous =
                  currentSnapshot.marketBiases[
                    symbol
                  ];

                const current =
                  marketBiases[
                    symbol
                  ];

                if (
                  previous &&
                  current &&
                  previous !==
                    current
                ) {
                  nextAlerts.push(
                    createAlert({
                      key: `market:${symbol}:${previous}:${current}:${Date.now()}`,

                      category:
                        "MARKET",

                      severity:
                        current ===
                          "NEUTRAL"
                          ? "WARNING"
                          : "INFO",

                      title:
                        "Market Bias Changed",

                      message: `${symbol} 1H Alpha bias changed from ${previous} to ${current}.`,

                      symbol,

                      createdAt:
                        now,
                    })
                  );
                }
              }
            );
          }

          appendAlerts(
            nextAlerts
          );

          const nextSnapshot: AlertSnapshot =
            {
              initialized:
                true,

              activeSignalId:
                currentActive
                  ?.id ??
                null,

              activeLifecycle:
                currentActive
                  ?.lifecyclePhase ??
                null,

              scannerFingerprint,

              marketBiases,

              closedSignalKeys:
                closedKeys,
            };

          snapshotRef.current =
            nextSnapshot;

          setSnapshot(
            nextSnapshot
          );

          setLastChecked(
            new Date()
          );

          setError("");
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Alert engine sync failed"
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [
        appendAlerts,
        hydrated,
      ]
    );

  /*
   * ========================================
   * AUTO REFRESH
   * ========================================
   */

  useEffect(() => {
    if (
      !hydrated
    ) {
      return;
    }

    syncAlerts();

    const interval =
      window.setInterval(
        () => {
          syncAlerts();
        },
        60_000
      );

    function handlePipelineComplete() {
      syncAlerts();
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
    hydrated,
    syncAlerts,
  ]);

  /*
   * ========================================
   * USER ACTIONS
   * ========================================
   */

  async function enableDesktopNotifications() {
    if (
      typeof Notification ===
      "undefined"
    ) {
      setError(
        "Desktop notifications are not supported by this browser."
      );

      return;
    }

    try {
      const permission =
        await Notification.requestPermission();

      setSettings(
        (
          current:
            AlertSettings
        ) => ({
          ...current,

          desktop:
            permission ===
            "granted",
        })
      );

      if (
        permission ===
        "granted"
      ) {
        setError("");
      } else {
        setError(
          "Desktop notification permission was not granted."
        );
      }
    } catch {
      setError(
        "Unable to request desktop notification permission."
      );
    }
  }

  function markAllRead() {
    setAlerts(
      (
        current:
          AlertRecord[]
      ) =>
        current.map(
          (
            alert:
              AlertRecord
          ) => ({
            ...alert,

            read: true,
          })
        )
    );
  }

  function markRead(
    id: string
  ) {
    setAlerts(
      (
        current:
          AlertRecord[]
      ) =>
        current.map(
          (
            alert:
              AlertRecord
          ) =>
            alert.id ===
            id
              ? {
                  ...alert,

                  read: true,
                }
              : alert
        )
    );
  }

  function clearAlerts() {
    setAlerts(
      []
    );
  }

  function toggleSetting(
    key:
      | "signal"
      | "lifecycle"
      | "scanner"
      | "market"
  ) {
    setSettings(
      (
        current:
          AlertSettings
      ) => ({
        ...current,

        [key]:
          !current[
            key
          ],
      })
    );
  }

  /*
   * ========================================
   * DERIVED
   * ========================================
   */

  const unreadCount =
    alerts.filter(
      (
        alert:
          AlertRecord
      ) =>
        !alert.read
    ).length;

  const dangerCount =
    alerts.filter(
      (
        alert:
          AlertRecord
      ) =>
        alert.severity ===
        "DANGER"
    ).length;

  const filteredAlerts =
    useMemo(() => {
      switch (
        filter
      ) {
        case "UNREAD":
          return alerts.filter(
            (
              alert:
                AlertRecord
            ) =>
              !alert.read
          );

        case "SIGNAL":
          return alerts.filter(
            (
              alert:
                AlertRecord
            ) =>
              alert.category ===
                "SIGNAL" ||
              alert.category ===
                "LIFECYCLE"
          );

        case "SCANNER":
          return alerts.filter(
            (
              alert:
                AlertRecord
            ) =>
              alert.category ===
              "SCANNER"
          );

        case "MARKET":
          return alerts.filter(
            (
              alert:
                AlertRecord
            ) =>
              alert.category ===
              "MARKET"
          );

        default:
          return alerts;
      }
    }, [
      alerts,
      filter,
    ]);

  return (
    <HiddenAlphaShell>

      <div className="mx-auto max-w-[1700px] px-4 py-5 lg:px-5">

        {/* HEADER */}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

          <div>

            <div className="flex items-center gap-2">

              <h1 className="text-[20px] font-semibold tracking-[-0.03em] text-zinc-100">
                Alerts
              </h1>

              <span className="rounded-md border border-amber-500/10 bg-amber-500/[0.06] px-2 py-1 text-[7px] font-semibold uppercase tracking-[0.12em] text-amber-400">
                Event Monitor
              </span>

            </div>

            <p className="mt-1 text-[9px] text-zinc-600">
              Scanner, signal lifecycle and market-state notifications.
            </p>

          </div>

          <div className="flex flex-wrap items-center gap-2">

            <button
              onClick={
                enableDesktopNotifications
              }
              className={`flex h-9 items-center gap-2 rounded-lg border px-3 text-[8px] transition ${
                settings.desktop
                  ? "border-emerald-500/10 bg-emerald-500/[0.05] text-emerald-400"
                  : "border-white/[0.055] bg-[#090c12] text-zinc-500 hover:text-zinc-300"
              }`}
            >

              <Bell
                size={11}
              />

              {settings.desktop
                ? "Desktop Enabled"
                : "Enable Desktop"}

            </button>

            <button
              onClick={() =>
                syncAlerts(
                  true
                )
              }
              disabled={
                refreshing
              }
              className="flex h-9 items-center gap-2 rounded-lg border border-white/[0.055] bg-[#090c12] px-3 text-[8px] text-zinc-500 transition hover:text-zinc-300"
            >

              <RefreshCw
                size={11}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />

              Check Now

            </button>

          </div>

        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/10 bg-red-500/[0.04] px-4 py-3 text-[8px] text-red-400">
            {error}
          </div>
        )}

        {/* SUMMARY */}

        <div className="mt-5 grid grid-cols-2 gap-2 xl:grid-cols-4">

          <SummaryCard
            icon={Bell}
            label="Unread"
            value={`${unreadCount}`}
            tone={
              unreadCount >
              0
                ? "amber"
                : "neutral"
            }
          />

          <SummaryCard
            icon={Zap}
            label="Official Signal"
            value={
              activeSignal
                ? `${activeSignal.symbol.replace(
                    "USDT",
                    ""
                  )} ${activeSignal.direction}`
                : "None"
            }
            tone={
              activeSignal
                ? "purple"
                : "neutral"
            }
          />

          <SummaryCard
            icon={Radar}
            label="Scanner Best"
            value={
              scannerBest &&
              scannerBest.actionable
                ? `${scannerBest.symbol.replace(
                    "USDT",
                    ""
                  )} ${
                    scannerBest.scannerScore ??
                    "—"
                  }`
                : "None"
            }
            tone={
              scannerBest
                ?.actionable
                ? "green"
                : "neutral"
            }
          />

          <SummaryCard
            icon={ShieldAlert}
            label="Risk Events"
            value={`${dangerCount}`}
            tone={
              dangerCount >
              0
                ? "red"
                : "neutral"
            }
          />

        </div>

        {/* SETTINGS */}

        <section className="ha-panel mt-3 p-5">

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

            <div>

              <h2 className="text-[11px] font-medium text-zinc-200">
                Alert Channels
              </h2>

              <p className="mt-1 text-[7px] text-zinc-700">
                Choose which HiddenAlpha events enter this feed.
              </p>

            </div>

            <div className="flex flex-wrap gap-2">

              <SettingToggle
                label="Signals"
                enabled={
                  settings.signal
                }
                onClick={() =>
                  toggleSetting(
                    "signal"
                  )
                }
              />

              <SettingToggle
                label="Lifecycle"
                enabled={
                  settings.lifecycle
                }
                onClick={() =>
                  toggleSetting(
                    "lifecycle"
                  )
                }
              />

              <SettingToggle
                label="Scanner"
                enabled={
                  settings.scanner
                }
                onClick={() =>
                  toggleSetting(
                    "scanner"
                  )
                }
              />

              <SettingToggle
                label="Market"
                enabled={
                  settings.market
                }
                onClick={() =>
                  toggleSetting(
                    "market"
                  )
                }
              />

            </div>

          </div>

        </section>

        {/* FEED */}

        <section className="ha-panel mt-3 overflow-hidden">

          <div className="flex flex-col gap-4 border-b border-white/[0.05] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">

            <div>

              <h2 className="text-[11px] font-medium text-zinc-200">
                Alert Feed
              </h2>

              <p className="mt-0.5 text-[7px] text-zinc-700">
                Persistent in this browser • newest first
              </p>

            </div>

            <div className="flex flex-wrap items-center gap-2">

              {(
                [
                  "ALL",
                  "UNREAD",
                  "SIGNAL",
                  "SCANNER",
                  "MARKET",
                ] as AlertFilter[]
              ).map(
                (
                  item:
                    AlertFilter
                ) => (
                  <button
                    key={
                      item
                    }
                    onClick={() =>
                      setFilter(
                        item
                      )
                    }
                    className={`rounded-lg border px-2.5 py-1.5 text-[6px] font-medium transition ${
                      filter ===
                      item
                        ? "border-violet-500/15 bg-violet-500/[0.07] text-violet-400"
                        : "border-white/[0.04] bg-white/[0.01] text-zinc-700 hover:text-zinc-400"
                    }`}
                  >
                    {item}
                  </button>
                )
              )}

              <div className="mx-1 h-5 w-px bg-white/[0.05]" />

              <button
                onClick={
                  markAllRead
                }
                className="flex items-center gap-1 text-[7px] text-zinc-600 transition hover:text-zinc-300"
              >

                <CheckCheck
                  size={9}
                />

                Read All

              </button>

              <button
                onClick={
                  clearAlerts
                }
                className="flex items-center gap-1 text-[7px] text-zinc-700 transition hover:text-red-400"
              >

                <Trash2
                  size={9}
                />

                Clear

              </button>

            </div>

          </div>

          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center">

              <div className="text-center">

                <RefreshCw
                  size={18}
                  className="mx-auto animate-spin text-violet-400"
                />

                <p className="mt-3 text-[8px] text-zinc-700">
                  Synchronizing alert state...
                </p>

              </div>

            </div>
          ) : filteredAlerts.length ===
            0 ? (
            <div className="flex min-h-[300px] items-center justify-center p-5">

              <div className="max-w-[420px] text-center">

                <Bell
                  size={23}
                  className="mx-auto text-zinc-700"
                />

                <h3 className="mt-4 text-[11px] font-medium text-zinc-400">
                  No alerts in this view
                </h3>

                <p className="mt-2 text-[8px] leading-5 text-zinc-700">
                  HiddenAlpha will surface signal, scanner and market-state changes here.
                </p>

              </div>

            </div>
          ) : (
            <div>

              {filteredAlerts.map(
                (
                  alert:
                    AlertRecord
                ) => (
                  <AlertRow
                    key={
                      alert.id
                    }
                    alert={
                      alert
                    }
                    onRead={() =>
                      markRead(
                        alert.id
                      )
                    }
                  />
                )
              )}

            </div>
          )}

        </section>

        {/* CURRENT STATE */}

        <div className="mt-3 grid gap-3 lg:grid-cols-2">

          <section className="ha-panel p-5">

            <div className="flex items-center gap-2">

              <Zap
                size={12}
                className="text-violet-400"
              />

              <h2 className="text-[10px] font-medium text-zinc-300">
                Current Official Signal
              </h2>

            </div>

            {activeSignal ? (
              <div className="mt-4 rounded-xl border border-violet-500/10 bg-violet-500/[0.025] p-4">

                <div className="flex items-start justify-between">

                  <div>

                    <p className="text-[12px] font-semibold text-zinc-200">
                      {activeSignal.symbol}
                    </p>

                    <p className="mt-1 text-[7px] text-zinc-700">
                      Published signal
                    </p>

                  </div>

                  <DirectionBadge
                    direction={
                      activeSignal.direction
                    }
                  />

                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">

                  <MiniMetric
                    label="Lifecycle"
                    value={
                      activeSignal.lifecyclePhase
                    }
                  />

                  <MiniMetric
                    label="Status"
                    value={
                      activeSignal.status
                    }
                  />

                </div>

              </div>
            ) : (
              <EmptyState
                message="No official signal is currently active."
              />
            )}

          </section>

          <section className="ha-panel p-5">

            <div className="flex items-center gap-2">

              <Radar
                size={12}
                className="text-cyan-400"
              />

              <h2 className="text-[10px] font-medium text-zinc-300">
                Current Scanner Opportunity
              </h2>

            </div>

            {scannerBest &&
            scannerBest.actionable ? (
              <div className="mt-4 rounded-xl border border-cyan-500/10 bg-cyan-500/[0.025] p-4">

                <div className="flex items-start justify-between">

                  <div>

                    <p className="text-[12px] font-semibold text-zinc-200">
                      {scannerBest.symbol}
                    </p>

                    <p className="mt-1 text-[7px] text-zinc-700">
                      Candidate only
                    </p>

                  </div>

                  <DirectionBadge
                    direction={
                      scannerBest.signal
                        ?.direction ===
                      "SHORT"
                        ? "SHORT"
                        : "LONG"
                    }
                  />

                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">

                  <MiniMetric
                    label="Score"
                    value={`${
                      scannerBest.scannerScore ??
                      "—"
                    }`}
                  />

                  <MiniMetric
                    label="Confidence"
                    value={
                      scannerBest.signal
                        ?.confidence !==
                      undefined
                        ? `${scannerBest.signal.confidence}%`
                        : "—"
                    }
                  />

                  <MiniMetric
                    label="Freshness"
                    value={
                      scannerBest.freshness
                        ?.status ??
                      "—"
                    }
                  />

                </div>

              </div>
            ) : (
              <EmptyState
                message="No actionable scanner candidate right now."
              />
            )}

          </section>

        </div>

        {/* POLICY */}

        <div className="mt-3 flex items-start gap-3 rounded-xl border border-white/[0.05] bg-white/[0.01] p-4">

          <ShieldCheck
            size={11}
            className="mt-0.5 shrink-0 text-emerald-400"
          />

          <p className="text-[7px] leading-4 text-zinc-700">
            Alerts v1 is an in-app monitoring layer. Alert history is stored locally in this browser. Desktop notifications require browser permission and are not guaranteed 24/7 delivery. Persistent background notification delivery will require a server-side worker or scheduler.
          </p>

        </div>

        {lastChecked && (
          <p className="mt-3 text-right text-[6px] text-zinc-800">
            Last alert check{" "}
            {lastChecked.toLocaleTimeString()}
          </p>
        )}

      </div>

    </HiddenAlphaShell>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: typeof Activity;

  label: string;

  value: string;

  tone?:
    | "neutral"
    | "green"
    | "red"
    | "purple"
    | "amber";
}) {
  const className =
    tone === "green"
      ? "text-emerald-400"
      : tone === "red"
      ? "text-red-400"
      : tone === "purple"
      ? "text-violet-400"
      : tone === "amber"
      ? "text-amber-400"
      : "text-zinc-300";

  return (
    <div className="rounded-xl border border-white/[0.055] bg-[#090c12] p-3">

      <div className="flex items-center gap-2">

        <Icon
          size={11}
          className="text-zinc-700"
        />

        <span className="text-[7px] uppercase tracking-[0.1em] text-zinc-700">
          {label}
        </span>

      </div>

      <p
        className={`mt-2 text-[10px] font-medium ${className}`}
      >
        {value}
      </p>

    </div>
  );
}

function SettingToggle({
  label,
  enabled,
  onClick,
}: {
  label: string;

  enabled: boolean;

  onClick: () => void;
}) {
  return (
    <button
      onClick={
        onClick
      }
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[7px] transition ${
        enabled
          ? "border-emerald-500/10 bg-emerald-500/[0.05] text-emerald-400"
          : "border-white/[0.05] bg-white/[0.01] text-zinc-700"
      }`}
    >

      <span
        className={`h-1.5 w-1.5 rounded-full ${
          enabled
            ? "bg-emerald-400"
            : "bg-zinc-700"
        }`}
      />

      {label}

    </button>
  );
}

function AlertRow({
  alert,
  onRead,
}: {
  alert: AlertRecord;

  onRead: () => void;
}) {
  const severityClass =
    alert.severity ===
    "SUCCESS"
      ? "text-emerald-400"
      : alert.severity ===
        "DANGER"
      ? "text-red-400"
      : alert.severity ===
        "WARNING"
      ? "text-amber-400"
      : "text-violet-400";

  const SeverityIcon =
    alert.severity ===
    "SUCCESS"
      ? CheckCircle2
      : alert.severity ===
        "DANGER"
      ? XCircle
      : alert.severity ===
        "WARNING"
      ? ShieldAlert
      : Activity;

  return (
    <button
      onClick={
        onRead
      }
      className={`flex w-full items-start gap-4 border-b border-white/[0.035] px-5 py-4 text-left transition last:border-0 hover:bg-white/[0.012] ${
        alert.read
          ? "opacity-55"
          : ""
      }`}
    >

      <div
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.04] bg-white/[0.015] ${severityClass}`}
      >

        <SeverityIcon
          size={12}
        />

      </div>

      <div className="min-w-0 flex-1">

        <div className="flex flex-wrap items-center gap-2">

          <p className="text-[9px] font-medium text-zinc-300">
            {alert.title}
          </p>

          <span className="rounded bg-white/[0.025] px-1.5 py-0.5 text-[6px] font-medium uppercase tracking-[0.08em] text-zinc-700">
            {alert.category}
          </span>

          {alert.symbol && (
            <span className="text-[6px] font-medium text-violet-400">
              {alert.symbol}
            </span>
          )}

          {!alert.read && (
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
          )}

        </div>

        <p className="mt-1.5 max-w-[900px] text-[7px] leading-4 text-zinc-600">
          {alert.message}
        </p>

      </div>

      <div className="shrink-0 text-right">

        <Clock3
          size={8}
          className="ml-auto text-zinc-800"
        />

        <p className="mt-1 text-[6px] text-zinc-800">
          {formatTime(
            alert.createdAt
          )}
        </p>

      </div>

    </button>
  );
}

function DirectionBadge({
  direction,
}: {
  direction:
    | "LONG"
    | "SHORT";
}) {
  if (
    direction ===
    "LONG"
  ) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/10 bg-emerald-500/[0.05] px-2 py-1 text-[7px] font-medium text-emerald-400">

        <TrendingUp
          size={8}
        />

        LONG

      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-red-500/10 bg-red-500/[0.05] px-2 py-1 text-[7px] font-medium text-red-400">

      <TrendingDown
        size={8}
      />

      SHORT

    </span>
  );
}

function MiniMetric({
  label,
  value,
}: {
  label: string;

  value: string;
}) {
  return (
    <div className="rounded-lg border border-white/[0.04] bg-white/[0.01] p-3">

      <p className="text-[6px] uppercase tracking-[0.08em] text-zinc-700">
        {label}
      </p>

      <p className="mt-2 text-[8px] font-medium text-zinc-400">
        {value}
      </p>

    </div>
  );
}

function EmptyState({
  message,
}: {
  message: string;
}) {
  return (
    <div className="mt-4 flex min-h-[130px] items-center justify-center rounded-xl border border-dashed border-white/[0.05]">

      <div className="text-center">

        <Database
          size={15}
          className="mx-auto text-zinc-800"
        />

        <p className="mt-2 text-[7px] text-zinc-700">
          {message}
        </p>

      </div>

    </div>
  );
}
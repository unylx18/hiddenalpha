/**
 * Hidden Alpha V2 personal journal: complete CLOSED linear trades only.
 * No browser API or backend dependencies in this module.
 * Crypto USDT P&L is treated as USD-equivalent for display (not FX-converted).
 * Forex quantities are base units; XAUUSD quantities are troy ounces.
 */
export const JOURNAL_STORAGE_KEY = "hiddenalpha:v2:journal:closed-trades";
export const JOURNAL_MAX_TRADES = 2000;
export const JOURNAL_CSV_COLUMNS = [
  "id", "symbol", "direction", "quantity", "entry", "exit",
  "feesUsd", "openedAt", "closedAt", "riskUsd", "notes",
] as const;

export const JOURNAL_SYMBOLS = [
  "BTCUSDT", "ETHUSDT", "SOLUSDT", "XAUUSD", "EURUSD", "GBPUSD",
] as const;

export type JournalSymbol = (typeof JOURNAL_SYMBOLS)[number];
export type JournalDirection = "LONG" | "SHORT";
export type ClosedTrade = {
  id: string;
  symbol: JournalSymbol;
  direction: JournalDirection;
  quantity: number;
  entry: number;
  exit: number;
  feesUsd: number;
  openedAt: string;
  closedAt: string;
  riskUsd: number | null;
  notes: string;
};

const symbolSet = new Set<string>(JOURNAL_SYMBOLS);

function finitePositive(v: unknown, label: string): asserts v is number {
  if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) {
    throw new Error(label + " must be a positive finite number.");
  }
}
function finiteNonnegative(v: unknown, label: string): asserts v is number {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0) {
    throw new Error(label + " must be a nonnegative finite number.");
  }
}
function validTimestamp(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value) ||
      !Number.isFinite(Date.parse(value))) {
    throw new Error(label + " must be a valid ISO datetime.");
  }
}

export function validateClosedTrade(trade: unknown): ClosedTrade {
  if (!trade || typeof trade !== "object") throw new Error("Trade must be an object.");
  const t = trade as Record<string, unknown>;
  if (typeof t.id !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(t.id)) {
    throw new Error("Trade ID must contain 1–100 letters, digits, hyphens or underscores.");
  }
  if (typeof t.symbol !== "string" || !symbolSet.has(t.symbol)) {
    throw new Error("Unsupported symbol.");
  }
  if (t.direction !== "LONG" && t.direction !== "SHORT") {
    throw new Error("Direction must be LONG or SHORT.");
  }
  finitePositive(t.quantity, "Quantity");
  finitePositive(t.entry, "Entry");
  finitePositive(t.exit, "Exit");
  finiteNonnegative(t.feesUsd, "Fees");
  if (t.riskUsd !== null) finitePositive(t.riskUsd, "Initial risk");
  validTimestamp(t.openedAt, "Opened at");
  validTimestamp(t.closedAt, "Closed at");
  if (Date.parse(t.closedAt) < Date.parse(t.openedAt)) {
    throw new Error("Close time cannot precede open time.");
  }
  if (Date.parse(t.closedAt) > Date.now() + 300_000) {
    throw new Error("Closed time cannot be in the future.");
  }
  if (typeof t.notes !== "string" || t.notes.length > 500) {
    throw new Error("Notes must be text of at most 500 characters.");
  }
  return {
    id: t.id,
    symbol: t.symbol as JournalSymbol,
    direction: t.direction,
    quantity: t.quantity,
    entry: t.entry,
    exit: t.exit,
    feesUsd: t.feesUsd,
    openedAt: new Date(t.openedAt).toISOString(),
    closedAt: new Date(t.closedAt).toISOString(),
    riskUsd: t.riskUsd as number | null,
    notes: t.notes,
  };
}

/** One fully closed trade, not an execution-leg ledger or partial-fill model. */
export function tradeNetPnl(trade: ClosedTrade): number {
  const gross = (trade.exit - trade.entry) *
    (trade.direction === "LONG" ? 1 : -1) * trade.quantity;
  return gross - trade.feesUsd;
}

export type JournalStatistics = {
  totalTrades: number;
  wins: number;
  losses: number;
  breakeven: number;
  winRatePercent: number | null;
  netPnlUsdEquivalent: number;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number | null;
  maxRealizedDrawdownUsd: number;
  totalFeesUsd: number;
  averageTradeUsd: number | null;
  averageR: number | null;
  rSamples: number;
  equityPoints: { id: string; closedAt: string; cumulativePnl: number }[];
};

/** Realized trade P&L drawdown in USD-equivalent, not account-equity drawdown %. */
export function calculateJournalStatistics(trades: ClosedTrade[]): JournalStatistics {
  const sorted = [...trades].sort((a, b) =>
    a.closedAt.localeCompare(b.closedAt) || a.id.localeCompare(b.id)
  );
  let wins = 0, losses = 0, breakeven = 0;
  let grossProfit = 0, grossLoss = 0, totalFeesUsd = 0;
  let running = 0, peak = 0, maxRealizedDrawdownUsd = 0;
  let totalR = 0, rSamples = 0;
  const equityPoints: JournalStatistics["equityPoints"] = [];
  for (const t of sorted) {
    const pnl = tradeNetPnl(t);
    totalFeesUsd += t.feesUsd;
    if (pnl > 0) { wins++; grossProfit += pnl; }
    else if (pnl < 0) { losses++; grossLoss += -pnl; }
    else breakeven++;
    running += pnl;
    peak = Math.max(peak, running);
    maxRealizedDrawdownUsd = Math.max(maxRealizedDrawdownUsd, peak - running);
    if (t.riskUsd !== null && t.riskUsd > 0) {
      rSamples++;
      totalR += pnl / t.riskUsd;
    }
    equityPoints.push({ id: t.id, closedAt: t.closedAt, cumulativePnl: running });
  }
  return {
    totalTrades: sorted.length,
    wins, losses, breakeven,
    winRatePercent: sorted.length ? wins / sorted.length * 100 : null,
    netPnlUsdEquivalent: running,
    grossProfit, grossLoss,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : null,
    maxRealizedDrawdownUsd, totalFeesUsd,
    averageTradeUsd: sorted.length ? running / sorted.length : null,
    averageR: rSamples ? totalR / rSamples : null,
    rSamples, equityPoints,
  };
}

/**
 * Strict RFC4180-style field parser (quotes, CRLF and multiline fields).
 * Entire import is rejected if there is an invalid row. No partial mutations.
 */
export function parseCsvRows(csv: string): string[][] {
  if (csv.length > 2_000_000) throw new Error("CSV is too large.");
  const result: string[][] = [];
  let row: string[] = [], value = "", quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (quoted) {
      if (c === '"') {
        if (csv[i + 1] === '"') { value += '"'; i++; }
        else quoted = false;
      } else value += c;
    } else if (c === '"') {
      if (value.length) throw new Error("Invalid quote inside unquoted CSV field.");
      quoted = true;
    } else if (c === ",") {
      row.push(value); value = "";
    } else if (c === "\r" || c === "\n") {
      if (c === "\r" && csv[i + 1] === "\n") i++;
      row.push(value); value = "";
      if (row.some(x => x.length)) result.push(row);
      row = [];
    } else value += c;
  }
  if (quoted) throw new Error("Unclosed quoted CSV field.");
  row.push(value);
  if (row.some(x => x.length)) result.push(row);
  return result;
}

export function importJournalCsv(csv: string): ClosedTrade[] {
  const rows = parseCsvRows(csv.replace(/^\uFEFF/, ""));
  if (!rows.length) throw new Error("CSV is empty.");
  const header = rows[0];
  if (header.length !== JOURNAL_CSV_COLUMNS.length ||
      JOURNAL_CSV_COLUMNS.some((name, i) => header[i] !== name)) {
    throw new Error("CSV columns must match the Hidden Alpha Journal template exactly.");
  }
  if (rows.length - 1 > JOURNAL_MAX_TRADES) throw new Error("CSV exceeds the maximum trade count.");
  const records: ClosedTrade[] = [], seen = new Set<string>();
  for (let index = 1; index < rows.length; index++) {
    const columns = rows[index];
    if (columns.length !== JOURNAL_CSV_COLUMNS.length) {
      throw new Error("CSV row " + (index + 1) + " has an incorrect number of fields.");
    }
    const values = Object.fromEntries(JOURNAL_CSV_COLUMNS.map((key, i) => [key, columns[i]]));
    const numberField = (key: string, nullable = false): number | null => {
      if (nullable && values[key].trim() === "") return null;
      if (!values[key].trim()) throw new Error("CSV row " + (index + 1) + " missing " + key);
      return Number(values[key]);
    };
    try {
      const t = validateClosedTrade({
        ...values,
        quantity: numberField("quantity"),
        entry: numberField("entry"),
        exit: numberField("exit"),
        feesUsd: numberField("feesUsd"),
        riskUsd: numberField("riskUsd", true),
      });
      if (seen.has(t.id)) throw new Error("Duplicate trade ID in imported CSV.");
      seen.add(t.id);
      records.push(t);
    } catch (error) {
      throw new Error("CSV row " + (index + 1) + ": " +
        (error instanceof Error ? error.message : "Invalid trade"));
    }
  }
  return records;
}

/** Escape spreadsheet formula execution in user-controlled text fields. */
function csvCell(value: string | number | null): string {
  const raw = value == null ? "" : String(value);
  const safe = /^[=+@\-\t\r\n]/.test(raw) ? "'" + raw : raw;
  return '"' + safe.replace(/"/g, '""') + '"';
}

export function exportJournalCsv(trades: ClosedTrade[]): string {
  const rows = trades.map(t => JOURNAL_CSV_COLUMNS.map(key => csvCell(t[key])).join(","));
  return [JOURNAL_CSV_COLUMNS.join(","), ...rows].join("\r\n") + "\r\n";
}

export function decodeJournalStorage(raw: string): ClosedTrade[] {
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed) || parsed.length > JOURNAL_MAX_TRADES) {
    throw new Error("Stored journal is invalid or too large.");
  }
  const rows = parsed.map(validateClosedTrade);
  if (new Set(rows.map(t => t.id)).size !== rows.length) {
    throw new Error("Stored journal contains duplicate IDs.");
  }
  return rows;
}

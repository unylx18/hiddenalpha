/**
 * Hidden Alpha V2: manually marked LONG, spot-like holdings only.
 *
 * No exchange/broker credentials or database access. No leverage/shorts.
 * Market marks, cost basis and cash are USER-SUPPLIED, not live quotes.
 * BTCUSDT/ETHUSDT/SOLUSDT are treated as USD-equivalent for display only;
 * this is not a USDT/USD FX conversion or a perp P&L calculator.
 */
export const PORTFOLIO_STORAGE_KEY = "hiddenalpha:v2:portfolio:manual-v1";
export const PORTFOLIO_UPDATE_EVENT = "hiddenalpha:v2:portfolio-updated";
export const PORTFOLIO_MAX_HOLDINGS = 200;
export const PORTFOLIO_CSV_COLUMNS = [
  "id", "symbol", "quantity", "costPerUnitUsd", "markPerUnitUsd", "markedAt",
] as const;
export const PORTFOLIO_SYMBOLS = [
  "BTCUSDT", "ETHUSDT", "SOLUSDT", "XAUUSD", "EURUSD", "GBPUSD",
] as const;

export type PortfolioSymbol = (typeof PORTFOLIO_SYMBOLS)[number];
export type TrackedHolding = {
  id: string;
  symbol: PortfolioSymbol;
  /** BTC/ETH/SOL: asset units; Gold: troy ounces; EUR/GBP: base currency units. */
  quantity: number;
  costPerUnitUsd: number;
  markPerUnitUsd: number;
  markedAt: string;
};
export type ManualPortfolio = {
  version: 1;
  cashUsd: number;
  holdings: TrackedHolding[];
};
export const EMPTY_PORTFOLIO: ManualPortfolio = {
  version: 1, cashUsd: 0, holdings: [],
};
const symbols = new Set<string>(PORTFOLIO_SYMBOLS);

function assertPositive(value: unknown, label: string): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(label + " must be a finite number greater than zero.");
  }
}
function assertNonnegative(value: unknown, label: string): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(label + " must be a nonnegative finite number.");
  }
}
function checkTimestamp(value: unknown): asserts value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value) ||
      !Number.isFinite(Date.parse(value))) {
    throw new Error("Mark timestamp must be a valid ISO datetime.");
  }
  if (Date.parse(value) > Date.now() + 300_000) {
    throw new Error("Mark timestamp cannot be in the future.");
  }
}
export function validateTrackedHolding(value: unknown): TrackedHolding {
  if (!value || typeof value !== "object") throw new Error("Holding must be an object.");
  const item = value as Record<string, unknown>;
  if (typeof item.id !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(item.id)) {
    throw new Error("Holding ID must contain 1–100 letters, digits, hyphens or underscores.");
  }
  if (typeof item.symbol !== "string" || !symbols.has(item.symbol)) {
    throw new Error("Unsupported holding symbol.");
  }
  assertPositive(item.quantity, "Holding quantity");
  assertPositive(item.costPerUnitUsd, "Average cost per unit");
  assertPositive(item.markPerUnitUsd, "Manual mark price per unit");
  checkTimestamp(item.markedAt);
  const cost = item.quantity * item.costPerUnitUsd;
  const valueUsd = item.quantity * item.markPerUnitUsd;
  if (!Number.isFinite(cost) || !Number.isFinite(valueUsd) || valueUsd > 1e15 || cost > 1e15) {
    throw new Error("Holding notional is outside supported limits.");
  }
  return {
    id: item.id,
    symbol: item.symbol as PortfolioSymbol,
    quantity: item.quantity,
    costPerUnitUsd: item.costPerUnitUsd,
    markPerUnitUsd: item.markPerUnitUsd,
    markedAt: new Date(item.markedAt).toISOString(),
  };
}
export function validateManualPortfolio(value: unknown): ManualPortfolio {
  if (!value || typeof value !== "object") throw new Error("Portfolio must be an object.");
  const input = value as Record<string, unknown>;
  if (input.version !== 1) throw new Error("Unsupported portfolio data version.");
  assertNonnegative(input.cashUsd, "Cash balance");
  if (input.cashUsd > 1e15) throw new Error("Cash balance exceeds supported limit.");
  if (!Array.isArray(input.holdings) || input.holdings.length > PORTFOLIO_MAX_HOLDINGS) {
    throw new Error("Portfolio holdings must be an array with at most 200 entries.");
  }
  const holdings = input.holdings.map(validateTrackedHolding);
  if (new Set(holdings.map(h => h.id)).size !== holdings.length) {
    throw new Error("Portfolio contains duplicate IDs.");
  }
  return { version: 1, cashUsd: input.cashUsd, holdings };
}
export function decodeManualPortfolio(raw: string): ManualPortfolio {
  return validateManualPortfolio(JSON.parse(raw) as unknown);
}

export type HoldingAnalytics = TrackedHolding & {
  costBasisUsd: number;
  markedValueUsd: number;
  unrealizedPnlUsd: number;
  unrealizedReturnPercent: number;
  allocationPercent: number;
};
export type PortfolioAnalytics = {
  holdingCount: number;
  cashUsd: number;
  markedHoldingsValueUsd: number;
  markedPortfolioValueUsd: number;
  costBasisUsd: number;
  unrealizedPnlUsd: number;
  unrealizedReturnPercent: number | null;
  cashAllocationPercent: number | null;
  holdings: HoldingAnalytics[];
  instrumentAllocations: {
    symbol: PortfolioSymbol;
    markedValueUsd: number;
    percent: number;
  }[];
};
export function calculatePortfolioAnalytics(input: ManualPortfolio): PortfolioAnalytics {
  const portfolio = validateManualPortfolio(input);
  const provisional = portfolio.holdings.map(holding => {
    const costBasisUsd = holding.quantity * holding.costPerUnitUsd;
    const markedValueUsd = holding.quantity * holding.markPerUnitUsd;
    const unrealizedPnlUsd = markedValueUsd - costBasisUsd;
    return { ...holding, costBasisUsd, markedValueUsd, unrealizedPnlUsd,
      unrealizedReturnPercent: (unrealizedPnlUsd / costBasisUsd) * 100 };
  });
  const markedHoldingsValueUsd = provisional.reduce((acc,x) => acc+x.markedValueUsd,0);
  const markedPortfolioValueUsd = markedHoldingsValueUsd + portfolio.cashUsd;
  const costBasisUsd = provisional.reduce((acc,x)=>acc+x.costBasisUsd,0);
  const unrealizedPnlUsd = provisional.reduce((acc,x)=>acc+x.unrealizedPnlUsd,0);
  if (![markedHoldingsValueUsd,markedPortfolioValueUsd,costBasisUsd,unrealizedPnlUsd].every(Number.isFinite) ||
      markedPortfolioValueUsd > 1e15) {
    throw new Error("Portfolio aggregate exceeds supported limits.");
  }
  const holdings = provisional.map(x => ({
    ...x,
    allocationPercent: markedPortfolioValueUsd > 0 ?
      x.markedValueUsd / markedPortfolioValueUsd * 100 : 0,
  })).sort((a,b)=>b.markedValueUsd-a.markedValueUsd);
  const bySymbol = new Map<PortfolioSymbol,number>();
  for (const h of holdings) bySymbol.set(h.symbol,(bySymbol.get(h.symbol)??0)+h.markedValueUsd);
  const instrumentAllocations = [...bySymbol.entries()].map(([symbol,value])=>({
    symbol, markedValueUsd:value, percent: markedPortfolioValueUsd>0 ? value/markedPortfolioValueUsd*100 : 0,
  })).sort((a,b)=>b.markedValueUsd-a.markedValueUsd);
  return {
    holdingCount: holdings.length,
    cashUsd:portfolio.cashUsd,
    markedHoldingsValueUsd,
    markedPortfolioValueUsd,
    costBasisUsd,
    unrealizedPnlUsd,
    unrealizedReturnPercent: costBasisUsd ? unrealizedPnlUsd/costBasisUsd*100 : null,
    cashAllocationPercent: markedPortfolioValueUsd ? portfolio.cashUsd/markedPortfolioValueUsd*100 : null,
    holdings,instrumentAllocations,
  };
}

/* Dedicated portfolio CSV format: import is all-or-nothing. No journal data is mutated. */
/** Parse the small dedicated portfolio CSV with RFC4180 quoting and CRLF support. */
function parsePortfolioCsvRows(csv: string): string[][] {
  if (csv.length > 2_000_000) throw new Error("Portfolio CSV exceeds 2 MB.");
  const rows: string[][] = [];
  let row: string[] = [], field = "", quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    if (quoted) {
      if (ch === '"') {
        if (csv[i + 1] === '"') {field += '"'; i++;}
        else quoted = false;
      } else field += ch;
    } else if (ch === '"') {
      if (field.length > 0) throw new Error("Invalid quote in unquoted field.");
      quoted = true;
    } else if (ch === ",") {
      row.push(field); field = "";
    } else if (ch === "\r" || ch === "\n") {
      if (ch === "\r" && csv[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some(x=>x.length>0)) rows.push(row);
      row = [];
    } else field += ch;
  }
  if (quoted) throw new Error("CSV contains an unclosed quoted value.");
  row.push(field);
  if (row.some(x=>x.length>0)) rows.push(row);
  return rows;
}
function escapeCsv(value: string|number) {
  const text = String(value);
  const safe = /^[=+@\-\t\r\n]/.test(text) ? "'"+text : text;
  return '"'+safe.replace(/"/g,'""')+'"';
}
export function exportHoldingsCsv(holdings: TrackedHolding[]): string {
  const valid = validateManualPortfolio({version:1,cashUsd:0,holdings});
  return [
    PORTFOLIO_CSV_COLUMNS.join(","),
    ...valid.holdings.map(h=>PORTFOLIO_CSV_COLUMNS.map(k=>escapeCsv(h[k])).join(",")),
  ].join("\r\n")+"\r\n";
}
export function importHoldingsCsv(text: string): TrackedHolding[] {
  const rows = parsePortfolioCsvRows(text.replace(/^\uFEFF/,""));
  if (!rows.length || rows[0].length!==PORTFOLIO_CSV_COLUMNS.length ||
      PORTFOLIO_CSV_COLUMNS.some((column,index)=>rows[0][index]!==column)) {
    throw new Error("Portfolio CSV header must match the Hidden Alpha template.");
  }
  if (rows.length-1>PORTFOLIO_MAX_HOLDINGS) throw new Error("Too many holdings in portfolio CSV.");
  const parsed: TrackedHolding[] = [];
  for (let i=1;i<rows.length;i++){
    const cols=rows[i];
    if(cols.length!==PORTFOLIO_CSV_COLUMNS.length) throw new Error("Portfolio CSV row "+(i+1)+" has invalid column count.");
    try {
      parsed.push(validateTrackedHolding({
        id:cols[0],symbol:cols[1],
        quantity:cols[2].trim()?Number(cols[2]):NaN,
        costPerUnitUsd:cols[3].trim()?Number(cols[3]):NaN,
        markPerUnitUsd:cols[4].trim()?Number(cols[4]):NaN,
        markedAt:cols[5],
      }));
    }catch(error){
      throw new Error("Portfolio CSV row "+(i+1)+": "+(error instanceof Error?error.message:"Invalid holding."));
    }
  }
  if(new Set(parsed.map(x=>x.id)).size!==parsed.length) throw new Error("Portfolio CSV contains duplicate holding IDs.");
  return parsed;
}

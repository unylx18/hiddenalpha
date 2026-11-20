export type Market = "crypto" | "forex";
export type SymbolKey = "BTCUSDT" | "ETHUSDT" | "SOLUSDT" | "XAUUSD" | "EURUSD" | "GBPUSD";

/**
 * This file contains display metadata ONLY.
 * Never put prices, P&L, market biases or confidence placeholders here.
 */
export type Instrument = {
  name: string;
  market: Market;
  icon: string;
  color: string;
  venue: string;
};

export const instruments: Record<SymbolKey, Instrument> = {
  BTCUSDT: { name: "Bitcoin Perpetual", market: "crypto", icon: "₿", color: "#f59e0b", venue: "Bybit" },
  ETHUSDT: { name: "Ethereum Perpetual", market: "crypto", icon: "◆", color: "#818cf8", venue: "Bybit" },
  SOLUSDT: { name: "Solana Perpetual", market: "crypto", icon: "≋", color: "#34d399", venue: "Bybit" },
  XAUUSD: { name: "Gold / US Dollar", market: "forex", icon: "◈", color: "#eab308", venue: "OANDA (chart)" },
  EURUSD: { name: "Euro / US Dollar", market: "forex", icon: "€", color: "#3b82f6", venue: "OANDA (chart)" },
  GBPUSD: { name: "Pound / US Dollar", market: "forex", icon: "£", color: "#a78bfa", venue: "OANDA (chart)" },
};

export const order: SymbolKey[] = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XAUUSD", "EURUSD", "GBPUSD"];
export const timeframes = ["1m", "3m", "5m", "15m", "1h", "4h", "1d"];
export const panel = "rounded-xl border border-[#184458] bg-[linear-gradient(145deg,#092132,#061522)]";

export function number(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: value < 10 ? 5 : 2,
    maximumFractionDigits: value < 10 ? 5 : 2,
  });
}

/** Single allowlist shared by terminal, V2 analysis, watchlist and scanner. */
export const CRYPTO_SYMBOLS = [
  "BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT",
  "BNBUSDT", "DOGEUSDT", "ADAUSDT", "AVAXUSDT",
  "LINKUSDT", "SUIUSDT", "LTCUSDT", "DOTUSDT",
] as const;
export type CryptoSymbol = (typeof CRYPTO_SYMBOLS)[number];
export const FOREX_SYMBOLS = ["XAUUSD","EURUSD","GBPUSD"] as const;
export type ForexSymbol = (typeof FOREX_SYMBOLS)[number];
export function isCryptoSymbol(value:string):value is CryptoSymbol {
  return CRYPTO_SYMBOLS.some(id=>id===value);
}

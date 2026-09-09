export type IndicatorResult = {
  symbol: string;
  timeframe: string;
  timestamp: string;

  price: number;

  ema20: number | null;
  ema50: number | null;
  ema200: number | null;

  rsi14: number | null;

  atr14: number | null;
};
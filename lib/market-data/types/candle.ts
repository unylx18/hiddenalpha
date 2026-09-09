export type NormalizedCandle = {
  marketId: string;
  symbol: string;
  exchange: string;
  marketType: "SPOT" | "PERPETUAL";

  timeframe: string;
  timestamp: string;

  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
};
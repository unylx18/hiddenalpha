export const BYBIT_TIMEFRAME_MAP: Record<string, string> = {
  "1m": "1",
  "3m": "3",
  "5m": "5",
  "15m": "15",
  "30m": "30",
  "1h": "60",
  "2h": "120",
  "4h": "240",
  "6h": "360",
  "12h": "720",
  "1d": "D",
  "1w": "W",
  "1M": "M",
};

export function getBybitTimeframe(timeframe: string): string {
  const mappedTimeframe = BYBIT_TIMEFRAME_MAP[timeframe];

  if (!mappedTimeframe) {
    throw new Error(`Unsupported Bybit timeframe: ${timeframe}`);
  }

  return mappedTimeframe;
}
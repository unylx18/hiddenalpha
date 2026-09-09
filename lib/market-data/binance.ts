const BINANCE_API_URL = "https://api.binance.com";

export type BinanceKline = {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
};

export async function getBinanceKlines(
  symbol: string,
  interval: string = "1m",
  limit: number = 100
): Promise<BinanceKline[]> {
  const url = new URL("/api/v3/klines", BINANCE_API_URL);

  url.searchParams.set("symbol", symbol);
  url.searchParams.set("interval", interval);
  url.searchParams.set("limit", String(limit));

  const response = await fetch(url.toString(), {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Binance API error: ${response.status}`);
  }

  const data = await response.json();

  return data.map((item: unknown[]) => ({
    openTime: item[0] as number,
    open: item[1] as string,
    high: item[2] as string,
    low: item[3] as string,
    close: item[4] as string,
    volume: item[5] as string,
  }));
}
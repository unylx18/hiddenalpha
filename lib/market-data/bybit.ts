const BYBIT_API_URL = "https://api.bybit.id";

export type BybitKline = {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
};

export async function getBybitKlines(
  symbol: string,
  interval: string = "1",
  limit: number = 100,
  endTime?: number
): Promise<BybitKline[]> {
  const url = new URL(
    "/v5/market/kline",
    BYBIT_API_URL
  );

  url.searchParams.set("category", "linear");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("interval", interval);
  url.searchParams.set(
    "limit",
    String(Math.min(Math.max(limit, 1), 1000))
  );

  if (endTime) {
    url.searchParams.set(
      "end",
      String(endTime)
    );
  }

  const response = await fetch(
    url.toString(),
    {
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Bybit API error: ${response.status}`
    );
  }

  const result = await response.json();

  if (result.retCode !== 0) {
    throw new Error(
      result.retMsg ||
        "Bybit API error"
    );
  }

  return (result.result.list ?? []).map(
    (item: string[]) => ({
      openTime: Number(item[0]),
      open: item[1],
      high: item[2],
      low: item[3],
      close: item[4],
      volume: item[5],
    })
  );
}
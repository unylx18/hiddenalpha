const BYBIT_API_URL = "https://api.bybit.id";

export type BybitTicker = {
  symbol: string;
  lastPrice: number;
  price24hChange: number;
  bidPrice: number;
  askPrice: number;
  markPrice: number;
};

export async function getBybitTicker(
  symbol: string
): Promise<BybitTicker> {
  const url = new URL(
    "/v5/market/tickers",
    BYBIT_API_URL
  );

  url.searchParams.set("category", "linear");
  url.searchParams.set("symbol", symbol);

  const response = await fetch(url.toString(), {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Bybit ticker API error: ${response.status}`
    );
  }

  const result = await response.json();

  if (result.retCode !== 0) {
    throw new Error(
      result.retMsg || "Bybit ticker API error"
    );
  }

  const ticker = result.result.list?.[0];

  if (!ticker) {
    throw new Error(
      `Ticker ${symbol} not found`
    );
  }

  return {
    symbol: ticker.symbol,
    lastPrice: Number(ticker.lastPrice),
    price24hChange: Number(ticker.price24hPcnt) * 100,
    bidPrice: Number(ticker.bid1Price),
    askPrice: Number(ticker.ask1Price),
    markPrice: Number(ticker.markPrice),
  };
}
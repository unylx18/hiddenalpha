export type BybitLiveTicker = {
  symbol: string;
  lastPrice: number;
  price24hChange: number;
  markPrice: number | null;
  indexPrice: number | null;
  bidPrice: number | null;
  askPrice: number | null;
  high24h: number | null;
  low24h: number | null;
  volume24h: number | null;
  openInterest: number | null;
  timestamp: number;
};

type BybitTickerMessage = {
  topic?: string;
  type?: string;
  ts?: number;
  data?: {
    symbol?: string;
    lastPrice?: string;
    price24hPcnt?: string;
    markPrice?: string;
    indexPrice?: string;
    bid1Price?: string;
    ask1Price?: string;
    highPrice24h?: string;
    lowPrice24h?: string;
    volume24h?: string;
    openInterest?: string;
  };
};

const BYBIT_WS_URL =
  "wss://stream.bybit.id/v5/public/linear";

function toNumber(
  value: string | undefined
): number | null {
  if (!value) return null;

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

export function createBybitTickerSocket(
  symbols: string[],
  onTicker: (
    ticker: BybitLiveTicker
  ) => void,
  onStatus?: (
    status:
      | "CONNECTING"
      | "OPEN"
      | "CLOSED"
      | "ERROR"
  ) => void,
  onError?: (error: Error) => void
) {
  if (typeof window === "undefined") {
    throw new Error(
      "Bybit live WebSocket can only run in the browser"
    );
  }

  onStatus?.("CONNECTING");

  const socket =
    new WebSocket(BYBIT_WS_URL);

  socket.onopen = () => {
    onStatus?.("OPEN");

    socket.send(
      JSON.stringify({
        op: "subscribe",
        args: symbols.map(
          (symbol) => `tickers.${symbol}`
        ),
      })
    );
  };

  socket.onmessage = (event) => {
    try {
      const message =
        JSON.parse(
          event.data
        ) as BybitTickerMessage;

      if (
        !message.topic?.startsWith(
          "tickers."
        )
      ) {
        return;
      }

      const data = message.data;

      if (!data?.symbol) {
        return;
      }

      if (!data.lastPrice) {
        return;
      }

      const ticker: BybitLiveTicker = {
        symbol: data.symbol,

        lastPrice: Number(
          data.lastPrice
        ),

        price24hChange:
          Number(
            data.price24hPcnt ?? 0
          ) * 100,

        markPrice: toNumber(
          data.markPrice
        ),

        indexPrice: toNumber(
          data.indexPrice
        ),

        bidPrice: toNumber(
          data.bid1Price
        ),

        askPrice: toNumber(
          data.ask1Price
        ),

        high24h: toNumber(
          data.highPrice24h
        ),

        low24h: toNumber(
          data.lowPrice24h
        ),

        volume24h: toNumber(
          data.volume24h
        ),

        openInterest: toNumber(
          data.openInterest
        ),

        timestamp:
          message.ts ??
          Date.now(),
      };

      if (
        ticker.lastPrice > 0
      ) {
        onTicker(ticker);
      }
    } catch (error) {
      onError?.(
        error instanceof Error
          ? error
          : new Error(
              "Failed to parse Bybit WebSocket message"
            )
      );
    }
  };

  socket.onerror = () => {
    onStatus?.("ERROR");

    onError?.(
      new Error(
        "Bybit WebSocket connection error"
      )
    );
  };

  socket.onclose = () => {
    onStatus?.("CLOSED");
  };

  const heartbeat =
    window.setInterval(() => {
      if (
        socket.readyState ===
        WebSocket.OPEN
      ) {
        socket.send(
          JSON.stringify({
            op: "ping",
          })
        );
      }
    }, 20_000);

  return {
    socket,

    close() {
      window.clearInterval(
        heartbeat
      );

      if (
        socket.readyState ===
          WebSocket.OPEN ||
        socket.readyState ===
          WebSocket.CONNECTING
      ) {
        socket.close();
      }
    },
  };
}
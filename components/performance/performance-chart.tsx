"use client";

import { useEffect, useRef, useState } from "react";
import {
  ColorType,
  createChart,
  LineSeries,
} from "lightweight-charts";

type HistoryPoint = {
  tradeNumber: number;
  realizedR: number;
  cumulativeR: number;
  closedAt: string;
};

export default function PerformanceChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      try {
        const response = await fetch(
          "/api/trading/performance/history"
        );

        const data = await response.json();

        if (data.success) {
          setHistory(data.history);
        }
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, []);

  useEffect(() => {
    if (!chartContainerRef.current || history.length === 0) {
      return;
    }

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: {
          type: ColorType.Solid,
          color: "#080b10",
        },
        textColor: "#71717a",
      },

      grid: {
        vertLines: {
          color: "rgba(255,255,255,0.04)",
        },
        horzLines: {
          color: "rgba(255,255,255,0.04)",
        },
      },

      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.08)",
      },

      timeScale: {
        borderColor: "rgba(255,255,255,0.08)",
      },

      width: chartContainerRef.current.clientWidth,
      height: 300,
    });

    const series = chart.addSeries(LineSeries, {
      lineWidth: 3,
      priceLineVisible: false,
      lastValueVisible: true,
    });

    series.setData(
      history.map((point) => ({
        time: Math.floor(
          new Date(point.closedAt).getTime() / 1000
        ) as any,
        value: point.cumulativeR,
      }))
    );

    chart.timeScale().fitContent();

    const resizeObserver = new ResizeObserver(() => {
      if (!chartContainerRef.current) return;

      chart.applyOptions({
        width: chartContainerRef.current.clientWidth,
      });
    });

    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [history]);

  if (loading) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-zinc-600">
        Loading performance history...
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex h-[300px] flex-col items-center justify-center">
        <p className="text-sm text-zinc-400">
          No performance history yet
        </p>

        <p className="mt-2 text-xs text-zinc-600">
          Completed trades will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div
        ref={chartContainerRef}
        className="h-[300px] w-full"
      />
    </div>
  );
}
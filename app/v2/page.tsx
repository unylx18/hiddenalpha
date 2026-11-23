import type { Metadata } from "next";
import TradingTerminal from "@/components/v2/trading-terminal";

export const metadata: Metadata = {
  title: "Hidden Alpha V2 | Trading Intelligence",
  description: "Read-only crypto and forex market intelligence workspace with verified on-demand analysis and local trading records.",
};

export default function V2Page() {
  return <TradingTerminal />;
}

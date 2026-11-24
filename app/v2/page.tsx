import type { Metadata } from "next";
import TradingTerminal from "@/components/v2/trading-terminal";

export const metadata: Metadata = {
  title: "Market Command Center | Hidden Alpha V2",
  description: "Your market command center: chart intelligence, on-demand market scanner, trading journal, portfolio and risk tools.",
};

export default function V2Page() {
  return <TradingTerminal />;
}

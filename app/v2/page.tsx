import type { Metadata } from "next";
import TradingTerminal from "@/components/v2/trading-terminal";

export const metadata: Metadata = {
  title: "Hidden Alpha V2 | Trading Intelligence",
  description: "A multi-market trading intelligence workspace. V2 is currently an isolated demo prototype.",
};

export default function V2Page() {
  return <TradingTerminal />;
}

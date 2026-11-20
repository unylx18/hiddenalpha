import type { Metadata } from "next";
import V2TradingJournal from "@/components/v2/trading-journal";

export const metadata: Metadata = {
  title: "Trading Journal | Hidden Alpha V2",
  description: "Local-only closed-trade journal with validated CSV import, realized P&L and performance metrics.",
};

export default function JournalPage() {
  return <V2TradingJournal />;
}

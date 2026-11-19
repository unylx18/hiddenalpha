import type { Metadata } from "next";
import V2RiskCalculator from "@/components/v2/risk-calculator";

export const metadata: Metadata = {
  title: "Risk Manager | Hidden Alpha V2",
  description: "Read-only manual position sizing for crypto, forex, and gold. No broker connection required.",
};

export default function RiskPage() {
  return <V2RiskCalculator />;
}

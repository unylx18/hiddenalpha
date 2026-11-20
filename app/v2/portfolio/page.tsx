import type { Metadata } from "next";
import V2Portfolio from "@/components/v2/portfolio-analytics";

export const metadata: Metadata = {
  title: "Portfolio Analytics | Hidden Alpha V2",
  description: "Manually marked long-only holdings and cash with separate realized Trading Journal analytics.",
};

export default function PortfolioPage() {
  return <V2Portfolio />;
}

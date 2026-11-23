import type {Metadata} from "next";
import MarketScanner from "@/components/v2/market-scanner";
export const metadata:Metadata={
  title:"Crypto Market Scanner | Hidden Alpha V2",
  description:"Read-only market context comparison for twelve supported Bybit linear crypto contracts.",
};
export default function ScannerPage(){return <MarketScanner/>;}

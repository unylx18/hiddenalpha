export type Market = "crypto" | "forex";
export type SymbolKey = "BTCUSDT" | "ETHUSDT" | "SOLUSDT" | "XAUUSD" | "EURUSD" | "GBPUSD";
export type Instrument = { name: string; price: number; change: number; market: Market; icon: string; confidence: number; bias: string; color: string };
export const instruments: Record<SymbolKey, Instrument> = {
  BTCUSDT: { name:"Bitcoin", price:92548.60, change:2.48, market:"crypto", icon:"₿", confidence:78, bias:"BULLISH", color:"#f59e0b" },
  ETHUSDT: { name:"Ethereum", price:3147.20, change:1.76, market:"crypto", icon:"◆", confidence:71, bias:"BULLISH", color:"#818cf8" },
  SOLUSDT: { name:"Solana", price:145.32, change:3.21, market:"crypto", icon:"≋", confidence:69, bias:"BULLISH", color:"#34d399" },
  XAUUSD: { name:"Gold / USD", price:2668.40, change:-0.34, market:"forex", icon:"◈", confidence:56, bias:"NEUTRAL", color:"#eab308" },
  EURUSD: { name:"Euro / USD", price:1.08672, change:0.22, market:"forex", icon:"€", confidence:52, bias:"NEUTRAL", color:"#3b82f6" },
  GBPUSD: { name:"Pound / USD", price:1.27094, change:0.20, market:"forex", icon:"£", confidence:62, bias:"BULLISH", color:"#a78bfa" },
};
export const order: SymbolKey[] = ["BTCUSDT","ETHUSDT","XAUUSD","EURUSD","SOLUSDT","GBPUSD"];
export const timeframes = ["1m","3m","5m","15m","1H","4H","1D"];
export const panel = "rounded-xl border border-[#14506a] bg-[linear-gradient(145deg,#092132,#061522)]";
export const number = (v: number) => v.toLocaleString("en-US",{minimumFractionDigits:v<10?5:2,maximumFractionDigits:v<10?5:2});
export const pct = (v: number) => (v>=0?"+":"") + v.toFixed(2) + "%";


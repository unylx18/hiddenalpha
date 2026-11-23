import {CRYPTO_SYMBOLS,type CryptoSymbol,type ForexSymbol} from "@/lib/trading/v2/symbol-registry";

export type Market = "crypto" | "forex";
export type SymbolKey = CryptoSymbol | ForexSymbol;

/** Metadata only; no speculative market price, return or trade signal. */
export type Instrument = {
  name:string;market:Market;icon:string;color:string;venue:string;
};
export const instruments:Record<SymbolKey,Instrument> = {
  BTCUSDT:{name:"Bitcoin Perpetual",market:"crypto",icon:"₿",color:"#f59e0b",venue:"Bybit"},
  ETHUSDT:{name:"Ethereum Perpetual",market:"crypto",icon:"◆",color:"#818cf8",venue:"Bybit"},
  SOLUSDT:{name:"Solana Perpetual",market:"crypto",icon:"≋",color:"#34d399",venue:"Bybit"},
  XRPUSDT:{name:"XRP Perpetual",market:"crypto",icon:"X",color:"#bed8e6",venue:"Bybit"},
  BNBUSDT:{name:"BNB Perpetual",market:"crypto",icon:"⬡",color:"#e7bd46",venue:"Bybit"},
  DOGEUSDT:{name:"Dogecoin Perpetual",market:"crypto",icon:"Ð",color:"#ddaf64",venue:"Bybit"},
  ADAUSDT:{name:"Cardano Perpetual",market:"crypto",icon:"₳",color:"#64b6f6",venue:"Bybit"},
  AVAXUSDT:{name:"Avalanche Perpetual",market:"crypto",icon:"▲",color:"#f17a8b",venue:"Bybit"},
  LINKUSDT:{name:"Chainlink Perpetual",market:"crypto",icon:"⬡",color:"#78a9fa",venue:"Bybit"},
  SUIUSDT:{name:"Sui Perpetual",market:"crypto",icon:"◈",color:"#5fc4f6",venue:"Bybit"},
  LTCUSDT:{name:"Litecoin Perpetual",market:"crypto",icon:"Ł",color:"#a4bace",venue:"Bybit"},
  DOTUSDT:{name:"Polkadot Perpetual",market:"crypto",icon:"●",color:"#f779bc",venue:"Bybit"},
  XAUUSD:{name:"Gold / US Dollar",market:"forex",icon:"◈",color:"#eab308",venue:"OANDA (chart)"},
  EURUSD:{name:"Euro / US Dollar",market:"forex",icon:"€",color:"#3b82f6",venue:"OANDA (chart)"},
  GBPUSD:{name:"Pound / US Dollar",market:"forex",icon:"£",color:"#a78bfa",venue:"OANDA (chart)"},
};
export const order:SymbolKey[]=[...CRYPTO_SYMBOLS,"XAUUSD","EURUSD","GBPUSD"];
export const timeframes=["1m","3m","5m","15m","1h","4h","1d"] as const;
export const panel="rounded-xl border border-[#184458] bg-[linear-gradient(145deg,#092132,#061522)]";
export function number(value:number):string {
  return value.toLocaleString("en-US",{
    minimumFractionDigits:value<10?5:2,maximumFractionDigits:value<10?5:2,
  });
}

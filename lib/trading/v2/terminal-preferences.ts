/** Only view preferences; never cache market prices or user financial records here. */
import {CRYPTO_SYMBOLS,FOREX_SYMBOLS} from "./symbol-registry.ts";
export const TERMINAL_PREFS_KEY="hiddenalpha:v2:terminal-preferences";
export const TERMINAL_TIMEFRAMES=["1m","3m","5m","15m","1h","4h","1d"] as const;
export type TerminalSymbol=(typeof CRYPTO_SYMBOLS)[number]|(typeof FOREX_SYMBOLS)[number];
export type TerminalTimeframe=(typeof TERMINAL_TIMEFRAMES)[number];
export type TerminalPrefs={symbol:TerminalSymbol;timeframe:TerminalTimeframe};
export function parseTerminalPrefs(raw:string|null):TerminalPrefs|null {
  if(!raw||raw.length>300)return null;
  try {
    const value:unknown=JSON.parse(raw);
    if(!value||typeof value!=="object")return null;
    const obj=value as Record<string,unknown>;
    if(typeof obj.symbol!=="string"||typeof obj.timeframe!=="string"||
       ![...CRYPTO_SYMBOLS,...FOREX_SYMBOLS].some(id=>id===obj.symbol)||
       !TERMINAL_TIMEFRAMES.some(tf=>tf===obj.timeframe))return null;
    return {symbol:obj.symbol as TerminalSymbol,timeframe:obj.timeframe as TerminalTimeframe};
  }catch{return null;}
}

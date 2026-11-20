"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  WATCH_SYMBOLS, type WatchSymbol, type VerifiedWatchQuote,
} from "@/lib/trading/v2/market-watch";

export type MarketWatchState = {
  quotes: Partial<Record<WatchSymbol, VerifiedWatchQuote>>;
  loading: boolean;
  unavailable: boolean;
  now: number;
  refresh: () => void;
};

function parseWatchData(input: unknown): Partial<Record<WatchSymbol, VerifiedWatchQuote>> {
  if (!input || typeof input!=="object") throw new Error("Invalid market response");
  const response=input as Record<string,unknown>;
  if (response.success!==true || response.provider!=="bybit-linear" || !Array.isArray(response.items)) {
    throw new Error("Market snapshot unavailable");
  }
  const quotes:Partial<Record<WatchSymbol,VerifiedWatchQuote>>={};
  for(const row of response.items) {
    if(!row||typeof row!=="object")continue;
    const item=row as Record<string,unknown>;
    if(typeof item.symbol!=="string" || !WATCH_SYMBOLS.some(x=>x===item.symbol) ||
       item.provider!=="bybit-linear" || typeof item.price!=="number" ||
       !Number.isFinite(item.price) || item.price<=0 ||
       typeof item.change24hPercent!=="number" ||
       !Number.isFinite(item.change24hPercent) || Math.abs(item.change24hPercent)>10_000 ||
       typeof item.fetchedAt!=="string")continue;
    const timestamp=Date.parse(item.fetchedAt);
    if(!Number.isFinite(timestamp) || timestamp>Date.now()+60_000)continue;
    const series=item.sparkline;
    const sparkline=Array.isArray(series) && series.length>=8 && series.length<=16 &&
      series.every(v=>typeof v==="number"&&Number.isFinite(v)&&v>0)
      ? [...series] as number[] : null;
    quotes[item.symbol as WatchSymbol]={
      symbol:item.symbol as WatchSymbol,
      price:item.price,
      change24hPercent:item.change24hPercent,
      fetchedAt:item.fetchedAt,
      provider:"bybit-linear",
      sparkline,
    };
  }
  if(!Object.keys(quotes).length)throw new Error("No valid public market snapshots");
  return quotes;
}

/** Exactly one 2-minute snapshot polling loop for header and watchlist together. */
export function useMarketWatch():MarketWatchState {
  const [quotes,setQuotes]=useState<Partial<Record<WatchSymbol,VerifiedWatchQuote>>>({});
  const [loading,setLoading]=useState(true);
  const [unavailable,setUnavailable]=useState(false);
  const [now,setNow]=useState(0);
  const activeRef=useRef(true);
  const abortRef=useRef<AbortController|null>(null);
  const runningRef=useRef(false);
  const lastRequestRef=useRef(0);

  const refresh=useCallback(()=>{
    if(runningRef.current || !activeRef.current) return;
    runningRef.current=true;
    lastRequestRef.current=Date.now();
    const abort=new AbortController();
    abortRef.current=abort;
    void (async()=>{
      try {
        const response=await fetch("/api/v2/market/watchlist",{
          cache:"no-store",signal:abort.signal,
        });
        if(!response.ok)throw new Error("Provider unavailable");
        const input:unknown=await response.json();
        const parsed=parseWatchData(input);
        if(abort.signal.aborted||!activeRef.current)return;
        setQuotes(parsed);
        setUnavailable(false);
      }catch{
        if(!abort.signal.aborted&&activeRef.current)setUnavailable(true);
      }finally{
        runningRef.current=false;
        if(activeRef.current){setLoading(false);setNow(Date.now());}
      }
    })();
  },[]);

  useEffect(()=>{
    activeRef.current=true;
    refresh();
    const interval=window.setInterval(()=>{
      setNow(Date.now());
      if(document.visibilityState==="visible")refresh();
    },120_000);
    const clockInterval=window.setInterval(()=>setNow(Date.now()),30_000);
    const onVisibility=()=>{
      if(document.visibilityState==="visible"&&Date.now()-lastRequestRef.current>60_000)
        refresh();
    };
    document.addEventListener("visibilitychange",onVisibility);
    return ()=>{
      activeRef.current=false;
      abortRef.current?.abort();
      window.clearInterval(interval);
      window.clearInterval(clockInterval);
      document.removeEventListener("visibilitychange",onVisibility);
    };
  },[refresh]);

  return {quotes,loading,unavailable,now,refresh};
}

export function quoteIsFresh(quote:VerifiedWatchQuote|undefined,now:number):boolean {
  const at=quote?Date.parse(quote.fetchedAt):NaN;
  return Number.isFinite(at)&&at<=now+60_000 && now-at<180_000;
}

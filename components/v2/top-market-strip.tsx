"use client";

import { useEffect, useState } from "react";
import { AssetBadge } from "./brand";
import { type SymbolKey } from "./instruments";

const PICKS:SymbolKey[] = ["BTCUSDT","ETHUSDT","XAUUSD","EURUSD"];
type MarketSnapshot={price:number;changePercent:number;receivedAt:number};
type SnapshotState=Partial<Record<SymbolKey,MarketSnapshot>>;
function priceText(price:number):string {
  return price.toLocaleString("en-US",{
    maximumFractionDigits:price<10?5:2,
    minimumFractionDigits:price<10?4:2,
  });
}

/**
 * Read-only 24h snapshot. Top bar calls two crypto ticker endpoints on mount,
 * then at most every 2 minutes while visible, never writes market candles.
 * Forex does not claim a price until a verified broker source is connected.
 */
export default function TopMarketStrip({selected,onSelect}:{
  selected:SymbolKey;
  onSelect:(symbol:SymbolKey)=>void;
}) {
  const [quotes,setQuotes]=useState<SnapshotState>({});
  const [clock,setClock]=useState(0);
  useEffect(()=>{
    let active=true;
    const controller=new AbortController();
    async function readSnapshot(symbol:SymbolKey) {
      try {
        const response=await fetch("/api/market/ticker?"+new URLSearchParams({symbol}).toString(),{
          cache:"no-store",signal:controller.signal,
        });
        if(!response.ok) return;
        const input:unknown=await response.json();
        if(!input || typeof input!=="object")return;
        const result=input as Record<string,unknown>;
        const raw=result.ticker;
        if(result.success!==true||!raw||typeof raw!=="object")return;
        const value=raw as Record<string,unknown>;
        if(value.symbol!==symbol||typeof value.lastPrice!=="number"||
            !Number.isFinite(value.lastPrice)||value.lastPrice<=0||
            typeof value.price24hChange!=="number"||!Number.isFinite(value.price24hChange))return;
        if(!active)return;
        const quote:MarketSnapshot={
          price:value.lastPrice,
          changePercent:value.price24hChange,
          receivedAt:Date.now(),
        };
        setQuotes(previous=>({...previous,[symbol]:quote}));
      }catch{
        // No fabricated fallback quote or percent.
      }
    }
    function refresh() {
      if(document.visibilityState!=="visible")return;
      setClock(Date.now());
      void readSnapshot("BTCUSDT");
      void readSnapshot("ETHUSDT");
    }
    refresh();
    const timer=window.setInterval(refresh,120_000);
    return ()=>{active=false;controller.abort();window.clearInterval(timer);};
  },[]);

  return <div aria-label="Market quick selector" className="flex min-w-0 items-center gap-2 overflow-x-auto pb-1">
    {PICKS.map(symbol=>{
      const quote=quotes[symbol];
      const fresh=quote && clock - quote.receivedAt <= 300_000;
      const forex=symbol==="XAUUSD"||symbol==="EURUSD";
      const active=selected===symbol;
      return <button key={symbol} type="button" onClick={()=>onSelect(symbol)}
        title={quote?symbol+" snapshot: "+priceText(quote.price)+" · "+new Date(quote.receivedAt).toLocaleTimeString()+(fresh?"":" (stale)"):"Select "+symbol}
        className={"flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-left transition "+
          (active?"border-[#14c8eb] bg-[#0a344b] shadow-[0_0_15px_rgba(0,194,240,.15)]":
            "border-[#20475d] bg-[#071b29] hover:border-[#138bab]")}>
        <AssetBadge id={symbol} small/>
        <div className="flex flex-col gap-1">
          <strong className="text-[11px] leading-none text-[#e4f7ff]">{symbol}</strong>
          <span className={"text-[10px] leading-none "+
            (!forex&&fresh&&quote?(quote.changePercent>=0?"text-[#1de4ad]":"text-[#ff728a]"):"text-[#83a9bb]")}>
            {forex?"Chart only":fresh&&quote?
              (quote.changePercent>=0?"+":"")+quote.changePercent.toFixed(2)+"% · 24h":quote?"Snapshot stale":"Quote unavailable"}
          </span>
        </div>
      </button>;
    })}
  </div>;
}

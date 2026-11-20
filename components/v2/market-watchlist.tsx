"use client";

import { Activity, RefreshCw } from "lucide-react";
import { Mark, AssetBadge } from "./brand";
import { instruments, order, panel, type SymbolKey } from "./instruments";
import { quoteIsFresh, type MarketWatchState } from "./use-market-watch";

function price(value:number):string {
  return value.toLocaleString("en-US",{
    minimumFractionDigits:value<10?4:2,
    maximumFractionDigits:value<10?5:2,
  });
}

function Sparkline({values,symbol}: {values:number[];symbol:string}) {
  const min=Math.min(...values),max=Math.max(...values);
  const range=Math.max(max-min,Number.EPSILON);
  const points=values.map((v,i)=>
    (3+i/(values.length-1)*94).toFixed(2)+","+
    (25-(v-min)/range*22).toFixed(2)
  ).join(" ");
  const green=values[values.length-1]>=values[0];
  return <svg viewBox="0 0 100 28" aria-label={symbol+" verified completed one-hour candle closing-price trend"} role="img"
    className="h-7 w-[76px] shrink-0" preserveAspectRatio="none">
    <polyline points={points} fill="none"
      stroke={green?"#18daa7":"#ff7a8c"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>;
}

export default function MarketWatchlist({
  watch,selected,onSelect,query,
}:{
  watch:MarketWatchState;
  selected:SymbolKey;
  onSelect:(id:SymbolKey)=>void;
  query:string;
}) {
  // The watchlist includes both markets even if a chart market tab is selected.
  const shown=order.filter(id=>
    !query||id.toLowerCase().includes(query.toLowerCase())||
    instruments[id].name.toLowerCase().includes(query.toLowerCase()));
  return <section className={panel+" flex min-w-0 flex-col p-4"}>
    <div className="flex items-center justify-between gap-2 border-b border-[#1d4359] pb-2">
      <h2 className="flex items-center gap-2 text-[13px] font-bold text-[#e4f7ff]">
        <Activity size={16} className="text-[#20c6ee]"/> Market Watchlist
      </h2>
      <button type="button" onClick={watch.refresh} disabled={watch.loading}
        aria-label="Refresh market watchlist from Bybit"
        title="Refresh snapshot (public Bybit data only)"
        className="rounded-md border border-[#1f516b] p-1.5 text-[#86c5dd] hover:border-[#27b8e0] disabled:opacity-40">
        <RefreshCw size={13} className={watch.loading?"animate-spin":""}/>
      </button>
    </div>
    <div className="mt-1 min-h-[160px]">
      {shown.map(id=>{
        const crypto=instruments[id].market==="crypto";
        const q=crypto?watch.quotes[id as "BTCUSDT"|"ETHUSDT"|"SOLUSDT"]:undefined;
        const fresh=quoteIsFresh(q,watch.now);
        const active=selected===id;
        const change=fresh&&q?q.change24hPercent:null;
        return <button key={id} type="button" onClick={()=>onSelect(id)}
          aria-pressed={active}
          title={crypto?"Bybit linear 24h ticker; sparkline uses completed 1h candles":"TradingView chart; Forex quote not connected"}
          className={"flex w-full min-w-0 items-center gap-2 border-b border-[#16394b] px-1 py-2.5 text-left transition focus-visible:outline-2 focus-visible:outline-[#23bde9] "+
            (active?"bg-[#0b3449]":"hover:bg-[#103348]")}>
          <AssetBadge id={id} small/>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[11px] font-bold text-[#d9eef7]">{id}</span>
            <span className="block truncate text-[9px] text-[#759aac]">{crypto?"Bybit perp · 24h":"Chart only · no quote"}</span>
          </span>
          <span className="min-w-[64px] shrink-0 text-right text-[10px] font-semibold text-[#bdd5e2]">
            {fresh&&q?price(q.price):crypto?watch.loading?"Loading":"—":"—"}
          </span>
          <span className={"min-w-[60px] shrink-0 text-right text-[10px] font-bold "+
            (change==null?"text-[#769bab]":change>=0?"text-[#1edfae]":"text-[#ff8092]")}>
            {change==null?(crypto&&q?"Stale":crypto?"—":"Chart"): (change>=0?"+":"")+change.toFixed(2)+"%"}
          </span>
          <span className="hidden w-[76px] shrink-0 sm:block">
            {fresh&&q?.sparkline&&q.sparkline.length>1
              ?<Sparkline values={q.sparkline} symbol={id}/>
              :<span className="inline-block w-full text-center text-[9px] text-[#507990]">—</span>}
          </span>
        </button>;
      })}
      {!shown.length&&<p className="px-2 py-6 text-center text-[11px] text-[#89abbe]">No symbols found.</p>}
    </div>
    <div className="mt-auto pt-3 text-[9px] leading-4 text-[#789faf]">
      {watch.unavailable?
        <span className="text-[#ffc39a]">Public market feed temporarily unavailable. No substitute prices shown.</span>:
        "Crypto: Bybit public snapshot · 24h change. Sparkline: completed hourly closes. Forex: chart only."}
      <div className="mt-1 text-[#648ca2]">Snapshots refresh while this tab is visible · no background candle sync.</div>
    </div>
  </section>;
}

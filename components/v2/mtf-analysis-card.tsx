"use client";

import { useEffect, useRef, useState } from "react";
import { Layers3, RefreshCw } from "lucide-react";
import { panel, type SymbolKey } from "./instruments";

const FRAMES = ["1h", "4h", "1d"] as const;
const TIME_MS: Record<string, number> = {
  "1h": 3_600_000, "4h": 14_400_000, "1d": 86_400_000,
};
type Bias = "BULLISH" | "BEARISH" | "NEUTRAL";
type MtfItem = {tf: string; bias: Bias | null; expiresAt: number};
type MtfState = {symbol: SymbolKey; loading: boolean; items: MtfItem[]};

/** Explicit request only: three verified, independent 1h/4h/1d provider calls. */
export default function MtfAnalysisCard({symbol, isCrypto}: {symbol: SymbolKey; isCrypto:boolean}) {
  const [state,setState] = useState<MtfState|null>(null);
  const [clock,setClock] = useState(0);
  const request = useRef<AbortController|null>(null);
  const visible = state?.symbol === symbol ? state : null;

  useEffect(()=>()=>request.current?.abort(),[symbol]);
  useEffect(()=>{
    if(!visible || visible.loading) return;
    const timer=window.setInterval(()=>setClock(Date.now()),60_000);
    return ()=>window.clearInterval(timer);
  },[visible]);

  async function refresh() {
    request.current?.abort();
    const next = new AbortController();
    request.current=next;
    setState({symbol,loading:true,items:[]});
    const endpoint=isCrypto?"/api/v2/analysis?":"/api/v2/forex/analysis?";
    const items=await Promise.all(FRAMES.map(async(tf):Promise<MtfItem>=>{
      try {
        const response=await fetch(endpoint+new URLSearchParams({symbol,timeframe:tf}).toString(),{
          cache:"no-store",signal:next.signal,
        });
        if(!response.ok) throw new Error("Provider unavailable");
        const payload:unknown=await response.json();
        if(!payload||typeof payload!=="object")throw new Error("Invalid market data");
        const result=payload as Record<string,unknown>;
        if(result.success!==true || result.provider!==(isCrypto?"bybit":"oanda"))
          throw new Error("Source mismatch");
        const data=result.alpha as Record<string,unknown>|undefined;
        const market=data?.market as Record<string,unknown>|undefined;
        if(data?.symbol!==symbol||data.timeframe!==tf ||
           !market||!["BULLISH","BEARISH","NEUTRAL"].includes(String(market.bias)))
          throw new Error("Invalid context");
        const closed=Date.parse(String(result.lastClosedAt));
        const expiresAt=closed+Math.max(TIME_MS[tf]*2,120_000);
        if(!Number.isFinite(expiresAt)||expiresAt<=Date.now())throw new Error("Stale");
        return {tf,bias:market.bias as Bias,expiresAt};
      }catch{
        return {tf,bias:null,expiresAt:0};
      }
    }));
    if(!next.signal.aborted) {
      setClock(Date.now());
      setState({symbol,loading:false,items});
    }
  }
  return <section className={panel+" flex min-w-0 flex-col border-[#1b6178] px-3 py-3"}>
    <h3 className="flex items-center gap-2 text-[11px] font-semibold text-[#c6e4f0]">
      <Layers3 size={15} className="text-[#8dddf5]"/> Market Bias (MTF)
    </h3>
    <div className="mt-2 space-y-1.5">
      {FRAMES.map(tf=>{
        const item=visible?.items.find(x=>x.tf===tf);
        const bias=item&&item.expiresAt>clock?item.bias:null;
        const color=bias==="BULLISH"?"text-[#20dda9]":bias==="BEARISH"?"text-[#ff7989]":"text-[#9bb7c6]";
        return <div key={tf} className="flex justify-between border-b border-[#1b4356] pb-1 text-[10px]">
          <span className="font-semibold uppercase text-[#a6c7d6]">{tf}</span>
          <span className={"rounded-full bg-[#123548] px-2 font-semibold "+color}>
            {visible?.loading?"···":bias??"—"}
          </span>
        </div>;
      })}
    </div>
    <button type="button" onClick={refresh} disabled={visible?.loading}
      className="mt-auto flex items-center justify-center gap-1.5 pt-2 text-[10px] font-semibold text-[#22d0f8] disabled:opacity-50">
      <RefreshCw size={11} className={visible?.loading?"animate-spin":""}/>
      {visible?.loading?"Checking...":"Check 1H / 4H / 1D"}
    </button>
    <div className="mt-1 text-center text-[9px] text-[#799bab]">On-demand · no polling</div>
  </section>;
}

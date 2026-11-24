"use client";

import {
  BrainCircuit, CircleAlert, Clock3, RefreshCw, ShieldAlert,
  Sparkles, TrendingDown, TrendingUp,
} from "lucide-react";
import { panel, type SymbolKey } from "./instruments";
import type { KeyLevels } from "@/lib/trading/v2/key-levels";

export type VerifiedAlpha = {
  symbol: string;
  timeframe: string;
  timestamp: string;
  market: { bias: "BULLISH" | "BEARISH" | "NEUTRAL"; score: number; confidence: number };
  trend: { direction: string; strength: number };
  momentum: { direction: string; strength: number };
  volume: { condition: string; ratio: number };
  volatility: { level: string; value: number | null; percentage: number | null };
  marketRegime: "BULLISH" | "BEARISH" | "NEUTRAL";
  reasons: string[];
  keyLevels: KeyLevels;
};

export function biasTone(value:string):string {
  if (value==="BULLISH")return "text-[#13dfaa]";
  if (value==="BEARISH")return "text-[#ff7b8e]";
  return "text-[#a5c2d0]";
}
function numericScore(value:number):string {
  return (value>0?"+":"")+value.toFixed(0);
}

export default function AlphaDecisionBrief({
  alpha, stale, loading, error, symbol, timeframe, crypto, onAnalyze,
}:{
  alpha:VerifiedAlpha|null;
  stale:boolean;
  loading:boolean;
  error:string;
  symbol:SymbolKey;
  timeframe:string;
  crypto:boolean;
  onAnalyze:()=>void;
}) {
  const data=alpha&&!stale?alpha:null;
  const bias=data?.market.bias??"NO TRADE";
  const confidence=data?Math.max(0,Math.min(100,data.market.confidence)):null;
  const score=data?.market.score??null;
  const ring=confidence===null?"#1c4255 0% 100%":
    "#11daa7 0% "+confidence+"%, #1c4255 "+confidence+"% 100%";
  const rows=[
    ["Trend", data?.trend.direction??"—"],
    ["Momentum", data?.momentum.direction??"—"],
    ["Volatility", data?.volatility.level??"—"],
    [crypto?"Volume":"Price updates", data?.volume.condition??"—"],
    ["Regime", data?.marketRegime??"—"],
  ];
  return <section className={panel+" relative flex min-h-[380px] flex-col overflow-hidden border-[#1597c6] p-4 shadow-[0_0_20px_rgba(0,178,230,.13)]"}>
    <div className="pointer-events-none absolute -bottom-24 -right-10 h-52 w-56 rounded-full bg-[#00d8ae]/10 blur-[60px]"/>
    <div className="relative flex items-center justify-between gap-2 border-b border-[#194c61] pb-3">
      <h2 className="flex items-center gap-2 text-[14px] font-extrabold tracking-wide"><Sparkles size={19} className="text-[#16d0f5]"/> AI DECISION BRIEF</h2>
      <span className="rounded-md border border-[#24566d] bg-[#092337] px-2 py-1 text-[10px] text-[#b8d7e3]">{timeframe.toUpperCase()}</span>
    </div>
    <div className="relative mt-3 flex items-center justify-between gap-2 rounded-lg border border-[#16536a] bg-[#061b2a]/85 p-3">
      <div className="min-w-0">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-[#88aebe]">{symbol} · {crypto?"Bybit":"OANDA"} analysis</p>
        <div className={"mt-1 flex items-center gap-2 text-[25px] font-black tracking-tight "+biasTone(bias)}>
          {data && bias==="BULLISH"?<TrendingUp size={22}/>:data && bias==="BEARISH"?<TrendingDown size={22}/>:null}
          {bias}
        </div>
        <p className="mt-1 max-w-52 text-[9px] leading-4 text-[#84a7b9]">{data?
          "Context only · Not a buy/sell instruction":stale?
          "Market analysis expired · refresh required":"Awaiting verified market analysis"}</p>
      </div>
      <div className="shrink-0 text-center">
        <div className="grid h-[67px] w-[67px] place-items-center rounded-full p-[6px]" style={{background:"conic-gradient("+ring+")"}}>
          <div className="grid h-full w-full place-items-center rounded-full bg-[#071b2b] text-[17px] font-extrabold">{confidence===null?"—":confidence+"%"}</div>
        </div>
        <span className="mt-1 block text-[9px] text-[#93b2c2]">Score confidence*</span>
      </div>
    </div>
    <div className="relative mt-3 rounded-lg border border-[#17465c] bg-[#092535] px-3 py-2">
      <div className="flex items-center justify-between gap-2 text-[11px]"><span className="font-semibold text-[#bad5e1]">Context Score</span>
        <strong className={score===null?"text-[#849fb0]":score>=0?"text-[#24dfb0]":"text-[#ff8396]"}>{score===null?"—":numericScore(score)+" / 100"}</strong>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#22475b]">
        <div className="h-full rounded-full bg-gradient-to-r from-[#12abd9] to-[#13e2a1] transition-all"
          style={{width:(score===null?0:Math.max(0,Math.min(100,Math.abs(score))))+"%"}}/>
      </div>
    </div>
    <div className="relative mt-3 space-y-1.5 text-[11px]">
      {rows.map(([label,value])=><div key={label} className="flex items-center justify-between gap-2 border-b border-[#17384a] pb-1.5">
        <span className="text-[#9ebccc]">{label}</span>
        <span className={"font-bold "+biasTone(value)}>{value}</span>
      </div>)}
    </div>
    {error&&<div role="alert" className="relative mt-2 flex items-start gap-2 rounded border border-[#894454] bg-[#431a2b] p-2 text-[10px] text-[#ffccd6]">
      <CircleAlert size={13} className="shrink-0"/>{error}
    </div>}
    <div className="relative mt-auto pt-3">
      <button type="button" onClick={onAnalyze} disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#0eb7dd] bg-[#075b7d] px-3 py-2.5 text-[11px] font-bold text-white transition hover:bg-[#0b779e] disabled:opacity-50">
        {loading?<RefreshCw size={14} className="animate-spin"/>:<BrainCircuit size={14}/>}
        {loading?"Analyzing market...":data?"Refresh Alpha Engine":"Analyze with Alpha Engine"}
      </button>
      <p className="mt-2 flex items-start gap-1.5 text-[9px] leading-4 text-[#749aac]">
        <ShieldAlert size={12} className="mt-0.5 shrink-0"/>*Internal confidence score, not predicted win probability. Chart feed is separate.
      </p>
      {data&&<p className="mt-1 flex items-center gap-1.5 text-[9px] text-[#749aac]">
        <Clock3 size={11}/> Last analyzed candle: {new Date(data.timestamp).toLocaleString()}
      </p>}
    </div>
  </section>;
}

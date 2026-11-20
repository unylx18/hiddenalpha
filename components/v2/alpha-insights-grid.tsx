"use client";

import type { ReactNode } from "react";
import { Activity, BarChart3, Gauge, Layers3, Waves } from "lucide-react";
import MtfAnalysisCard from "./mtf-analysis-card";
import { panel, type SymbolKey } from "./instruments";
import { type VerifiedAlpha, biasTone } from "./alpha-decision-brief";

function Tile({title, icon:Icon, value, sub, tone, children}:{
  title:string;
  icon:typeof Activity;
  value?:string;
  sub?:string;
  tone?:string;
  children?:ReactNode;
}) {
  return <section className={panel+" flex min-w-0 flex-col overflow-hidden border-[#1b6178] px-3 py-3"}>
    <h3 className="flex items-center gap-2 truncate text-[11px] font-semibold text-[#c6e4f0]">
      <Icon size={15} className="shrink-0 text-[#8dddf5]"/>{title}
    </h3>
    {value!==undefined&&<div className={"mt-3 truncate text-[23px] font-black tracking-tight "+(tone??"text-[#e5f7ff]")} title={value}>{value}</div>}
    {sub&&<div className="mt-auto pt-1 text-[10px] leading-4 text-[#82a8bb]">{sub}</div>}
    {children}
  </section>;
}
function asPrice(amount:number|null|undefined, forex:boolean):string {
  if(amount==null||!Number.isFinite(amount)||amount<=0)return "—";
  return amount.toLocaleString("en-US",{
    minimumFractionDigits:forex&&amount<10?5:2,
    maximumFractionDigits:forex&&amount<10?5:2,
  });
}
function signed(value:number):string {
  return (value>0?"+":"")+String(value);
}

export default function AlphaInsightsGrid({alpha,stale,symbol,crypto}:{
  alpha:VerifiedAlpha|null;
  stale:boolean;
  symbol:SymbolKey;
  crypto:boolean;
}) {
  const data=alpha&&!stale?alpha:null;
  const relative=data?.volume.ratio;
  const relativePercent=relative==null?null:Math.round((relative-1)*100);
  const volatility=data?.volatility.percentage;
  const levels=data?.keyLevels;
  return <div className="grid grid-cols-2 gap-2 md:grid-cols-3 2xl:grid-cols-6">
    <Tile title="Market Regime" icon={Layers3}
      value={data?.marketRegime??"—"}
      tone={biasTone(data?.marketRegime??"")}
      sub={data?"Closed-candle regime · "+data.timeframe:"Analysis needed"}/>
    <Tile title="Context Score" icon={BarChart3}
      value={data?signed(data.market.score)+" / 100":"—"}
      tone={biasTone(data?.market.bias??"")}
      sub="Signed Alpha Score"/>
    <Tile title={crypto?"Volume Analysis":"Price Update Activity"} icon={Activity}
      value={relativePercent==null?"—":signed(relativePercent)+"%"}
      tone={relativePercent==null?"text-[#b1cbd8]":relativePercent>=0?"text-[#18deb0]":"text-[#f7ab81]"}
      sub={relative==null?"Analysis needed":relative.toFixed(2)+"× previous 20 candles"}/>
    <Tile title="Volatility (ATR)" icon={Waves}
      value={volatility==null?"—":volatility.toFixed(2)+"%"}
      tone={data?.volatility.level==="HIGH"?"text-[#ffac7a]":"text-[#e4f6ff]"}
      sub={data?data.volatility.level+" · ATR / price":"Analysis needed"}/>
    <MtfAnalysisCard symbol={symbol} isCrypto={crypto}/>
    <Tile title="Key Levels" icon={Gauge}>
      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
        {(["r2","r1","s1","s2"] as const).map(key=><div key={key} className="flex items-center justify-between gap-1 border-b border-[#1b3d4e] pb-1">
          <span className="font-bold uppercase text-[#8db4c7]">{key}</span>
          <span className="font-semibold text-[#d5f2fb]">{asPrice(levels?.[key],!crypto)}</span>
        </div>)}
      </div>
      <div className="mt-auto pt-2 text-[9px] leading-4 text-[#7ca6ba]">Verified OHLC pivots · references only</div>
    </Tile>
  </div>;
}

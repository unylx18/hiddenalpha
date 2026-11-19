"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Activity, ArrowUpRight, BarChart3, Bell, BookOpen, ChevronDown, FlaskConical,
  Home, PlugZap, Search, Settings2, ShieldCheck, SlidersHorizontal,
  Wallet, Wrench, Zap
} from "lucide-react";

type Market = "crypto" | "forex";
type SymbolKey = "BTCUSDT" | "ETHUSDT" | "SOLUSDT" | "XAUUSD" | "EURUSD" | "GBPUSD";
type Instrument = { name: string; price: number; change: number; market: Market; icon: string; confidence: number; bias: string; color: string };
const instruments: Record<SymbolKey, Instrument> = {
  BTCUSDT: { name:"Bitcoin", price:92548.60, change:2.48, market:"crypto", icon:"₿", confidence:78, bias:"BULLISH", color:"#f59e0b" },
  ETHUSDT: { name:"Ethereum", price:3147.20, change:1.76, market:"crypto", icon:"◆", confidence:71, bias:"BULLISH", color:"#818cf8" },
  SOLUSDT: { name:"Solana", price:145.32, change:3.21, market:"crypto", icon:"≋", confidence:69, bias:"BULLISH", color:"#34d399" },
  XAUUSD: { name:"Gold / USD", price:2668.40, change:-0.34, market:"forex", icon:"◈", confidence:56, bias:"NEUTRAL", color:"#eab308" },
  EURUSD: { name:"Euro / USD", price:1.08672, change:0.22, market:"forex", icon:"€", confidence:52, bias:"NEUTRAL", color:"#3b82f6" },
  GBPUSD: { name:"Pound / USD", price:1.27094, change:0.20, market:"forex", icon:"£", confidence:62, bias:"BULLISH", color:"#a78bfa" },
};
const order: SymbolKey[] = ["BTCUSDT","ETHUSDT","XAUUSD","EURUSD","SOLUSDT","GBPUSD"];
const timeframes = ["1m","3m","5m","15m","1H","4H","1D"];
const panel = "rounded-xl border border-[#14506a] bg-[linear-gradient(145deg,#092132,#061522)]";
const number = (v: number) => v.toLocaleString("en-US",{minimumFractionDigits:v<10?5:2,maximumFractionDigits:v<10?5:2});
const pct = (v: number) => (v>=0?"+":"") + v.toFixed(2) + "%";

function Mark() {
  return <svg viewBox="0 0 96 96" className="h-11 w-11 shrink-0" aria-hidden="true" fill="none">
    <path d="M5 7 39 26v44L5 89ZM91 7 57 26v44l34 19Z" stroke="#1bcaf5" strokeWidth="4" strokeLinejoin="round"/>
    <path d="M12 18 32 30v36L12 77ZM84 18 64 30v36l20 11Z" fill="#062d4b"/>
    <path d="M44 40v41m-4-29h8v18h-8z" fill="#fb6478" stroke="#20c9f3" strokeWidth="2"/>
    <path d="M54 20v52m-4-42h8v24h-8z" fill="#087bc0" stroke="#20c9f3" strokeWidth="2"/>
    <path d="M64 25v40m-4-30h8v20h-8z" fill="#18bba0" stroke="#20c9f3" strokeWidth="2"/>
  </svg>;
}
function AssetBadge({ id, small=false }: {id: SymbolKey; small?: boolean}) {
  return <span className={"inline-flex shrink-0 items-center justify-center rounded-full font-bold "+(small?"h-6 w-6 text-[12px]":"h-9 w-9 text-base")} style={{background:instruments[id].color+"22",color:instruments[id].color}}>{instruments[id].icon}</span>;
}
function CandlestickChart({symbol, timeframe, indicators}:{symbol:SymbolKey;timeframe:string;indicators:boolean}) {
  const candles = useMemo(()=>{
    const seed=order.indexOf(symbol)*3+timeframes.indexOf(timeframe);
    return Array.from({length:62},(_,i)=>{
      const anchor=94+(i*.15)+(Math.sin(i*.21+seed)*2.5)+(Math.cos(i*.54+seed)*1.55)+(i>28?4:0);
      const open=anchor+Math.sin(i*.81+seed)*1.65;
      const close=anchor+Math.cos(i*.68+seed+1)*1.65;
      return {open,close,high:Math.max(open,close)+.7+(i%4)*.2,low:Math.min(open,close)-.6-(i%3)*.3,volume:9+(i*7)%26};
    });
  },[symbol,timeframe]);
  const lo=Math.min(...candles.map(c=>c.low))-2,hi=Math.max(...candles.map(c=>c.high))+2;
  const y=(v:number)=>252-(v-lo)/(hi-lo)*216;
  const ma=(period:number)=>candles.map((c,i)=>{
    const cut=candles.slice(Math.max(0,i-period+1),i+1);
    const v=cut.reduce((t,x)=>t+x.close,0)/cut.length;
    return (42+i*11.35).toFixed(1)+","+y(v).toFixed(1);
  }).join(" ");
  return <svg viewBox="0 0 820 340" className="block h-auto w-full" role="img" aria-label={"Synthetic demo candlestick chart for "+symbol+" on "+timeframe}>
    <rect width="820" height="340" fill="#061724"/>
    {Array.from({length:6},(_,i)=><g key={i}><line x1="34" x2="747" y1={35+i*43} y2={35+i*43} stroke="#214456" opacity=".5"/><text x="760" y={39+i*43} fill="#7b9bae" fontSize="11">{number(instruments[symbol].price*(1.035-i*.014))}</text></g>)}
    {Array.from({length:8},(_,i)=><line key={i} y1="32" y2="286" x1={42+i*100} x2={42+i*100} stroke="#173748" opacity=".35"/>)}
    {candles.map((c,i)=>{const x=42+i*11.35,up=c.close>=c.open,color=up?"#16dba5":"#ff5f76";return <g key={i}><line x1={x+3} x2={x+3} y1={y(c.high)} y2={y(c.low)} stroke={color} strokeWidth="1.2"/><rect x={x} y={Math.min(y(c.open),y(c.close))} width="7" height={Math.max(2,Math.abs(y(c.close)-y(c.open)))} fill={color} rx="0.5"/><rect x={x} y={295-c.volume*.65} width="7" height={c.volume*.65} fill={color} opacity=".42"/></g>})}
    {indicators&&<><polyline points={ma(8)} fill="none" stroke="#1bcaf5" strokeWidth="1.8"/><polyline points={ma(20)} fill="none" stroke="#b16bd7" strokeWidth="1.8"/></>}
    <line x1="32" y1="291" x2="751" y2="291" stroke="#1b516a"/>
    {["12 Nov","13 Nov","14 Nov","15 Nov","16 Nov","17 Nov","18 Nov","19 Nov"].map((v,i)=><text key={v} x={42+i*96} y="326" fill="#81a4b9" fontSize="11">{v}</text>)}
  </svg>;
}
function MiniStat({heading,children}:{heading:string;children:React.ReactNode}) {
  return <div className={panel+" min-h-31 p-4"}><div className="mb-3 text-[11px] font-semibold text-[#d7eefa]">{heading}</div>{children}</div>;
}
export default function V2PrototypePage() {
  const [market,setMarket]=useState<Market>("crypto");
  const [symbol,setSymbol]=useState<SymbolKey>("BTCUSDT");
  const [timeframe,setTimeframe]=useState("15m");
  const [indicators,setIndicators]=useState(true);
  const [query,setQuery]=useState("");
  const [notice,setNotice]=useState("");
  const data=instruments[symbol];
  const pick=(id:SymbolKey)=>{setSymbol(id);setMarket(instruments[id].market);setNotice("");};
  const changeMarket=(next:Market)=>{setMarket(next);pick(next==="crypto"?"BTCUSDT":"XAUUSD");};
  const filtered=order.filter(id=>instruments[id].market===market&&id.toLowerCase().includes(query.toLowerCase()));
  const nav=[{label:"Dashboard",icon:Home,href:"/v2"},{label:"Market Desk",icon:BarChart3,href:"/markets"},{label:"AI Analysis",icon:Zap,href:"/scanner"},{label:"Trading Journal",icon:BookOpen,href:"/performance"},{label:"Portfolio",icon:Wallet,href:"/performance"},{label:"Risk Manager",icon:ShieldCheck,href:"/tools"},{label:"Backtest",icon:FlaskConical,href:"/tools"},{label:"Tools",icon:Wrench,href:"/tools"},{label:"Integrations",icon:PlugZap,href:"/tools"}];
  return <div className="min-h-screen bg-[#020f18] font-sans text-[#e6f5ff]">
    <div className="flex min-h-screen">
      <aside className="hidden w-[205px] shrink-0 flex-col border-r border-[#0b3448] bg-[linear-gradient(180deg,#031824,#020e17)] lg:flex">
        <div className="flex items-center gap-2 border-b border-[#0b3448] px-4 py-4"><Mark/><div><div className="whitespace-nowrap text-[16px] font-extrabold tracking-tight">HIDDEN ALPHA <span className="rounded border border-[#1bcaf5] px-1 text-[11px] text-[#1bcaf5]">V2</span></div><div className="mt-1 text-[9px] tracking-widest text-[#6d9aaf]">TRADING INTELLIGENCE</div></div></div>
        <nav className="flex-1 space-y-1 px-3 pt-6">{nav.map((item,i)=>{const Icon=item.icon;return <Link key={item.label} href={item.href} className={"flex items-center gap-3 rounded-lg border px-3 py-3 text-[12px] font-medium transition "+(i===0?"border-[#18b8e9] bg-[#073e5a] text-white shadow-[inset_0_0_18px_#07bdfb22,0_0_13px_#00b8fa20]":"border-transparent text-[#9bbbc9] hover:bg-[#0b2e40] hover:text-white")}><Icon size={17}/>{item.label}</Link>})}</nav>
        <div className="m-3 border-t border-[#174255] p-3 text-[10px] text-[#80a4b8]"><span className="block text-[#19cbf3]">HIDDEN ALPHA V2</span>Design prototype · No production changes</div>
      </aside>
      <main className="min-w-0 flex-1">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#14384a] px-4 py-3 lg:px-5">
          <div className="flex items-center gap-2 lg:hidden"><Mark/><strong>HIDDEN ALPHA V2</strong></div>
          <div className="hidden flex-wrap items-center gap-2 md:flex">{(["BTCUSDT","ETHUSDT","XAUUSD","EURUSD"] as SymbolKey[]).map(id=><button key={id} onClick={()=>pick(id)} className={"flex items-center gap-2 rounded-lg border px-3 py-2 text-[11px] transition hover:border-[#1bcaf5] "+(id===symbol?"border-[#16aedd] bg-[#07344c]":"border-[#184458] bg-[#071c2b]")}><AssetBadge id={id} small/><strong>{id}</strong><span className={instruments[id].change>=0?"text-[#11d79b]":"text-[#ff657a]"}>{pct(instruments[id].change)}</span></button>)}</div>
          <div className="ml-auto flex items-center gap-3 text-[#93b8c8]"><span className="rounded border border-[#72531e] bg-[#4a35141a] px-2 py-1 text-[9px] font-bold tracking-wider text-[#e7bc70]">DEMO DATA</span><Bell size={17}/><Settings2 size={17}/><span className="grid h-7 w-7 place-items-center rounded-full border border-[#1bcaf5] text-xs font-bold text-[#1bcaf5]">HA</span></div>
        </header>
        <div className="mx-auto max-w-[1780px] space-y-3 px-3 py-4 lg:px-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-lg border border-[#1b5267] bg-[#061b28] p-1">{(["crypto","forex"] as Market[]).map(m=><button key={m} onClick={()=>changeMarket(m)} className={"rounded-md px-5 py-2 text-[12px] font-semibold "+(market===m?"bg-[#056389] text-white shadow-[0_0_14px_#00bdfa55]":"text-[#9aBDcc]")}>{m==="crypto"?"₿  Crypto":"◈  Forex"}</button>)}</div>
            <div className="flex items-center gap-2 rounded-lg border border-[#1b5267] bg-[#071b2a] px-3 py-2"><Search size={14} className="text-[#88b1c3]"/><input aria-label="Search instruments" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search symbol..." className="w-32 bg-transparent text-[12px] outline-none placeholder:text-[#6f96a9] sm:w-44"/></div>
            <div className="ml-auto flex flex-wrap gap-1 rounded-lg border border-[#1b5267] bg-[#051826] p-1">{timeframes.map(tf=><button key={tf} onClick={()=>setTimeframe(tf)} className={"rounded px-2 py-1 text-[11px] "+(timeframe===tf?"bg-[#0c7093] text-white ring-1 ring-[#1bcaf5]":"text-[#9ab4c5]")}>{tf}</button>)}</div>
            <button onClick={()=>setIndicators(!indicators)} aria-pressed={indicators} className={"rounded-lg border px-3 py-2 text-[11px] "+(indicators?"border-[#18b8e9] bg-[#064460] text-[#e4faff]":"border-[#235068] text-[#8dadbf]")}><SlidersHorizontal size={15} className="inline"/> Indicators {indicators?"ON":"OFF"}</button>
          </div>
          {notice&&<div role="status" className="rounded-lg border border-[#1b6580] bg-[#0a3346] p-2 text-xs text-[#c8edff]">{notice}</div>}
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.9fr)_minmax(300px,0.76fr)]">
            <section className={panel+" overflow-hidden p-3"}>
              <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-2"><div className="flex items-center gap-2"><AssetBadge id={symbol}/><div><div className="flex items-center gap-2"><strong className="text-[19px]">{symbol}</strong><ChevronDown size={13}/></div><span className="text-[10px] text-[#86a7b7]">{data.name}</span></div></div><div className="text-right"><div className="text-[20px] font-bold">{number(data.price)}</div><div className={"text-[12px] font-bold "+(data.change>=0?"text-[#19dba6]":"text-[#ff657a]")}>{pct(data.change)} · Sample</div></div></div>
              <div className="mb-1 flex items-center gap-4 px-2 text-[10px] text-[#a8bfcb]"><span><span className="text-[#1bcaf5]">●</span> EMA 20</span><span><span className="text-[#b16bd7]">●</span> EMA 50</span><span className="ml-auto text-[#6f9baf]">SYNTHETIC CANDLES</span></div>
              <CandlestickChart symbol={symbol} timeframe={timeframe} indicators={indicators}/>
              <div className="flex flex-wrap items-center gap-2 border-t border-[#184559] pt-2 text-[10px]"><span className="rounded border border-[#1bcaf5] bg-[#073c53] px-3 py-1 text-[#e0faff]">Indicators</span>{["EMA","RSI","MACD","BB","ATR","Volume"].map(label=><button key={label} onClick={()=>setNotice(label+" indicator configuration is planned for the full implementation.")} className="rounded px-2 py-1 text-[#a4bcc8] hover:bg-[#164056] hover:text-white">{label}</button>)}</div>
            </section>
            <section className={panel+" overflow-hidden p-3 shadow-[inset_0_0_0_1px_#00c9ff12]"}>
              <div className="mb-4 flex items-center justify-between border-b border-[#1a4a60] pb-3"><h2 className="flex items-center gap-2 text-[13px] font-bold"><span className="text-lg text-[#1bcaf5]">✦</span> AI DECISION BRIEF</h2><span className="rounded border border-[#285873] px-2 py-1 text-[10px] text-[#9abccd]">{timeframe}</span></div>
              <div className="flex items-center justify-between rounded-xl border border-[#0c715d] bg-[#063c3440] p-4"><div><div className={"text-[23px] font-extrabold "+(data.bias==="BULLISH"?"text-[#10dda0]":"text-[#d9eaf2]")}>{data.bias==="BULLISH"?"↗":"↔"} {data.bias}</div><div className="mt-1 text-[9px] text-[#8cadbf]">Illustrative market context</div></div><div className="text-right"><div className="text-[10px] text-[#95b6c5]">CONFIDENCE*</div><div className="text-[28px] font-extrabold">{data.confidence}%</div></div></div>
              <div className="mt-3 rounded-lg border border-[#1a4356] bg-[#0b2434] p-3"><div className="flex justify-between text-[11px]"><span>Context Score</span><strong className="text-[#14dda2]">{data.bias==="BULLISH"?"+3.2":"0.4"} / 5</strong></div><div className="mt-2 h-2 rounded-full bg-[#173c4e]"><div className="h-full rounded-full bg-[linear-gradient(90deg,#17b9ed,#12dca1)]" style={{width:String(data.confidence)+"%"}}/></div></div>
              <div className="mt-3 space-y-1 rounded-lg border border-[#154d63] p-3">{[["Trend",data.bias==="BULLISH"?"Uptrend — EMA 20 > EMA 50":"No confirmed trending alignment"],["Momentum","Momentum confirmation required"],["Volatility","Normal (sample ATR 0.91%)"],["Volume","Above average (+24% sample)"],["Regime",data.bias==="BULLISH"?"Trend Continuation":"Ranging / Consolidation"]].map(([k,v])=><div key={k} className="flex items-start gap-2 border-b border-[#153c4d] py-2 last:border-0"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#13d8a6]"/><span className="text-[11px]"><strong>{k}:</strong> <span className="text-[#a9c1d0]">{v}</span></span></div>)}</div>
              <div className="mt-3 text-[10px] leading-5 text-[#7d9fb1]">*Demo scores are not generated by the live Alpha Engine and are not trade recommendations.</div>
            </section>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
            <MiniStat heading="Market Regime"><div className="text-[21px] font-bold text-[#21d6f4]">{data.bias==="BULLISH"?"TREND":"RANGE"}</div><div className="text-[10px] text-[#8cbbcb]">Illustrative context</div></MiniStat>
            <MiniStat heading="Context Score"><div className="text-[23px] font-bold text-[#16dba4]">{data.bias==="BULLISH"?"+3.2":"0.4"} <span className="text-sm text-[#8eacbd]">/ 5</span></div><div className="text-[10px] text-[#8bb1c1]">Demo score</div></MiniStat>
            <MiniStat heading="Volume Analysis"><div className="text-[23px] font-bold text-[#17dba3]">+24.0%</div><div className="text-[10px] text-[#8bb1c1]">vs. 20-period avg</div></MiniStat>
            <MiniStat heading="Volatility (ATR)"><div className="text-[23px] font-bold">0.91%</div><div className="mt-1 inline-block rounded-full bg-[#075a53] px-3 text-[10px] text-[#1be2b0]">Normal</div></MiniStat>
            <MiniStat heading="Market Bias (MTF)"><div className="space-y-1 text-[10px]">{["1H","4H","1D"].map((x,i)=><div key={x} className="flex justify-between"><span>{x}</span><span className={"rounded px-2 "+(i===2?"bg-[#263f52] text-[#b0c2cb]":"bg-[#095d48] text-[#17dc9f]")}>{i===2?"NEUTRAL":data.bias}</span></div>)}</div></MiniStat>
            <MiniStat heading="Key Levels"><div className="space-y-1 text-[10px]">{[["R2",1.018],["R1",1.008],["S1",.992],["S2",.980]].map(([name,mul])=><div key={String(name)} className="flex justify-between"><span className="text-[#95b4c4]">{name}</span><span>{number(data.price*Number(mul))}</span></div>)}</div></MiniStat>
          </div>
          <div className="grid gap-3 xl:grid-cols-3">
            <section className={panel+" p-4"}><h3 className="flex items-center gap-2 text-[13px] font-bold"><Wallet size={16} className="text-[#1bcaf5]"/> Portfolio Overview <span className="ml-auto text-[9px] font-normal text-[#789baf]">Demo portfolio</span></h3><p className="mt-4 text-[10px] text-[#94b1c1]">Total Equity</p><div className="text-[27px] font-extrabold">$4,873.29</div><div className="text-[13px] font-bold text-[#14dba0]">+12.64% (+$547.82)</div><div className="mt-5 grid grid-cols-3 divide-x divide-[#1a4355] border-t border-[#1a4355] pt-3 text-center"><div><div className="text-[9px] text-[#89aebd]">Open P&L</div><div className="mt-1 font-bold text-[#12dba0]">+$236</div></div><div><div className="text-[9px] text-[#89aebd]">Daily P&L</div><div className="mt-1 font-bold text-[#12dba0]">+$89</div></div><div><div className="text-[9px] text-[#89aebd]">Profit Factor</div><div className="mt-1 font-bold">1.86</div></div></div></section>
            <section className={panel+" p-4"}><h3 className="flex items-center gap-2 text-[13px] font-bold"><BookOpen size={16} className="text-[#1bcaf5]"/> Trading Journal (30D)<Link href="/performance" className="ml-auto text-[10px] font-normal text-[#1bcaf5]">View ↗</Link></h3><div className="mt-5 flex items-center gap-5"><div className="grid h-28 w-28 shrink-0 place-items-center rounded-full" style={{background:"conic-gradient(#14dca3 0 58.3%, #1b4659 58.3% 100%)"}}><div className="grid h-20 w-20 place-items-center rounded-full bg-[#071b29]"><div className="text-center text-[22px] font-extrabold">58.3%<div className="text-[9px] font-normal text-[#87a6b7]">Win Rate</div></div></div></div><div className="flex-1 space-y-2 text-[11px]">{[["Trades","48"],["Wins","28"],["Losses","20"],["Expectancy","+$11.41"],["R/R Average","1:1.92"]].map(([k,v])=><div key={k} className="flex justify-between border-b border-[#123a4c] pb-1"><span className="text-[#9cb7c5]">{k}</span><strong className={k==="Wins"||k==="Expectancy"?"text-[#18dca3]":k==="Losses"?"text-[#ff657a]":""}>{v}</strong></div>)}</div></div></section>
            <section className={panel+" p-4"}><h3 className="flex items-center gap-2 text-[13px] font-bold"><Activity size={16} className="text-[#1bcaf5]"/> Market Watchlist</h3><div className="mt-3 space-y-1">{filtered.length?filtered.map(id=><button key={id} onClick={()=>pick(id)} className={"flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-[#12354a] "+(symbol===id?"bg-[#0a3045]":"")}><AssetBadge id={id} small/><strong className="flex-1 text-[11px]">{id}</strong><span className="text-[11px] text-[#b8d0db]">{number(instruments[id].price)}</span><span className={"text-[10px] font-bold "+(instruments[id].change>=0?"text-[#14dba4]":"text-[#ff657a]")}>{pct(instruments[id].change)}</span></button>):<p className="py-6 text-center text-xs text-[#7d9bad]">No matching symbols</p>}</div></section>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#7597aa]"><span>Hidden Alpha V2 · Reference-aligned visual prototype · Values and candles are synthetic</span><Link href="/" className="flex items-center gap-1 text-[#1bcaf5]">Return to current dashboard <ArrowUpRight size={12}/></Link></div>
        </div>
      </main>
    </div>
  </div>;
}

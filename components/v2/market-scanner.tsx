"use client";

import Link from "next/link";
import {useEffect,useMemo,useRef,useState} from "react";
import {ArrowUpRight,Menu,Radar,RefreshCcw,ShieldCheck} from "lucide-react";
import {CRYPTO_SYMBOLS,type CryptoSymbol} from "@/lib/trading/v2/symbol-registry";
import {
  SCAN_FRAMES,deriveMtfVerdict,filterSortScans,mapWithConcurrency,
  parseScannerResponse,isScannerResultFresh,matchesScanCondition,
  type ScanFilter,type ScanFrame,type ScanSort,type ScanCondition,type VerifiedScan,
} from "@/lib/trading/v2/market-scanner-model";
import {AssetBadge,Mark} from "./brand";
import {instruments,panel} from "./instruments";
import {MobileTerminalNav,TerminalSidebar} from "./terminal-navigation";

type Result={kind:"ready";data:VerifiedScan}|{kind:"unavailable"};
type Results=Partial<Record<CryptoSymbol,Result>>;
type ScanPhase="idle"|"running"|"complete"|"cancelled";
function signed(value:number){return (value>0?"+":"")+value.toFixed(0);}
function tone(value:string){return value==="BULLISH"?"text-[#1be0a9]":value==="BEARISH"?"text-[#ff879b]":"text-[#9dbcca]";}

function AlignmentCheck({primary}:{primary:VerifiedScan}){
  const [pending,setPending]=useState(false);
  const [result,setResult]=useState<VerifiedScan[]|null>(null);
  const [error,setError]=useState(false);
  const [checkedAt,setCheckedAt]=useState(0);
  const [clock,setClock]=useState(0);
  const active=useRef<AbortController|null>(null);
  useEffect(()=>()=>active.current?.abort(),[]);
  useEffect(()=>{
    if(!result)return;
    const timer=window.setInterval(()=>setClock(Date.now()),30_000);
    return ()=>window.clearInterval(timer);
  },[result]);
  const fresh=result&&result.every(row=>{
    const closed=Date.parse(row.lastClosedAt);
    const ms=row.timeframe==="15m"?900_000:row.timeframe==="1h"?3_600_000:14_400_000;
    return Number.isFinite(closed)&&clock-closed<=Math.max(ms*2,120_000);
  });
  const verdict=result&&fresh?deriveMtfVerdict(primary.symbol,result):"UNAVAILABLE";
  async function verify(){
    active.current?.abort();
    const ctrl=new AbortController();
    active.current=ctrl;
    setPending(true);setResult(null);setError(false);
    const frames=SCAN_FRAMES.filter(tf=>tf!==primary.timeframe);
    const responses=await Promise.all(frames.map(async tf=>{
      try{
        const res=await fetch("/api/v2/analysis?"+new URLSearchParams({
          symbol:primary.symbol,timeframe:tf,
        }).toString(),{cache:"no-store",signal:ctrl.signal});
        if(!res.ok)return null;
        const payload:unknown=await res.json();
        return parseScannerResponse(payload,primary.symbol,tf,Date.now());
      }catch{return null;}
    }));
    if(ctrl.signal.aborted)return;
    const all=[primary,...responses.filter((x):x is VerifiedScan=>x!==null)];
    setResult(all);
    setError(all.length!==3);
    setCheckedAt(Date.now());
    setClock(Date.now());
    setPending(false);
  }
  return <div className="mt-3 rounded-xl border border-[#23708b] bg-[#09283b] p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h3 className="text-[13px] font-bold text-[#d9eff9]">MTF Alignment · {primary.symbol}</h3>
        <p className="mt-1 text-[10px] text-[#90b3c5]">15m + 1H + 4H · independent completed-candle analyses</p>
      </div>
      <button type="button" onClick={verify} disabled={pending}
        className="rounded-lg border border-[#20a6c6] bg-[#0a4560] px-3 py-2 text-[11px] font-bold text-[#d7f6ff] disabled:opacity-50">
        {pending?"Checking...":"Check MTF (on demand)"}
      </button>
    </div>
    {result&&<div className="mt-3 grid grid-cols-3 gap-2">
      {SCAN_FRAMES.map(tf=>{
        const row=result.find(x=>x.timeframe===tf);
        return <div key={tf} className="rounded-lg border border-[#20526b] bg-[#081e30] p-2 text-center">
          <div className="text-[10px] uppercase text-[#8baebc]">{tf}</div>
          <div className={"mt-1 text-[11px] font-bold "+tone(row?.bias??"")}>{row?.bias??"UNAVAILABLE"}</div>
          <div className="text-[10px] text-[#91b1c0]">{row?signed(row.score)+"/100":"—"}</div>
        </div>;
      })}
    </div>}
    <p aria-live="polite" className={"mt-3 text-[12px] font-bold "+(verdict==="ALIGNED BULLISH"?"text-[#16e0a3]":verdict==="ALIGNED BEARISH"?"text-[#ff8196]":"text-[#a9c4d1]")}>
      {pending?"Verifying...":result?verdict:error?"UNAVAILABLE":"Run MTF check to compare all three timeframes"}
    </p>
    {result&&<p className="mt-1 text-[10px] text-[#7ea4b5]">
      {checkedAt?"Checked "+new Date(checkedAt).toLocaleTimeString()+" · ":""}
      Alignment is descriptive, not a trade trigger or prediction. Recheck when candles become stale.
    </p>}
  </div>;
}

export default function MarketScanner(){
  const [frame,setFrame]=useState<ScanFrame>("15m");
  const [filter,setFilter]=useState<ScanFilter>("ALL");
  const [sort,setSort]=useState<ScanSort>("absolute");
  const [condition,setCondition]=useState<ScanCondition>("ANY");
  const [clock,setClock]=useState(0);
  const [completedAt,setCompletedAt]=useState(0);
  const [outcomes,setOutcomes]=useState<Results>({});
  const [phase,setPhase]=useState<ScanPhase>("idle");
  const [progress,setProgress]=useState(0);
  const [message,setMessage]=useState("");
  const [menuOpen,setMenuOpen]=useState(false);
  const [selected,setSelected]=useState<CryptoSymbol|null>(null);
  const ctrl=useRef<AbortController|null>(null);
  const lastStart=useRef(0);
  useEffect(()=>()=>ctrl.current?.abort(),[]);
  useEffect(()=>{
    if(phase==="idle")return;
    const timer=window.setInterval(()=>setClock(Date.now()),30_000);
    return ()=>window.clearInterval(timer);
  },[phase]);
  const allReady=useMemo(()=>CRYPTO_SYMBOLS.flatMap(symbol=>{
    const row=outcomes[symbol];return row?.kind==="ready"?[row.data]:[];
  }),[outcomes]);
  const successful=useMemo(()=>allReady.filter(row=>isScannerResultFresh(row,clock)),[allReady,clock]);
  const staleCount=allReady.length-successful.length;
  const confluenceCount=successful.filter(row=>matchesScanCondition(row,"TREND_MOMENTUM")).length;
  const displayed=useMemo(()=>filterSortScans(successful,filter,sort,condition),[successful,filter,sort,condition]);
  const unavailable=CRYPTO_SYMBOLS.filter(id=>outcomes[id]?.kind==="unavailable");
  const chosen=successful.find(x=>x.symbol===selected);
  function cancel(){
    if(!ctrl.current)return;
    ctrl.current.abort();ctrl.current=null;
    setPhase("cancelled");setMessage("Cancelled; only completed verified results remain visible.");
  }
  function changeFrame(tf:ScanFrame){
    ctrl.current?.abort();ctrl.current=null;
    setFrame(tf);setOutcomes({});setProgress(0);setCompletedAt(0);
    setPhase("idle");setSelected(null);setMessage("");
  }
  async function start(){
    if(ctrl.current||phase==="running")return;
    if(Date.now()-lastStart.current<60_000){
      setMessage("Scan rate limit: one scan per minute in this tab.");return;
    }
    lastStart.current=Date.now();
    const controller=new AbortController();
    ctrl.current=controller;
    setOutcomes({});setProgress(0);setSelected(null);setCompletedAt(0);setClock(Date.now());
    setPhase("running");setMessage("");
    let done=0;
    try{
      await mapWithConcurrency(CRYPTO_SYMBOLS,3,async symbol=>{
        let outcome:Result={kind:"unavailable"};
        try{
          const res=await fetch("/api/v2/analysis?"+new URLSearchParams({
            symbol,timeframe:frame,
          }).toString(),{
            cache:"no-store",
            signal:AbortSignal.any([controller.signal,AbortSignal.timeout(14_000)]),
          });
          if(res.ok){
            const body:unknown=await res.json();
            const data=parseScannerResponse(body,symbol,frame,Date.now());
            if(data)outcome={kind:"ready",data};
          }
        }catch{ /* provider/network errors stay unavailable */ }
        if(controller.signal.aborted)return;
        done++;
        setOutcomes(previous=>({...previous,[symbol]:outcome}));
        setProgress(done);
        setClock(Date.now());
      },controller.signal);
      if(!controller.signal.aborted){
        setCompletedAt(Date.now());setClock(Date.now());
        setPhase("complete");
        setMessage("Scan finished. Only verified, non-expired markets appear in rankings.");
      }
    }catch{
      if(!controller.signal.aborted){
        setCompletedAt(Date.now());setClock(Date.now());
        setPhase("complete");setMessage("Some markets could not be checked.");
      }
    }finally{
      if(ctrl.current===controller)ctrl.current=null;
    }
  }
  return <div className="min-h-screen bg-[#03121c] text-[#e4f6ff]">
    <div className="flex min-h-screen">
      <TerminalSidebar/>
      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-[#174359] bg-[#041725]/95 px-4 py-3 backdrop-blur lg:px-5">
          <div className="flex items-center gap-2">
            <button type="button" onClick={()=>setMenuOpen(true)} aria-label="Open navigation"
              className="rounded-lg border border-[#226180] p-2 text-[#a5d8eb] lg:hidden"><Menu size={18}/></button>
            <Mark/><strong className="text-[14px]">HIDDEN ALPHA <span className="text-[#20c5ef]">V2</span></strong>
          </div>
          <span className="rounded border border-[#1b6279] px-2 py-1 text-[10px] text-[#9fc6d9]">Read only · On demand</span>
        </header>
        <div className="mx-auto max-w-[1550px] space-y-3 px-3 py-4 lg:px-5">
          <section className={panel+" p-4"}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="flex items-center gap-2 text-[19px] font-extrabold"><Radar size={22} className="text-[#18c5f3]"/> Crypto Market Scanner</h1>
                <p className="mt-1 text-[11px] text-[#8db0c1]">12 verified Bybit linear contracts · no auto trading · no synthetic scores</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {SCAN_FRAMES.map(tf=><button key={tf} type="button" disabled={phase==="running"}
                  onClick={()=>changeFrame(tf)} aria-pressed={frame===tf}
                  className={"rounded-md border px-3 py-2 text-[11px] font-bold "+
                    (frame===tf?"border-[#16c8f0] bg-[#095477] text-white":"border-[#24536a] text-[#98b8cb]")}>{tf.toUpperCase()}</button>)}
                <button type="button" onClick={phase==="running"?cancel:()=>{void start();}}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#1dc5e8] bg-[#086081] px-4 py-2 text-[11px] font-bold text-white">
                  <RefreshCcw size={14}/>{phase==="running"?"Cancel":"Scan 12 Markets"}
                </button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-[#1b4256] pt-3">
              <label className="text-[10px] text-[#96b9ca]">Filter
                <select value={filter} onChange={e=>setFilter(e.target.value as ScanFilter)}
                  className="ml-2 rounded border border-[#27586f] bg-[#071b2d] px-2 py-1.5 text-[#d2edf9]">
                  {(["ALL","BULLISH","BEARISH","NEUTRAL"] as const).map(x=><option key={x} value={x}>{x}</option>)}
                </select>
              </label>
              <label className="text-[10px] text-[#96b9ca]">Sort
                <select value={sort} onChange={e=>setSort(e.target.value as ScanSort)}
                  className="ml-2 rounded border border-[#27586f] bg-[#071b2d] px-2 py-1.5 text-[#d2edf9]">
                  <option value="absolute">Largest absolute score</option>
                  <option value="highest">Highest signed score</option>
                  <option value="symbol">Symbol A-Z</option>
                </select>
              </label>
              <label className="text-[10px] text-[#96b9ca]">Context
                <select value={condition} onChange={e=>setCondition(e.target.value as ScanCondition)}
                  className="ml-2 max-w-[180px] rounded border border-[#27586f] bg-[#071b2d] px-2 py-1.5 text-[#d2edf9]">
                  <option value="ANY">All contexts</option>
                  <option value="TREND_MOMENTUM">Trend + momentum aligned</option>
                  <option value="VOLUME_1X">Relative volume ≥ 1×</option>
                </select>
              </label>
              <span className="ml-auto text-[10px] text-[#85a7b9]">{progress}/{CRYPTO_SYMBOLS.length} checked · {successful.length} fresh verified</span>
            </div>
            {message&&<p role="status" className="mt-2 text-[11px] text-[#b3d2df]">{message}</p>}
            {progress>0&&<div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
              <div className="rounded border border-[#215068] bg-[#082638] px-3 py-2 text-[#9fc8da]">
                Verified <strong className="block text-[16px] text-[#e8f8ff]">{successful.length}</strong>
              </div>
              <div className="rounded border border-[#215068] bg-[#082638] px-3 py-2 text-[#9fc8da]">
                Trend + momentum aligned <strong className="block text-[16px] text-[#e8f8ff]">{confluenceCount}</strong>
              </div>
              <div className="rounded border border-[#215068] bg-[#082638] px-3 py-2 text-[#9fc8da]">
                Stale / unavailable <strong className="block text-[16px] text-[#e8f8ff]">{staleCount+unavailable.length}</strong>
              </div>
            </div>}
            {completedAt>0&&<p className="mt-2 text-[10px] text-[#81a6b7]">
              Last scan completed: {new Date(completedAt).toLocaleTimeString()} · Results expire with their completed-candle freshness window.
            </p>}
          </section>
          <section className={panel+" p-4"}>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[13px] font-bold">Verified Market Context</h2>
              <span className="inline-flex items-center gap-1 text-[10px] text-[#85adbe]"><ShieldCheck size={14}/> Completed candles</span>
            </div>
            {phase==="idle"?<p className="py-12 text-center text-[12px] text-[#8aafbe]">Choose timeframe and click Scan. Scans never start automatically.</p>:
            <div className="space-y-1">
              {displayed.map(row=><div key={row.symbol} className="flex flex-wrap items-center gap-3 rounded-lg border border-[#174257] bg-[#081d2b] p-3">
                <div className="flex min-w-[120px] flex-1 items-center gap-2">
                  <AssetBadge id={row.symbol} small/>
                  <div><strong className="text-[11px]">{row.symbol}</strong><div className="text-[9px] text-[#84a9b9]">{instruments[row.symbol].name}</div></div>
                </div>
                <span className={"w-[86px] text-[11px] font-bold "+tone(row.bias)}>{row.bias}</span>
                <div className="w-[78px] text-[12px] font-bold">{signed(row.score)}<span className="text-[9px] text-[#7599ac]"> /100</span></div>
                <div className="hidden min-w-[125px] flex-1 text-[10px] text-[#a7c8d6] sm:block">{row.trend} / {row.momentum}</div>
                <div className="hidden w-[65px] text-[11px] text-[#b0d1df] md:block">{row.relativeVolume.toFixed(2)}×</div>
                <button type="button" onClick={()=>setSelected(selected===row.symbol?null:row.symbol)}
                  aria-expanded={selected===row.symbol}
                  className="rounded border border-[#22678a] px-2.5 py-1.5 text-[10px] font-semibold text-[#8bdffc]">MTF</button>
                <Link href={"/v2?"+new URLSearchParams({symbol:row.symbol,timeframe:row.timeframe}).toString()}
                  className="rounded border border-[#26738f] px-2.5 py-1.5 text-[10px] font-semibold text-[#b9edff]">
                  Chart <ArrowUpRight size={11} className="inline"/>
                </Link>
              </div>)}
              {phase==="running"&&<p className="py-4 text-center text-[11px] text-[#9ebbc9]">Scanning remaining markets...</p>}
              {phase!=="running"&&!displayed.length&&<p className="py-8 text-center text-[11px] text-[#9ebbc9]">No fresh verified markets match this filter. Run a new scan if snapshots expired.</p>}
            </div>}
            {chosen&&<AlignmentCheck key={chosen.symbol+":"+chosen.timeframe+":"+chosen.lastClosedAt} primary={chosen}/>}
            {unavailable.length>0&&<p className="mt-3 rounded-lg border border-[#6a4855] bg-[#241c2a] p-2 text-[10px] text-[#e0aebd]">
              Unavailable/unverified: {unavailable.join(", ")}. No market bias was inferred.
            </p>}
            <p className="mt-3 border-t border-[#1a465b] pt-3 text-[10px] leading-5 text-[#83a9ba]">
              Context score (−100…+100) is an engine diagnostic, not win probability.
              MTF alignment only compares verified 15m/1H/4H results; it is not financial advice or an execution signal.
              Trend + momentum alignment is descriptive context, not a trade recommendation.
              Results expire automatically. Manual scanner uses up to 3 concurrent Bybit requests, at most once per minute per tab.
            </p>
          </section>
          <Link href="/v2" className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#26c5ee]">Back to Trading Terminal <ArrowUpRight size={12}/></Link>
        </div>
      </main>
    </div>
    <MobileTerminalNav open={menuOpen} onClose={()=>setMenuOpen(false)}/>
  </div>;
}

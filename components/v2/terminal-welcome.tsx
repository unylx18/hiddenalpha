"use client";

import Link from "next/link";
import {Activity,ArrowUpRight,BookOpen,CircleHelp,Radar,Search,ShieldCheck,Wallet} from "lucide-react";

type FeedState="loading"|"ready"|"unavailable";
export default function TerminalWelcome({onOpenGuide,onFocusSearch,feed}:{
  onOpenGuide:()=>void;
  onFocusSearch:()=>void;
  feed:FeedState;
}){
  return <section aria-label="Market Command Center" className="ha-v2-hero relative overflow-hidden rounded-[18px] border border-[#20617a] bg-[#071e30] px-4 py-4 sm:px-5 sm:py-5">
    <div className="ha-v2-hero-grid pointer-events-none absolute inset-0 opacity-70" aria-hidden="true"/>
    <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-[#0a8a9d]/15 blur-[90px]" aria-hidden="true"/>
    <div className="pointer-events-none absolute bottom-0 left-1/3 h-[1px] w-1/3 bg-gradient-to-r from-transparent via-[#55e0d5]/50 to-transparent" aria-hidden="true"/>
    <div className="relative flex flex-wrap items-center justify-between gap-4 lg:gap-6">
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-[.2em] text-[#65dfe0]">
          <span className="flex h-5 w-5 items-center justify-center rounded border border-[#268e93] bg-[#0b424d]"><Activity size={12}/></span>
          Hidden Alpha · Trading Workspace
        </div>
        <h1 className="text-[22px] font-black leading-tight tracking-tight text-[#f0fbff] sm:text-[27px]">
          Market Command Center<span className="text-[#50e2d0]">.</span>
        </h1>
        <p className="mt-2 max-w-[580px] text-[11px] leading-5 text-[#9fc5d5] sm:text-[12px]">
          Your chart, verified market context, and trading routine—one desk. Explore markets without auto-trading or invented performance.
        </p>
      </div>
      <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
        <Link href="/v2/scanner" className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-[#40d9df] bg-[#0b6986] px-4 py-2.5 text-[11px] font-bold text-white transition hover:bg-[#0a7a98] focus-visible:outline-2 focus-visible:outline-[#6cf5ec] sm:flex-none">
          <Radar size={15}/> Open Scanner <ArrowUpRight size={13}/>
        </Link>
        <button type="button" onClick={onOpenGuide}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-[#31657b] bg-[#0b2a3b]/80 px-4 py-2.5 text-[11px] font-semibold text-[#c3e4ed] transition hover:bg-[#103b51] focus-visible:outline-2 focus-visible:outline-[#6cf5ec] sm:flex-none">
          <CircleHelp size={15}/> Quick tour
        </button>
      </div>
    </div>
    <div className="relative mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[#2a586b]/65 pt-3 text-[10px] text-[#9fc4d4]">
      <span className="inline-flex items-center gap-1.5"><ShieldCheck size={13} className="text-[#54ddbd]"/> Read-only terminal</span>
      <span className="inline-flex items-center gap-1.5"><Radar size={13} className="text-[#6dd7ee]"/> 12 crypto markets</span>
      <span className="inline-flex items-center gap-1.5"><Wallet size={13} className="text-[#6dd7ee]"/> 3 Gold / Forex charts</span>
      <span className="inline-flex items-center gap-1.5">
        <span className={"h-1.5 w-1.5 rounded-full "+(feed==="ready"?"bg-[#43e2b5]":feed==="loading"?"bg-[#f1c575]":"bg-[#a7aeb8]")}/>
        {feed==="ready"?"Bybit snapshots available":feed==="loading"?"Checking market feed":"Market feed unavailable"}
      </span>
      <div className="ml-auto flex items-center gap-3">
        <button type="button" onClick={onFocusSearch} className="inline-flex items-center gap-1.5 font-semibold text-[#8eddea] hover:text-white"><Search size={12}/> Find market</button>
        <Link href="/v2/journal" className="hidden items-center gap-1.5 font-semibold text-[#8eddea] hover:text-white sm:inline-flex"><BookOpen size={12}/> Journal</Link>
      </div>
    </div>
  </section>;
}

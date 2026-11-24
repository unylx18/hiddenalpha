"use client";

import {useEffect,useRef,useState} from "react";
import {ArrowLeft,ArrowRight,BookOpen,ChartNoAxesCombined,Check,LayoutDashboard,ShieldCheck,X} from "lucide-react";
import {ONBOARDING_STEPS} from "@/lib/trading/v2/onboarding";
import {Mark} from "./brand";

const steps=[
  {
    kicker:"01 / YOUR WORKSPACE",
    title:"A clearer way to read the market.",
    description:"Hidden Alpha brings your chart, verified market context, and trading workflow into one calm workspace.",
    icon:LayoutDashboard,
    bullets:[
      "12 crypto markets plus Gold and Forex charts",
      "Your last symbol and timeframe stay on this device",
      "Quick symbol search: ⌘K / Ctrl+K or /",
    ],
  },
  {
    kicker:"02 / VERIFIED CONTEXT",
    title:"Study the context. Keep control.",
    description:"The Alpha Engine and Crypto Scanner only analyze when you ask. They never invent market prices or execute orders.",
    icon:ChartNoAxesCombined,
    bullets:[
      "Select a symbol and timeframe to explore its chart",
      "Press Analyze to request completed-candle market context",
      "Use Scanner to compare 12 crypto assets on demand",
    ],
  },
  {
    kicker:"03 / A BETTER ROUTINE",
    title:"Turn research into a process.",
    description:"Plan your risk, keep a trading journal, and track a manual portfolio. Your workspace is yours to manage.",
    icon:ShieldCheck,
    bullets:[
      "Risk Manager helps you plan exposure before a trade",
      "Trading Journal tracks entries you choose to record",
      "Journal and Portfolio data stay in this browser",
    ],
  },
] as const;

export default function FirstRunGuide({open,onDismiss,onComplete}:{
  open:boolean;
  onDismiss:()=>void;
  onComplete:()=>void;
}){
  const [step,setStep]=useState(0);
  const closeRef=useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    if(!open)return;
    const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
    const overflow=document.body.style.overflow;
    document.body.style.overflow="hidden";
    closeRef.current?.focus();
    function handleKey(event:KeyboardEvent){
      if(event.key==="Escape"){event.preventDefault();onDismiss();return;}
      if(event.key!=="Tab")return;
      const modal=document.getElementById("ha-v2-onboarding");
      if(!modal)return;
      const focusable=Array.from(modal.querySelectorAll<HTMLElement>(
        'button:not([disabled]),a[href],input:not([disabled])'
      ));
      if(!focusable.length)return;
      const first=focusable[0],last=focusable[focusable.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
    window.addEventListener("keydown",handleKey);
    return ()=>{
      document.body.style.overflow=overflow;
      window.removeEventListener("keydown",handleKey);
      previous?.focus();
    };
  },[open,onDismiss]);
  if(!open)return null;
  const content=steps[Math.min(step,steps.length-1)];
  const Icon=content.icon;
  return <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6">
    <button type="button" aria-label="Dismiss welcome guide" onClick={onDismiss}
      className="absolute inset-0 h-full w-full bg-[#020a11]/90 backdrop-blur-md"/>
    <section id="ha-v2-onboarding" role="dialog" aria-modal="true" aria-labelledby="ha-tour-title"
      aria-describedby="ha-tour-description"
      className="ha-v2-dialog relative max-h-[90vh] w-full max-w-[690px] overflow-y-auto rounded-[22px] border border-[#28637c] bg-[#061927] shadow-[0_28px_110px_rgba(0,0,0,.85)]">
      <div className="flex items-center justify-between border-b border-[#24495d] px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Mark/>
          <div>
            <div className="text-[11px] font-black tracking-[.14em] text-[#edfaff]">HIDDEN ALPHA</div>
            <p className="mt-1 text-[10px] text-[#8bb6c9]">YOUR FIRST 60 SECONDS · V2</p>
          </div>
        </div>
        <button ref={closeRef} type="button" onClick={onDismiss} aria-label="Close onboarding"
          className="rounded-lg border border-[#2d6077] p-2 text-[#a6d1e3] transition hover:bg-[#174056] focus-visible:outline-2 focus-visible:outline-[#47e0ed]">
          <X size={18}/>
        </button>
      </div>
      <div className="grid sm:grid-cols-[190px_minmax(0,1fr)]">
        <div className="relative overflow-hidden border-b border-[#24495d] bg-[#071d2c] px-5 py-6 sm:border-b-0 sm:border-r sm:px-6 sm:py-8">
          <div className="ha-v2-hero-grid pointer-events-none absolute inset-0 opacity-50" aria-hidden="true"/>
          <div className="relative flex items-center gap-3 sm:flex-col sm:items-start sm:gap-6">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-[#2a8ca4] bg-[#0d4358] shadow-[0_0_36px_rgba(0,205,242,.12)]">
              <Icon size={30} strokeWidth={1.5} className="text-[#79e7e9]"/>
            </div>
            <div>
              <div className="text-[10px] font-bold tracking-[.15em] text-[#55e0e1]">{content.kicker}</div>
              <p className="mt-2 text-[11px] leading-5 text-[#99bdcf]">
                Read-only intelligence. Every market analysis is on demand.
              </p>
            </div>
          </div>
          <div className="relative mt-7 hidden text-[10px] text-[#83aabe] sm:block">
            <div className="flex items-center gap-2"><Check size={13} className="text-[#45dcb9]"/> No auto trades</div>
            <div className="mt-3 flex items-center gap-2"><BookOpen size={13} className="text-[#45dcb9]"/> No fabricated signals</div>
          </div>
        </div>
        <div className="px-5 py-6 sm:px-7 sm:py-8">
          <div className="text-[10px] font-bold uppercase tracking-[.2em] text-[#48d6e7]">Welcome to your desk</div>
          <h2 id="ha-tour-title" className="mt-3 text-[25px] font-black leading-[1.18] tracking-tight text-[#f2fcff] sm:text-[29px]">{content.title}</h2>
          <p id="ha-tour-description" className="mt-4 max-w-[430px] text-[12px] leading-6 text-[#a8c6d5]">{content.description}</p>
          <div className="mt-5 space-y-3 rounded-xl border border-[#20536a] bg-[#092538] p-4">
            {content.bullets.map(item=><div key={item} className="flex items-start gap-3 text-[11px] leading-5 text-[#d1e8f1]">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-[#1b897e] bg-[#0b4947] text-[#59ecc9]"><Check size={11}/></span>
              <span>{item}</span>
            </div>)}
          </div>
          <div className="mt-6 flex items-center gap-2" aria-label={"Step "+(step+1)+" of "+ONBOARDING_STEPS}>
            {steps.map((s,i)=><span key={s.kicker} className={"h-1.5 rounded-full transition-all "+(i===step?"w-10 bg-[#46e0e4]":"w-5 bg-[#294f63]")}/>)}
            <span className="ml-auto text-[10px] tabular-nums text-[#83afc2]">{String(step+1).padStart(2,"0")} / 03</span>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-[#24495d] px-5 py-4 sm:px-6">
        <button type="button" onClick={onDismiss}
          className="rounded-lg px-2 py-2 text-[11px] font-semibold text-[#95baca] hover:text-white focus-visible:outline-2 focus-visible:outline-[#47e0ed]">
          Skip for now
        </button>
        <div className="flex items-center gap-2">
          {step>0&&<button type="button" onClick={()=>setStep(s=>s-1)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#28566b] px-3 py-2.5 text-[11px] font-semibold text-[#bddae7] hover:bg-[#12374a]">
            <ArrowLeft size={13}/> Back
          </button>}
          {step<steps.length-1
            ?<button type="button" onClick={()=>setStep(s=>Math.min(s+1,steps.length-1))}
              className="inline-flex items-center gap-2 rounded-lg border border-[#35d7e7] bg-[#0a6484] px-4 py-2.5 text-[11px] font-bold text-white hover:bg-[#0d799b]">
              Next <ArrowRight size={14}/>
            </button>
            :<button type="button" onClick={onComplete}
              className="inline-flex items-center gap-2 rounded-lg border border-[#44d6c0] bg-[#087c75] px-4 py-2.5 text-[11px] font-bold text-white hover:bg-[#09988a]">
              Enter workspace <ArrowRight size={14}/>
            </button>}
        </div>
      </div>
    </section>
  </div>;
}

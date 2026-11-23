"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import { useEffect, useRef } from "react";
import {
  BarChart3, BookOpen, BrainCircuit, FlaskConical, Home, PlugZap, Radar,
  ShieldCheck, Wallet, X,
} from "lucide-react";
import { Mark } from "./brand";

const links=[
  {name:"Dashboard",href:"/v2",icon:Home,legacy:false},
  {name:"Market Scanner",href:"/v2/scanner",icon:Radar,legacy:false},
  {name:"Market Desk",href:"/markets",icon:BarChart3,legacy:true},
  {name:"AI Analysis",href:"/scanner",icon:BrainCircuit,legacy:true},
  {name:"Trading Journal",href:"/v2/journal",icon:BookOpen,legacy:false},
  {name:"Portfolio",href:"/v2/portfolio",icon:Wallet,legacy:false},
  {name:"Risk Manager",href:"/v2/risk",icon:ShieldCheck,legacy:false},
  {name:"Strategy Lab",href:"/tools",icon:FlaskConical,legacy:true},
  {name:"Integrations",href:"/tools",icon:PlugZap,legacy:true},
] as const;

function MenuLinks({onNavigate}:{onNavigate?:()=>void}) {
  const route=usePathname();
  return <nav aria-label="Hidden Alpha navigation" className="space-y-1">
    {links.map(({name,href,icon:Icon,legacy})=>
      <Link key={name} href={href} onClick={onNavigate}
        aria-current={route===href?"page":undefined}
        className={"flex items-center gap-3 rounded-lg border px-3 py-3 text-[12px] font-semibold transition focus-visible:outline-2 focus-visible:outline-[#20d1f2] "+
          (route===href?"border-[#17b8ed] bg-[#0a4563] text-[#f2fdff] shadow-[0_0_16px_rgba(0,185,244,.13)]":
            "border-transparent text-[#96b9ca] hover:border-[#245b72] hover:bg-[#10364c]")}>
        <Icon size={17} className="shrink-0"/>
        <span className="flex-1">{name}</span>
        {legacy && <span className="text-[9px] font-normal text-[#618b9e]">Legacy</span>}
      </Link>)}
  </nav>;
}
function Logo() {
  return <div className="flex items-center gap-3 border-b border-[#173c4f] px-4 py-5">
    <Mark/>
    <div>
      <strong className="text-[14px] font-black tracking-tight text-[#eaf8ff]">HIDDEN ALPHA <span className="rounded border border-[#18aeda] px-1.5 py-0.5 text-[#1acdf7]">V2</span></strong>
      <div className="mt-2 text-[9px] tracking-[.17em] text-[#85acbe]">TRADING INTELLIGENCE</div>
    </div>
  </div>;
}
export function TerminalSidebar() {
  return <aside className="hidden w-[210px] shrink-0 flex-col border-r border-[#163c50] bg-[#041522] lg:flex">
    <Logo/>
    <div className="flex-1 px-3 py-5"><MenuLinks/></div>
    <div className="border-t border-[#163d50] px-4 py-4 text-[10px] leading-5 text-[#7da2b7]">
      <div className="font-semibold text-[#1cccf1]">V2 BETA · READ ONLY</div>
      <div>Chart: TradingView</div>
      <div>Analysis: Bybit / OANDA*</div>
      <div className="mt-1 text-[9px]">*OANDA requires a connected provider</div>
    </div>
  </aside>;
}

export function MobileTerminalNav({open,onClose}:{
  open:boolean;
  onClose:()=>void;
}) {
  const closeRef=useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    if(!open)return;
    const before=document.activeElement instanceof HTMLElement?document.activeElement:null;
    const prev=document.body.style.overflow;
    document.body.style.overflow="hidden";
    closeRef.current?.focus();
    function keyHandler(event:KeyboardEvent){
      if(event.key==="Escape"){onClose();return;}
      if(event.key!=="Tab")return;
      const modal=document.getElementById("hiddenalpha-v2-mobile-drawer");
      if(!modal)return;
      const nodes=Array.from(modal.querySelectorAll<HTMLElement>(
        "button:not([disabled]),a[href],input:not([disabled])"
      ));
      if(!nodes.length)return;
      const first=nodes[0],last=nodes[nodes.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
    window.addEventListener("keydown",keyHandler);
    return ()=>{
      document.body.style.overflow=prev;
      window.removeEventListener("keydown",keyHandler);
      before?.focus();
    };
  },[open,onClose]);

  if(!open)return null;
  return <div className="fixed inset-0 z-50 lg:hidden">
    <button type="button" aria-label="Close navigation overlay" onClick={onClose}
      className="absolute inset-0 h-full w-full bg-black/75 backdrop-blur-sm"/>
    <div id="hiddenalpha-v2-mobile-drawer" role="dialog" aria-modal="true" aria-label="Hidden Alpha navigation"
      className="relative flex h-full w-[min(85vw,330px)] flex-col overflow-y-auto border-r border-[#126a89] bg-[#061b29] shadow-[0_0_50px_rgba(0,0,0,.65)]">
      <div className="flex items-center justify-between border-b border-[#14465c] pr-3">
        <Logo/>
        <button ref={closeRef} type="button" aria-label="Close menu" onClick={onClose}
          className="rounded-lg border border-[#245d75] p-2 text-[#b2d6e5] focus-visible:outline-2 focus-visible:outline-[#20d1f2]">
          <X size={18}/>
        </button>
      </div>
      <div className="flex-1 px-3 py-4"><MenuLinks onNavigate={onClose}/></div>
      <p className="border-t border-[#173c50] px-4 py-3 text-[10px] text-[#86aabb]">Local Portfolio and Journal data stays on this browser.</p>
    </div>
  </div>;
}

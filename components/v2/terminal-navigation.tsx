"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {useEffect,useRef} from "react";
import {
  ArrowUpRight,BarChart3,BookOpen,BrainCircuit,ChevronDown,FlaskConical,
  LayoutDashboard,PlugZap,Radar,ShieldCheck,Wallet,X,
} from "lucide-react";
import {Mark} from "./brand";

const workspaceLinks=[
  {name:"Dashboard",href:"/v2",icon:LayoutDashboard},
  {name:"Market Scanner",href:"/v2/scanner",icon:Radar},
  {name:"Trading Journal",href:"/v2/journal",icon:BookOpen},
  {name:"Portfolio",href:"/v2/portfolio",icon:Wallet},
  {name:"Risk Manager",href:"/v2/risk",icon:ShieldCheck},
] as const;
const legacyLinks=[
  {name:"Market Desk",href:"/markets",icon:BarChart3},
  {name:"AI Analysis",href:"/scanner",icon:BrainCircuit},
  {name:"Strategy Lab",href:"/tools",icon:FlaskConical},
  {name:"Integrations",href:"/tools",icon:PlugZap},
] as const;

function MenuLinks({onNavigate}:{onNavigate?:()=>void}){
  const route=usePathname();
  function makeLink({name,href,icon:Icon}:{name:string;href:string;icon:typeof LayoutDashboard},legacy=false){
    const selected=route===href;
    return <Link key={name} href={href} onClick={onNavigate} aria-current={selected?"page":undefined}
      className={"group flex items-center gap-3 rounded-[10px] border px-3 py-2.5 text-[11px] font-semibold transition focus-visible:outline-2 focus-visible:outline-[#52e1e1] "+
      (selected?"border-[#258e9d] bg-[#103c51] text-[#e9fcff] shadow-[inset_3px_0_0_#5ce7d9,0_0_18px_rgba(30,194,222,.075)]":
        "border-transparent text-[#92b6c7] hover:border-[#27546a] hover:bg-[#102d40] hover:text-[#def3fa]")}>
      <Icon size={17} strokeWidth={1.8} className={"shrink-0 "+(selected?"text-[#68e7d8]":"text-[#7ca9be] group-hover:text-[#9fe7ee]")}/>
      <span className="min-w-0 flex-1 truncate">{name}</span>
      {legacy&&<ArrowUpRight size={12} className="shrink-0 opacity-50"/>}
    </Link>;
  }
  return <nav aria-label="Hidden Alpha navigation" className="space-y-5">
    <div>
      <div className="px-3 pb-2 text-[9px] font-black uppercase tracking-[.19em] text-[#6c98ac]">Workspace</div>
      <div className="space-y-1">{workspaceLinks.map(item=>makeLink(item))}</div>
    </div>
    <details className="group rounded-xl border border-[#1a4054] bg-[#081f2d]/60">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-3 text-[10px] font-bold text-[#89adbe] focus-visible:outline-2 focus-visible:outline-[#52e1e1]">
        <span className="flex-1 uppercase tracking-[.14em]">Legacy tools</span>
        <span className="text-[9px] font-normal text-[#6b91a4]">4 apps</span>
        <ChevronDown size={13} className="transition group-open:rotate-180"/>
      </summary>
      <div className="space-y-1 border-t border-[#1a4054] p-1.5">{legacyLinks.map(item=>makeLink(item,true))}</div>
    </details>
  </nav>;
}
function Logo(){
  return <div className="flex items-center gap-3 border-b border-[#1b4354] px-4 py-5">
    <Mark/>
    <div className="min-w-0">
      <strong className="block whitespace-nowrap text-[13px] font-black tracking-tight text-[#f1fcff]">HIDDEN <span className="text-[#65e4dc]">ALPHA</span></strong>
      <div className="mt-1.5 text-[9px] font-semibold tracking-[.16em] text-[#8ab4c4]">INTELLIGENCE · V2</div>
    </div>
  </div>;
}
export function TerminalSidebar(){
  return <aside className="sticky top-0 hidden h-screen w-[225px] shrink-0 flex-col overflow-y-auto border-r border-[#194457] bg-[linear-gradient(180deg,#061e2c,#041420)] lg:flex">
    <Logo/>
    <div className="flex-1 px-3 py-5"><MenuLinks/></div>
    <div className="mx-3 mb-3 rounded-xl border border-[#24566c] bg-[#0b2c3d] p-3">
      <div className="mb-1 flex items-center gap-2 text-[10px] font-black tracking-[.07em] text-[#6fe7d7]">
        <ShieldCheck size={14}/> READ-ONLY MODE
      </div>
      <p className="text-[10px] leading-[1.65] text-[#8fb5c5]">Market context on demand. No broker orders or automated execution.</p>
    </div>
  </aside>;
}
export function MobileTerminalNav({open,onClose}:{open:boolean;onClose:()=>void;}){
  const closeRef=useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    if(!open)return;
    const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
    const original=document.body.style.overflow;
    document.body.style.overflow="hidden";
    closeRef.current?.focus();
    function onKey(e:KeyboardEvent){
      if(e.key==="Escape"){e.preventDefault();onClose();return;}
      if(e.key!=="Tab")return;
      const modal=document.getElementById("hiddenalpha-v2-mobile-drawer");
      if(!modal)return;
      const nodes=Array.from(modal.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],summary'));
      if(!nodes.length)return;
      const first=nodes[0],last=nodes[nodes.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    }
    window.addEventListener("keydown",onKey);
    return ()=>{
      document.body.style.overflow=original;
      window.removeEventListener("keydown",onKey);
      previous?.focus();
    };
  },[open,onClose]);
  if(!open)return null;
  return <div className="fixed inset-0 z-50 lg:hidden">
    <button type="button" aria-label="Close navigation overlay" onClick={onClose}
      className="absolute inset-0 h-full w-full bg-black/75 backdrop-blur-sm"/>
    <div id="hiddenalpha-v2-mobile-drawer" role="dialog" aria-modal="true" aria-label="Hidden Alpha navigation"
      className="relative flex h-full w-[min(88vw,330px)] flex-col overflow-y-auto border-r border-[#25738a] bg-[#061a28] shadow-[0_0_50px_rgba(0,0,0,.65)]">
      <div className="flex items-center justify-between border-b border-[#21485a] pr-3">
        <Logo/>
        <button ref={closeRef} type="button" aria-label="Close menu" onClick={onClose}
          className="rounded-lg border border-[#245d75] p-2 text-[#b2d6e5] focus-visible:outline-2 focus-visible:outline-[#52e1e1]">
          <X size={18}/>
        </button>
      </div>
      <div className="flex-1 px-3 py-4"><MenuLinks onNavigate={onClose}/></div>
      <p className="border-t border-[#20475a] px-4 py-3 text-[10px] leading-5 text-[#86aabb]">
        Portfolio and Journal entries remain on this browser.
      </p>
    </div>
  </div>;
}

"use client";
import {useEffect,useMemo,useState} from "react";
import {Activity,RefreshCw,Star} from "lucide-react";
import {AssetBadge} from "./brand";
import {instruments,order,panel,type SymbolKey} from "./instruments";
import {quoteIsFresh,type MarketWatchState} from "./use-market-watch";
import type {WatchSymbol} from "@/lib/trading/v2/market-watch";

const KEY="hiddenalpha:v2:watchlist-pro";
type Sort="favorites"|"name"|"change";
function readPrefs():{favorites:SymbolKey[];sort:Sort;onlyFavorites:boolean}{
  const fallback:{favorites:SymbolKey[];sort:Sort;onlyFavorites:boolean}={
    favorites:[],sort:"favorites",onlyFavorites:false,
  };
  try {
    const raw=window.localStorage.getItem(KEY);
    if(!raw)return fallback;
    const parsed:unknown=JSON.parse(raw);
    if(!parsed||typeof parsed!=="object")return fallback;
    const obj=parsed as Record<string,unknown>;
    const favorites=Array.isArray(obj.favorites)?
      obj.favorites.filter((x):x is SymbolKey=>typeof x==="string"&&order.some(id=>id===x)).slice(0,15):[];
    return {favorites,sort:obj.sort==="name"||obj.sort==="change" ?obj.sort:"favorites",
      onlyFavorites:obj.onlyFavorites===true};
  }catch{return fallback;}
}
function price(value:number):string {
  return value.toLocaleString("en-US",{minimumFractionDigits:value<10?4:2,maximumFractionDigits:value<10?5:2});
}
function Spark({values,id}:{values:number[];id:string}){
  const min=Math.min(...values),max=Math.max(...values),range=Math.max(max-min,Number.EPSILON);
  const points=values.map((v,i)=>(3+i/(values.length-1)*94).toFixed(2)+","+
    (25-(v-min)/range*22).toFixed(2)).join(" ");
  return <svg viewBox="0 0 100 28" role="img" aria-label={id+" completed hourly close trend"}
    className="hidden h-7 w-[70px] shrink-0 sm:block" preserveAspectRatio="none">
    <polyline points={points} fill="none"
      stroke={values.at(-1)!>=values[0]?"#18daa7":"#ff7a8c"}
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>;
}
export default function MarketWatchlist({
  watch,selected,onSelect,query,
}:{watch:MarketWatchState;selected:SymbolKey;onSelect:(id:SymbolKey)=>void;query:string;}){
  const [favorites,setFavorites]=useState<SymbolKey[]>([]);
  const [sort,setSort]=useState<Sort>("favorites");
  const [onlyFavorites,setOnlyFavorites]=useState(false);
  const [hydrated,setHydrated]=useState(false);
  useEffect(()=>{
    const timer=window.setTimeout(()=>{
      const prefs=readPrefs();
      setFavorites(prefs.favorites);setSort(prefs.sort);
      setOnlyFavorites(prefs.onlyFavorites);setHydrated(true);
    },0);
    return ()=>window.clearTimeout(timer);
  },[]);
  useEffect(()=>{
    if(!hydrated)return;
    try {window.localStorage.setItem(KEY,JSON.stringify({favorites,sort,onlyFavorites}));}
    catch { /* storage optional */ }
  },[favorites,sort,onlyFavorites,hydrated]);
  function toggle(id:SymbolKey){
    setFavorites(previous=>previous.includes(id)?previous.filter(x=>x!==id):[...previous,id]);
  }
  const shown=useMemo(()=>order.filter(id=>
    (!onlyFavorites||favorites.includes(id))&&
    (!query||id.toLowerCase().includes(query.toLowerCase())||
      instruments[id].name.toLowerCase().includes(query.toLowerCase())))
      .sort((a,b)=>{
        if(sort==="name")return a.localeCompare(b);
        if(sort==="change"){
          const quote=(id:SymbolKey)=>instruments[id].market==="crypto"?
            watch.quotes[id as WatchSymbol]:undefined;
          const qa=quote(a),qb=quote(b);
          const fa=quoteIsFresh(qa,watch.now),fb=quoteIsFresh(qb,watch.now);
          if(fa!==fb)return fa?-1:1;
          if(fa&&fb&&qa&&qb)return qb.change24hPercent-qa.change24hPercent;
          return a.localeCompare(b);
        }
        const av=favorites.includes(a),bv=favorites.includes(b);
        return av===bv?order.indexOf(a)-order.indexOf(b):av?-1:1;
      }),[favorites,onlyFavorites,sort,watch.quotes,watch.now,query]);
  return <section className={panel+" min-w-0 p-4"}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-[13px] font-bold"><Activity size={16} className="text-[#20c6ee]"/>Market Watchlist</h2>
      <button type="button" onClick={watch.refresh} disabled={watch.loading}
        aria-label="Refresh public Bybit market snapshots"
        className="rounded border border-[#1f516b] p-2 text-[#9ad4eb] disabled:opacity-40">
        <RefreshCw size={13} className={watch.loading?"animate-spin":""}/>
      </button>
    </div>
    <div className="my-2 flex gap-2 text-[10px]">
      <label className="flex items-center gap-1 text-[#9fc1d1]">
        <input type="checkbox" checked={onlyFavorites} onChange={e=>setOnlyFavorites(e.target.checked)}/>
        Favorites
      </label>
      <select aria-label="Watchlist sort" value={sort} onChange={e=>setSort(e.target.value as Sort)}
        className="ml-auto rounded border border-[#24576e] bg-[#071d2e] px-2 py-1 text-[#aad3e4]">
        <option value="favorites">Pinned first</option>
        <option value="change">24h change</option>
        <option value="name">Symbol A–Z</option>
      </select>
    </div>
    <div className="max-h-[460px] overflow-y-auto border-t border-[#1b4356]">
      {shown.map(id=>{
        const crypto=instruments[id].market==="crypto";
        const q=crypto?watch.quotes[id as WatchSymbol]:undefined;
        const fresh=quoteIsFresh(q,watch.now),change=fresh&&q?q.change24hPercent:null;
        const marked=favorites.includes(id);
        return <div key={id} className={"flex min-w-0 items-center gap-1 border-b border-[#17384b] py-2 "+
          (selected===id?"bg-[#0d364b]":"hover:bg-[#0d2b3e]")}>
          <button type="button" aria-label={(marked?"Unpin ":"Pin ")+id}
            aria-pressed={marked} onClick={()=>toggle(id)}
            className="shrink-0 rounded p-1 text-[#9bc4d3] focus-visible:outline-[#18c8f3]">
            <Star size={14} fill={marked?"#e7bd57":"none"} color={marked?"#e7bd57":"#8daec0"}/>
          </button>
          <button type="button" onClick={()=>onSelect(id)} aria-pressed={selected===id}
            className="flex min-w-0 flex-1 items-center gap-2 text-left focus-visible:outline-[#18c8f3]">
            <AssetBadge id={id} small/>
            <span className="min-w-0 flex-1">
              <strong className="block truncate text-[11px]">{id}</strong>
              <span className="block truncate text-[9px] text-[#6f9bad]">{crypto?"Bybit linear":"Chart only"}</span>
            </span>
            <span className="min-w-[66px] text-right text-[10px] font-semibold">
              {fresh&&q?price(q.price):crypto?"—":"—"}
            </span>
            <span className={"min-w-[60px] text-right text-[10px] font-bold "+
              (change==null?"text-[#7194a6]":change>=0?"text-[#20d7a5]":"text-[#f78496]")}>
              {change==null?crypto&&q?"Stale":crypto?"—":"Chart":(change>=0?"+":"")+change.toFixed(2)+"%"}
            </span>
            {fresh&&q?.sparkline&&q.sparkline.length>=8
              ?<Spark values={q.sparkline} id={id}/>
              :<span className="hidden w-[70px] text-center text-[10px] text-[#638a9e] sm:block">—</span>}
          </button>
        </div>;
      })}
      {!shown.length&&<p className="py-6 text-center text-[11px] text-[#93b7c8]">No matching markets.</p>}
    </div>
    <div className="pt-2 text-[9px] leading-5 text-[#7e9fb0]">
      {watch.unavailable?"Provider temporarily unavailable. No substitute quotes.":
        "12 Bybit crypto markets; sparkline for BTC, ETH, SOL. Forex/Gold chart only."}
      <div>Freshness expires after 3 minutes. Favorite/sort preferences remain local.</div>
    </div>
  </section>;
}

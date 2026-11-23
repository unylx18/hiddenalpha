"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check, Menu, Search, Wrench, Maximize2, Minimize2 } from "lucide-react";
import { instruments, order, timeframes, panel, type Market, type SymbolKey } from "./instruments";
import { Mark, AssetBadge } from "./brand";
import LiveMarketQuote from "./live-market-quote";
import TradingViewChart from "./tradingview-chart";
import DashboardLocalSummary from "./dashboard-local-summary";
import AlphaDecisionBrief, {type VerifiedAlpha} from "./alpha-decision-brief";
import AlphaInsightsGrid from "./alpha-insights-grid";
import TopMarketStrip from "./top-market-strip";
import MarketWatchlist from "./market-watchlist";
import { useMarketWatch } from "./use-market-watch";
import { TerminalSidebar, MobileTerminalNav } from "./terminal-navigation";
import {TERMINAL_PREFS_KEY,parseTerminalPrefs} from "@/lib/trading/v2/terminal-preferences";
import {decodeScannerChartLink} from "@/lib/trading/v2/market-scanner-model";

type AnalysisState = {
  key: string;
  loading: boolean;
  data: VerifiedAlpha | null;
  error: string;
  stale: boolean;
  provider: string;
  volumeKind: string;
};

const frameDuration: Record<string, number> = {
  "1m": 60_000, "3m": 180_000, "5m": 300_000, "15m": 900_000,
  "1h": 3_600_000, "4h": 14_400_000, "1d": 86_400_000,
};

function readAlpha(input: unknown): VerifiedAlpha | null {
  if (!input || typeof input !== "object") return null;
  const value = input as Record<string, unknown>;
  if (typeof value.symbol !== "string" || typeof value.timeframe !== "string" ||
      typeof value.timestamp !== "string") return null;
  if (!value.market || !value.trend || !value.momentum || !value.volume || !value.volatility ||
      typeof value.market !== "object" || typeof value.trend !== "object" ||
      typeof value.momentum !== "object" || typeof value.volume !== "object" ||
      typeof value.volatility !== "object") return null;
  const market = value.market as Record<string, unknown>;
  const trend = value.trend as Record<string, unknown>;
  const momentum = value.momentum as Record<string, unknown>;
  const volume = value.volume as Record<string, unknown>;
  const volatility = value.volatility as Record<string, unknown>;
  const goodNum = (v: unknown) => typeof v === "number" && Number.isFinite(v);
  if (!["BULLISH", "BEARISH", "NEUTRAL"].includes(String(market.bias)) ||
      !goodNum(market.score) || !goodNum(market.confidence) ||
      typeof trend.direction !== "string" || !goodNum(trend.strength) ||
      typeof momentum.direction !== "string" || !goodNum(momentum.strength) ||
      typeof volume.condition !== "string" || !goodNum(volume.ratio) ||
      typeof volatility.level !== "string" ||
      !(volatility.percentage === null || goodNum(volatility.percentage))) return null;
  if (!["BULLISH","BEARISH","NEUTRAL"].includes(String(value.marketRegime)) ||
      !Array.isArray(value.reasons) || value.reasons.length > 8 ||
      !value.reasons.every((r:unknown)=>typeof r==="string")) return null;
  const levels = value.keyLevels;
  if (!levels || typeof levels !== "object") return null;
  const k = levels as Record<string, unknown>;
  const validLevel=(v:unknown):boolean => v === null ||
    (typeof v === "number" && Number.isFinite(v) && v > 0);
  if (k.method!=="completed-candle-swings" ||
      typeof k.referenceClose!=="number" || !Number.isFinite(k.referenceClose) ||
      !["r1","r2","s1","s2"].every(key=>validLevel(k[key]))) return null;
  if (typeof market.score !== "number" || market.score < -100 || market.score > 100 ||
      typeof market.confidence !== "number" || market.confidence < 0 || market.confidence > 100) return null;
  return value as VerifiedAlpha;
}

export default function TradingTerminal() {
  const [market, setMarket] = useState<Market>("crypto");
  const [symbol, setSymbol] = useState<SymbolKey>("BTCUSDT");
  const [timeframe, setTimeframe] = useState("15m");
  const [query, setQuery] = useState("");
  const [analysisState, setAnalysisState] = useState<AnalysisState | null>(null);
  const [mobileMenuOpen,setMobileMenuOpen]=useState(false);
  const [focusMode,setFocusMode]=useState(false);
  const [suggestionIndex,setSuggestionIndex]=useState(0);
  const [searchOpen,setSearchOpen]=useState(false);
  const [prefsReady,setPrefsReady]=useState(false);
  const closeMobileMenu=useCallback(()=>setMobileMenuOpen(false),[]);
  const watch=useMarketWatch();
  const controller = useRef<AbortController | null>(null);
  const searchRef=useRef<HTMLInputElement>(null);
  const selected = instruments[symbol];
  const analysisKey = symbol + ":" + timeframe;
  const state = analysisState?.key === analysisKey ? analysisState : null;
  const analysis = state?.data ?? null;
  const oldData = state?.stale ?? false;
  const crypto = market === "crypto";
  const matches=query.trim()?order.filter(id=>id.toLowerCase().includes(query.trim().toLowerCase())||
    instruments[id].name.toLowerCase().includes(query.trim().toLowerCase())).slice(0,9):[];

  useEffect(() => () => controller.current?.abort(), []);
  useEffect(()=>{
    const timer=window.setTimeout(()=>{
      let saved=null;
      try{saved=parseTerminalPrefs(window.localStorage.getItem(TERMINAL_PREFS_KEY));}catch{}
      const deep=decodeScannerChartLink(window.location.search);
      const next=deep??saved;
      if(next){
        setSymbol(next.symbol);
        setTimeframe(next.timeframe);
        setMarket(instruments[next.symbol].market);
      }
      setPrefsReady(true);
    },0);
    return ()=>window.clearTimeout(timer);
  },[]);
  useEffect(()=>{
    if(!prefsReady)return;
    try{window.localStorage.setItem(TERMINAL_PREFS_KEY,JSON.stringify({symbol,timeframe}));}catch{}
  },[prefsReady,symbol,timeframe]);
  useEffect(()=>{
    function keyboard(e:KeyboardEvent){
      if(e.defaultPrevented||e.altKey||document.querySelector('[role="dialog"]'))return;
      const el=e.target instanceof HTMLElement?e.target:null;
      const typing=el&&(el.isContentEditable||["INPUT","TEXTAREA","SELECT"].includes(el.tagName));
      const cmd=(e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k";
      if(cmd||(e.key==="/"&&!typing&&!e.metaKey&&!e.ctrlKey)){
        e.preventDefault();searchRef.current?.focus();setSearchOpen(true);
      }else if(e.key.toLowerCase()==="f"&&!typing&&!e.metaKey&&!e.ctrlKey){
        e.preventDefault();setFocusMode(previous=>!previous);
      }else if(e.key==="Escape"&&focusMode&&document.activeElement!==searchRef.current){
        setFocusMode(false);
      }
    }
    window.addEventListener("keydown",keyboard);
    return ()=>window.removeEventListener("keydown",keyboard);
  },[focusMode]);

  useEffect(() => {
    if (!analysisState?.data || analysisState.stale) return;
    const duration = frameDuration[analysisState.data.timeframe] ?? 900_000;
    const openedAt = Date.parse(analysisState.data.timestamp);
    const cutoff = openedAt + duration + Math.max(duration * 2, 120_000);
    const delay = Number.isFinite(cutoff) ? Math.max(0, cutoff - Date.now() + 25) : 0;
    const timer = window.setTimeout(() => {
      setAnalysisState((previous) =>
        previous?.key === analysisState.key && previous.data === analysisState.data
          ? { ...previous, stale: true }
          : previous
      );
    }, delay);
    return () => window.clearTimeout(timer);
  }, [analysisState]);



  function selectSymbol(id: SymbolKey) {
    controller.current?.abort();
    setSymbol(id);
    setMarket(instruments[id].market);
    setQuery("");
    setSearchOpen(false);
    setSuggestionIndex(0);
  }

  function selectMarket(next: Market) {
    controller.current?.abort();
    setMarket(next);
    setSymbol(next === "crypto" ? "BTCUSDT" : "XAUUSD");
  }

  async function analyze() {
    controller.current?.abort();
    const active = new AbortController();
    controller.current = active;
    const key = analysisKey;
    setAnalysisState({key, loading: true, data: null, error: "", stale: false, provider: "", volumeKind: ""});
    try {
      const qs = new URLSearchParams({symbol, timeframe});
      const endpoint = crypto ? "/api/v2/analysis?" : "/api/v2/forex/analysis?";
      const result = await fetch(endpoint + qs.toString(), {
        cache: "no-store", signal: active.signal,
      });
      const payload: unknown = await result.json();
      if (!payload || typeof payload !== "object") throw new Error("Invalid engine response");
      const response = payload as Record<string, unknown>;
      const data = readAlpha(response.alpha);
      if (!result.ok || response.success !== true || !data) {
        throw new Error(typeof response.error === "string" ? response.error : "Market context unavailable");
      }
      if ((crypto && response.provider !== "bybit") ||
          (!crypto && (response.provider !== "oanda" || response.volumeKind !== "price_updates"))) {
        throw new Error("Wrong market data source returned from provider");
      }
      if (data.symbol !== symbol || data.timeframe.toLowerCase() !== timeframe.toLowerCase()) {
        throw new Error("Context response mismatch");
      }
      const sampledAt = Date.parse(data.timestamp);
      const duration = frameDuration[timeframe] ?? 900_000;
      const expiresAt = sampledAt + duration + Math.max(duration * 2, 120_000);
      const stale = !Number.isFinite(sampledAt) || Date.now() >= expiresAt;
      if (!active.signal.aborted) setAnalysisState({key, loading: false, data, error: "", stale,
        provider: String(response.provider), volumeKind: String(response.volumeKind ?? "")});
    } catch (error) {
      if (!active.signal.aborted) setAnalysisState({
        key, loading: false, data: null, stale: false, provider: "", volumeKind: "",
        error: error instanceof Error ? error.message : "Market context unavailable",
      });
    }
  }

  return (
    <div className="min-h-screen bg-[#03121c] font-sans text-[#e7f7ff]">
      <div className="flex min-h-screen">
        <TerminalSidebar/>
        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-[#133e53] bg-[#041522]/95 px-4 py-3 backdrop-blur-xl lg:px-5">
            <div className="flex items-center gap-2 lg:hidden">
              <button type="button" aria-label="Open Hidden Alpha navigation"
                aria-expanded={mobileMenuOpen} aria-controls="hiddenalpha-v2-mobile-drawer"
                onClick={()=>setMobileMenuOpen(true)}
                className="rounded-lg border border-[#226180] bg-[#08283b] p-2.5 text-[#b5edff] focus-visible:outline-2 focus-visible:outline-[#1cd1f2]">
                <Menu size={19}/>
              </button>
              <Mark/><strong className="whitespace-nowrap text-[12px]">HIDDEN ALPHA <span className="text-[#19cef2]">V2</span></strong>
            </div>
            <TopMarketStrip selected={symbol} onSelect={selectSymbol} watch={watch}/>
            <div className="rounded border border-[#145c70] bg-[#093044] px-2 py-1 text-[10px] text-[#b0d6e5]">
              <span className="mr-1 text-[#19dbac]">●</span> V2 Beta · Read-only
            </div>
          </header>
          <div className="mx-auto max-w-[1750px] space-y-3 px-3 py-4 lg:px-5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-lg border border-[#19546b] bg-[#061927] p-1">
                {(["crypto","forex"] as Market[]).map(type =>
                  <button type="button" key={type} aria-pressed={market===type} onClick={()=>selectMarket(type)}
                    className={"rounded-md px-5 py-2 text-[12px] font-bold " +
                      (market === type ? "bg-[#075f82] text-white shadow-[0_0_12px_#00bdfb40]" : "text-[#88abbc]")}>
                    {type === "crypto" ? "₿ Crypto" : "◈ Forex / Gold"}
                  </button>)}
              </div>
              <div className="relative flex items-center gap-2 rounded-lg border border-[#1a4f64] bg-[#071c2b] px-3 py-2">
                <Search size={15} className="shrink-0 text-[#86aec1]"/>
                <input ref={searchRef} value={query} onFocus={()=>setSearchOpen(true)}
                  onChange={event=>{setQuery(event.target.value);setSuggestionIndex(0);setSearchOpen(true);}}
                  onKeyDown={event=>{
                    if(event.key==="Escape"){setQuery("");setSearchOpen(false);searchRef.current?.blur();}
                    else if(event.key==="ArrowDown"){event.preventDefault();setSuggestionIndex(i=>Math.min(i+1,Math.max(0,matches.length-1)));}
                    else if(event.key==="ArrowUp"){event.preventDefault();setSuggestionIndex(i=>Math.max(0,i-1));}
                    else if(event.key==="Enter"&&matches.length){event.preventDefault();selectSymbol(matches[suggestionIndex]??matches[0]);}
                  }}
                  aria-label="Search symbols" aria-keyshortcuts="Meta+K Control+K /"
                  aria-expanded={searchOpen&&matches.length>0} aria-controls="v2-search-results"
                  placeholder="Search symbol"
                  className="w-32 bg-transparent text-[12px] outline-none placeholder:text-[#7195a7] sm:w-44"/>
                <kbd className="hidden rounded border border-[#265971] px-1 text-[9px] text-[#88acbd] sm:inline">⌘K</kbd>
                {searchOpen&&query.trim()&&<div id="v2-search-results" role="listbox"
                  className="absolute left-0 top-full z-50 mt-1 max-h-64 w-[min(88vw,310px)] overflow-y-auto rounded-lg border border-[#2784a4] bg-[#061c2c] p-1 shadow-2xl">
                  {matches.length?matches.map((id,i)=><button key={id} role="option"
                    aria-selected={i===suggestionIndex} type="button"
                    onMouseDown={event=>event.preventDefault()}
                    onClick={()=>selectSymbol(id)}
                    className={"flex w-full items-center gap-2 rounded px-3 py-2 text-left text-[11px] "+(i===suggestionIndex?"bg-[#0e4f69]":"hover:bg-[#103d52]")}>
                    <AssetBadge id={id} small/><span className="flex-1 font-bold">{id}</span>
                    <span className="text-[9px] text-[#83aabd]">{instruments[id].market}</span>
                  </button>):<p className="px-3 py-3 text-[11px] text-[#8daeba]">No matching markets</p>}
                </div>}
              </div>
              <div className="ml-auto flex flex-wrap gap-1 rounded-lg border border-[#195069] bg-[#061a28] p-1">
                {timeframes.map(tf=><button type="button" key={tf} aria-pressed={timeframe===tf} onClick={()=>{controller.current?.abort();setTimeframe(tf);}}
                  className={"rounded px-2 py-1 text-[11px] " +
                    (timeframe === tf ? "bg-[#08658b] text-white ring-1 ring-[#16aee0]" : "text-[#8cabbc]")}>{tf.toUpperCase()}</button>)}
              </div>
            </div>

            <div className={focusMode?"grid gap-3":"grid gap-3 xl:grid-cols-[minmax(0,1.85fr)_minmax(300px,.75fr)]"}>
              <section className={panel + " overflow-hidden p-3"}>
                <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-3">
                  <div className="flex items-center gap-3">
                    <AssetBadge id={symbol}/>
                    <div><h1 className="text-[19px] font-extrabold">{symbol}</h1>
                      <div className="text-[10px] text-[#83a8b9]">{selected.name} · {selected.venue}</div>
                    </div>
                  </div>
                  <LiveMarketQuote symbol={symbol}/>
                  <button type="button" onClick={()=>setFocusMode(v=>!v)}
                    aria-pressed={focusMode} aria-label={focusMode?"Exit chart focus mode":"Enter chart focus mode"}
                    title="Focus chart (F)"
                    className="rounded-md border border-[#23657f] p-2 text-[#91d4e9] hover:bg-[#0c3b52]">
                    {focusMode?<Minimize2 size={16}/>:<Maximize2 size={16}/>}
                  </button>
                </div>
                <TradingViewChart symbol={symbol} timeframe={timeframe} focus={focusMode}/>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-[#89adbe]">
                  <Check size={13} className="text-[#14d7a4]"/> Chart is hosted by TradingView; Hidden Alpha does not download or store its candles.
                  <span className="ml-auto text-[#6896ab]">No local candle sync</span>
                </div>
              </section>

              {!focusMode&&<AlphaDecisionBrief
                alpha={analysis}
                stale={oldData}
                loading={state?.loading===true}
                error={state?.error??""}
                symbol={symbol}
                timeframe={timeframe}
                crypto={crypto}
                onAnalyze={analyze}
              />}
            </div>

            {!focusMode&&<AlphaInsightsGrid
              alpha={analysis}
              stale={oldData}
              symbol={symbol}
              crypto={crypto}
            />}

            {!focusMode&&<div className="grid gap-3 xl:grid-cols-3">
              <DashboardLocalSummary/>
              <MarketWatchlist
                watch={watch}
                selected={symbol}
                onSelect={selectSymbol}
                query={query}
              />
            </div>}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#123c51] pt-3 text-[10px] text-[#759cae]">
              <div>TradingView hosts the chart. Alpha Engine fetches Bybit/OANDA candles on demand. Neither flow writes candles to Supabase.</div>
              <div className="flex flex-wrap gap-3">
                <Link href="/tools" className="inline-flex items-center gap-1 text-[#1bcaf5]"><Wrench size={12}/> Existing tools</Link>
                <Link href="/" className="inline-flex items-center gap-1 text-[#1bcaf5]"><ArrowUpRight size={12}/> Legacy dashboard</Link>
              </div>
            </div>
          </div>
        </main>
      </div>
      <MobileTerminalNav open={mobileMenuOpen} onClose={closeMobileMenu}/>
    </div>
  );
}

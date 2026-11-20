"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Activity, ArrowUpRight, BarChart3, BookOpen, BrainCircuit, Check,
  FlaskConical, Home, PlugZap, Search, ShieldCheck, Wallet, Wrench,
} from "lucide-react";
import { instruments, order, timeframes, panel, type Market, type SymbolKey } from "./instruments";
import { Mark, AssetBadge } from "./brand";
import LiveMarketQuote from "./live-market-quote";
import TradingViewChart from "./tradingview-chart";
import DashboardLocalSummary from "./dashboard-local-summary";
import AlphaDecisionBrief, {type VerifiedAlpha} from "./alpha-decision-brief";
import AlphaInsightsGrid from "./alpha-insights-grid";

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

const navigation = [
  { name: "Dashboard V2", href: "/v2", icon: Home, current: true },
  { name: "Market Desk", href: "/markets", icon: BarChart3 },
  { name: "AI Analysis", href: "/scanner", icon: BrainCircuit },
  { name: "Trading Journal", href: "/v2/journal", icon: BookOpen },
  { name: "Portfolio Analytics", href: "/v2/portfolio", icon: Wallet },
  { name: "Risk Manager", href: "/v2/risk", icon: ShieldCheck },
  { name: "Strategy Lab", href: "/tools", icon: FlaskConical },
  { name: "Integrations", href: "/tools", icon: PlugZap },
];

export default function TradingTerminal() {
  const [market, setMarket] = useState<Market>("crypto");
  const [symbol, setSymbol] = useState<SymbolKey>("BTCUSDT");
  const [timeframe, setTimeframe] = useState("15m");
  const [query, setQuery] = useState("");
  const [analysisState, setAnalysisState] = useState<AnalysisState | null>(null);
  const controller = useRef<AbortController | null>(null);
  const selected = instruments[symbol];
  const analysisKey = symbol + ":" + timeframe;
  const state = analysisState?.key === analysisKey ? analysisState : null;
  const analysis = state?.data ?? null;
  const oldData = state?.stale ?? false;
  const filtered = order.filter(id => instruments[id].market === market &&
    (id.toLowerCase().includes(query.toLowerCase()) ||
      instruments[id].name.toLowerCase().includes(query.toLowerCase())));
  const crypto = market === "crypto";

  useEffect(() => () => controller.current?.abort(), []);

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
        <aside className="hidden w-[208px] shrink-0 flex-col border-r border-[#133b4f] bg-[#041522] lg:flex">
          <div className="flex items-center gap-2 border-b border-[#173c4f] px-3 py-5">
            <Mark/>
            <div>
              <strong className="text-[14px] font-extrabold tracking-tight">HIDDEN ALPHA <span className="text-[#1bcaf5]">V2</span></strong>
              <div className="mt-1 text-[9px] tracking-[.16em] text-[#81adbf]">TRADING INTELLIGENCE</div>
            </div>
          </div>
          <nav className="flex-1 space-y-1 px-3 py-6">
            {navigation.map(({name,href,icon:Icon,current})=><Link key={name} href={href}
              className={"flex items-center gap-3 rounded-lg border px-3 py-3 text-[12px] transition " +
                (current ? "border-[#1baee0] bg-[#0b4562] text-white" :
                  "border-transparent text-[#91b0c0] hover:bg-[#123447]")}>
              <Icon size={17}/><span className="flex-1">{name}</span>
              {!current && !href.startsWith("/v2") && <span className="text-[8px] text-[#64899d]">OLD</span>}
            </Link>)}
          </nav>
          <div className="border-t border-[#15384d] p-4 text-[10px] leading-5 text-[#7295a8]">
            V2 is isolated from legacy background candle sync.
            <div className="mt-2 text-[#18c6f3]">Chart: TradingView</div>
            <div className="text-[#18c6f3]">Engine: Bybit / own API</div>
          </div>
        </aside>
        <main className="min-w-0 flex-1">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#133e53] px-4 py-3 lg:px-5">
            <div className="flex items-center gap-2 lg:hidden"><Mark/><strong>HIDDEN ALPHA V2</strong></div>
            <div className="flex flex-wrap gap-2">
              {(["BTCUSDT","ETHUSDT","XAUUSD","EURUSD"] as SymbolKey[]).map(id =>
                <button type="button" key={id} onClick={()=>selectSymbol(id)}
                  className={"flex items-center gap-2 rounded-lg border px-3 py-2 text-[11px] " +
                    (symbol === id ? "border-[#17bee9] bg-[#0a4965]" : "border-[#164255] bg-[#071b29] hover:border-[#0d85af]")}>
                  <AssetBadge id={id} small/><strong>{id}</strong>
                </button>)}
            </div>
            <div className="rounded border border-[#145c70] bg-[#093044] px-2 py-1 text-[10px] text-[#b0d6e5]">
              <span className="mr-1 text-[#19dbac]">●</span> V2 Beta · Read-only
            </div>
          </header>
          <div className="mx-auto max-w-[1750px] space-y-3 px-3 py-4 lg:px-5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-lg border border-[#19546b] bg-[#061927] p-1">
                {(["crypto","forex"] as Market[]).map(type =>
                  <button type="button" key={type} onClick={()=>selectMarket(type)}
                    className={"rounded-md px-5 py-2 text-[12px] font-bold " +
                      (market === type ? "bg-[#075f82] text-white shadow-[0_0_12px_#00bdfb40]" : "text-[#88abbc]")}>
                    {type === "crypto" ? "₿ Crypto" : "◈ Forex / Gold"}
                  </button>)}
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-[#1a4f64] bg-[#071c2b] px-3 py-2">
                <Search size={15} className="text-[#86aec1]"/>
                <input value={query} onChange={event=>setQuery(event.target.value)}
                  aria-label="Search symbols" placeholder="Search symbol"
                  className="w-32 bg-transparent text-[12px] outline-none placeholder:text-[#7195a7] sm:w-44"/>
              </div>
              <div className="ml-auto flex flex-wrap gap-1 rounded-lg border border-[#195069] bg-[#061a28] p-1">
                {timeframes.map(tf=><button type="button" key={tf} onClick={()=>{controller.current?.abort();setTimeframe(tf);}}
                  className={"rounded px-2 py-1 text-[11px] " +
                    (timeframe === tf ? "bg-[#08658b] text-white ring-1 ring-[#16aee0]" : "text-[#8cabbc]")}>{tf.toUpperCase()}</button>)}
              </div>
            </div>

            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.85fr)_minmax(300px,.75fr)]">
              <section className={panel + " overflow-hidden p-3"}>
                <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-3">
                  <div className="flex items-center gap-3">
                    <AssetBadge id={symbol}/>
                    <div><h1 className="text-[19px] font-extrabold">{symbol}</h1>
                      <div className="text-[10px] text-[#83a8b9]">{selected.name} · {selected.venue}</div>
                    </div>
                  </div>
                  <LiveMarketQuote symbol={symbol}/>
                </div>
                <TradingViewChart symbol={symbol} timeframe={timeframe}/>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-[#89adbe]">
                  <Check size={13} className="text-[#14d7a4]"/> Chart is hosted by TradingView; Hidden Alpha does not download or store its candles.
                  <span className="ml-auto text-[#6896ab]">No local candle sync</span>
                </div>
              </section>

              <AlphaDecisionBrief
                alpha={analysis}
                stale={oldData}
                loading={state?.loading===true}
                error={state?.error??""}
                symbol={symbol}
                timeframe={timeframe}
                crypto={crypto}
                onAnalyze={analyze}
              />
            </div>

            <AlphaInsightsGrid
              alpha={analysis}
              stale={oldData}
              symbol={symbol}
              crypto={crypto}
            />

            <div className="grid gap-3 xl:grid-cols-3">
              <DashboardLocalSummary/>
              <section className={panel + " p-4"}>
                <div className="flex items-center justify-between text-[13px] font-bold"><span className="flex items-center gap-2"><Activity size={16} className="text-[#20c6ee]"/> Market Watchlist</span><span className="text-[9px] font-normal text-[#7798a9]">Symbols only</span></div>
                <div className="mt-3 space-y-1">
                  {filtered.length ? filtered.map(id => <button key={id} type="button" onClick={()=>selectSymbol(id)}
                    className={"flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-[#123749] " + (symbol === id ? "bg-[#0b3a51]" : "")}>
                    <AssetBadge id={id} small/><span className="flex-1 text-[11px] font-semibold">{id}</span>
                    <span className="text-[10px] text-[#87adbf]">{instruments[id].venue}</span>
                  </button>) : <p className="p-3 text-[11px] text-[#87a7b5]">No symbols match your search.</p>}
                </div>
              </section>
            </div>
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
    </div>
  );
}

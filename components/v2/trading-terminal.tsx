"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Activity, ArrowUpRight, BarChart3, BookOpen, BrainCircuit, Check,
  CircleAlert, Clock3, FlaskConical, Gauge, Home, PlugZap, RefreshCw,
  Search, ShieldCheck, Wallet, Wrench, Zap
} from "lucide-react";
import { instruments, order, timeframes, panel, type Market, type SymbolKey } from "./instruments";
import { Mark, AssetBadge } from "./brand";
import LiveMarketQuote from "./live-market-quote";
import TradingViewChart from "./tradingview-chart";

type Alpha = {
  symbol: string;
  timeframe: string;
  timestamp: string;
  market: { bias: "BULLISH" | "BEARISH" | "NEUTRAL"; score: number; confidence: number };
  trend: { direction: string; strength: number };
  momentum: { direction: string; strength: number };
  volume: { condition: string; ratio: number };
  volatility: { level: string; value: number | null; percentage: number | null };
};

type AnalysisState = {
  key: string;
  loading: boolean;
  data: Alpha | null;
  error: string;
  stale: boolean;
};

const frameDuration: Record<string, number> = {
  "1m": 60_000, "3m": 180_000, "5m": 300_000, "15m": 900_000,
  "1h": 3_600_000, "4h": 14_400_000, "1d": 86_400_000,
};

function readAlpha(input: unknown): Alpha | null {
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
  return value as Alpha;
}

function Metric({label, value, sub, tone = "text-[#e9f7ff]"}: {
  label: string;
  value: string;
  sub?: string;
  tone?: string;
}) {
  return <div className={panel + " min-w-0 px-3 py-3"}>
    <div className="text-[10px] font-semibold text-[#8fafc0]">{label}</div>
    <div className={"mt-2 truncate text-[17px] font-bold " + tone} title={value}>{value}</div>
    <div className="mt-1 truncate text-[9px] text-[#7199ad]">{sub || "—"}</div>
  </div>;
}

const navigation = [
  { name: "Dashboard V2", href: "/v2", icon: Home, current: true },
  { name: "Market Desk", href: "/markets", icon: BarChart3 },
  { name: "AI Analysis", href: "/scanner", icon: BrainCircuit },
  { name: "Trading Journal", href: "/performance", icon: BookOpen },
  { name: "Risk Manager", href: "/tools", icon: ShieldCheck },
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
  const analyzedTimestamp = analysis ? Date.parse(analysis.timestamp) : NaN;
  const oldData = state?.stale ?? false;
  const currentBias = !analysis || oldData ? "NO TRADE" : analysis.market.bias;
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
    if (!crypto) return;
    controller.current?.abort();
    const active = new AbortController();
    controller.current = active;
    const key = analysisKey;
    setAnalysisState({key, loading: true, data: null, error: "", stale: false});
    try {
      const qs = new URLSearchParams({symbol, timeframe});
      const result = await fetch("/api/v2/analysis?" + qs.toString(), {
        cache: "no-store", signal: active.signal,
      });
      const payload: unknown = await result.json();
      if (!payload || typeof payload !== "object") throw new Error("Invalid engine response");
      const response = payload as Record<string, unknown>;
      const data = readAlpha(response.alpha);
      if (!result.ok || response.success !== true || !data) {
        throw new Error(typeof response.error === "string" ? response.error : "Market context unavailable");
      }
      if (data.symbol !== symbol || data.timeframe.toLowerCase() !== timeframe.toLowerCase()) {
        throw new Error("Context response mismatch");
      }
      const sampledAt = Date.parse(data.timestamp);
      const duration = frameDuration[timeframe] ?? 900_000;
      const expiresAt = sampledAt + duration + Math.max(duration * 2, 120_000);
      const stale = !Number.isFinite(sampledAt) || Date.now() >= expiresAt;
      if (!active.signal.aborted) setAnalysisState({key, loading: false, data, error: "", stale});
    } catch (error) {
      if (!active.signal.aborted) setAnalysisState({
        key, loading: false, data: null, stale: false,
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
              {!current && <span className="text-[8px] text-[#64899d]">OLD</span>}
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

              <section className={panel + " p-4"}>
                <div className="flex items-center justify-between border-b border-[#19485b] pb-3">
                  <h2 className="flex items-center gap-2 text-[13px] font-bold"><Zap size={18} className="text-[#1acbf5]"/> AI DECISION BRIEF</h2>
                  <span className="rounded border border-[#225168] px-2 py-1 text-[10px] text-[#a2c4d3]">{timeframe}</span>
                </div>
                <div className="mt-4 rounded-lg border border-[#14566c] bg-[#062435] p-4">
                  <div className="text-[10px] text-[#88abbc]">Stateless Alpha Engine · {symbol}</div>
                  <div className={"mt-2 text-[25px] font-extrabold " +
                    (currentBias === "BULLISH" ? "text-[#14dca4]" : currentBias === "BEARISH" ? "text-[#ff7182]" : "text-[#a2bbcc]")}>
                    {currentBias}
                  </div>
                  <div className="mt-1 text-[10px] text-[#91b5c7]">
                    {!crypto ? "Forex analysis connector not available" :
                      !analysis ? "No live analysis requested yet" :
                        oldData ? "Historical context is stale; not actionable" :
                          "Engine market bias, not a buy/sell instruction"}
                  </div>
                </div>
                <button type="button" onClick={analyze} disabled={!crypto || state?.loading === true}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-[#00b9e6] bg-[#075f84] px-3 py-3 text-[12px] font-bold text-white transition hover:bg-[#08799c] disabled:cursor-not-allowed disabled:border-[#36546a] disabled:bg-[#183447] disabled:text-[#82a1b0]">
                  {state?.loading ? <RefreshCw size={15} className="animate-spin"/> : <BrainCircuit size={16}/>}
                  {!crypto ? "Forex Engine: Coming Soon" : state?.loading ? "Analyzing market..." : "Analyze with Alpha Engine"}
                </button>
                {state?.error && <div role="alert" className="mt-3 rounded-lg border border-[#783e4a] bg-[#391a28] p-3 text-[11px] text-[#ffd3da]">
                  <CircleAlert size={13} className="mr-1 inline"/> {state.error}
                </div>}
                {analysis ? <div className="mt-4 space-y-2 text-[11px]">
                  <div className="flex justify-between border-b border-[#164253] py-2"><span className="text-[#98bac9]">Context Score</span><strong>{analysis.market.score} / 100</strong></div>
                  <div className="flex justify-between border-b border-[#164253] py-2"><span className="text-[#98bac9]">Engine Confidence*</span><strong>{analysis.market.confidence}%</strong></div>
                  <div className="flex justify-between border-b border-[#164253] py-2"><span className="text-[#98bac9]">Trend</span><strong>{analysis.trend.direction}</strong></div>
                  <div className="flex justify-between border-b border-[#164253] py-2"><span className="text-[#98bac9]">Momentum</span><strong>{analysis.momentum.direction}</strong></div>
                  <div className="flex justify-between border-b border-[#164253] py-2"><span className="text-[#98bac9]">Volume condition</span><strong>{analysis.volume.condition}</strong></div>
                  <div className="flex items-center gap-2 pt-2 text-[10px] text-[#85a9ba]">
                    <Clock3 size={13}/> Engine candle: {Number.isFinite(analyzedTimestamp) ? new Date(analyzedTimestamp).toLocaleString() : "Unknown"}
                  </div>
                </div> : <div className="mt-4 rounded-lg border border-dashed border-[#1a455a] p-4 text-[11px] leading-5 text-[#90b3c3]">
                  <Gauge size={18} className="mb-2 text-[#1bcaf5]"/>
                  Fast chart first. Alpha Engine computes from independent closed Bybit candles in memory, only when requested.
                </div>}
                <p className="mt-4 text-[10px] leading-5 text-[#779daf]">
                  *Confidence is an internal score, not an accuracy guarantee. TradingView chart data is separate from Bybit engine calculations.
                </p>
              </section>
            </div>

            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 2xl:grid-cols-6">
              <Metric label="Market Bias" value={analysis && !oldData ? analysis.market.bias : "NO TRADE"} sub={oldData ? "Stale engine context" : crypto ? "After requesting analysis" : "Forex adapter pending"}
                tone={analysis && !oldData && analysis.market.bias === "BULLISH" ? "text-[#1ddcb1]" : "text-[#c5d7df]"}/>
              <Metric label="Context Score" value={analysis ? String(analysis.market.score) + " / 100" : "—"} sub="Own Alpha Engine"/>
              <Metric label="Trend / Momentum" value={analysis ? analysis.trend.direction + " / " + analysis.momentum.direction : "—"} sub="Computed context"/>
              <Metric label="Relative Volume" value={analysis ? analysis.volume.ratio.toFixed(2) + "×" : "—"} sub="Against recent candles"/>
              <Metric label="Volatility" value={analysis ? analysis.volatility.level : "—"} sub={analysis?.volatility.percentage != null ? analysis.volatility.percentage.toFixed(2) + "%" : "Provider-dependent"}/>
              <Metric label="Data State" value={!crypto ? "Not connected" : state?.loading ? "Analyzing" : state?.error ? "Unavailable" : analysis ? oldData ? "Stale" : "Calculated" : "Not requested"}
                sub="No fabricated market signals" tone={analysis && !oldData ? "text-[#14dbaa]" : "text-[#a3bfcc]"}/>
            </div>

            <div className="grid gap-3 xl:grid-cols-3">
              <section className={panel + " p-4"}>
                <div className="flex items-center gap-2 text-[13px] font-bold"><Wallet size={16} className="text-[#20c6ee]"/> Portfolio Overview</div>
                <div className="mt-4 text-[22px] font-bold text-[#a6c0ce]">Not connected</div>
                <p className="mt-2 text-[11px] leading-5 text-[#8caebd]">Portfolio values require authenticated broker or account data. No sample P&L is presented as real.</p>
                <Link href="/performance" className="mt-4 inline-flex items-center gap-1 text-[11px] text-[#1ccbf4]">View existing performance (legacy) <ArrowUpRight size={12}/></Link>
              </section>
              <section className={panel + " p-4"}>
                <div className="flex items-center gap-2 text-[13px] font-bold"><BookOpen size={16} className="text-[#20c6ee]"/> Trading Journal</div>
                <div className="mt-4 text-[22px] font-bold text-[#a6c0ce]">Awaiting trade sync</div>
                <p className="mt-2 text-[11px] leading-5 text-[#8caebd]">Journal requires real executions, fee and funding reconciliation; planned read-only import via broker or CSV.</p>
                <Link href="/performance" className="mt-4 inline-flex items-center gap-1 text-[11px] text-[#1ccbf4]">Open existing journal (legacy) <ArrowUpRight size={12}/></Link>
              </section>
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
              <div>TradingView hosts the chart. Alpha Engine fetches independent Bybit candles on request. Neither flow writes candles to Supabase.</div>
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

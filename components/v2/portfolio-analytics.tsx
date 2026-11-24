"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  ArrowLeft, ArrowUpRight, BookOpen, Download, FileUp, Info, Pencil,
  Plus, ShieldAlert, Trash2, Wallet, X,
} from "lucide-react";
import { Mark, AssetBadge } from "./brand";
import { instruments, order, type SymbolKey } from "./instruments";
import {
  EMPTY_PORTFOLIO, PORTFOLIO_STORAGE_KEY, PORTFOLIO_UPDATE_EVENT,
  PORTFOLIO_MAX_HOLDINGS, calculatePortfolioAnalytics, decodeManualPortfolio,
  exportHoldingsCsv, importHoldingsCsv, validateManualPortfolio, validateTrackedHolding,
  type ManualPortfolio, type PortfolioSymbol, type TrackedHolding,
} from "@/lib/trading/v2/portfolio";
import {
  JOURNAL_STORAGE_KEY, calculateJournalStatistics, decodeJournalStorage,
} from "@/lib/trading/v2/journal";

const panel = "rounded-xl border border-[#1b475d] bg-[#091e2d] p-4";
const EMPTY_SNAPSHOT = JSON.stringify(EMPTY_PORTFOLIO);

function subscribePortfolio(callback: () => void) {
  window.addEventListener(PORTFOLIO_UPDATE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(PORTFOLIO_UPDATE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
function portfolioSnapshot() {
  try {return window.localStorage.getItem(PORTFOLIO_STORAGE_KEY) ?? EMPTY_SNAPSHOT;}
  catch {return EMPTY_SNAPSHOT;}
}
function portfolioServerSnapshot() {return EMPTY_SNAPSHOT;}

function subscribeJournal(callback: () => void) {
  window.addEventListener("hiddenalpha:v2:journal-updated", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("hiddenalpha:v2:journal-updated", callback);
    window.removeEventListener("storage", callback);
  };
}
function journalSnapshot() {
  try {return window.localStorage.getItem(JOURNAL_STORAGE_KEY) ?? "[]";}
  catch {return "[]";}
}
function journalServerSnapshot() {return "[]";}

function usd(value:number) {
  return value.toLocaleString("en-US", {style:"currency",currency:"USD",maximumFractionDigits:2});
}
function num(value:number,maximumFractionDigits=6) {
  return value.toLocaleString("en-US",{maximumFractionDigits});
}
type HoldingForm = {
  symbol: PortfolioSymbol;
  quantity: string;
  costPerUnitUsd: string;
  markPerUnitUsd: string;
};
function blankForm():HoldingForm {
  return {symbol:"BTCUSDT",quantity:"",costPerUnitUsd:"",markPerUnitUsd:""};
}
function Input({label,value,onChange,hint,placeholder}:{
  label:string;value:string;onChange:(next:string)=>void;hint?:string;placeholder?:string;
}) {
  return <label className="flex min-w-0 flex-col gap-1.5">
    <span className="text-[11px] font-semibold text-[#b4d0dd]">{label}</span>
    <input value={value} onChange={event=>onChange(event.target.value)}
      type="text" inputMode="decimal" placeholder={placeholder ?? "Enter value"}
      className="w-full min-w-0 rounded-lg border border-[#245166] bg-[#061723] px-3 py-2.5 text-[12px] text-[#e9f8ff] outline-none placeholder:text-[#577c90] focus:border-[#19c9ee]"/>
    {hint && <span className="text-[10px] leading-4 text-[#86a7b9]">{hint}</span>}
  </label>;
}
function Metric({title,value,description,tone="text-[#e8f8ff]"}:{
  title:string;value:string;description:string;tone?:string;
}) {
  return <div className={panel}>
    <div className="text-[11px] text-[#90b2c3]">{title}</div>
    <div className={"mt-2 text-[22px] font-extrabold "+tone}>{value}</div>
    <div className="mt-1 text-[10px] leading-4 text-[#789eb0]">{description}</div>
  </div>;
}
function triggerFileDownload(filename:string, text:string, contentType:string) {
  const objectUrl = URL.createObjectURL(new Blob([text],{type:contentType}));
  const element = document.createElement("a");
  element.href=objectUrl;element.download=filename;document.body.appendChild(element);
  element.click();element.remove();
  window.setTimeout(()=>URL.revokeObjectURL(objectUrl),30_000);
}

export default function V2Portfolio() {
  const raw = useSyncExternalStore(subscribePortfolio,portfolioSnapshot,portfolioServerSnapshot);
  const journalRaw = useSyncExternalStore(subscribeJournal,journalSnapshot,journalServerSnapshot);
  const parsed = useMemo(()=>{
    try{return {portfolio:decodeManualPortfolio(raw),error:""};}
    catch(error){return {portfolio:EMPTY_PORTFOLIO,error:error instanceof Error?error.message:"Invalid saved portfolio"};}
  },[raw]);
  const journal = useMemo(()=>{
    try{return {stats:calculateJournalStatistics(decodeJournalStorage(journalRaw)),error:""};}
    catch(error){return {stats:null,error:error instanceof Error?error.message:"Invalid saved journal"};}
  },[journalRaw]);
  const analytics = useMemo(()=>calculatePortfolioAnalytics(parsed.portfolio),[parsed.portfolio]);
  const [form,setForm]=useState<HoldingForm>(blankForm);
  const [editingId,setEditingId]=useState<string|null>(null);
  const [cashInput,setCashInput]=useState<string|null>(null);
  const [error,setError]=useState("");
  const [status,setStatus]=useState("");
  const csvInputRef=useRef<HTMLInputElement>(null);
  const backupInputRef=useRef<HTMLInputElement>(null);

  const cashDraft = cashInput === null ? String(parsed.portfolio.cashUsd) : cashInput;
  function update<K extends keyof HoldingForm>(field:K,value:HoldingForm[K]) {
    setForm(previous=>({...previous,[field]:value}));
  }
  function save(portfolio:ManualPortfolio,successMessage:string) {
    if(parsed.error)throw new Error("Saved portfolio is invalid. Export the original browser data before changes.");
    const valid=validateManualPortfolio(portfolio);
    window.localStorage.setItem(PORTFOLIO_STORAGE_KEY,JSON.stringify(valid));
    window.dispatchEvent(new Event(PORTFOLIO_UPDATE_EVENT));
    setError("");setStatus(successMessage);
  }
  function saveCash(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();setStatus("");
    try {
      if(!cashDraft.trim())throw new Error("Enter a cash balance in USD.");
      const cashUsd=Number(cashDraft);
      save({...parsed.portfolio,cashUsd},"Cash balance updated. This is a manually tracked amount.");
      setCashInput(null);
    } catch(error) {
      setError(error instanceof Error?error.message:"Unable to update cash.");
    }
  }
  function submit(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();setStatus("");
    try{
      if(!form.quantity.trim()||!form.costPerUnitUsd.trim()||!form.markPerUnitUsd.trim())
        throw new Error("Fill in quantity, average cost, and manual mark price.");
      const existing=parsed.portfolio.holdings.find(h=>h.id===editingId);
      const holding=validateTrackedHolding({
        id:editingId??crypto.randomUUID(),
        symbol:form.symbol,
        quantity:Number(form.quantity),
        costPerUnitUsd:Number(form.costPerUnitUsd),
        markPerUnitUsd:Number(form.markPerUnitUsd),
        markedAt: new Date().toISOString(),
      });
      const holdings = existing
        ? parsed.portfolio.holdings.map(h=>h.id===editingId?holding:h)
        : [...parsed.portfolio.holdings,holding];
      save({...parsed.portfolio,holdings},
        existing?"Tracked holding updated.":"Tracked holding added.");
      setEditingId(null);setForm(blankForm());
    }catch(error){setError(error instanceof Error?error.message:"Unable to save holding.");}
  }
  function edit(holding:TrackedHolding){
    setEditingId(holding.id);
    setForm({
      symbol:holding.symbol, quantity:String(holding.quantity),
      costPerUnitUsd:String(holding.costPerUnitUsd),
      markPerUnitUsd:String(holding.markPerUnitUsd),
    });
    setError("");setStatus("Editing "+holding.symbol+". Update the form above to save a new manual mark.");
    window.scrollTo({top:0,behavior:"smooth"});
  }
  function remove(holding:TrackedHolding){
    if(!window.confirm("Delete this manually tracked "+holding.symbol+" holding? This does not place an order."))return;
    try{
      save({...parsed.portfolio,
        holdings:parsed.portfolio.holdings.filter(h=>h.id!==holding.id)},
        "Tracked holding deleted.");
      if(editingId===holding.id){setEditingId(null);setForm(blankForm());}
    }catch(error){setError(error instanceof Error?error.message:"Unable to delete holding.");}
  }

  async function importCsv(event:React.ChangeEvent<HTMLInputElement>){
    const file=event.target.files?.[0];event.target.value="";if(!file)return;
    setError("");setStatus("");
    try{
      if(file.size>1_500_000)throw new Error("CSV exceeds 1.5 MB.");
      const incoming=importHoldingsCsv(await file.text());
      const existing=new Set(parsed.portfolio.holdings.map(h=>h.id));
      const fresh=incoming.filter(h=>!existing.has(h.id));
      save({...parsed.portfolio,holdings:[...parsed.portfolio.holdings,...fresh]},
        "Imported "+fresh.length+" holdings; skipped "+(incoming.length-fresh.length)+" existing IDs.");
    }catch(error){setError(error instanceof Error?error.message:"CSV import failed. No changes saved.");}
  }
  async function restoreJson(event:React.ChangeEvent<HTMLInputElement>){
    const file=event.target.files?.[0];event.target.value="";if(!file)return;
    setError("");setStatus("");
    try{
      if(file.size>250_000)throw new Error("Portfolio backup exceeds 250 KB.");
      const restored=decodeManualPortfolio(await file.text());
      if(!window.confirm("Restore this backup? This will REPLACE the current manual cash and holdings in this browser. The Trading Journal will not be changed."))return;
      save(restored,"Portfolio backup restored. Journal was not modified.");
      setEditingId(null);setForm(blankForm());setCashInput(null);
    }catch(error){setError(error instanceof Error?error.message:"Backup restore failed. No changes saved.");}
  }

  const empty=analytics.holdingCount===0&&parsed.portfolio.cashUsd===0;
  return <main className="min-h-screen bg-[#03131d] px-4 py-6 font-sans text-[#e8f7ff] md:px-8">
    <div className="mx-auto max-w-[1400px] space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#194355] pb-5">
        <div className="flex items-center gap-3"><Mark/><div>
          <div className="text-[10px] font-bold tracking-[.2em] text-[#18c6f3]">HIDDEN ALPHA V2</div>
          <h1 className="text-[24px] font-extrabold">Portfolio Analytics</h1>
          <p className="mt-1 text-[11px] text-[#86a9ba]">Manual marked holdings · Cash · Separate realized journal</p>
        </div></div>
        <div className="flex flex-wrap gap-2">
          <Link href="/v2/journal" className="inline-flex items-center gap-2 rounded-lg border border-[#266078] bg-[#0a293c] px-3 py-2 text-[12px]"><BookOpen size={15}/> Journal</Link>
          <Link href="/v2" className="inline-flex items-center gap-2 rounded-lg border border-[#176c89] bg-[#08384d] px-3 py-2 text-[12px]"><ArrowLeft size={15}/> Terminal</Link>
        </div>
      </header>
      <div className="flex items-start gap-3 rounded-lg border border-[#1c5f74] bg-[#092d41] p-3 text-[11px] leading-5 text-[#add1df]">
        <ShieldAlert size={19} className="mt-0.5 shrink-0 text-[#28d1f2]"/>
        <span><strong>Local-only and manually marked.</strong> Holdings, cost, marks and cash are entered by you—NOT synced with a broker and NOT live market prices. Nothing is written to Supabase. Browser storage is not encrypted, can be lost when site data is cleared, and is accessible to scripts running on this origin. Export a JSON backup regularly.</span>
      </div>
      {parsed.error&&<div role="alert" className="rounded-lg border border-[#9a4f5d] bg-[#331922] p-3 text-[12px] text-[#ffd4df]">Saved portfolio cannot be read: {parsed.error}. Existing browser data was not overwritten.</div>}
      {error&&<div role="alert" className="rounded-lg border border-[#9a4f5d] bg-[#331922] p-3 text-[12px] text-[#ffd4df]">{error}</div>}
      {status&&<div role="status" className="rounded-lg border border-[#297466] bg-[#093932] p-3 text-[12px] text-[#a4f8da]">{status}</div>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric title="Marked holdings + tracked cash" value={empty?"—":usd(analytics.markedPortfolioValueUsd)} description="Not full net worth · no loans, derivatives or external wallets"/>
        <Metric title="Holdings marked value" value={analytics.holdingCount?usd(analytics.markedHoldingsValueUsd):"—"} description={analytics.holdingCount+" manually entered long-only holdings"}/>
        <Metric title="Unrealized P&L" value={analytics.holdingCount?usd(analytics.unrealizedPnlUsd):"—"}
          tone={analytics.unrealizedPnlUsd>=0?"text-[#16d9a9]":"text-[#fa8191]"}
          description={analytics.unrealizedReturnPercent===null?"Requires holdings":"From current manual marks · "+analytics.unrealizedReturnPercent.toFixed(2)+"% on cost"}/>
        <Metric title="Tracked cash (USD)" value={usd(parsed.portfolio.cashUsd)} description={empty?"No portfolio data entered yet":"Cash is not automatically reconciled to journal trades"}/>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(310px,.9fr)_minmax(0,1.45fr)]">
        <div className="space-y-4">
          <section className={panel}>
            <h2 className="mb-3 flex items-center gap-2 border-b border-[#22495b] pb-3 text-[14px] font-bold"><Wallet size={17} className="text-[#20c4e8]"/> Tracked cash</h2>
            <form className="flex items-end gap-3" onSubmit={saveCash}>
              <div className="min-w-0 flex-1"><Input label="Cash in USD (manual)" value={cashDraft} onChange={setCashInput} hint="Set a balance; this does not execute deposits or transfers."/></div>
              <button type="submit" disabled={Boolean(parsed.error)}
                className="rounded-lg border border-[#0eaacf] bg-[#065f82] px-4 py-2.5 text-[11px] font-semibold disabled:opacity-40">Update</button>
            </form>
          </section>
          <section className={panel}>
            <div className="mb-3 flex items-center justify-between border-b border-[#22495b] pb-3">
              <h2 className="flex items-center gap-2 text-[14px] font-bold"><Plus size={17} className="text-[#1ac4f1]"/>{editingId?"Edit holding":"Add holding"}</h2>
              {editingId&&<button type="button" onClick={()=>{setEditingId(null);setForm(blankForm());setStatus("");}} className="inline-flex items-center gap-1 text-[11px] text-[#b6cede]"><X size={13}/> Cancel</button>}
            </div>
            <p className="mb-4 text-[10px] leading-5 text-[#89aabb]">For long, spot-like holdings only. Not a leveraged position or perpetual futures P&L calculator. Mark prices must be updated manually.</p>
            <form className="space-y-4" onSubmit={submit}>
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold text-[#b4d0dd]">Asset</span>
                <select value={form.symbol} onChange={e=>update("symbol",e.target.value as PortfolioSymbol)}
                  className="rounded-lg border border-[#245166] bg-[#061723] px-3 py-2.5 text-[12px]">
                  {order.map(id=><option key={id} value={id}>{id} · {instruments[id].name}</option>)}
                </select>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Units owned" value={form.quantity} onChange={v=>update("quantity",v)}
                  hint={form.symbol==="XAUUSD"?"Troy ounces":form.symbol==="EURUSD"||form.symbol==="GBPUSD"?"Base currency units":"Base crypto units"}/>
                <Input label="Average cost per unit (USD)" value={form.costPerUnitUsd} onChange={v=>update("costPerUnitUsd",v)}/>
                <Input label="Current manual mark / unit (USD)" value={form.markPerUnitUsd} onChange={v=>update("markPerUnitUsd",v)}
                  hint="This is your input, not a TradingView or Bybit live quote."/>
              </div>
              <button type="submit" disabled={Boolean(parsed.error)}
                className="w-full rounded-lg border border-[#0ba8cf] bg-[#086386] px-4 py-3 text-[12px] font-bold disabled:opacity-40">{editingId?"Update manual holding":"Save manual holding"}</button>
            </form>
          </section>
          <section className={panel}>
            <h2 className="mb-3 text-[14px] font-bold">Backup & import</h2>
            <p className="mb-3 text-[10px] leading-5 text-[#8cadbc]">JSON backup includes cash and all holdings. Holdings CSV includes holdings only—not your cash balance. Imports are validated before saving.</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={Boolean(parsed.error)} onClick={()=>triggerFileDownload("hiddenalpha-v2-portfolio-backup.json",JSON.stringify(parsed.portfolio,null,2),"application/json")}
                className="inline-flex items-center gap-1.5 rounded border border-[#226480] px-3 py-2 text-[11px] disabled:opacity-40"><Download size={13}/> Backup JSON</button>
              {parsed.error && <button type="button" onClick={()=>triggerFileDownload("hiddenalpha-v2-portfolio-unparsed.txt",raw,"text/plain;charset=utf-8")}
                className="inline-flex items-center gap-1.5 rounded border border-[#9b5860] px-3 py-2 text-[11px] text-[#ffb6c4]"><Download size={13}/> Export raw data for recovery</button>}
              <button type="button" disabled={Boolean(parsed.error)} onClick={()=>backupInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded border border-[#226480] px-3 py-2 text-[11px] disabled:opacity-40"><FileUp size={13}/> Restore JSON</button>
              <button type="button" disabled={Boolean(parsed.error)} onClick={()=>triggerFileDownload("hiddenalpha-v2-holdings.csv",exportHoldingsCsv(parsed.portfolio.holdings),"text/csv;charset=utf-8")}
                className="inline-flex items-center gap-1.5 rounded border border-[#226480] px-3 py-2 text-[11px] disabled:opacity-40"><Download size={13}/> Export CSV</button>
              <button type="button" disabled={Boolean(parsed.error)} onClick={()=>csvInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded border border-[#226480] px-3 py-2 text-[11px] disabled:opacity-40"><FileUp size={13}/> Import CSV</button>
            </div>
            <input ref={backupInputRef} hidden type="file" accept=".json,application/json" onChange={restoreJson}/>
            <input ref={csvInputRef} hidden type="file" accept=".csv,text/csv" onChange={importCsv}/>
          </section>
        </div>
        <div className="space-y-4">
          <section className={panel}>
            <div className="mb-4 flex items-center justify-between border-b border-[#214658] pb-3">
              <h2 className="text-[14px] font-bold">Marked value allocation</h2>
              <span className="text-[10px] text-[#799db0]">Cash + long holdings</span>
            </div>
            {empty?<div className="grid min-h-32 place-items-center text-center text-[12px] text-[#82a7ba]">No portfolio recorded yet. Add tracked cash or a holding to see allocation.</div>:<div className="space-y-4">
              {analytics.instrumentAllocations.map(asset=><div key={asset.symbol}>
                <div className="flex items-center justify-between gap-3 text-[11px]">
                  <div className="flex items-center gap-2"><AssetBadge id={asset.symbol as SymbolKey} small/><strong>{asset.symbol}</strong></div>
                  <div className="text-right text-[#bbd4e0]">{usd(asset.markedValueUsd)} <span className="ml-2 text-[#8aabbb]">{asset.percent.toFixed(1)}%</span></div>
                </div>
                <div className="mt-2 h-2 rounded-full bg-[#153547]">
                  <div className="h-2 rounded-full" style={{width:asset.percent.toFixed(3)+"%",background:instruments[asset.symbol].color}}/>
                </div>
              </div>)}
              {parsed.portfolio.cashUsd>0&&<div>
                <div className="flex items-center justify-between text-[11px]"><strong>Cash (USD)</strong><span>{usd(parsed.portfolio.cashUsd)} · {analytics.cashAllocationPercent?.toFixed(1)}%</span></div>
                <div className="mt-2 h-2 rounded-full bg-[#153547]"><div className="h-2 rounded-full bg-[#65a8c6]" style={{width:analytics.cashAllocationPercent?.toFixed(3)+"%"}}/></div>
              </div>}
            </div>}
            <p className="mt-4 text-[10px] leading-5 text-[#82a8b9]">This is marked value allocation for user-entered long holdings, not actual broker exposure, leverage, or global net worth.</p>
          </section>
          <section className={panel}>
            <div className="mb-4 flex items-center justify-between gap-2 border-b border-[#214658] pb-3">
              <h2 className="text-[14px] font-bold">Manually tracked holdings</h2>
              <span className="text-[10px] text-[#7d9eaf]">{analytics.holdingCount} entries</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full whitespace-nowrap text-left text-[11px]">
                <thead className="border-b border-[#1a455a] text-[#94b5c3]">
                  <tr><th className="px-2 py-3">Asset</th><th className="px-2 py-3">Units</th><th className="px-2 py-3">Mark / unit</th><th className="px-2 py-3">Marked value</th><th className="px-2 py-3">Unrealized</th><th className="px-2 py-3 text-right">Actions</th></tr>
                </thead>
                <tbody>{analytics.holdings.map(h=><tr key={h.id} className="border-b border-[#173b4d]">
                  <td className="px-2 py-3">
                    <span className="flex items-center gap-1.5"><AssetBadge id={h.symbol as SymbolKey} small/><strong>{h.symbol}</strong></span>
                    <div className="mt-1 text-[9px] text-[#7197aa]">Marked: {new Date(h.markedAt).toLocaleDateString()}</div>
                  </td>
                  <td className="px-2 py-3">{num(h.quantity,8)}</td>
                  <td className="px-2 py-3">{num(h.markPerUnitUsd,6)}</td>
                  <td className="px-2 py-3">{usd(h.markedValueUsd)}</td>
                  <td className={"px-2 py-3 font-semibold "+(h.unrealizedPnlUsd>=0?"text-[#20d7ac]":"text-[#ff8395]")}>
                    {usd(h.unrealizedPnlUsd)}<div className="text-[9px] font-normal">{h.unrealizedReturnPercent.toFixed(2)}%</div>
                  </td>
                  <td className="px-2 py-3 text-right">
                    <button type="button" onClick={()=>edit(h)} aria-label={"Edit "+h.symbol+" holding"} className="rounded p-2 text-[#9bd6ed] hover:bg-[#174054]"><Pencil size={13}/></button>
                    <button type="button" onClick={()=>remove(h)} aria-label={"Delete "+h.symbol+" holding"} className="rounded p-2 text-[#ffa3b1] hover:bg-[#472532]"><Trash2 size={13}/></button>
                  </td>
                </tr>)}
                {!analytics.holdings.length&&<tr><td colSpan={6} className="py-10 text-center text-[#82a3b5]">No holdings saved.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
          <section className={panel}>
            <h2 className="flex items-center gap-2 border-b border-[#22495b] pb-3 text-[14px] font-bold"><BookOpen size={16} className="text-[#20c5ec]"/> Trading Journal — realized results</h2>
            {journal.error?<p className="mt-3 text-[11px] text-[#ffb6c5]">Journal data could not be read: {journal.error}</p>:<div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div><div className="text-[10px] text-[#83aab9]">Closed trades</div><div className="mt-2 text-[19px] font-bold">{journal.stats?.totalTrades??0}</div></div>
              <div><div className="text-[10px] text-[#83aab9]">Realized net P&L</div><div className={"mt-2 text-[19px] font-bold "+((journal.stats?.netPnlUsdEquivalent??0)>=0?"text-[#24dfb1]":"text-[#ff8598]")}>{journal.stats?.totalTrades?usd(journal.stats.netPnlUsdEquivalent):"—"}</div></div>
              <div><div className="text-[10px] text-[#83aab9]">Win rate</div><div className="mt-2 text-[19px] font-bold">{journal.stats?.winRatePercent==null?"—":journal.stats.winRatePercent.toFixed(1)+"%"}</div></div>
            </div>}
            <p className="mt-4 flex items-start gap-2 text-[10px] leading-5 text-[#8eafbf]"><Info size={14} className="mt-0.5 shrink-0"/>Realized Journal P&L is shown separately; it is NOT added to marked portfolio value or unrealized P&L. Open holdings are not inferred from closed trades, preventing double counting.</p>
            <Link href="/v2/journal" className="mt-3 inline-flex items-center gap-1 text-[11px] text-[#1ac8f2]">Open Trading Journal <ArrowUpRight size={12}/></Link>
          </section>
        </div>
      </div>
      <p className="border-t border-[#19475a] pt-3 text-[10px] leading-5 text-[#789dae]">Beta limitations: manually tracked long-only spot-like holdings, no shorts, margin, funding, account reconciliation, FX settlement, execution fees or market-price streaming. Asset marks may be outdated. Values in USDT are treated as USD-equivalent without applying a conversion rate.</p>
    </div>
  </main>;
}

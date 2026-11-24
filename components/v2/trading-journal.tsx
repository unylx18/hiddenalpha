"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  ArrowLeft, BookOpen, Download, FileUp, Pencil, Plus, ShieldAlert,
  Trash2, TrendingUp, X, Info,
} from "lucide-react";
import { Mark, AssetBadge } from "./brand";
import { instruments, order, type SymbolKey } from "./instruments";
import {
  JOURNAL_STORAGE_KEY, JOURNAL_MAX_TRADES, calculateJournalStatistics,
  decodeJournalStorage, exportJournalCsv, importJournalCsv,
  tradeNetPnl, validateClosedTrade, type ClosedTrade, type JournalDirection,
  type JournalSymbol,
} from "@/lib/trading/v2/journal";

const UPDATE_EVENT = "hiddenalpha:v2:journal-updated";
const panel = "rounded-xl border border-[#1b455a] bg-[#081e2e] p-4";

function subscribe(callback: () => void) {
  window.addEventListener(UPDATE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(UPDATE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
function snapshot() {
  try { return window.localStorage.getItem(JOURNAL_STORAGE_KEY) ?? "[]"; }
  catch { return "[]"; }
}
function serverSnapshot() { return "[]"; }

function usd(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 2,
  });
}
function number(value: number, digits = 6) {
  return value.toLocaleString("en-US", { maximumFractionDigits: digits });
}
function dateInputValue(value = new Date()) {
  return new Date(value.getTime() - value.getTimezoneOffset() * 60_000)
    .toISOString().slice(0, 16);
}
function toInputTime(iso: string) { return dateInputValue(new Date(iso)); }
function parseInputTime(value: string) {
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) throw new Error("Enter valid open and close dates.");
  return d.toISOString();
}
type FormData = {
  symbol: JournalSymbol; direction: JournalDirection;
  quantity: string; entry: string; exit: string;
  feesUsd: string; riskUsd: string; openedAt: string; closedAt: string; notes: string;
};
const blankForm = (): FormData => ({
  symbol: "BTCUSDT", direction: "LONG",
  quantity: "", entry: "", exit: "", feesUsd: "0", riskUsd: "",
  // Keep server/client first render stable; user enters actual execution timestamps.
  openedAt: "", closedAt: "", notes: "",
});

function Field({ name, value, update, kind = "text", hint, placeholder }: {
  name: string; value: string; update: (value: string) => void;
  kind?: "text" | "datetime-local"; hint?: string; placeholder?: string;
}) {
  return <label className="flex min-w-0 flex-col gap-1.5">
    <span className="text-[11px] font-semibold text-[#b6d2e0]">{name}</span>
    <input type={kind} inputMode={kind === "text" ? "decimal" : undefined}
      value={value} onChange={event => update(event.target.value)}
      placeholder={placeholder ?? ""}
      className="min-w-0 w-full rounded-lg border border-[#285165] bg-[#061724] px-3 py-2 text-[12px] text-[#ecf9ff] outline-none focus:border-[#1fcbec]"/>
    {hint && <span className="text-[10px] text-[#88a9b8]">{hint}</span>}
  </label>;
}

function SummaryCard({label, value, note, color = "text-[#e9f9ff]"}: {
  label: string; value: string; note?: string; color?: string;
}) {
  return <div className={panel}>
    <div className="text-[11px] text-[#91b3c3]">{label}</div>
    <div className={"mt-2 text-[21px] font-extrabold " + color}>{value}</div>
    {note && <div className="mt-1 text-[10px] text-[#789caf]">{note}</div>}
  </div>;
}

function RealizedPnlChart({trades}: {trades: ClosedTrade[]}) {
  const stats = useMemo(()=>calculateJournalStatistics(trades),[trades]);
  if (stats.equityPoints.length < 2) return <div className="grid h-40 place-items-center text-[11px] text-[#739bae]">Add at least two closed trades to see the curve.</div>;
  const values = [0, ...stats.equityPoints.map(p=>p.cumulativePnl)];
  const min = Math.min(...values), max = Math.max(...values);
  const pad = Math.max(1, (max-min)*.12);
  const low = min-pad, high = max+pad;
  const x = (i: number) => 26+i/Math.max(1,values.length-1)*650;
  const y = (v: number) => 174-(v-low)/(high-low)*150;
  const points = values.map((v,i)=>x(i).toFixed(2)+","+y(v).toFixed(2)).join(" ");
  return <div>
    <svg viewBox="0 0 720 204" role="img" aria-label="Realized cumulative net profit and loss by closed trade" className="w-full">
      <rect x="0" y="0" width="720" height="204" fill="#061724"/>
      {[0,.25,.5,.75,1].map(frac=><line key={frac} x1="26" x2="681" y1={24+frac*150} y2={24+frac*150} stroke="#214457" strokeDasharray="3 5"/>)}
      {low <= 0 && high >= 0 && <line x1="26" x2="681" y1={y(0)} y2={y(0)} stroke="#85a2b7" strokeDasharray="5 4" opacity=".7"/>}
      <polyline points={points} fill="none" stroke="#19d7c3" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
      <text x="690" y="28" fontSize="11" fill="#94b7c9" textAnchor="end">{usd(max)}</text>
      <text x="690" y="190" fontSize="11" fill="#94b7c9" textAnchor="end">{usd(min)}</text>
    </svg>
    <p className="mt-2 text-[10px] text-[#8daebd]">Cumulative realized net P&L from a zero baseline. Not a live account equity curve; deposits and open positions are excluded.</p>
  </div>;
}

export default function V2TradingJournal() {
  const raw = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const decoded = useMemo(() => {
    try { return { trades: decodeJournalStorage(raw), storageError: "" }; }
    catch (error) { return { trades: [] as ClosedTrade[], storageError: error instanceof Error ? error.message : "Stored journal cannot be read" }; }
  }, [raw]);
  const trades = decoded.trades;
  const stats = useMemo(()=>calculateJournalStatistics(trades),[trades]);
  const [form, setForm] = useState<FormData>(blankForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [alert, setAlert] = useState("");
  const [error, setError] = useState("");
  const [symbolFilter, setSymbolFilter] = useState("ALL");
  const [showAll, setShowAll] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(previous=>({...previous,[key]:value}));
  }

  function persist(next: ClosedTrade[], message: string) {
    if (decoded.storageError) throw new Error("Stored journal is invalid. Export a backup of the original browser data before making changes.");
    if (next.length > JOURNAL_MAX_TRADES) throw new Error("Maximum " + JOURNAL_MAX_TRADES + " trades per local journal.");
    window.localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(UPDATE_EVENT));
    setError("");
    setAlert(message);
  }

  function saveTrade(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAlert("");
    try {
      const t = validateClosedTrade({
        id: editingId ?? crypto.randomUUID(),
        symbol: form.symbol,
        direction: form.direction,
        quantity: Number(form.quantity),
        entry: Number(form.entry),
        exit: Number(form.exit),
        feesUsd: Number(form.feesUsd),
        riskUsd: form.riskUsd.trim() ? Number(form.riskUsd) : null,
        openedAt: parseInputTime(form.openedAt),
        closedAt: parseInputTime(form.closedAt),
        notes: form.notes,
      });
      if (!form.quantity.trim() || !form.entry.trim() || !form.exit.trim() || !form.feesUsd.trim()) {
        throw new Error("Enter quantity, entry, exit, and fees.");
      }
      const existing = trades.some(previous=>previous.id===t.id);
      const next = existing ? trades.map(previous=>previous.id===t.id?t:previous) : [...trades,t];
      persist(next, existing ? "Closed trade updated." : "Closed trade saved locally.");
      setEditingId(null);
      setForm(blankForm());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Trade could not be saved.");
    }
  }

  function edit(t: ClosedTrade) {
    setEditingId(t.id);
    setForm({
      symbol:t.symbol,direction:t.direction,
      quantity:String(t.quantity),entry:String(t.entry),exit:String(t.exit),
      feesUsd:String(t.feesUsd), riskUsd:t.riskUsd==null?"":String(t.riskUsd),
      openedAt:toInputTime(t.openedAt),closedAt:toInputTime(t.closedAt),notes:t.notes,
    });
    setError("");
    setAlert("Editing " + t.symbol + " trade. Update the form and save.");
    window.scrollTo({top:0,behavior:"smooth"});
  }

  function remove(t: ClosedTrade) {
    if (!window.confirm("Permanently remove this " + t.symbol + " journal entry from this browser?")) return;
    try {
      persist(trades.filter(x=>x.id!==t.id),"Journal trade deleted.");
      if(editingId===t.id) {setEditingId(null);setForm(blankForm());}
    } catch(cause) {setError(cause instanceof Error?cause.message:"Unable to delete trade.");}
  }

  function download(csv: string, filename: string) {
    const url = URL.createObjectURL(new Blob([csv], {type:"text/csv;charset=utf-8"}));
    const a=document.createElement("a");
    a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
    window.setTimeout(()=>URL.revokeObjectURL(url),30_000);
  }

  async function importFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file=event.target.files?.[0];
    event.target.value="";
    if(!file) return;
    setAlert("");setError("");
    try {
      if(file.size>1_500_000)throw new Error("File exceeds 1.5 MB.");
      const incoming=importJournalCsv(await file.text());
      const known=new Set(trades.map(t=>t.id));
      const fresh=incoming.filter(t=>!known.has(t.id));
      persist([...trades,...fresh],
        "Imported " + fresh.length + " closed trades; skipped " + (incoming.length-fresh.length) + " existing IDs.");
    }catch(cause){setError(cause instanceof Error?cause.message:"CSV import failed. No changes were saved.");}
  }

  const visible=trades.filter(t=>symbolFilter==="ALL"||t.symbol===symbolFilter)
    .sort((a,b)=>b.closedAt.localeCompare(a.closedAt)||b.id.localeCompare(a.id));
  const displayed=showAll?visible:visible.slice(0,25);
  const inputNotes = "Enter completed trades only. Crypto quantity = base units, Forex = currency units, Gold = ounces. Values are USD/USDT-equivalent, not a multi-currency conversion.";

  return <main className="min-h-screen bg-[#03131d] px-4 py-6 font-sans text-[#e5f7ff] md:px-8">
    <div className="mx-auto max-w-[1420px] space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#174357] pb-4">
        <div className="flex items-center gap-3"><Mark/><div>
          <div className="text-[10px] font-bold tracking-[.2em] text-[#1bc7ee]">HIDDEN ALPHA V2</div>
          <h1 className="text-[23px] font-extrabold">Trading Journal</h1>
          <p className="text-[11px] text-[#86a9ba]">Closed trades · Manual entry · CSV backup · No broker sync</p>
        </div></div>
        <Link href="/v2" className="inline-flex items-center gap-2 rounded-lg border border-[#176987] bg-[#083349] px-4 py-2 text-[12px] font-semibold"><ArrowLeft size={14}/> Trading Terminal</Link>
      </header>

      <div className="flex items-start gap-3 rounded-lg border border-[#205f71] bg-[#0b2e40] px-4 py-3 text-[11px] leading-5 text-[#b3d2df]">
        <ShieldAlert size={18} className="mt-0.5 shrink-0 text-[#20d3ef]"/>
        <div><strong>Local browser storage only — not encrypted or cloud-backed.</strong> Entries stay on this browser profile, may be lost if site data is cleared, and are accessible to scripts with access to this origin. Avoid shared devices and export CSV backups regularly. No Supabase, OANDA, Bybit account connection or orders.</div>
      </div>

      {decoded.storageError && <div role="alert" className="rounded border border-[#8a4054] bg-[#351825] p-3 text-[12px] text-[#ffc3d2]">Stored journal cannot be loaded: {decoded.storageError}. Data was not overwritten.</div>}
      {error && <div role="alert" className="rounded border border-[#8a4054] bg-[#351825] p-3 text-[12px] text-[#ffc3d2]">{error}</div>}
      {alert && <div role="status" className="rounded border border-[#226a64] bg-[#093933] p-3 text-[12px] text-[#a5f2d8]">{alert}</div>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Total closed trades" value={String(stats.totalTrades)} note={stats.wins+" wins / "+stats.losses+" losses / "+stats.breakeven+" breakeven"}/>
        <SummaryCard label="Net realized P&L" value={usd(stats.netPnlUsdEquivalent)} note="USD/USDT equivalent · net of reported fees"
          color={stats.netPnlUsdEquivalent>=0?"text-[#1ce0b0]":"text-[#ff7e96]"}/>
        <SummaryCard label="Win rate" value={stats.winRatePercent===null?"—":stats.winRatePercent.toFixed(1)+"%"} note="Winning closed trades / all closed trades"/>
        <SummaryCard label="Profit factor" value={stats.profitFactor===null?"—":stats.profitFactor===Infinity?"∞":stats.profitFactor.toFixed(2)} note="Gross wins / absolute gross losses"/>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Max realized drawdown" value={usd(stats.maxRealizedDrawdownUsd)} note="From cumulative closed-trade P&L; not account equity" color="text-[#ffac98]"/>
        <SummaryCard label="Total fees recorded" value={usd(stats.totalFeesUsd)} note="No unreported funding or swaps included"/>
        <SummaryCard label="Average R" value={stats.averageR===null?"—":stats.averageR.toFixed(2)+"R"} note={stats.rSamples+" trades with an initial risk USD value"}/>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(300px,.9fr)_minmax(0,1.25fr)]">
        <section className={panel}>
          <div className="mb-4 flex items-center justify-between border-b border-[#21485b] pb-3">
            <h2 className="flex items-center gap-2 text-[14px] font-bold"><Plus size={16} className="text-[#24c8ee]"/>{editingId?"Edit closed trade":"Add closed trade"}</h2>
            {editingId && <button type="button" onClick={()=>{setEditingId(null);setForm(blankForm());setAlert("");}} className="inline-flex items-center gap-1 text-[11px] text-[#b6d5e2]"><X size={13}/> Cancel edit</button>}
          </div>
          <p className="mb-3 text-[10px] leading-5 text-[#88a9b9]">{inputNotes}</p>
          <form onSubmit={saveTrade} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5"><span className="text-[11px] font-semibold text-[#b6d2e0]">Instrument</span>
                <select value={form.symbol} onChange={e=>update("symbol",e.target.value as JournalSymbol)}
                  className="rounded-lg border border-[#285165] bg-[#061724] px-3 py-2 text-[12px]">
                  {order.map(id=><option key={id} value={id}>{id} · {instruments[id].name}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1.5"><span className="text-[11px] font-semibold text-[#b6d2e0]">Trade direction</span>
                <select value={form.direction} onChange={e=>update("direction",e.target.value as JournalDirection)}
                  className="rounded-lg border border-[#285165] bg-[#061724] px-3 py-2 text-[12px]">
                  <option value="LONG">LONG / Buy</option><option value="SHORT">SHORT / Sell</option>
                </select>
              </label>
              <Field name="Quantity / Units" value={form.quantity} update={v=>update("quantity",v)} hint={form.symbol==="XAUUSD"?"Troy ounces":instruments[form.symbol].market==="forex"?"Base currency units":"Coin/base asset units"}/>
              <Field name="Entry price" value={form.entry} update={v=>update("entry",v)}/>
              <Field name="Exit price" value={form.exit} update={v=>update("exit",v)}/>
              <Field name="Total fees in USD equivalent" value={form.feesUsd} update={v=>update("feesUsd",v)}/>
              <Field name="Initial risk USD (optional)" value={form.riskUsd} update={v=>update("riskUsd",v)} hint="For average R calculation; not estimated automatically"/>
              <Field name="Opened at" kind="datetime-local" value={form.openedAt} update={v=>update("openedAt",v)}/>
              <Field name="Closed at" kind="datetime-local" value={form.closedAt} update={v=>update("closedAt",v)}/>
              <button type="button" onClick={()=>update("closedAt", dateInputValue())}
                className="self-end rounded border border-[#225468] px-3 py-2 text-[11px] text-[#afcedd] hover:bg-[#12384c]">Set close time to now</button>
            </div>
            <label className="flex flex-col gap-1.5"><span className="text-[11px] font-semibold text-[#b6d2e0]">Trade notes (optional, up to 500 characters)</span>
              <textarea rows={3} maxLength={500} value={form.notes} onChange={e=>update("notes",e.target.value)}
                placeholder="Setup, mistakes, observation..."
                className="rounded-lg border border-[#285165] bg-[#061724] p-3 text-[12px] outline-none focus:border-[#1fc8e9]"/>
            </label>
            <button disabled={Boolean(decoded.storageError)} type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#0cb2d8] bg-[#076587] px-4 py-3 text-[12px] font-bold text-white hover:bg-[#087ba1] disabled:opacity-40">
              <BookOpen size={15}/>{editingId?"Update closed trade":"Save closed trade"}
            </button>
          </form>
        </section>

        <div className="space-y-4">
          <section className={panel}>
            <h2 className="mb-3 flex items-center gap-2 text-[14px] font-bold"><TrendingUp size={17} className="text-[#20d9b9]"/> Realized performance</h2>
            <RealizedPnlChart trades={trades}/>
          </section>
          <section className={panel}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#21485b] pb-3">
              <h2 className="text-[14px] font-bold">Trade history</h2>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={()=>download(exportJournalCsv(trades),"hiddenalpha-v2-journal.csv")}
                  className="inline-flex items-center gap-1 rounded border border-[#1c6681] px-3 py-1.5 text-[11px] text-[#c4e9f8]"><Download size={13}/> Export CSV</button>
                <button type="button" onClick={()=>fileRef.current?.click()} disabled={Boolean(decoded.storageError)}
                  className="inline-flex items-center gap-1 rounded border border-[#1c6681] px-3 py-1.5 text-[11px] text-[#c4e9f8] disabled:opacity-40"><FileUp size={13}/> Import CSV</button>
                <input type="file" hidden ref={fileRef} accept=".csv,text/csv" onChange={importFile}/>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] text-[#89aab9]">Strict Hidden Alpha CSV format. Export an empty template first to see the columns.</p>
              <select aria-label="Filter trades by symbol" value={symbolFilter} onChange={e=>{setSymbolFilter(e.target.value);setShowAll(false);}}
                className="rounded border border-[#255065] bg-[#061724] px-2 py-1.5 text-[11px]">
                <option value="ALL">All instruments</option>
                {order.map(id=><option key={id} value={id}>{id}</option>)}
              </select>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full whitespace-nowrap text-[11px]">
                <thead className="border-b border-[#24465a] text-left text-[#8badbc]">
                  <tr><th className="px-2 py-3">Closed</th><th className="px-2 py-3">Market</th><th className="px-2 py-3">Side</th><th className="px-2 py-3">Qty</th><th className="px-2 py-3">Net P&L</th><th className="px-2 py-3 text-right">Actions</th></tr>
                </thead>
                <tbody>
                  {displayed.map(t=>{
                    const pnl=tradeNetPnl(t);
                    return <tr key={t.id} className="border-b border-[#193949]">
                      <td className="px-2 py-3 text-[#a9bdc9]">{new Date(t.closedAt).toLocaleDateString()}</td>
                      <td className="px-2 py-3"><span className="inline-flex items-center gap-1"><AssetBadge id={t.symbol as SymbolKey} small/>{t.symbol}</span></td>
                      <td className="px-2 py-3">{t.direction}</td>
                      <td className="px-2 py-3">{number(t.quantity)}</td>
                      <td className={"px-2 py-3 font-semibold "+(pnl>=0?"text-[#2ce0b1]":"text-[#ff7f94]")}>{usd(pnl)}</td>
                      <td className="px-2 py-3"><div className="flex justify-end gap-2">
                        <button type="button" aria-label={"Edit "+t.symbol+" trade"} onClick={()=>edit(t)} className="rounded p-2 text-[#85cdec] hover:bg-[#154256]"><Pencil size={13}/></button>
                        <button type="button" aria-label={"Delete "+t.symbol+" trade"} onClick={()=>remove(t)} className="rounded p-2 text-[#ff9ca9] hover:bg-[#56232f]"><Trash2 size={13}/></button>
                      </div></td>
                    </tr>;
                  })}
                  {!displayed.length && <tr><td colSpan={6} className="py-9 text-center text-[#88a9ba]">No closed trades saved for this filter.</td></tr>}
                </tbody>
              </table>
            </div>
            {visible.length>25 && <button type="button" onClick={()=>setShowAll(value=>!value)} className="mt-3 text-[11px] text-[#1ccafa]">{showAll?"Show first 25":"Show all "+visible.length+" trades"}</button>}
            <p className="mt-3 flex items-start gap-2 text-[10px] leading-5 text-[#7a9dad]">
              <Info size={14} className="mt-0.5 shrink-0"/>Closed, linear trades only. No partial fills, deposits, transfers, funding, FX conversion or live broker verification. CSV import does not overwrite existing trade IDs. Reported win rate and drawdown describe recorded closed trades, not your entire account.
            </p>
          </section>
        </div>
      </div>
    </div>
  </main>;
}

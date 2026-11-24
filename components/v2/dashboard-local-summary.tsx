"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { ArrowUpRight, BookOpen, CircleAlert, Wallet } from "lucide-react";
import {
  EMPTY_PORTFOLIO, PORTFOLIO_STORAGE_KEY, PORTFOLIO_UPDATE_EVENT,
  calculatePortfolioAnalytics, decodeManualPortfolio,
} from "@/lib/trading/v2/portfolio";
import {
  JOURNAL_STORAGE_KEY, calculateJournalStatistics, decodeJournalStorage,
} from "@/lib/trading/v2/journal";
import { panel } from "./instruments";

const JOURNAL_EVENT = "hiddenalpha:v2:journal-updated";
const EMPTY_PORTFOLIO_RAW = JSON.stringify(EMPTY_PORTFOLIO);
const EMPTY_JOURNAL_RAW = "[]";

function subscribeLocalData(notify: () => void) {
  window.addEventListener("storage", notify);
  window.addEventListener(PORTFOLIO_UPDATE_EVENT, notify);
  window.addEventListener(JOURNAL_EVENT, notify);
  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener(PORTFOLIO_UPDATE_EVENT, notify);
    window.removeEventListener(JOURNAL_EVENT, notify);
  };
}

function localPortfolioSnapshot() {
  try { return window.localStorage.getItem(PORTFOLIO_STORAGE_KEY) ?? EMPTY_PORTFOLIO_RAW; }
  catch { return EMPTY_PORTFOLIO_RAW; }
}
function localJournalSnapshot() {
  try { return window.localStorage.getItem(JOURNAL_STORAGE_KEY) ?? EMPTY_JOURNAL_RAW; }
  catch { return EMPTY_JOURNAL_RAW; }
}
function serverPortfolioSnapshot() { return EMPTY_PORTFOLIO_RAW; }
function serverJournalSnapshot() { return EMPTY_JOURNAL_RAW; }

function usd(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 2,
  });
}
function SignedAmount({ value }: { value: number }) {
  return <span className={value >= 0 ? "text-[#29d7ae]" : "text-[#ff8195]"}>{usd(value)}</span>;
}

function PortfolioCard({ snapshot }: { snapshot: string }) {
  const state = useMemo(() => {
    try {
      const portfolio = decodeManualPortfolio(snapshot);
      const data = calculatePortfolioAnalytics(portfolio);
      return { data, error: false };
    } catch {
      return { data: null, error: true };
    }
  }, [snapshot]);
  const data = state.data;
  const hasData = Boolean(data && (data.holdingCount || data.cashUsd));

  return <section className={panel + " flex min-w-0 flex-col p-4"}>
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-[13px] font-bold">
        <Wallet size={16} className="text-[#20c6ee]"/> Portfolio Overview
      </div>
      <span className="rounded border border-[#1d5369] px-2 py-1 text-[9px] text-[#92bccc]">LOCAL</span>
    </div>
    {state.error ?
      <div role="alert" className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-[#ffadbf]">
        <CircleAlert size={15} className="mt-0.5 shrink-0"/>
        Saved portfolio could not be read. Open Portfolio to export raw data for recovery.
      </div>
    : hasData && data ?
      <>
        <div className="mt-4 text-[23px] font-extrabold tracking-tight">{usd(data.markedPortfolioValueUsd)}</div>
        <div className="mt-1 text-[10px] text-[#88adbd]">User-marked holdings + tracked cash</div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-[10px]">
          <div><div className="text-[#799cad]">Unrealized P&L</div>
            <div className="mt-1 text-[12px] font-bold"><SignedAmount value={data.unrealizedPnlUsd}/></div>
          </div>
          <div><div className="text-[#799cad]">Tracked cash</div>
            <div className="mt-1 text-[12px] font-bold">{usd(data.cashUsd)}</div>
          </div>
        </div>
        <div className="mt-3 text-[10px] text-[#7f9fb0]">{data.holdingCount} long-only holdings · Manual prices, not live quotes</div>
      </>
    : <>
        <div className="mt-4 text-[18px] font-semibold text-[#a7c3d1]">No holdings recorded</div>
        <p className="mt-2 text-[11px] leading-5 text-[#87a9ba]">
          Enter cash and manually marked long holdings to view your allocation and unrealized P&L.
        </p>
      </>
    }
    <div className="mt-auto pt-4">
      <Link href="/v2/portfolio" className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#23c9f1]">
        Open Portfolio <ArrowUpRight size={12}/>
      </Link>
    </div>
  </section>;
}

function JournalCard({ snapshot }: { snapshot: string }) {
  const state = useMemo(() => {
    try {
      return { data: calculateJournalStatistics(decodeJournalStorage(snapshot)), error: false };
    } catch {
      return { data: null, error: true };
    }
  }, [snapshot]);
  const stats = state.data;
  return <section className={panel + " flex min-w-0 flex-col p-4"}>
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-[13px] font-bold">
        <BookOpen size={16} className="text-[#20c6ee]"/> Trading Journal
      </div>
      <span className="rounded border border-[#1d5369] px-2 py-1 text-[9px] text-[#92bccc]">LOCAL</span>
    </div>
    {state.error ?
      <div role="alert" className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-[#ffadbf]">
        <CircleAlert size={15} className="mt-0.5 shrink-0"/>
        Saved Journal entries are invalid. Review them before making changes.
      </div>
    : stats && stats.totalTrades > 0 ?
      <>
        <div className="mt-4 text-[23px] font-extrabold tracking-tight"><SignedAmount value={stats.netPnlUsdEquivalent}/></div>
        <div className="mt-1 text-[10px] text-[#88adbd]">Realized net P&L · Reported fees included</div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-[10px]">
          <div><div className="text-[#799cad]">Closed trades</div>
            <div className="mt-1 text-[12px] font-bold">{stats.totalTrades}</div>
          </div>
          <div><div className="text-[#799cad]">Win rate</div>
            <div className="mt-1 text-[12px] font-bold">{stats.winRatePercent?.toFixed(1) ?? "—"}%</div>
          </div>
        </div>
        <div className="mt-3 text-[10px] text-[#7f9fb0]">
          Separate closed-trade results; not added to Portfolio value
        </div>
      </>
    : <>
        <div className="mt-4 text-[18px] font-semibold text-[#a7c3d1]">No closed trades yet</div>
        <p className="mt-2 text-[11px] leading-5 text-[#87a9ba]">
          Add closed trades or import a Journal CSV to view actual realized performance here.
        </p>
      </>
    }
    <div className="mt-auto pt-4">
      <Link href="/v2/journal" className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#23c9f1]">
        Open Trading Journal <ArrowUpRight size={12}/>
      </Link>
    </div>
  </section>;
}

/**
 * Read-only dashboard summary. Never writes to browser storage or a backend.
 * Cross-tab and same-tab edits update this component without extra polling.
 */
export default function DashboardLocalSummary() {
  const portfolio = useSyncExternalStore(
    subscribeLocalData, localPortfolioSnapshot, serverPortfolioSnapshot
  );
  const journal = useSyncExternalStore(
    subscribeLocalData, localJournalSnapshot, serverJournalSnapshot
  );
  return <>
    <PortfolioCard snapshot={portfolio}/>
    <JournalCard snapshot={journal}/>
  </>;
}

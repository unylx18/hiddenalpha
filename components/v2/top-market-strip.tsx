"use client";

import { AssetBadge } from "./brand";
import { type SymbolKey } from "./instruments";
import { quoteIsFresh, type MarketWatchState } from "./use-market-watch";

const PICKS:SymbolKey[]=["BTCUSDT","ETHUSDT","XAUUSD","EURUSD"];

/** Shared, real public snapshots; Forex never displays a fabricated quote. */
export default function TopMarketStrip({selected,onSelect,watch}:{
  selected:SymbolKey;
  onSelect:(symbol:SymbolKey)=>void;
  watch:MarketWatchState;
}) {
  return <div aria-label="Market quick selector" className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto py-1 lg:flex-initial">
    {PICKS.map(symbol=>{
      const forex=symbol==="XAUUSD"||symbol==="EURUSD";
      const quote=forex?undefined:watch.quotes[symbol as "BTCUSDT"|"ETHUSDT"];
      const fresh=quoteIsFresh(quote,watch.now);
      const active=selected===symbol;
      const text=forex?"Chart only":fresh&&quote
        ?(quote.change24hPercent>=0?"+":"")+quote.change24hPercent.toFixed(2)+"% · 24h"
        :watch.loading?"Loading...":quote?"Snapshot stale":"No quote";
      return <button key={symbol} type="button" onClick={()=>onSelect(symbol)}
        title={quote?"Bybit linear · "+quote.price.toLocaleString("en-US")+" · "+new Date(quote.fetchedAt).toLocaleTimeString():symbol+" · Select chart"}
        aria-pressed={active}
        className={"flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-left transition focus-visible:outline-2 focus-visible:outline-[#1ed4f7] "+
          (active?"border-[#14c8eb] bg-[#0a344b] shadow-[0_0_15px_rgba(0,194,240,.15)]":
            "border-[#20475d] bg-[#071b29] hover:border-[#138bab]")}>
        <AssetBadge id={symbol} small/>
        <div className="flex flex-col gap-1">
          <strong className="text-[11px] leading-none text-[#e4f7ff]">{symbol}</strong>
          <span className={"text-[10px] leading-none "+(fresh&&quote
            ?quote.change24hPercent>=0?"text-[#1de4ad]":"text-[#ff728a]"
            :"text-[#83a9bb]")}>{text}</span>
        </div>
      </button>;
    })}
  </div>;
}

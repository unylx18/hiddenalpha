"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Calculator, CircleAlert, Info, LockKeyhole, ShieldCheck } from "lucide-react";
import { calculateV2PositionSize, type V2SizingDirection, type V2SizingInput, type V2SizingSymbol } from "@/lib/trading/v2/position-sizing";
import { instruments, order } from "./instruments";
import { Mark } from "./brand";

function usd(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}
function pretty(value: number, digits = 6) {
  return value.toLocaleString("en-US", { maximumFractionDigits: digits });
}
function Field({ label, value, set, hint, placeholder }: {
  label: string;
  value: string;
  set: (value: string) => void;
  hint?: string;
  placeholder?: string;
}) {
  return <label className="flex min-w-0 flex-col gap-1.5">
    <span className="text-[11px] font-semibold text-[#afd0dd]">{label}</span>
    <input type="text" inputMode="decimal" value={value} onChange={e => set(e.target.value)}
      placeholder={placeholder ?? "Enter value"}
      className="w-full rounded-lg border border-[#245165] bg-[#071b29] px-3 py-2.5 text-[13px] text-[#e9faff] outline-none placeholder:text-[#52798e] focus:border-[#20c5eb]"/>
    {hint && <span className="text-[10px] leading-4 text-[#82a6b7]">{hint}</span>}
  </label>;
}

export default function V2RiskCalculator() {
  const [symbol, setSymbol] = useState<V2SizingSymbol>("BTCUSDT");
  const [direction, setDirection] = useState<V2SizingDirection>("LONG");
  const [equity, setEquity] = useState("1000");
  const [riskPercent, setRiskPercent] = useState("1");
  const [entry, setEntry] = useState("");
  const [stop, setStop] = useState("");
  const [target, setTarget] = useState("");
  const [feesBps, setFeesBps] = useState("9");
  const [slippageBps, setSlippageBps] = useState("5");
  const [cryptoStep, setCryptoStep] = useState("0.000001");
  const [contractUnits, setContractUnits] = useState("");
  const [lotStep, setLotStep] = useState("0.01");
  const forex = instruments[symbol].market === "forex";

  const calculated = useMemo(() => {
    if (!entry.trim() || !stop.trim()) return { result: null, error: "Enter an entry and stop-loss price to calculate." };
    if (forex && !contractUnits.trim()) return {result: null, error: "Enter the verified contract size from your broker before calculating Forex lots."};
    const input: V2SizingInput = {
      symbol, direction, equityUsd: Number(equity), riskPercent: Number(riskPercent),
      entry: Number(entry), stop: Number(stop), target: target.trim() ? Number(target) : undefined,
      roundTripFeesBps: Number(feesBps), slippageBps: Number(slippageBps),
      cryptoQuantityStep: forex ? undefined : Number(cryptoStep),
      contractUnitsPerLot: forex ? Number(contractUnits) : undefined,
      lotStep: forex ? Number(lotStep) : undefined,
    };
    try {
      return { result: calculateV2PositionSize(input), error: "" };
    } catch (cause) {
      return { result: null, error: cause instanceof Error ? cause.message : "Invalid sizing inputs" };
    }
  }, [symbol, direction, equity, riskPercent, entry, stop, target,
    feesBps, slippageBps, cryptoStep, contractUnits, lotStep, forex]);

  const result = calculated.result;
  const fieldCard = "rounded-xl border border-[#1d4c61] bg-[#091d2b] p-4";
  return <main className="min-h-screen bg-[#03131d] px-4 py-6 font-sans text-[#e6f6ff] md:px-8">
    <div className="mx-auto max-w-[1160px] space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1c4658] pb-5">
        <div className="flex items-center gap-3">
          <Mark/>
          <div>
            <div className="text-[10px] font-semibold tracking-[.2em] text-[#1cc9f4]">HIDDEN ALPHA V2</div>
            <h1 className="text-[24px] font-extrabold tracking-tight">Risk Manager</h1>
            <p className="mt-1 text-[11px] text-[#88acbd]">Offline position sizing · Manual inputs · No broker connection</p>
          </div>
        </div>
        <Link href="/v2" className="inline-flex items-center gap-2 rounded-lg border border-[#176b88] bg-[#083448] px-4 py-2 text-[12px] font-semibold text-[#d4f6ff] hover:bg-[#0b5271]">
          <ArrowLeft size={15}/> Back to Trading Terminal
        </Link>
      </header>
      <div className="flex items-start gap-3 rounded-lg border border-[#1a5a70] bg-[#082c3c] p-3 text-[11px] leading-5 text-[#b3d6e3]">
        <LockKeyhole size={17} className="mt-0.5 shrink-0 text-[#30cde8]"/>
        <span>Calculations stay on this page. Nothing is saved or submitted to an exchange. USD-equivalent account is assumed; confirm actual broker contract, minimum quantity, spread and funding before trading. A stop order may fill worse than modeled.</span>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(310px,.9fr)]">
        <section className={fieldCard + " space-y-5"}>
          <div className="flex items-center gap-2 border-b border-[#1d4556] pb-3">
            <Calculator size={17} className="text-[#1cc9f4]"/><h2 className="text-[14px] font-bold">Position inputs</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold text-[#afd0dd]">Instrument</span>
              <select value={symbol} onChange={e=>setSymbol(e.target.value as V2SizingSymbol)}
                className="rounded-lg border border-[#245165] bg-[#071b29] px-3 py-2.5 text-[13px] outline-none focus:border-[#20c5eb]">
                {order.map(id=><option key={id} value={id}>{id} · {instruments[id].name}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold text-[#afd0dd]">Direction</span>
              <select value={direction} onChange={e=>setDirection(e.target.value as V2SizingDirection)}
                className="rounded-lg border border-[#245165] bg-[#071b29] px-3 py-2.5 text-[13px] outline-none focus:border-[#20c5eb]">
                <option value="LONG">LONG / Buy</option><option value="SHORT">SHORT / Sell</option>
              </select>
            </label>
            <Field label="Account equity (USD)" value={equity} set={setEquity}/>
            <Field label="Risk per trade (%)" value={riskPercent} set={setRiskPercent} hint="Risk cap: 5% · Example starting value: 1%"/>
            <Field label="Entry price (USD)" value={entry} set={setEntry} placeholder="Enter planned entry"/>
            <Field label="Stop-loss price (USD)" value={stop} set={setStop} placeholder="Enter planned stop"/>
            <Field label="Take-profit price (USD, optional)" value={target} set={setTarget}/>
            <Field label="Round-trip fees (basis points)" value={feesBps} set={setFeesBps} hint="10 bps = 0.10%; both entry and exit combined"/>
            <Field label="Total adverse slippage (basis points)" value={slippageBps} set={setSlippageBps} hint="A planning estimate, not a maximum guaranteed fill cost"/>
            {forex ? <>
              <Field label="Broker contract units per lot" value={contractUnits} set={setContractUnits}
                placeholder="Required from broker specification" hint={symbol==="XAUUSD"?"Gold: enter the broker's ounces per 1.00 lot.":"FX: enter the broker's base-currency units per 1.00 lot."}/>
              <Field label="Lot increment" value={lotStep} set={setLotStep} hint="Example: 0.01. Confirm with your broker."/>
            </> : <Field label="Exchange quantity increment" value={cryptoStep} set={setCryptoStep} hint="Enter your exchange's permitted step; 0.000001 is an editable example, not a live specification."/>}
          </div>
        </section>
        <section className={fieldCard + " h-fit space-y-4"}>
          <div className="flex items-center gap-2 border-b border-[#1d4556] pb-3">
            <ShieldCheck size={17} className="text-[#26deb0]"/><h2 className="text-[14px] font-bold">Position sizing result</h2>
          </div>
          {calculated.error && <div role="status" className="rounded-lg border border-[#4b5964] bg-[#132738] p-3 text-[12px] text-[#b2cbd8]">
            <CircleAlert className="mr-2 inline" size={15}/>{calculated.error}
          </div>}
          {result && <>
            <div className="rounded-lg border border-[#1c7168] bg-[#0b383b] p-4">
              <div className="text-[11px] text-[#a8d8cd]">Maximum modeled risk budget</div>
              <div className="mt-2 text-[28px] font-extrabold text-[#34e3b3]">{usd(result.riskBudgetUsd)}</div>
              <p className="mt-1 text-[10px] text-[#88b8b1]">Estimated stop loss including modeled fees and slippage: {usd(result.estimatedStopLossUsd)}</p>
            </div>
            <dl className="space-y-3 text-[12px]">
              {[
                ["Order quantity", pretty(result.quantity, 8) + (forex?" base units / oz":" asset units")],
                ...(forex?[["Calculated lots", result.lots?.toFixed(4) ?? "—"]]:[]),
                ["Notional size", usd(result.notionalUsd)],
                ["Stop distance", pretty(result.stopDistance, 6)],
                ["Estimated round-trip costs", usd(result.estimatedRoundTripCostUsd)],
                ["Risk budget used", result.riskUtilizationPercent.toFixed(2)+"%"],
                ["Gross R:R", result.grossRiskReward === null ? "—" : result.grossRiskReward.toFixed(2)+"R"],
                ["Estimated net R:R", result.netRiskReward === null ? "—" : result.netRiskReward.toFixed(2)+"R"],
                ["Estimated net target P&L", result.estimatedTargetNetUsd === null ? "—" : usd(result.estimatedTargetNetUsd)],
              ].map(([key,value])=><div key={key} className="flex items-start justify-between gap-3 border-b border-[#193c4c] pb-2">
                <dt className="text-[#99b8c8]">{key}</dt><dd className="text-right font-semibold">{value}</dd>
              </div>)}
            </dl>
          </>}
          <div className="flex items-start gap-2 border-t border-[#1d4556] pt-4 text-[11px] leading-5 text-[#87a9b9]">
            <Info size={15} className="mt-0.5 shrink-0 text-[#21c7e5]"/>
            <span>Not an execution recommendation. Crypto assumes linear USD/USDT-quoted quantity. Forex account is USD with USD-quoted instruments only; the actual broker contract/lot step must be verified. No margin, liquidation, spread widening, financing or guaranteed stop execution is modeled.</span>
          </div>
        </section>
      </div>
    </div>
  </main>;
}

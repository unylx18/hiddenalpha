"use client";

import { useMemo } from "react";
import { instruments, order, timeframes, number, type SymbolKey } from "./instruments";

export function CandlestickChart({symbol, timeframe, indicators}:{symbol:SymbolKey;timeframe:string;indicators:boolean}) {
  const candles = useMemo(()=>{
    const seed=order.indexOf(symbol)*3+timeframes.indexOf(timeframe);
    return Array.from({length:62},(_,i)=>{
      const anchor=94+(i*.15)+(Math.sin(i*.21+seed)*2.5)+(Math.cos(i*.54+seed)*1.55)+(i>28?4:0);
      const open=anchor+Math.sin(i*.81+seed)*1.65;
      const close=anchor+Math.cos(i*.68+seed+1)*1.65;
      return {open,close,high:Math.max(open,close)+.7+(i%4)*.2,low:Math.min(open,close)-.6-(i%3)*.3,volume:9+(i*7)%26};
    });
  },[symbol,timeframe]);
  const lo=Math.min(...candles.map(c=>c.low))-2,hi=Math.max(...candles.map(c=>c.high))+2;
  const y=(v:number)=>252-(v-lo)/(hi-lo)*216;
  const ma=(period:number)=>candles.map((c,i)=>{
    const cut=candles.slice(Math.max(0,i-period+1),i+1);
    const v=cut.reduce((t,x)=>t+x.close,0)/cut.length;
    return (42+i*11.35).toFixed(1)+","+y(v).toFixed(1);
  }).join(" ");
  return <svg viewBox="0 0 820 340" className="block h-auto w-full" role="img" aria-label={"Synthetic demo candlestick chart for "+symbol+" on "+timeframe}>
    <rect width="820" height="340" fill="#061724"/>
    {Array.from({length:6},(_,i)=><g key={i}><line x1="34" x2="747" y1={35+i*43} y2={35+i*43} stroke="#214456" opacity=".5"/><text x="760" y={39+i*43} fill="#7b9bae" fontSize="11">{number(instruments[symbol].price*(1.035-i*.014))}</text></g>)}
    {Array.from({length:8},(_,i)=><line key={i} y1="32" y2="286" x1={42+i*100} x2={42+i*100} stroke="#173748" opacity=".35"/>)}
    {candles.map((c,i)=>{const x=42+i*11.35,up=c.close>=c.open,color=up?"#16dba5":"#ff5f76";return <g key={i}><line x1={x+3} x2={x+3} y1={y(c.high)} y2={y(c.low)} stroke={color} strokeWidth="1.2"/><rect x={x} y={Math.min(y(c.open),y(c.close))} width="7" height={Math.max(2,Math.abs(y(c.close)-y(c.open)))} fill={color} rx="0.5"/><rect x={x} y={295-c.volume*.65} width="7" height={c.volume*.65} fill={color} opacity=".42"/></g>})}
    {indicators&&<><polyline points={ma(8)} fill="none" stroke="#1bcaf5" strokeWidth="1.8"/><polyline points={ma(20)} fill="none" stroke="#b16bd7" strokeWidth="1.8"/></>}
    <line x1="32" y1="291" x2="751" y2="291" stroke="#1b516a"/>
    {["12 Nov","13 Nov","14 Nov","15 Nov","16 Nov","17 Nov","18 Nov","19 Nov"].map((v,i)=><text key={v} x={42+i*96} y="326" fill="#81a4b9" fontSize="11">{v}</text>)}
  </svg>;
}

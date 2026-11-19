import { instruments, type SymbolKey } from "./instruments";

export function Mark() {
  return <svg viewBox="0 0 96 96" className="h-11 w-11 shrink-0" aria-hidden="true" fill="none">
    <path d="M5 7 39 26v44L5 89ZM91 7 57 26v44l34 19Z" stroke="#1bcaf5" strokeWidth="4" strokeLinejoin="round"/>
    <path d="M12 18 32 30v36L12 77ZM84 18 64 30v36l20 11Z" fill="#062d4b"/>
    <path d="M44 40v41m-4-29h8v18h-8z" fill="#fb6478" stroke="#20c9f3" strokeWidth="2"/>
    <path d="M54 20v52m-4-42h8v24h-8z" fill="#087bc0" stroke="#20c9f3" strokeWidth="2"/>
    <path d="M64 25v40m-4-30h8v20h-8z" fill="#18bba0" stroke="#20c9f3" strokeWidth="2"/>
  </svg>;
}
export function AssetBadge({ id, small=false }: {id: SymbolKey; small?: boolean}) {
  return <span className={"inline-flex shrink-0 items-center justify-center rounded-full font-bold "+(small?"h-6 w-6 text-[12px]":"h-9 w-9 text-base")} style={{background:instruments[id].color+"22",color:instruments[id].color}}>{instruments[id].icon}</span>;
}

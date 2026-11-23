import { instruments, type SymbolKey } from "./instruments";

/** Consistent square geometric mark; preserves the existing Hidden Alpha motif. */
export function Mark() {
  return <span aria-hidden="true" className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#247d90] bg-[linear-gradient(145deg,#103f4d,#051b2b_75%)] shadow-[inset_0_1px_0_rgba(148,245,250,.13),0_0_18px_rgba(0,205,220,.09)]">
    <svg viewBox="0 0 96 96" className="h-[34px] w-[34px]" fill="none">
      <path d="M5 7 39 26v44L5 89ZM91 7 57 26v44l34 19Z" stroke="#58dce6" strokeWidth="4.5" strokeLinejoin="round"/>
      <path d="M12 18 32 30v36L12 77ZM84 18 64 30v36l20 11Z" fill="#0a3041"/>
      <path d="M44 40v41m-4-29h8v18h-8z" fill="#fb7c87" stroke="#56dce3" strokeWidth="2"/>
      <path d="M54 20v52m-4-42h8v24h-8z" fill="#0a95be" stroke="#56dce3" strokeWidth="2"/>
      <path d="M64 25v40m-4-30h8v20h-8z" fill="#25d4af" stroke="#56dce3" strokeWidth="2"/>
    </svg>
    <span className="pointer-events-none absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-[#8ffbef]/60 to-transparent"/>
  </span>;
}

/** Source-safe asset glyphs. Distinct square tokens, no external image dependency. */
export function AssetBadge({id,small=false}:{id:SymbolKey;small?:boolean}) {
  const asset=instruments[id];
  return <span aria-hidden="true" title={id}
    className={"inline-flex shrink-0 items-center justify-center rounded-[9px] border font-black leading-none shadow-[inset_0_1px_0_rgba(255,255,255,.035)] "+
      (small?"h-[27px] w-[27px] text-[13px]":"h-10 w-10 text-[17px]")}
    style={{backgroundColor:asset.color+"18",borderColor:asset.color+"3a",color:asset.color}}>
    {asset.icon}
  </span>;
}

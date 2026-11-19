import type { ReactNode } from "react";
import { panel } from "./instruments";

export function MiniStat({heading,children}:{heading:string;children:ReactNode}) {
  return <div className={panel+" min-h-31 p-4"}><div className="mb-3 text-[11px] font-semibold text-[#d7eefa]">{heading}</div>{children}</div>;
}

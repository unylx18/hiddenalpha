/** Next.js route-loading skeleton; never represents a fabricated quote. */
export default function Loading(){
  return <main aria-busy="true" aria-label="Loading Hidden Alpha V2" className="min-h-screen bg-[#03121c] p-4 text-[#aacbd9] lg:p-6">
    <div className="mx-auto max-w-[1530px] space-y-4">
      <div className="h-12 animate-pulse rounded-xl border border-[#164258] bg-[#092638]"/>
      <div className="rounded-2xl border border-[#235970] bg-[#08283b] p-5">
        <div className="h-3 w-32 animate-pulse rounded bg-[#19485c]"/>
        <div className="mt-4 h-7 w-[min(320px,75%)] animate-pulse rounded bg-[#21536b]"/>
        <div className="mt-3 h-3 w-[min(480px,90%)] animate-pulse rounded bg-[#19485c]"/>
        <p className="mt-6 text-[11px] font-medium">Opening your market workspace…</p>
      </div>
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.85fr)_minmax(300px,.75fr)]">
        <div className="h-[380px] animate-pulse rounded-2xl border border-[#184458] bg-[#092132]"/>
        <div className="h-[380px] animate-pulse rounded-2xl border border-[#184458] bg-[#092132]"/>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({length:6},(_,i)=><div key={i} className="h-28 animate-pulse rounded-xl border border-[#184458] bg-[#082437]"/>)}
      </div>
    </div>
  </main>;
}

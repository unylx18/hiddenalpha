export default function ScannerLoading(){
  return <main aria-busy="true" aria-label="Loading Market Scanner" className="min-h-screen bg-[#03121c] p-4 text-[#a6c7d7] lg:p-6">
    <div className="mx-auto max-w-[1500px] space-y-4">
      <div className="h-12 animate-pulse rounded-xl border border-[#164258] bg-[#082638]"/>
      <div className="rounded-2xl border border-[#245970] bg-[#08283b] p-5">
        <div className="h-3 w-28 animate-pulse rounded bg-[#19485c]"/>
        <div className="mt-4 h-7 w-60 animate-pulse rounded bg-[#21536b]"/>
        <p className="mt-4 text-[11px]">Opening Market Scanner… Scans run only when requested.</p>
      </div>
      <div className="h-[440px] animate-pulse rounded-2xl border border-[#184458] bg-[#092132]"/>
    </div>
  </main>;
}

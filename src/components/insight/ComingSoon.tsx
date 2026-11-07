// Placeholder for an Insight page that isn't built yet
export function ComingSoon({ what }: { what: string }) {
  return (
    <section className="border border-slate-200 bg-slate-50 px-6 py-12 text-center">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Coming soon</p>
      <p className="mt-2 text-sm text-slate-600">{what} is on its way.</p>
    </section>
  )
}

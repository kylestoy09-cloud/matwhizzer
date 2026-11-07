// "Coming soon" box for a page or section with nothing to show yet (brackets before they're set,
// Insight pages not yet built)
export function ComingSoon({ what }: { what: string }) {
  return (
    <section className="border border-slate-200 bg-slate-50 px-6 py-12 text-center">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{what} coming soon</p>
    </section>
  )
}

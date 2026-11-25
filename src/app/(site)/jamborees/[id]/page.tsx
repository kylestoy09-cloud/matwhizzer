// A jamboree (Kyle 2026-11-11): its teams ranked by team points under standard dual scoring, summed over
// their pairings (src/lib/jamboreeResults.ts), then every pairing with its score; a pairing opens its bouts
// on the meet page. Jamborees are listed on the Tournaments page's Jamborees tab.
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase/public-cached'
import { SchoolTag } from '@/components/SchoolTag'
import { jamboreeTeams, jamboreeRecord } from '@/lib/jamboreeResults'

export const revalidate = 300

const TH = 'text-left px-3 py-1 text-xs font-bold uppercase tracking-wide whitespace-nowrap'

function formatDate(start: string, end: string | null): string {
  const f = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  return end && end !== start ? `${f(start)} – ${f(end)}` : f(start)
}

export default async function JamboreePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [{ data: girls }, { data: boys }] = await Promise.all([
    supabase.from('jamborees_girls').select('id, name, start_date, end_date, season').eq('id', id).maybeSingle(),
    supabase.from('jamborees').select('id, name, start_date, end_date, season').eq('id', id).maybeSingle(),
  ])
  const jam = girls ?? boys
  if (!jam) notFound()
  const isGirls = !!girls
  const side = isGirls ? 'girls' : 'boys'

  const { data: pairingsData } = await supabase.from(isGirls ? 'dual_meets_girls' : 'dual_meets')
    .select('id, team1_school_id, team2_school_id, team1_score, team2_score')
    .eq('jamboree_id', id).order('id').range(0, 4999)
  const pairings = pairingsData ?? []
  const teams = jamboreeTeams(pairings)
  const { data: sch } = await supabase.from('schools').select('id, display_name').in('id', teams.map(t => t.school_id))
  const name = new Map((sch ?? []).map(s => [s.id as number, s.display_name as string]))
  // the higher-scoring side first; pairings in team-results order
  const rank = new Map(teams.map((t, i) => [t.school_id, i]))
  const rows = pairings.map(p => {
    const flip = Number(p.team2_score ?? 0) > Number(p.team1_score ?? 0)
    return flip
      ? { id: p.id, a: p.team2_school_id, as: p.team2_score, b: p.team1_school_id, bs: p.team1_score }
      : { id: p.id, a: p.team1_school_id, as: p.team1_score, b: p.team2_school_id, bs: p.team2_score }
  }).sort((x, y) => (rank.get(x.a) ?? 0) - (rank.get(y.a) ?? 0) || (rank.get(x.b) ?? 0) - (rank.get(y.b) ?? 0))

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Link href={`/${side}/tournaments?kind=jamborees`} className="text-sm text-slate-500 hover:text-slate-700 hover:underline mb-4 inline-block">
        ← All Jamborees
      </Link>
      <h1 className="text-2xl font-bold text-slate-900">{jam.name}</h1>
      <p className="text-sm text-slate-500 mb-6">{formatDate(jam.start_date, jam.end_date)} · {isGirls ? 'Girls' : 'Boys'} · {jam.season}</p>

      <h2 className="mb-2 text-lg font-bold text-slate-900">Team Results</h2>
      <p className="mb-2 text-xs text-slate-500">Team points by standard dual scoring across each team&apos;s pairings. Record is pairings won-lost-tied.</p>
      <div className="border border-black rounded-none overflow-x-auto mb-8">
        <table className="min-w-max w-full text-[13px]">
          <thead><tr className="bg-slate-900 text-white">{['#', 'Team', 'Pts', 'Record'].map(c => <th key={c} className={TH}>{c}</th>)}</tr></thead>
          <tbody>
            {teams.map((t, i) => (
              <tr key={t.school_id} className={`border-t border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                <td className="px-3 py-1 tabular-nums text-slate-500">{teams.findIndex(x => x.pts === t.pts) + 1}</td>
                <td className="px-3 py-1 whitespace-nowrap"><SchoolTag id={t.school_id} name={name.get(t.school_id)} className="" /></td>
                <td className="px-3 py-1 tabular-nums font-semibold text-slate-800">{t.pts}</td>
                <td className="px-3 py-1 tabular-nums text-slate-700">{jamboreeRecord(t)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mb-2 text-lg font-bold text-slate-900">Pairings</h2>
      <div className="border border-black rounded-none overflow-x-auto">
        <table className="min-w-max w-full text-[13px]">
          <thead><tr className="bg-slate-900 text-white">{['Team', 'Score', 'Team', ''].map((c, i) => <th key={i} className={TH}>{c}</th>)}</tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className={`border-t border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                <td className="px-3 py-1 whitespace-nowrap"><SchoolTag id={r.a} name={name.get(r.a)} className="" /></td>
                <td className="px-3 py-1 tabular-nums whitespace-nowrap text-slate-800">{r.as ?? 0} – {r.bs ?? 0}</td>
                <td className="px-3 py-1 whitespace-nowrap"><SchoolTag id={r.b} name={name.get(r.b)} className="" /></td>
                <td className="px-3 py-1 whitespace-nowrap"><Link href={`/meets/${r.id}`} className="text-xs text-blue-600 hover:underline">Bouts →</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

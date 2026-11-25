// College on a wrestler's profile (Kyle 2026-11-17): a bar per college in its colors joined to the high school banner
// (the qualifier years at least), NCAA medals after the NJSIAA ones in the medal case (oldest first), and a box per
// NCAA year after the high school years with each bout's round. Records from a bracket sheet missing bouts are marked
// * (src/lib/ncaa/stats.ts recordComplete).
import Link from 'next/link'
import { StatsTable } from '@/components/StatsTable'
import { IconHint } from '@/components/site/IconHint'
import { collegeHint } from '@/lib/awardHints'
import { Stardos_Stencil } from 'next/font/google'
import { careerTotals, fallTime, ordinal, textOn, COLLEGE_ROUND_LABEL, levelTab, levelFullAny, isConsRound, type CollegeYear } from '@/lib/ncaa/stats'

const stardos = Stardos_Stencil({ weight: '700', subsets: ['latin'] })

const TH = 'text-left px-3 py-1 text-xs font-bold uppercase tracking-wide whitespace-nowrap'
const byCollege = (years: CollegeYear[]) => {
  const m = new Map<string, CollegeYear[]>()
  for (const y of years) { const k = String(y.college?.id ?? 'tbd'); m.set(k, [...(m.get(k) ?? []), y]) }
  return [...m.values()]
}
// a college not on our list shows TBD, never the printed abbreviation
const collegeName = (y: CollegeYear) => y.college?.name ?? 'TBD'

/** One bar per college, in its colors, joined to the bottom of the high school banner (same width, the school bar's
 *  lettering) */
export function CollegeBars({ years, linkBase }: { years: CollegeYear[]; linkBase: string | null }) {
  if (!years.length) return null
  return (
    <div className="w-full">
      {byCollege(years).map(ys => {
        const c = ys[0].college, bg = c?.primary_color ?? '#334155', fg = textOn(bg), t = careerTotals(ys)
        const facts = [
          `NCAA Qualifier ${[...ys].sort((a, b) => a.year - b.year).map(y => y.year).join(', ')}`,
          t.titles ? `${t.titles > 1 ? `${t.titles}× ` : ''}NCAA Champion` : t.best ? `${ordinal(t.best)} at NCAAs` : null,
          t.aa ? `${t.aa}× All-American` : null,
        ].filter(Boolean)
        const name = (
          <span className="flex items-center gap-2 min-w-0">
            <span className={`${stardos.className} text-base uppercase tracking-tight leading-none`}>{collegeName(ys[0])}</span>
            {c?.mascot && <span className="text-xs opacity-75">{c.mascot}</span>}
          </span>
        )
        return (
          <div key={collegeName(ys[0])} className="px-4 sm:px-6 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs border-t" style={{ background: bg, color: fg, borderColor: `${fg}30`, borderBottom: `3px solid ${c?.secondary_color ?? bg}` }}>
            {linkBase && c ? <Link href={`${linkBase}/${c.id}`} className="hover:opacity-80">{name}</Link> : name}
            <span className="opacity-90">{facts.join(' · ')}</span>
          </div>
        )
      })}
    </div>
  )
}

/** NCAA finishes for the medal case, after the NJSIAA ones: one row, oldest first, in the college's colors — medals for
 *  All-American years, a qualifier chip for the rest */
export function CollegeMedals({ years }: { years: CollegeYear[] }) {
  // a qualifier chip only when that year has no placing (Kyle 2026-11-19: DIII placers went on to DI the same year)
  const all = [...years].filter(y => y.place != null || !years.some(o => o.year === y.year && o.place != null)).sort((a, b) => a.year - b.year)
  const tab = levelTab
  if (!all.length) return null
  return (
    <>
      {all.map(y => {
        const hint = collegeHint(levelFullAny(y.level), y.place, y.weight, y.year)
        if (y.place == null) return (
          <IconHint key={y.entry_id} hint={hint}><span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border bg-white" style={{ color: '#334155', borderColor: y.college?.primary_color ?? '#334155' }}>
            <span>{tab(y.level)} Qualifier</span>
            <span className="opacity-60">{`'${String(y.year).slice(2)}`}</span>
          </span></IconHint>
        )
        const bg = y.college?.primary_color ?? '#334155', medal = y.place === 1 ? '\u{1F947}' : y.place === 2 ? '\u{1F948}' : y.place === 3 ? '\u{1F949}' : null
        return (
          <IconHint key={y.entry_id} hint={hint}><span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border" style={{ background: bg, color: textOn(bg), borderColor: y.college?.secondary_color ?? bg }}>
            {medal ? <span>{medal}</span> : <span className="opacity-75">{ordinal(y.place!)}</span>}
            <span>{tab(y.level)} {y.weight}</span>
            <span className="opacity-70">{`'${String(y.year).slice(2)}`}</span>
          </span></IconHint>
        )
      })}
    </>
  )
}

/** The college years, after high school: totals, then a box per NCAA year */
export function CollegeSection({ years }: { years: CollegeYear[] }) {
  if (!years.length) return null
  const t = careerTotals(years)
  // Kyle 2026-11-19: a stats table like the high school Career Stats, its header naming the championship and saying
  // these are tournament stats — so a 5-3 doesn't read as his whole college career
  const levels = [...new Set([...years].sort((a, b) => a.year - b.year).map(y => y.level))]
  const multi = levels.length > 1
  const hasBouts = (y: CollegeYear) => y.bouts.length > 0
  const anyBouts = years.some(hasBouts)
  const finish = (p: number | null) => (p == null ? 'Qualifier' : p === 1 ? 'Champion' : `${ordinal(p)} · AA`)
  const rows = [...years].sort((a, b) => b.year - a.year)
  return (
    <div className="mt-10">
      <h2 className="mb-2 text-lg font-bold text-slate-900">College</h2>
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">{levels.map(levelFullAny).join(' · ')} Championships — Tournament Stats</h3>
      <div className="mb-5">
        <StatsTable
          columns={[
            { key: 'year',    label: 'Year',     align: 'left',   numeric: false },
            ...(multi ? [{ key: 'level', label: 'Level', align: 'left' as const, numeric: false }] : []),
            { key: 'college', label: 'College',  align: 'left',   numeric: false },
            { key: 'wt',      label: 'Wt',       align: 'center' },
            ...(anyBouts ? [
              { key: 'wl',    label: 'W-L',      align: 'center' as const, numeric: false },
              { key: 'falls', label: 'Falls',    align: 'center' as const },
              { key: 'techs', label: 'TFs',      align: 'center' as const },
              { key: 'majors', label: 'Majors',  align: 'center' as const },
              { key: 'cons',  label: 'Cons. W',  align: 'center' as const },
            ] : []),
            { key: 'finish',  label: 'Finish',   align: 'left',   numeric: false },
          ]}
          rows={rows.map(y => ({
            year: y.year, level: levelTab(y.level), college: collegeName(y), wt: y.weight,
            wl: hasBouts(y) ? `${y.wins}-${y.losses}${y.complete ? '' : '*'}` : '—',
            falls: hasBouts(y) ? y.falls : '—', techs: hasBouts(y) ? y.techs : '—', majors: hasBouts(y) ? y.majors : '—', cons: hasBouts(y) ? y.consWins : '—',
            finish: finish(y.place),
          }))}
          footer={rows.length > 1 ? {
            year: 'Career', level: '', college: '', wt: '',
            wl: anyBouts ? `${t.wins}-${t.losses}${t.complete ? '' : '*'}` : '—', falls: t.falls, techs: t.techs, majors: t.majors, cons: t.consWins,
            finish: t.titles ? `${t.titles}× Champion · ${t.aa}× AA` : t.aa ? `${t.aa}× AA` : '',
          } : undefined}
        />
        <p className="mt-1 text-xs text-slate-500">Bouts at the {levels.length === 1 ? `${levelFullAny(levels[0])} Championships` : 'college championships'} only — not the full college season.{!anyBouts ? ' Only qualifiers and places are on file for these years.' : ''}</p>
      </div>
      {/* the NCAA years joined into one stack, like the NJSIAA seasons above (Kyle 2026-11-18) */}
      <div>
        {[...years].sort((a, b) => b.year - a.year).map((y, yi) => {
          const bg = y.college?.primary_color ?? '#334155', fg = textOn(bg)
          return (
            <div key={y.entry_id} className={`border border-slate-300 overflow-hidden ${yi > 0 ? '-mt-px' : ''}`}>
              <div className="px-4 py-2 flex flex-wrap items-center gap-2" style={{ background: bg, color: fg, borderBottom: `3px solid ${y.college?.secondary_color ?? bg}` }}>
                <span className="text-xs font-semibold uppercase tracking-widest">{y.year} {levelFullAny(y.level)} Championships</span>
                <span className="text-xs opacity-90">— {collegeName(y)} · {y.weight}{y.seed ? ` · seed ${y.seed}` : ''}{y.place ? ` · ${y.place === 1 ? 'Champion' : ordinal(y.place)}` : ''}</span>
                <span className="ml-auto text-xs font-medium">{y.wins}W – {y.losses}L{y.complete ? '' : '*'}</span>
              </div>
              {y.bouts.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-max w-full text-[13px]">
                    <thead><tr className="bg-slate-900 text-white">{['Round', 'Res', 'Opponent', 'College', 'Result'].map(c => <th key={c} className={TH}>{c}</th>)}</tr></thead>
                    <tbody>
                      {y.bouts.map((b, i) => (
                        <tr key={i} className={`border-t border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                          <td className={`px-3 py-1 whitespace-nowrap ${isConsRound(b.round) ? 'text-slate-500' : 'text-slate-700 font-medium'}`}>{b.round ? COLLEGE_ROUND_LABEL[b.round] ?? '' : ''}</td>
                          <td className={`px-3 py-1 font-bold ${b.won ? 'text-emerald-700' : 'text-red-600'}`}>{b.won ? 'W' : 'L'}</td>
                          <td className="px-3 py-1 whitespace-nowrap text-slate-800">{b.opponent_id ? <Link href={`/wrestler/${b.opponent_id}`} className="hover:underline">{b.opponent}</Link> : b.opponent}</td>
                          <td className="px-3 py-1 whitespace-nowrap text-slate-500">{b.opponent_college}</td>
                          <td className="px-3 py-1 whitespace-nowrap tabular-nums text-slate-700">{b.result ?? ''}{b.type === 'fall' && b.fall_secs != null && !(b.result ?? '').includes(':') ? ` ${fallTime(b.fall_secs)}` : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </div>
      {!t.complete && <p className="mt-2 text-xs text-slate-500">* The bracket sheet for this year doesn&apos;t list every bout, so the record is incomplete.</p>}

    </div>
  )
}

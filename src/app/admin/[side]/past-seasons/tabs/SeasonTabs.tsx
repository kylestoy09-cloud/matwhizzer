'use client'

// Past Seasons tabs (Kyle 2026-11-12): Directory (the preseason dashboard's spreadsheet, showing and editing
// that season's own locked values), Schools, Wrestlers, Coaches, Tournaments, Leaderboards, Playoffs and
// End of Season. Each side has its own data; nothing here mixes boys and girls.
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import type { PastSeason } from '../PastSeasonsClient'
import { SchoolDirectoryWorkspace } from '../../dashboards/tools/SchoolDirectoryWorkspace'
import { SchoolDirectoryWorkspaceGirls } from '../../dashboards/tools/SchoolDirectoryWorkspaceGirls'
import { EndOfSeasonPanel } from '../../snapshot/EndOfSeasonPanel'
import { RATING_SHORT } from '@/lib/rating'

type Props = { season: PastSeason; gender: 'M' | 'F' }
const th = 'px-3 py-1 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap'
const td = 'px-3 py-1'
const input = 'border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-black'
const ord = (n: number) => n + (['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th')

function useTab<T>(tab: string, { season, gender }: Props) {
  const key = `${tab}-${season.id}-${gender}`
  const [state, setState] = useState<{ key: string; data: T | null; error: string | null } | null>(null)
  useEffect(() => {
    let off = false
    fetch(`/api/admin/past-seasons/tab?tab=${tab}&seasonId=${season.id}&gender=${gender}`)
      .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error ?? `HTTP ${r.status}`); if (!off) setState({ key, data: d, error: null }) })
      .catch(e => { if (!off) setState({ key, data: null, error: (e as Error).message }) })
    return () => { off = true }
  }, [key, tab, season.id, gender])
  const current = state?.key === key ? state : null
  return { data: current?.data ?? null, error: current?.error ?? null, loading: !current }
}

function Status({ loading, error, empty }: { loading: boolean; error: string | null; empty?: boolean }) {
  if (loading) return <p className="text-sm text-slate-400">Loading…</p>
  if (error) return <p className="text-sm text-red-600">{error}</p>
  if (empty) return <p className="text-sm text-slate-400">Nothing recorded for this season.</p>
  return null
}

// ── Directory ────────────────────────────────────────────────────────────────

export function DirectoryTab({ season, gender }: Props) {
  return (
    <div className="-m-6">
      <p className="px-4 pt-3 text-xs text-slate-500">
        {season.year_label} as it was. Edits here change only {season.year_label}; the preseason dashboard edits the current season.
      </p>
      {gender === 'F'
        ? <SchoolDirectoryWorkspaceGirls key={`F-${season.id}`} seasonId={season.id} coachSeasonId={season.id} archive />
        : <SchoolDirectoryWorkspace key={`M-${season.id}`} seasonId={season.id} coachSeasonId={season.id} archive />}
    </div>
  )
}

// ── Schools ──────────────────────────────────────────────────────────────────

type SchoolRow = { school_id: number; name: string; active: boolean; wins: number | null; losses: number | null; ties: number | null; power_points: number | null; pp_group: string | null; district: string | null; region: string | null; section: string | null; group: string | null }

export function SchoolsTab(p: Props) {
  const { data, error, loading } = useTab<{ rows: SchoolRow[] }>('schools', p)
  const [q, setQ] = useState('')
  const rows = (data?.rows ?? []).filter(r => !q || r.name.toLowerCase().includes(q.toLowerCase()))
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search schools" className={`${input} w-56`} />
        {data && <span className="text-xs text-slate-400">{rows.length} programs</span>}
      </div>
      <Status loading={loading} error={error} empty={!!data && !data.rows.length} />
      {!!rows.length && (
        <table className="w-full text-sm border border-slate-200">
          <thead className="bg-slate-50 border-b border-slate-200"><tr>
            <th className={th}>School</th><th className={th}>Record</th><th className={th}>Power points</th><th className={th}>District</th><th className={th}>Region</th><th className={th}>Section</th><th className={th}>Group</th><th className={th}>Active</th>
          </tr></thead>
          <tbody>{rows.map(r => (
            <tr key={r.school_id} className="border-b border-slate-100">
              <td className={`${td} font-medium`}><Link href={`/admin/${p.gender === 'F' ? 'girls' : 'boys'}/schools/${r.school_id}`} className="hover:underline">{r.name}</Link></td>
              <td className={td}>{r.wins != null ? `${r.wins}-${r.losses}${r.ties ? `-${r.ties}` : ''}` : '—'}</td>
              <td className={td}>{r.power_points ?? '—'}{r.pp_group ? <span className="text-xs text-slate-400"> ({r.pp_group})</span> : null}</td>
              <td className={td}>{r.district ?? '—'}</td><td className={td}>{r.region ?? '—'}</td>
              <td className={td}>{r.section ?? '—'}</td><td className={td}>{r.group ?? '—'}</td>
              <td className={td}>{r.active ? 'Yes' : <span className="text-slate-400">Inactive</span>}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </div>
  )
}

// ── Wrestlers ────────────────────────────────────────────────────────────────

type WrestlerRow = { wrestler_id: string; name: string; school: string | null; weight: string | null; matches: number; pins: number; techs: number; bonus_pct: number | null; wrr: number | null }
const PAGE = 200

export function WrestlersTab(p: Props) {
  const { data, error, loading } = useTab<{ rows: WrestlerRow[] }>('wrestlers', p)
  const [q, setQ] = useState('')
  const [weight, setWeight] = useState('')
  const [shown, setShown] = useState(PAGE)
  const weights = useMemo(() => [...new Set((data?.rows ?? []).map(r => r.weight).filter(Boolean))].sort((a, b) => Number(a) - Number(b)) as string[], [data])
  const rows = (data?.rows ?? []).filter(r => (!weight || r.weight === weight) && (!q || `${r.name} ${r.school ?? ''}`.toLowerCase().includes(q.toLowerCase())))
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <input value={q} onChange={e => { setQ(e.target.value); setShown(PAGE) }} placeholder="Search wrestler or school" className={`${input} w-64`} />
        <select value={weight} onChange={e => { setWeight(e.target.value); setShown(PAGE) }} className={input}>
          <option value="">All weights</option>{weights.map(w => <option key={w} value={w}>{w}</option>)}
        </select>
        {data && <span className="text-xs text-slate-400">{rows.length.toLocaleString()} wrestlers, by {RATING_SHORT}</span>}
      </div>
      <Status loading={loading} error={error} empty={!!data && !data.rows.length} />
      {!!rows.length && (
        <>
          <table className="w-full text-sm border border-slate-200">
            <thead className="bg-slate-50 border-b border-slate-200"><tr>
              <th className={th}>#</th><th className={th}>Wrestler</th><th className={th}>School</th><th className={th}>Wt</th><th className={th}>Matches</th><th className={th}>Pins</th><th className={th}>Techs</th><th className={th}>Bonus %</th><th className={th}>{RATING_SHORT}</th>
            </tr></thead>
            <tbody>{rows.slice(0, shown).map((r, i) => (
              <tr key={r.wrestler_id} className="border-b border-slate-100">
                <td className={`${td} text-slate-400`}>{i + 1}</td>
                <td className={`${td} font-medium`}><Link href={`/admin/${p.gender === 'F' ? 'girls' : 'boys'}/wrestlers/${r.wrestler_id}`} className="hover:underline">{r.name}</Link></td>
                <td className={td}>{r.school ?? '—'}</td><td className={td}>{r.weight ?? '—'}</td><td className={td}>{r.matches}</td>
                <td className={td}>{r.pins}</td><td className={td}>{r.techs}</td><td className={td}>{r.bonus_pct ?? '—'}</td>
                <td className={`${td} font-semibold`}>{r.wrr?.toFixed(2) ?? '—'}</td>
              </tr>
            ))}</tbody>
          </table>
          {rows.length > shown && <button onClick={() => setShown(shown + PAGE)} className="mt-2 text-sm underline text-slate-500 hover:text-black">Show {Math.min(PAGE, rows.length - shown)} more</button>}
        </>
      )}
    </div>
  )
}

// ── Coaches ──────────────────────────────────────────────────────────────────

export function CoachesTab(p: Props) {
  const { data, error, loading } = useTab<{ rows: { school_id: number; school: string; name: string; title: string | null; email: string | null; phone: string | null }[]; without: string[] }>('coaches', p)
  return (
    <div>
      <p className="text-xs text-slate-500 mb-3">Edit a {p.season.year_label} coach on the Directory tab.</p>
      <Status loading={loading} error={error} empty={!!data && !data.rows.length} />
      {!!data?.rows.length && (
        <table className="w-full text-sm border border-slate-200 mb-4">
          <thead className="bg-slate-50 border-b border-slate-200"><tr><th className={th}>School</th><th className={th}>Coach</th><th className={th}>Title</th><th className={th}>Email</th><th className={th}>Phone</th></tr></thead>
          <tbody>{data.rows.map(r => (
            <tr key={`${r.school_id}-${r.name}`} className="border-b border-slate-100">
              <td className={`${td} font-medium`}>{r.school}</td><td className={td}>{r.name}</td><td className={td}>{r.title ?? ''}</td>
              <td className={td}>{r.email ? <a href={`mailto:${r.email}`} className="hover:underline">{r.email}</a> : ''}</td><td className={td}>{r.phone ?? ''}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
      {!!data?.without.length && <p className="text-xs text-slate-500"><b>No coach on file ({data.without.length}):</b> {data.without.join(', ')}</p>}
    </div>
  )
}

// ── Tournaments ──────────────────────────────────────────────────────────────

export function TournamentsTab(p: Props) {
  const { data, error, loading } = useTab<{ rows: { id: string; name: string; date: string | null; points: number | null; venue: string | null; out_of_state: boolean; bouts: number; placements: number; team_champion: string | null }[] }>('tournaments', p)
  return (
    <div>
      <Status loading={loading} error={error} empty={!!data && !data.rows.length} />
      {!!data?.rows.length && (
        <table className="w-full text-sm border border-slate-200">
          <thead className="bg-slate-50 border-b border-slate-200"><tr><th className={th}>Date</th><th className={th}>Tournament</th><th className={th}>Points</th><th className={th}>Bouts</th><th className={th}>Placements</th><th className={th}>Team champion</th></tr></thead>
          <tbody>{data.rows.map(r => (
            <tr key={r.id} className="border-b border-slate-100">
              <td className={`${td} whitespace-nowrap`}>{r.date ?? '—'}</td>
              <td className={`${td} font-medium`}><Link href={`/tournaments/${r.id}`} className="hover:underline">{r.name}</Link>{r.out_of_state && <span className="text-xs text-slate-400"> · out of state</span>}{r.venue && <div className="text-[11px] text-slate-400 font-normal">{r.venue}</div>}</td>
              <td className={td}>{r.points ?? '—'}</td><td className={td}>{r.bouts}</td><td className={td}>{r.placements}</td><td className={td}>{r.team_champion ?? '—'}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </div>
  )
}

// ── Leaderboards ─────────────────────────────────────────────────────────────

export function LeaderboardsTab(p: Props) {
  const { data, error, loading } = useTab<{ lists: { title: string; rows: { name: string; school: string | null; weight: number | null; value: number | string | null }[] }[] }>('leaderboards', p)
  return (
    <div>
      <Status loading={loading} error={error} empty={!!data && data.lists.every(l => !l.rows.length)} />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {data?.lists.filter(l => l.rows.length).map(l => (
          <div key={l.title} className="border border-slate-200">
            <p className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 border-b border-slate-200">{l.title}</p>
            <table className="w-full text-sm"><tbody>{l.rows.map((r, i) => (
              <tr key={i} className="border-b border-slate-100 last:border-0">
                <td className={`${td} text-slate-400 w-6`}>{i + 1}</td>
                <td className={td}><span className="font-medium">{r.name}</span>{(r.school || r.weight) && <span className="text-[11px] text-slate-400"> {[r.school, r.weight].filter(Boolean).join(' · ')}</span>}</td>
                <td className={`${td} text-right font-semibold tabular-nums`}>{typeof r.value === 'number' ? Number(r.value.toFixed(2)) : r.value}</td>
              </tr>
            ))}</tbody></table>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Playoffs ─────────────────────────────────────────────────────────────────

type Bracket = { id: number; level: 'state' | 'region' | 'district'; name: string; placers: { weight: number; place: number; name: string; school: string | null }[] }

export function PlayoffsTab(p: Props) {
  const { data, error, loading } = useTab<{ rows: Bracket[] }>('playoffs', p)
  const [level, setLevel] = useState<'state' | 'region' | 'district'>('state')
  const [pick, setPick] = useState<number | null>(null)
  const list = (data?.rows ?? []).filter(r => r.level === level)
  const chosen = list.find(r => r.id === pick) ?? list[0]
  const weights = chosen ? [...new Set(chosen.placers.map(x => x.weight))] : []
  const maxPlace = chosen ? Math.max(0, ...chosen.placers.map(x => x.place)) : 0
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        {(['state', 'region', 'district'] as const).map(l => (
          <button key={l} onClick={() => { setLevel(l); setPick(null) }} className={`px-3 py-1 text-sm border ${level === l ? 'bg-black text-white border-black' : 'border-slate-300 hover:border-black'}`}>{l === 'state' ? 'State' : l === 'region' ? 'Regions' : 'Districts'}</button>
        ))}
        {list.length > 1 && (
          <select value={chosen?.id ?? ''} onChange={e => setPick(Number(e.target.value))} className={input}>
            {list.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        )}
      </div>
      <Status loading={loading} error={error} empty={!!data && !chosen} />
      {chosen && (
        chosen.placers.length === 0 ? <p className="text-sm text-slate-400">No placement bouts recorded for {chosen.name}.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-slate-200">
              <thead className="bg-slate-50 border-b border-slate-200"><tr><th className={th}>Wt</th>{Array.from({ length: maxPlace }, (_, i) => <th key={i} className={th}>{ord(i + 1)}</th>)}</tr></thead>
              <tbody>{weights.map(w => (
                <tr key={w} className="border-b border-slate-100 align-top">
                  <td className={`${td} font-medium`}>{w}</td>
                  {Array.from({ length: maxPlace }, (_, i) => {
                    const x = chosen.placers.find(y => y.weight === w && y.place === i + 1)
                    return <td key={i} className={td}>{x ? <><div className="font-medium">{x.name}</div><div className="text-[11px] text-slate-400">{x.school}</div></> : null}</td>
                  })}
                </tr>
              ))}</tbody>
            </table>
          </div>
        )
      )}
    </div>
  )
}

// ── End of Season ────────────────────────────────────────────────────────────

export function EndOfSeasonTab({ season, gender }: Props) {
  return <EndOfSeasonPanel key={`${gender}-${season.id}`} seasons={[{ id: season.id, label: season.year_label }]} gender={gender} />
}

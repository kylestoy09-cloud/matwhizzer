'use client'

// Middle School Hub / Offseason Hub (Kyle 2026-11-12), admin only, to help with rankings.
// Results are tied to seasons (Kyle 2026-11-12): the offseason is one calendar year ("2026"), the middle
// school season runs June through May ("2025-26"). The hub opens on the season today falls in, the picker
// goes back through past ones, and a tournament's results for a season live in that season's event.
// Tabs: Tournaments (per tournament: level, champion rating, whether this season was uploaded, NJ kids and podium), Leaderboard (most podiums and highest
// finishes; NJ kids unless "All states"; this season or all), Prospects (every kid seen on a hub,
// linked to their HS wrestler when known), Clubs (shared NJ club list).
import { Fragment, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAdminGender } from '@/components/admin/AdminGenderContext'
import { HUBS, ordinal, placeLabel, hubSeasonLabel, hubSeasonOfDate, hubPool, HUB_LEVELS, HUB_LEVEL_LABEL, type HubKey, type HubGender } from '@/lib/hub'
import { ProspectsTab } from './ProspectsTab'
import { RATING_SHORT } from '@/lib/rating'
import { ratingSeasons } from '@/lib/hubSchools'
import { ClubsTab } from './ClubsTab'
import { HowTo } from './HowTo'
import { FreshmanTab } from './FreshmanTab'
import { BoardOrderTab } from './BoardOrderTab'

type NjPlace = { name: string; from: string | null; rating: { score: number; season: string } | null; division: string | null; weight: string; style: string; place: number; place_to: number | null }
type HubEvent = {
  id: number; season: number; label: string | null; start_date: string | null; notes: string | null; placements: number; bouts: number; placed_through: number | null
  uploaded_at: string | null; upload_files: string[] | null
  upload_divisions: { division: string; style: string; weights: number; places: number; placed_through: number }[] | null
  nj: { competed: number; podium: NjPlace[]; placed: NjPlace[] }
}
type Tournament = {
  id: number; name: string; location: string | null; time_of_year: string | null; in_state: string | null
  format: string | null; platform: string | null; notes: string | null; is_active: boolean; sort_order: number; events: HubEvent[]
  level: string | null; champion_rating: number | null; division_ratings?: Record<string, number>
}
type LeaderRow = {
  prospect_id: number; name: string; state: string | null; class_year: number | null; club: string | null
  score: number; score_from: string | null; weight: string | null; sex: string; events: number
  notable: { kind: 'win' | 'close loss'; opponent: string; opponent_score: number; opponent_from: string | null; result: string; event: string; weight: string }[]
  wrestler: { id: string; school: string | null; rating: { score: number; season: string } | null } | null
  titles: number; podiums: number; best: number | null; avg_place: number | null; wins: number; losses: number
  finishes: { season: number; tournament: string; style: string; division: string | null; weight: string; place: number; place_to: number | null }[]
}

const TABS = ['Tournaments', 'Leaderboard', 'Public board', 'Freshman year', 'Prospects', 'Clubs', 'How to add results'] as const
type Tab = typeof TABS[number]
const input = 'border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-black'
const th = 'px-3 py-1 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500'
const td = 'px-3 py-1'

export function HubClient({ hub, seasons, season, howTo = false }: { hub: HubKey; seasons: number[]; season: number; howTo?: boolean }) {
  const { gender: sideGender, side, loaded } = useAdminGender()
  const gender = hubPool(hub, sideGender)   // Middle School: the mixed pool on both sides
  const [tab, pick] = useState<Tab>(howTo ? 'How to add results' : 'Tournaments')
  const router = useRouter(), pathname = usePathname()
  const setSeason = (s: number) => router.replace(`${pathname}?season=${s}`)

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-1">Non-NJSIAA · {side === 'girls' ? 'Girls' : 'Boys'}</p>
          <h1 className="text-lg font-bold text-slate-900">{HUBS[hub].label} Hub</h1>
        </div>
        <label className="text-xs text-slate-500 flex items-center gap-2">Season
          <select value={season} onChange={e => setSeason(Number(e.target.value))} className={`${input} font-semibold text-slate-900`}>
            {seasons.map(s => <option key={s} value={s}>{hubSeasonLabel(hub, s)}</option>)}
          </select>
        </label>
      </div>
      <p className="text-sm text-slate-500 mt-1 mb-5">
        {hub === 'ms'
          ? 'Middle school podiums, kept so that when these kids reach high school we know who was winning at a high level.'
          : 'Offseason individual tournaments: who placed, and how NJ kids did. Middle schoolers who enter go on the same prospect list.'}
      </p>
      <div className="flex gap-1 border-b border-slate-200 mb-5">
        {TABS.filter(t => (t !== 'Freshman year' || hub === 'ms') && (t !== 'Public board' || hub === 'offseason')).map(t => (
          <button key={t} onClick={() => pick(t)}
            className={`px-3 py-1.5 text-sm -mb-px border-b-2 ${tab === t ? 'border-black text-slate-900 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            {t}
          </button>
        ))}
      </div>
      {!loaded ? <p className="text-sm text-slate-400">Loading…</p>
        : tab === 'Tournaments' ? <TournamentsTab hub={hub} gender={gender} side={side} season={season} />
        : tab === 'Leaderboard' ? <LeaderboardTab hub={hub} gender={gender} season={season} />
        : tab === 'Public board' ? <BoardOrderTab gender={sideGender === 'F' ? 'F' : 'M'} side={side} />
        : tab === 'Freshman year' ? <FreshmanTab />
        : tab === 'Prospects' ? <ProspectsTab gender={gender} />
        : tab === 'Clubs' ? <ClubsTab gender={gender} />
        : <HowTo />}
    </div>
  )
}

// ── Tournaments ──────────────────────────────────────────────────────────────

const LEVEL_ORDER: Record<string, number> = { national: 0, regional: 1, state: 2, local: 3 }
// a rating with the season it's from when that isn't the newest ("31.4 (2025-26)")
const wrr = (r: { score: number; season: string } | null) => (r ? `${r.score.toFixed(1)}${r.season === ratingSeasons()[0] ? '' : ` (${r.season})`}` : '—')
const fmtDay = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const isUploaded = (e: HubEvent) => !!e.uploaded_at || e.placements > 0 || e.bouts > 0

function TournamentsTab({ hub, gender, side, season }: { hub: HubKey; gender: HubGender; side: string; season: number }) {
  const sideSex = side === 'girls' ? 'F' : 'M'   // the Middle School Hub's mixed pool: this side's kids
  const [list, setList] = useState<Tournament[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState<number | null>(null)
  const [adding, setAdding] = useState(false)
  const [showInactive, setShowInactive] = useState(false)

  const load = useCallback(() => {
    fetch(`/api/admin/hub/tournaments?gender=${gender}&hub=${hub}${gender === 'X' ? `&sex=${sideSex}` : ''}`).then(r => r.json())
      .then(d => d.error ? setError(d.error) : setList(d.tournaments))
      .catch(() => setError('Could not load the tournaments'))
  }, [gender, hub, sideSex])
  useEffect(() => { load() }, [load])

  if (error) return <p className="text-sm text-red-600">{error}</p>
  if (!list) return <p className="text-sm text-slate-400">Loading…</p>
  // national, then regional, then state
  const shown = list.filter(t => showInactive || t.is_active)
    .sort((a, b) => (LEVEL_ORDER[a.level ?? ''] ?? 3) - (LEVEL_ORDER[b.level ?? ''] ?? 3) || a.sort_order - b.sort_order || a.name.localeCompare(b.name))
  const hidden = list.length - list.filter(t => t.is_active).length
  const uploaded = shown.filter(t => t.events.some(e => e.season === season && isUploaded(e))).length

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <button onClick={() => setAdding(v => !v)} className="px-3 py-1 text-sm bg-black text-white hover:bg-slate-800">Add tournament</button>
        <span className="text-xs text-slate-500">{hubSeasonLabel(hub, season)}: <b className="text-slate-800">{uploaded} of {shown.length}</b> uploaded</span>
        {hidden > 0 && (
          <label className="text-xs text-slate-500 flex items-center gap-1 ml-auto">
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} /> Show {hidden} hidden
          </label>
        )}
      </div>
      {adding && <TournamentForm gender={gender} hub={hub} onDone={t => { setAdding(false); if (t) setList([...list, t]) }} />}
      <table className="w-full text-sm border border-slate-200">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr><th className={th}>Tournament</th><th className={th}>Level</th><th className={th}>Champion</th><th className={th}>When</th><th className={th}>Where</th><th className={th}>{hubSeasonLabel(hub, season)}</th></tr>
        </thead>
        <tbody>
          {shown.map(t => (
            <TournamentRow key={t.id} t={t} gender={gender} hub={hub} side={side} season={season} open={open === t.id}
              onToggle={() => setOpen(open === t.id ? null : t.id)}
              onChange={nt => setList(list.map(x => x.id === nt.id ? nt : x))} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function seasonCell(e: HubEvent) {
  if (!isUploaded(e)) return <span className="text-amber-700">entered · not uploaded</span>
  return (
    <span><span className="text-emerald-700 font-medium">✓ Uploaded</span>{e.uploaded_at ? <span className="text-slate-500"> {fmtDay(e.uploaded_at)}</span> : null}
      <span className="text-slate-500"> · {e.placements.toLocaleString()} places{e.placed_through ? ` (through ${ordinal(e.placed_through)})` : ''} · NJ {e.nj.competed}</span></span>
  )
}

function TournamentRow({ t, gender, hub, side, season, open, onToggle, onChange }: {
  t: Tournament; gender: HubGender; hub: HubKey; side: string; season: number; open: boolean; onToggle: () => void; onChange: (t: Tournament) => void
}) {
  const [editing, setEditing] = useState(false)
  const [label, setLabel] = useState('')
  const [date, setDate] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const hubPath = hub === 'ms' ? 'ms-hub' : 'offseason-hub'
  const thisSeason = t.events.filter(e => e.season === season)
  const others = t.events.filter(e => e.season !== season)
  const href = (e: HubEvent) => `/admin/${side}/${hubPath}/event/${e.id}`
  const dateSeason = date ? hubSeasonOfDate(hub, date) : null

  async function addYear() {
    setErr(null)
    const res = await fetch('/api/admin/hub/events', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gender, tournament_id: t.id, season, label, start_date: date || null }) })
    const d = await res.json()
    if (!res.ok) return setErr(d.error)
    onChange({ ...t, events: [{ ...d.event, nj: { competed: 0, podium: [], placed: [] } }, ...t.events].sort((a, b) => b.season - a.season) })
    setLabel(''); setDate('')
  }
  async function removeYear(e: HubEvent) {
    if (!confirm(`Remove ${t.name} ${hubSeasonLabel(hub, e.season)}${e.label ? ` (${e.label})` : ''}? It has no results.`)) return
    const res = await fetch(`/api/admin/hub/events?gender=${gender}&id=${e.id}`, { method: 'DELETE' })
    const d = await res.json()
    if (!res.ok) return setErr(d.error)
    onChange({ ...t, events: t.events.filter(x => x.id !== e.id) })
  }

  return (
    <>
      <tr className={`border-b border-slate-100 cursor-pointer hover:bg-slate-50 ${t.is_active ? '' : 'text-slate-400'}`} onClick={onToggle}>
        <td className={`${td} font-medium`}>{open ? '▾' : '▸'} {t.name}</td>
        <td className={td}>{t.level ? HUB_LEVEL_LABEL[t.level] : <span className="text-slate-400">—</span>}</td>
        <td className={td}>{t.champion_rating ?? '—'}</td>
        <td className={td}>{t.time_of_year}</td>
        <td className={td}>{t.location}</td>
        <td className={td} onClick={e => e.stopPropagation()}>
          {thisSeason.length
            ? thisSeason.map(e => <div key={e.id}><Link href={href(e)} className="hover:underline">{e.label ? `${e.label}: ` : ''}{seasonCell(e)}</Link></div>)
            : <span className="text-slate-400">not entered</span>}
        </td>
      </tr>
      {open && (
        <tr className="border-b border-slate-200 bg-slate-50/60">
          <td colSpan={6} className="px-6 py-3">
            {editing
              ? <TournamentForm gender={gender} hub={hub} initial={t} onDone={nt => { setEditing(false); if (nt) onChange({ ...nt, events: t.events }) }} />
              : (
                <div className="flex gap-3 text-xs text-slate-600 mb-3">
                  {t.format && <span className="text-slate-400">{t.format}</span>}
                  <button onClick={() => setEditing(true)} className="underline hover:text-black">Edit details</button>
                  <button onClick={async () => {
                    const res = await fetch('/api/admin/hub/tournaments', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gender, id: t.id, is_active: !t.is_active }) })
                    const d = await res.json(); if (res.ok) onChange({ ...d.tournament, events: t.events })
                  }} className="underline hover:text-black">{t.is_active ? 'Hide from the list' : 'Show in the list'}</button>
                </div>
              )}

            <DivisionRatings t={t} gender={gender} onChange={onChange} />
            {thisSeason.map(e => <EventSummary key={e.id} e={e} hub={hub} href={href(e)} onRemove={() => removeYear(e)} />)}
            <div className="flex items-center gap-2 flex-wrap mt-2">
              <span className="text-xs text-slate-500">{thisSeason.length ? 'Add a second run this season:' : `Enter ${hubSeasonLabel(hub, season)}:`}</span>
              <input value={date} onChange={e => setDate(e.target.value)} type="date" className={input} title="Start date (optional)" />
              {(thisSeason.length > 0 || label) && <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Label, e.g. Fall or Spring" className={`${input} w-48`} />}
              <button onClick={addYear} disabled={(thisSeason.length > 0 && !label.trim()) || (dateSeason != null && dateSeason !== season)}
                className="px-3 py-1 text-sm bg-black text-white disabled:opacity-40">Add</button>
              {dateSeason != null && dateSeason !== season && <span className="text-xs text-amber-700">That date is in {hubSeasonLabel(hub, dateSeason)}: switch the season at the top to enter it there.</span>}
            </div>
            {err && <p className="text-xs text-red-600 mt-1">{err}</p>}

            {others.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-slate-700 mb-1">Other seasons</p>
                {others.map(e => (
                  <div key={e.id} className="text-sm flex gap-3">
                    <Link href={href(e)} className="underline hover:text-black">{hubSeasonLabel(hub, e.season)}{e.label ? ` · ${e.label}` : ''}</Link>
                    {seasonCell(e)}
                  </div>
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

// A champion rating per division (NHSCA's grade brackets, Fargo 16U / Junior…): blank = the tournament's rating.
// Lists the divisions any season of the tournament was uploaded with.
function DivisionRatings({ t, gender, onChange }: { t: Tournament; gender: HubGender; onChange: (t: Tournament) => void }) {
  const divisions = [...new Set(t.events.flatMap(e => (e.upload_divisions ?? []).map(d => d.division)))].sort()
  const [vals, setVals] = useState<Record<string, string>>(() => Object.fromEntries(divisions.map(d => [d, t.division_ratings?.[d] != null ? String(t.division_ratings[d]) : ''])))
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  if (divisions.length < 2) return null
  // unchanged from what's saved: Save stays off and says so (Kyle 2026-11-13: "nothing happens when i hit save")
  const saved = (d: string) => (t.division_ratings?.[d] != null ? String(t.division_ratings[d]) : '')
  const dirty = divisions.some(d => (vals[d] ?? '') !== saved(d))
  async function save() {
    setBusy(true); setMsg(null)
    const res = await fetch('/api/admin/hub/tournaments', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gender, id: t.id, division_ratings: vals }) })
    const d = await res.json().catch(() => ({ error: 'The server did not answer' }))
    setBusy(false)
    setMsg(res.ok ? 'Saved' : d.error)
    if (res.ok) onChange({ ...d.tournament, events: t.events })
  }
  return (
    <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600 mb-2">
      <span className="font-semibold text-slate-700">Champion rating by division</span>
      {divisions.map(d => (
        <label key={d} className="flex items-center gap-1">{d}
          <input value={vals[d] ?? ''} onChange={e => { setVals({ ...vals, [d]: e.target.value.replace(/[^\d]/g, '') }); setMsg(null) }} placeholder={String(t.champion_rating ?? '')} inputMode="numeric" className="border border-slate-300 px-1 py-0.5 w-12" />
        </label>
      ))}
      <button onClick={save} disabled={busy || !dirty} className={`px-2 py-0.5 text-white ${msg === 'Saved' && !dirty ? 'bg-emerald-700' : 'bg-black'} disabled:opacity-60`}>
        {busy ? 'Saving…' : msg === 'Saved' && !dirty ? 'Saved ✓' : dirty ? 'Save' : 'Saved'}
      </button>
      <span className="text-slate-400">blank = {t.champion_rating ?? 'the tournament'}</span>
      {msg === 'Saved' && !dirty && <span className="text-emerald-700 font-semibold">Leaderboard scores now use these ratings.</span>}
      {msg && msg !== 'Saved' && <span className="text-red-600 font-semibold">{msg}</span>}
    </div>
  )
}

// One season of a tournament, opened: the upload, the divisions, and the NJ kids
function EventSummary({ e, hub, href, onRemove }: { e: HubEvent; hub: HubKey; href: string; onRemove: () => void }) {
  const [allPlaced, setAllPlaced] = useState(false)
  const top8Only = isUploaded(e) && !e.bouts && (e.placed_through ?? 0) <= 8   // results that only publish the top 8
  const div = (r: NjPlace) => `${r.division ? `${r.division} ` : ''}${r.weight}${r.style === 'freestyle' ? ' FS' : ''}`
  const placed = allPlaced ? e.nj.placed : e.nj.placed.slice(0, 20)
  return (
    <div className="border border-slate-200 bg-white p-3 mb-2">
      <div className="flex items-baseline gap-3 flex-wrap text-sm">
        <Link href={href} className="font-semibold underline hover:text-black">{hubSeasonLabel(hub, e.season)}{e.label ? ` · ${e.label}` : ''}</Link>
        {e.start_date && <span className="text-slate-500">{fmtDay(`${e.start_date}T12:00:00`)}</span>}
        {isUploaded(e)
          ? <span className="text-emerald-700 font-medium">✓ Uploaded{e.uploaded_at ? ` ${fmtDay(e.uploaded_at)}` : ''}</span>
          : <><span className="text-amber-700">Not uploaded yet</span><Link href={href} className="text-xs underline text-slate-500 hover:text-black">upload results</Link><button onClick={onRemove} className="text-xs text-slate-400 hover:text-red-600">remove</button></>}
      </div>
      {isUploaded(e) && (
        <>
          <p className="text-xs text-slate-600 mt-1">
            {e.placements.toLocaleString()} places{e.placed_through ? `, placed through ${ordinal(e.placed_through)}` : ''}{e.bouts ? ` · ${e.bouts.toLocaleString()} bouts` : ''}
            {e.upload_files?.length ? <span className="text-slate-400"> · from {e.upload_files.join(', ')}</span> : null}
          </p>
          {e.notes && <p className="text-xs text-amber-700 mt-0.5">{e.notes}</p>}
          {!!e.upload_divisions?.length && (
            <p className="text-xs text-slate-500 mt-0.5">{e.upload_divisions.map(d => `${d.division}${d.style === 'freestyle' ? ' (FS)' : ''}: ${d.weights} wts, ${d.places} places, through ${ordinal(d.placed_through)}`).join(' · ')}</p>
          )}
          <p className="text-sm mt-2"><b>{e.nj.competed}</b> NJ {top8Only ? `placer${e.nj.competed === 1 ? '' : 's'} (only the top 8 are published)` : `wrestler${e.nj.competed === 1 ? '' : 's'} competed`} · <b>{e.nj.podium.length}</b> on the podium{!top8Only ? <> · <b>{e.nj.placed.length}</b> placed below 8th</> : null}</p>
          {e.nj.podium.length > 0 && (
            <table className="text-sm mt-1 border border-slate-200">
              <thead className="bg-slate-50 border-b border-slate-200"><tr><th className={th}>Place</th><th className={th}>NJ podium</th><th className={th}>School / club</th><th className={th}>{RATING_SHORT}</th><th className={th}>Division</th></tr></thead>
              <tbody>{e.nj.podium.map((r, i) => (
                <tr key={i} className="border-b border-slate-100"><td className={`${td} font-semibold`}>{ordinal(r.place)}</td><td className={td}>{r.name}</td><td className={`${td} text-slate-600`}>{r.from ?? '—'}</td><td className={td}>{wrr(r.rating)}</td><td className={`${td} text-slate-600`}>{div(r)}</td></tr>
              ))}</tbody>
            </table>
          )}
          {e.nj.placed.length > 0 && (
            <div className="mt-2 text-xs text-slate-600">
              <p className="font-semibold text-slate-700 mb-0.5">NJ placed below 8th</p>
              {placed.map((r, i) => <div key={i}>{placeLabel(r.place, r.place_to)} · {r.name}{r.from ? ` (${r.from})` : ''}{r.rating ? <> · {RATING_SHORT} {wrr(r.rating)}</> : null} · {div(r)}</div>)}
              {e.nj.placed.length > 20 && <button onClick={() => setAllPlaced(v => !v)} className="underline hover:text-black mt-0.5">{allPlaced ? 'Show fewer' : `Show all ${e.nj.placed.length}`}</button>}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function TournamentForm({ gender, hub, initial, onDone }: { gender: HubGender; hub: HubKey; initial?: Tournament; onDone: (t: Tournament | null) => void }) {
  const keys = ['name', 'time_of_year', 'location', 'format'] as const
  const labels: Record<typeof keys[number], string> = { name: 'Name *', time_of_year: 'Time of year', location: 'Location', format: 'Format (e.g. Folkstyle Individual)' }
  const [f, setF] = useState<Record<string, string>>(Object.fromEntries(keys.map(k => [k, (initial?.[k] as string | null) ?? ''])))
  const [level, setLevel] = useState(initial?.level ?? '')
  const [rating, setRating] = useState(initial?.champion_rating != null ? String(initial.champion_rating) : '')
  const [err, setErr] = useState<string | null>(null)
  async function save() {
    const res = await fetch('/api/admin/hub/tournaments', { method: initial ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gender, hub, ...(initial ? { id: initial.id } : {}), ...f, level: level || null, champion_rating: rating.trim() ? Number(rating) : null }) })
    const d = await res.json()
    if (!res.ok) return setErr(d.error)
    onDone(d.tournament)
  }
  return (
    <div className="border border-slate-200 bg-white p-3 mb-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
      {keys.map(k => (
        <label key={k} className="text-xs text-slate-500">{labels[k]}
          <input value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} className={`${input} w-full mt-0.5`} />
        </label>
      ))}
      <label className="text-xs text-slate-500">Level
        <select value={level} onChange={e => { setLevel(e.target.value); if (e.target.value) setRating(String(HUB_LEVELS[e.target.value])) }} className={`${input} w-full mt-0.5`}>
          <option value="">—</option>
          {Object.keys(HUB_LEVELS).map(l => <option key={l} value={l}>{HUB_LEVEL_LABEL[l]}</option>)}
        </select>
      </label>
      <label className="text-xs text-slate-500">Champion rating (national 90, regional 75, state 50, local 25)
        <input value={rating} onChange={e => setRating(e.target.value.replace(/[^\d]/g, ''))} inputMode="numeric" className={`${input} w-full mt-0.5`} />
      </label>
      <div className="sm:col-span-2 flex gap-2 items-center">
        <button onClick={save} disabled={!f.name.trim()} className="px-3 py-1 text-sm bg-black text-white disabled:opacity-40">Save</button>
        <button onClick={() => onDone(null)} className="px-3 py-1 text-sm border border-slate-300">Cancel</button>
        {err && <span className="text-xs text-red-600">{err}</span>}
      </div>
    </div>
  )
}

// ── Leaderboard ──────────────────────────────────────────────────────────────
// Sorted by weight, then offseason score (Kyle 2026-11-13), or by score or podiums; any set of class years.
// The Middle School Hub is one mixed pool, so its leaderboard picks boys or girls.

type LbSort = 'weight' | 'score' | 'podiums' | 'events' | 'school' | 'bestwin'

function LeaderboardTab({ hub, gender, season }: { hub: HubKey; gender: HubGender; season: number }) {
  const { gender: sideGender } = useAdminGender()
  const [rows, setRows] = useState<LeaderRow[] | null>(null)
  const [unknown, setUnknown] = useState(0)
  const [all, setAll] = useState(false)
  const [allSeasons, setAllSeasons] = useState(false)
  const [classYears, setClassYears] = useState<number[]>([])
  const [weight, setWeight] = useState('')
  const [sort, setSort] = useState<LbSort>('weight')
  const [ours, setOurs] = useState(false)       // only kids linked to one of our wrestlers with a school
  const [school, setSchool] = useState('')
  const sex: 'M' | 'F' = sideGender === 'F' ? 'F' : 'M'   // the Middle School Hub shows this side's kids
  const [open, setOpen] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/admin/hub/leaderboard?gender=${gender}&hub=${hub}${all ? '&state=all' : ''}${allSeasons ? '' : `&season=${season}`}${gender === 'X' ? `&sex=${sex}` : ''}`).then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else { setRows(d.rows); setUnknown(d.unknown_state ?? 0) } })
      .catch(() => setError('Could not load the leaderboard'))
  }, [gender, hub, all, allSeasons, season, sex])

  if (error) return <p className="text-sm text-red-600">{error}</p>
  if (!rows) return <p className="text-sm text-slate-400">Loading…</p>
  const wt = (r: LeaderRow) => Number.parseInt(r.weight ?? '') || 9999
  const years = [...new Set(rows.map(r => r.class_year).filter(Boolean))].sort() as number[]
  const schoolOf = (r: LeaderRow) => r.wrestler?.school ?? null
  const bestWin = (r: LeaderRow) => r.notable.find(n => n.kind === 'win')?.opponent_score ?? 0
  const schools = [...new Set(rows.map(schoolOf).filter(Boolean))].sort() as string[]
  const weights = [...new Set(rows.map(r => r.weight).filter(Boolean))].sort((x, y) => Number.parseInt(x!) - Number.parseInt(y!)) as string[]
  const shown = rows
    .filter(r => (!classYears.length || (r.class_year != null && classYears.includes(r.class_year))) && (!weight || r.weight === weight)
      && (!ours || !!schoolOf(r)) && (!school || schoolOf(r) === school))
    .sort((x, y) => sort === 'podiums' ? 0
      : sort === 'events' ? y.events - x.events || y.score - x.score || x.name.localeCompare(y.name)
      : sort === 'bestwin' ? bestWin(y) - bestWin(x) || y.score - x.score
      : sort === 'school' ? (schoolOf(x) ?? '\uffff').localeCompare(schoolOf(y) ?? '\uffff') || wt(x) - wt(y) || y.score - x.score
      : sort === 'score' ? y.score - x.score || x.name.localeCompare(y.name)
      : wt(x) - wt(y) || y.score - x.score || x.name.localeCompare(y.name))
  const toggleYear = (y: number) => setClassYears(classYears.includes(y) ? classYears.filter(x => x !== y) : [...classYears, y])
  let n = 0, lastWt: string | null = null

  return (
    <div>
      <div className="flex items-center gap-3 mb-2 text-sm flex-wrap">
        <select value={allSeasons ? 'all' : 'one'} onChange={e => setAllSeasons(e.target.value === 'all')} className={input}>
          <option value="one">{hubSeasonLabel(hub, season)} only</option>
          <option value="all">All seasons</option>
        </select>
        <select value={sort} onChange={e => setSort(e.target.value as LbSort)} className={input}>
          <option value="weight">By weight, then score</option>
          <option value="score">By score</option>
          <option value="podiums">By podiums</option>
          <option value="events">By events wrestled</option>
          <option value="school">By school</option>
          <option value="bestwin">By best win</option>
        </select>
        <select value={weight} onChange={e => setWeight(e.target.value)} className={input}>
          <option value="">All weights</option>
          {weights.map(w => <option key={w} value={w}>{w}</option>)}
        </select>
        <label className="flex items-center gap-1 text-slate-600"><input type="checkbox" checked={ours} onChange={e => setOurs(e.target.checked)} /> Our wrestlers only</label>
        {schools.length > 0 && (
          <select value={school} onChange={e => setSchool(e.target.value)} className={`${input} max-w-[14rem]`}>
            <option value="">All schools</option>
            {schools.map(x => <option key={x} value={x}>{x}</option>)}
          </select>
        )}
        <label className="flex items-center gap-1 text-slate-600"><input type="checkbox" checked={all} onChange={e => setAll(e.target.checked)} /> All states</label>
        {!all && unknown > 0 && <span className="text-xs text-amber-700">{unknown} kids have no state yet (set it on the Prospects tab)</span>}
      </div>
      {years.length > 0 && (
        <div className="flex items-center gap-1 mb-3 text-xs flex-wrap">
          <span className="text-slate-500 mr-1">Class of</span>
          {years.map(y => <button key={y} onClick={() => toggleYear(y)} className={`px-2 py-0.5 border ${classYears.includes(y) ? 'bg-black text-white border-black' : 'border-slate-300 text-slate-600 hover:border-slate-500'}`}>{y}</button>)}
          {classYears.length > 0 && <button onClick={() => setClassYears([])} className="ml-1 underline text-slate-500 hover:text-black">all</button>}
        </div>
      )}
      <p className="text-xs text-slate-400 mb-2">Score: the best single result, by place and the tournament&apos;s tier (national 90, regional 75, state 50; local 25 uses the 50 table halved until it has its own). 1st–8th, then 9th–12th, 13th–16th, 17th–24th, 25th–32nd.</p>
      {!shown.length ? <p className="text-sm text-slate-400">No results loaded{allSeasons ? '' : ` for ${hubSeasonLabel(hub, season)}`} yet.</p> : (
        <table className="w-full text-sm border border-slate-200">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className={th}>#</th><th className={th}>Wt</th><th className={th}>Wrestler</th><th className={th}>Class</th><th className={th}>Club</th>
              {all && <th className={th}>St</th>}
              <th className={th}>Score</th><th className={th}>Best result</th><th className={th} title="Tournaments on our list they wrestled">Events</th><th className={th} title="Highest-rated kid they beat (score 75+)">Best win</th><th className={th}>Titles</th><th className={th}>Podiums</th><th className={th}>Bouts W-L</th><th className={th}>High school</th><th className={th}>{RATING_SHORT}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map(r => {
              // rank restarts at each weight when sorted by weight
              const group = sort === 'school' ? schoolOf(r) : r.weight
              if ((sort === 'weight' || sort === 'school') && group !== lastWt) { n = 0; lastWt = group }
              n++
              return (
                <Fragment key={r.prospect_id}>
                  <tr className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer ${(sort === 'weight' || sort === 'school') && n === 1 ? 'border-t-2 border-t-slate-300' : ''}`} onClick={() => setOpen(open === r.prospect_id ? null : r.prospect_id)}>
                    <td className={`${td} text-slate-400`}>{n}</td>
                    <td className={`${td} font-semibold`}>{r.weight ?? '—'}</td>
                    <td className={`${td} font-medium`}>{r.name}</td>
                    <td className={td}>{r.class_year ?? '—'}</td>
                    <td className={td}>{r.club ?? '—'}</td>
                    {all && <td className={td}>{r.state ?? '—'}</td>}
                    <td className={`${td} font-semibold`}>{r.score ? r.score.toFixed(1) : '—'}</td>
                    <td className={`${td} text-xs text-slate-600`}>{r.score_from ?? ''}</td>
                    <td className={td}>{r.events}</td>
                    <td className={`${td} text-xs`}>{(() => { const w = r.notable.find(n => n.kind === 'win'); return w ? <span title={`${w.result} · ${w.event}`}>{w.opponent} <span className="text-slate-400">({w.opponent_score})</span></span> : '' })()}</td>
                    <td className={td}>{r.titles || ''}</td>
                    <td className={td}>{r.podiums || ''}</td>
                    <td className={td}>{r.wins + r.losses ? `${r.wins}-${r.losses}` : '—'}</td>
                    <td className={td}>{r.wrestler ? r.wrestler.school ?? 'linked (school not found)' : ''}</td>
                    <td className={td}>{r.wrestler ? wrr(r.wrestler.rating) : ''}</td>
                  </tr>
                  {open === r.prospect_id && (
                    <tr className="border-b border-slate-200 bg-slate-50/60">
                      <td />
                      <td colSpan={all ? 14 : 13} className="px-3 py-2 text-xs text-slate-600">
                        {r.notable.length > 0 && (
                          <div className="mb-2">
                            <p className="font-semibold text-slate-700">Notable results <span className="font-normal text-slate-400">(opponents scoring 75+: wins, and losses by 1–2 points or in overtime)</span></p>
                            {r.notable.map((n, j) => (
                              <div key={j}><span className={n.kind === 'win' ? 'text-emerald-700 font-semibold' : 'text-amber-700'}>{n.kind === 'win' ? 'Beat' : 'Lost close to'}</span> {n.opponent} <span className="text-slate-400">({n.opponent_score}{n.opponent_from ? `, ${n.opponent_from}` : ''})</span> · {n.result} · {n.event} {n.weight}</div>
                            ))}
                          </div>
                        )}
                        {r.finishes.map((f, j) => (
                          <div key={j}>{hubSeasonLabel(hub, f.season)} · {f.tournament} · {f.division ? `${f.division} ` : ''}{f.weight}{f.style === 'freestyle' ? ' (freestyle)' : ''} · <b>{placeLabel(f.place, f.place_to)}</b></div>
                        ))}
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

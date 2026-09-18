'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAdminGender } from '@/components/admin/AdminGenderContext'
// parseEventList removed — Add Events now redirects to the unified import tool

// ── Types ─────────────────────────────────────────────────────────────────────

export type HubRow = {
  registry_id:             string
  name:                    string
  date_start:              string | null
  date_end:                string | null
  event_type:              'tournament' | 'jamboree'
  point_value:             number | null
  imported:                boolean
  in_season_tournament_id: string | null
  notes:                   string | null
  has_finals:              boolean | null
  has_3rd_place:           boolean | null
  has_5th_place:           boolean | null
  has_7th_place:           boolean | null
  district_champs:         number | null
  region_top4:             number | null
  state_qualifiers:        number | null
  total_nj_wrestlers:      number | null
  school_count:            number | null
  bout_count:              number | null
  placement_count:         number | null
  team_score_count:        number | null
}

type FilterType   = 'all' | 'tournament' | 'jamboree'
type FilterStatus = 'all' | 'imported' | 'pending'
type SortCol      = 'date_start' | 'name' | 'point_value' | 'region_top4' | 'state_qualifiers' | 'total_nj_wrestlers'

const POINT_OPTIONS = [20, 15, 10, 5, 1] as const
const COL_COUNT = 11

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  const [, m, d] = iso.split('-')
  return `${parseInt(m)}/${parseInt(d)}`
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split('-')
  const name = new Date(parseInt(y), parseInt(m) - 1).toLocaleString('default', { month: 'long' })
  return `${name} ${y}`
}

// ── Paste parsers (inline, no dep on TournamentDetailClient) ──────────────────

type SeedRow = { weight_class: number; seed: number; wrestler_name_raw: string; school_name_raw: string }
type ScoreRow = { place: number; school_name: string; score: number; school_id: null }

type ResolvedSeed = SeedRow & {
  school_id:           number | null
  school_display_name: string | null
  school_source:       'alias' | 'name' | 'unmatched'
}

type ResolvedSchool = {
  raw:          string
  school_id:    number | null
  display_name: string | null
  source:       'alias' | 'name' | 'unmatched'
}

function parseSeeds(text: string): SeedRow[] {
  const rows: SeedRow[] = []
  let wc = 0
  for (const raw of text.trim().split('\n')) {
    const line = raw.trim()
    if (!line) continue
    const wcMatch = line.match(/^(\d{2,3})(?:\s*lbs?)?\.?$/)
    if (wcMatch) { wc = parseInt(wcMatch[1]); continue }
    const seedMatch = line.match(/^(\d+)[.\s]+(.+?)(?:[,]\s*(.+))?$/)
    if (seedMatch && wc > 0) {
      rows.push({
        weight_class:      wc,
        seed:              parseInt(seedMatch[1]),
        wrestler_name_raw: seedMatch[2]?.trim() ?? '',
        school_name_raw:   seedMatch[3]?.trim() ?? '',
      })
    }
  }
  return rows
}

function parseScores(text: string): ScoreRow[] {
  const rows: ScoreRow[] = []
  for (const raw of text.trim().split('\n')) {
    const line = raw.trim()
    if (!line) continue
    const m = line.match(/^(\d+)\s+(.+?)\s+([\d.]+)\s*$/)
    if (m) {
      rows.push({ place: parseInt(m[1]), school_name: m[2].trim(), score: parseFloat(m[3]), school_id: null })
    }
  }
  return rows
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: 'tournament' | 'jamboree' }) {
  return (
    <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 ${
      type === 'tournament' ? 'bg-indigo-100 text-indigo-700' : 'bg-teal-100 text-teal-700'
    }`}>
      {type === 'tournament' ? 'T' : 'J'}
    </span>
  )
}

function StatusBadge({ imported, linked }: { imported: boolean; linked: boolean }) {
  const isImported = imported || linked
  return (
    <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 ${
      isImported ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
    }`}>
      {isImported ? '✓' : 'Pending'}
    </span>
  )
}

function BracketChips({ row }: { row: HubRow }) {
  if (row.has_finals === null) return <span className="text-slate-300 text-xs">—</span>
  const pv = row.point_value
  const tiers = [
    { label: 'F', has: row.has_finals,    needed: pv !== null },
    { label: '3', has: row.has_3rd_place, needed: pv !== null && pv >= 10 },
    { label: '5', has: row.has_5th_place, needed: pv !== null && pv >= 15 },
    { label: '7', has: row.has_7th_place, needed: pv !== null && pv >= 20 },
  ]
  const visible = pv !== null ? tiers.filter(t => t.needed) : tiers.filter(t => t.has)
  if (visible.length === 0) return <span className="text-slate-300 text-xs">—</span>
  return (
    <div className="flex gap-0.5">
      {visible.map(t => (
        <span key={t.label} className={`text-[10px] font-bold px-1 py-0.5 ${
          t.has ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
        }`}>{t.label}</span>
      ))}
    </div>
  )
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

function PointDropdown({ row, onSaved }: { row: HubRow; onSaved: (id: string, value: number | null) => void }) {
  const [saveState, setSaveState] = useState<SaveState>('idle')

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value === '' ? null : Number(e.target.value) as 1 | 5 | 10 | 15 | 20
    setSaveState('saving')
    try {
      const res = await fetch('/api/admin/tournament-hub', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registry_id:             row.registry_id,
          in_season_tournament_id: row.in_season_tournament_id,
          point_value:             value,
        }),
      })
      if (!res.ok) throw new Error()
      onSaved(row.registry_id, value)
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 1500)
    } catch {
      setSaveState('error')
      setTimeout(() => setSaveState('idle'), 2000)
    }
  }

  return (
    <div className="flex items-center gap-1">
      <select
        value={row.point_value ?? ''}
        onChange={handleChange}
        disabled={saveState === 'saving'}
        className="text-xs border border-slate-200 bg-white px-1.5 py-1 text-slate-700 focus:outline-none focus:border-slate-400 disabled:opacity-50 w-[72px]"
      >
        <option value="">—</option>
        {POINT_OPTIONS.map(v => <option key={v} value={v}>{v} pts</option>)}
      </select>
      {saveState === 'saving' && <span className="text-[9px] text-slate-400">…</span>}
      {saveState === 'saved'  && <span className="text-[9px] text-emerald-600">✓</span>}
      {saveState === 'error'  && <span className="text-[9px] text-red-600">!</span>}
    </div>
  )
}

function Num({ n }: { n: number | null }) {
  if (n === null) return <span className="text-slate-300">—</span>
  return <span className={n > 0 ? 'font-semibold text-slate-900' : 'text-slate-400'}>{n}</span>
}

// ── Row Expander Panel ────────────────────────────────────────────────────────

function RowExpander({ row, gender, season, onClose, onTidCreated }: { row: HubRow; gender: 'M' | 'F'; season: string; onClose: () => void; onTidCreated: (tid: string) => void }) {
  const router = useRouter()
  const tid = row.in_season_tournament_id
  const [creating, setCreating] = useState(false)
  const [createMsg, setCreateMsg] = useState<string | null>(null)

  // Bout results
  const [boutText,       setBoutText]       = useState('')

  // Seeds
  const [showSeeds,      setShowSeeds]      = useState(false)
  const [seedText,       setSeedText]       = useState('')
  const [seedParsed,     setSeedParsed]     = useState<SeedRow[] | null>(null)
  const [seedResolved,   setSeedResolved]   = useState<ResolvedSeed[] | null>(null)
  const [seedResolving,  setSeedResolving]  = useState(false)
  const [seedSaving,     setSeedSaving]     = useState(false)
  const [seedMsg,        setSeedMsg]        = useState<string | null>(null)

  // Team scores
  const [showScores,     setShowScores]     = useState(false)
  const [scoreText,      setScoreText]      = useState('')
  const [scoreParsed,    setScoreParsed]    = useState<ScoreRow[] | null>(null)
  const [scoreSaving,    setScoreSaving]    = useState(false)
  const [scoreMsg,       setScoreMsg]       = useState<string | null>(null)

  // School list
  const [showSchools,    setShowSchools]    = useState(false)
  const [schoolText,     setSchoolText]     = useState('')
  const [schoolResolved, setSchoolResolved] = useState<ResolvedSchool[] | null>(null)
  const [schoolResolving,setSchoolResolving]= useState(false)
  const [schoolSaving,   setSchoolSaving]   = useState(false)
  const [schoolMsg,      setSchoolMsg]      = useState<string | null>(null)

  function sendToImportHub() {
    if (!boutText.trim()) return
    sessionStorage.setItem('mw_pending_import', JSON.stringify({
      type: 'tournament',
      text: boutText,
      gender,
      seasonId: 2,
      tournament_id:   tid ?? undefined,
      tournament_name: row.name,
      registry_id:     row.registry_id,
    }))
    router.push('/admin/import-rtf')
  }

  async function createTournamentRecord() {
    setCreating(true); setCreateMsg(null)
    try {
      const res = await fetch('/api/admin/tournament-hub', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_tournament_record',
          registry_id: row.registry_id,
          name: row.name,
          date_start: row.date_start,
          date_end: row.date_end,
          season,
          gender,
        }),
      })
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      setCreateMsg('✓ Tournament record created')
      onTidCreated(d.in_season_tournament_id)
    } catch (e) {
      setCreateMsg(`Error: ${String(e)}`)
    } finally {
      setCreating(false)
    }
  }

  async function resolveSeeds() {
    if (!seedParsed?.length) return
    setSeedResolving(true); setSeedMsg(null)

    const uniqueSchools = [...new Set(seedParsed.map(s => s.school_name_raw).filter(Boolean))]
    const schoolMap = new Map<string, { id: number; display_name: string; source: string } | null>()
    for (const name of uniqueSchools) {
      const res = await fetch(`/api/admin/search-schools?q=${encodeURIComponent(name)}&limit=1`)
      const data = await res.json()
      schoolMap.set(name, data.schools?.[0] ?? null)
    }

    setSeedResolved(seedParsed.map(s => {
      const match = s.school_name_raw ? schoolMap.get(s.school_name_raw) : null
      return {
        ...s,
        school_id:           match?.id ?? null,
        school_display_name: match?.display_name ?? null,
        school_source:       (match?.source ?? 'unmatched') as 'alias' | 'name' | 'unmatched',
      }
    }))
    setSeedResolving(false)
  }

  async function saveSeeds() {
    const toSave = seedResolved ?? seedParsed
    if (!tid || !toSave?.length) return
    setSeedSaving(true); setSeedMsg(null)
    try {
      const seeds = toSave.map(s => ({
        weight_class:      s.weight_class,
        seed:              s.seed,
        wrestler_name_raw: s.wrestler_name_raw,
        school_name_raw:   s.school_name_raw,
        school_id:         (s as Partial<ResolvedSeed>).school_id ?? null,
      }))
      const res = await fetch('/api/admin/tournament-detail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_seeds', in_season_tournament_id: tid, seeds }),
      })
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      setSeedMsg(`✓ Saved ${d.count} seeds`)
      setSeedText(''); setSeedParsed(null); setSeedResolved(null)
    } catch (e) {
      setSeedMsg(`Error: ${String(e)}`)
    } finally {
      setSeedSaving(false)
    }
  }

  async function saveScores() {
    if (!tid || !scoreParsed?.length) return
    setScoreSaving(true); setScoreMsg(null)
    try {
      const res = await fetch('/api/admin/save-team-scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournament_id: tid, scores: scoreParsed }),
      })
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      setScoreMsg(`✓ Saved ${scoreParsed.length} scores`)
      setScoreText(''); setScoreParsed(null)
    } catch (e) {
      setScoreMsg(`Error: ${String(e)}`)
    } finally {
      setScoreSaving(false)
    }
  }

  async function resolveSchools() {
    const names = schoolText.trim().split('\n').map(l => l.trim()).filter(Boolean)
    if (!names.length) return
    setSchoolResolving(true); setSchoolMsg(null)

    const resolved: ResolvedSchool[] = []
    for (const raw of names) {
      const res = await fetch(`/api/admin/search-schools?q=${encodeURIComponent(raw)}&limit=3`)
      const data = await res.json()
      const best = data.schools?.[0] ?? null
      resolved.push({
        raw,
        school_id:    best?.id ?? null,
        display_name: best?.display_name ?? null,
        source:       best ? (best.source as 'alias' | 'name') : 'unmatched',
      })
    }
    setSchoolResolved(resolved)
    setSchoolResolving(false)
  }

  async function confirmSchools() {
    if (!tid || !schoolResolved?.length) return
    setSchoolSaving(true); setSchoolMsg(null)

    const matched = schoolResolved.filter(r => r.school_id !== null)
    let saved = 0
    let aliasesWritten = 0

    for (const r of matched) {
      await fetch('/api/admin/tournament-detail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_participant', in_season_tournament_id: tid, school_id: r.school_id }),
      })
      saved++
      // Write alias when the pasted name differs from display_name and wasn't already an alias match
      if (r.source !== 'alias' && r.raw.toLowerCase() !== (r.display_name ?? '').toLowerCase()) {
        const aliasRes = await fetch('/api/admin/add-school-alias', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ school_id: r.school_id, alias: r.raw, alias_type: 'tournament' }),
        })
        const aliasData = await aliasRes.json()
        if (aliasData.ok && !aliasData.skipped) aliasesWritten++
      }
    }

    const unmatched = schoolResolved.length - matched.length
    setSchoolMsg(
      `✓ Added ${saved} school${saved !== 1 ? 's' : ''}` +
      (aliasesWritten > 0 ? `, ${aliasesWritten} alias${aliasesWritten !== 1 ? 'es' : ''} saved` : '') +
      (unmatched > 0 ? ` · ${unmatched} unmatched skipped` : '')
    )
    setSchoolText(''); setSchoolResolved(null)
    setSchoolSaving(false)
  }

  // Derived for resolved seeds summary
  const uniqueSeedSchoolNames = seedResolved
    ? [...new Set(seedResolved.filter(s => s.school_name_raw).map(s => s.school_name_raw))]
    : []
  const unmatchedSeedSchools = uniqueSeedSchoolNames.filter(
    name => !seedResolved?.find(s => s.school_name_raw === name && s.school_id)
  ).length

  const ta = 'w-full text-xs font-mono border border-slate-300 p-2.5 focus:outline-none focus:ring-1 focus:ring-black resize-y bg-white'

  return (
    <td colSpan={COL_COUNT} className="px-0 py-0 border-t-0">
      <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 space-y-5">

        {/* Bout results */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-700">Bout Results</p>
            <p className="text-[10px] text-slate-400">Paste TrackWrestling / RTF export → sends to Import Hub</p>
          </div>
          <textarea
            className={`${ta} h-28`}
            placeholder={`${row.name} - ${fmtDate(row.date_start)}\n1    School A     215.5\n...`}
            value={boutText}
            onChange={e => setBoutText(e.target.value)}
          />
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={sendToImportHub}
              disabled={!boutText.trim()}
              className="px-3 py-1.5 text-xs font-medium bg-black text-white hover:bg-slate-800 disabled:opacity-40 transition-colors"
            >
              Send to Import Hub →
            </button>
            {!tid && (
              <button
                onClick={createTournamentRecord}
                disabled={creating}
                className="px-3 py-1.5 text-xs font-medium border border-slate-300 text-slate-700 hover:border-black hover:text-black disabled:opacity-40 transition-colors"
              >
                {creating ? 'Creating…' : 'Create tournament record'}
              </button>
            )}
            {createMsg && <span className="text-[11px] text-slate-500">{createMsg}</span>}
          </div>
        </div>

        {/* Optional sections */}
        <div className="space-y-3">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Also paste</p>

          {/* Seeds */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showSeeds} onChange={e => setShowSeeds(e.target.checked)} className="accent-black" />
              <span className="text-xs font-medium text-slate-700">Seeds</span>
            </label>
            {showSeeds && (
              <div className="space-y-2 pl-5">
                {!tid && <p className="text-[11px] text-amber-600">Tournament must be imported before seeds can be saved.</p>}
                <textarea
                  className={`${ta} h-32`}
                  placeholder={`106\n1 Wrestler Name, School\n2 Wrestler Name, School\n\n113\n1 Wrestler Name, School`}
                  value={seedText}
                  onChange={e => { setSeedText(e.target.value); setSeedParsed(null); setSeedResolved(null); setSeedMsg(null) }}
                />
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => { setSeedParsed(parseSeeds(seedText)); setSeedResolved(null) }}
                    disabled={!seedText.trim()}
                    className="px-3 py-1 text-xs font-medium border border-slate-300 hover:bg-white disabled:opacity-40 transition-colors"
                  >
                    Preview ({parseSeeds(seedText).length} detected)
                  </button>
                  {seedParsed && !seedResolved && (
                    <button
                      onClick={resolveSeeds}
                      disabled={seedResolving}
                      className="px-3 py-1 text-xs font-medium border border-slate-300 hover:bg-white disabled:opacity-40 transition-colors"
                    >
                      {seedResolving ? 'Resolving…' : 'Resolve Schools →'}
                    </button>
                  )}
                  {seedResolved && (
                    <button
                      onClick={saveSeeds}
                      disabled={!tid || seedSaving}
                      className="px-3 py-1 text-xs font-medium bg-black text-white hover:bg-slate-800 disabled:opacity-40 transition-colors"
                    >
                      {seedSaving ? 'Saving…' : `Save ${seedResolved.length} seeds`}
                    </button>
                  )}
                  {seedMsg && <span className={`text-xs ${seedMsg.startsWith('Error') ? 'text-red-600' : 'text-green-700'}`}>{seedMsg}</span>}
                </div>

                {/* Raw preview — parsed but not yet resolved */}
                {seedParsed && !seedResolved && seedParsed.length > 0 && (
                  <div className="overflow-x-auto max-h-40 overflow-y-auto border border-slate-200 bg-white">
                    <table className="min-w-full text-[11px]">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          <th className="px-2 py-1 text-left text-slate-500 font-medium">Wt</th>
                          <th className="px-2 py-1 text-left text-slate-500 font-medium">#</th>
                          <th className="px-2 py-1 text-left text-slate-500 font-medium">Wrestler</th>
                          <th className="px-2 py-1 text-left text-slate-500 font-medium">School</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {seedParsed.map((s, i) => (
                          <tr key={i}>
                            <td className="px-2 py-1 tabular-nums text-slate-400">{s.weight_class}</td>
                            <td className="px-2 py-1 tabular-nums text-slate-400">#{s.seed}</td>
                            <td className="px-2 py-1 font-medium text-slate-800">{s.wrestler_name_raw}</td>
                            <td className="px-2 py-1 text-slate-500">{s.school_name_raw || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Resolved preview — with school match columns */}
                {seedResolved && seedResolved.length > 0 && (
                  <>
                    {unmatchedSeedSchools > 0 ? (
                      <p className="text-[11px] text-amber-600">
                        {unmatchedSeedSchools} school{unmatchedSeedSchools !== 1 ? 's' : ''} unmatched — will be saved without school ID.
                      </p>
                    ) : (
                      <p className="text-[11px] text-emerald-600">All schools matched ✓</p>
                    )}
                    <div className="overflow-x-auto max-h-48 overflow-y-auto border border-slate-200 bg-white">
                      <table className="min-w-full text-[11px]">
                        <thead className="bg-slate-50 sticky top-0">
                          <tr>
                            <th className="px-2 py-1 text-left text-slate-500 font-medium">Wt</th>
                            <th className="px-2 py-1 text-left text-slate-500 font-medium">#</th>
                            <th className="px-2 py-1 text-left text-slate-500 font-medium">Wrestler</th>
                            <th className="px-2 py-1 text-left text-slate-500 font-medium">School</th>
                            <th className="px-2 py-1 text-left text-slate-500 font-medium">Matched</th>
                            <th className="px-2 py-1 text-left text-slate-500 font-medium w-10">Via</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {seedResolved.map((s, i) => (
                            <tr key={i} className={s.school_name_raw && !s.school_id ? 'bg-amber-50' : ''}>
                              <td className="px-2 py-1 tabular-nums text-slate-400">{s.weight_class}</td>
                              <td className="px-2 py-1 tabular-nums text-slate-400">#{s.seed}</td>
                              <td className="px-2 py-1 font-medium text-slate-800">{s.wrestler_name_raw}</td>
                              <td className="px-2 py-1 text-slate-400 font-mono text-[10px]">{s.school_name_raw || '—'}</td>
                              <td className="px-2 py-1 text-slate-700">
                                {s.school_display_name ?? (s.school_name_raw ? <span className="text-amber-600 italic">no match</span> : '—')}
                              </td>
                              <td className="px-2 py-1">
                                {s.school_source === 'alias'     && <span className="text-[10px] text-emerald-600 font-semibold">alias</span>}
                                {s.school_source === 'name'      && <span className="text-[10px] text-slate-400">name</span>}
                                {s.school_source === 'unmatched' && s.school_name_raw && <span className="text-[10px] text-amber-500">✗</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Team scores */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showScores} onChange={e => setShowScores(e.target.checked)} className="accent-black" />
              <span className="text-xs font-medium text-slate-700">Team Scores</span>
            </label>
            {showScores && (
              <div className="space-y-2 pl-5">
                {!tid && <p className="text-[11px] text-amber-600">Tournament must be imported before scores can be saved.</p>}
                <textarea
                  className={`${ta} h-28`}
                  placeholder={`1  Cherry Hill East  215.5\n2  Kingsway  198.0\n3  Southern Regional  185.5`}
                  value={scoreText}
                  onChange={e => { setScoreText(e.target.value); setScoreParsed(null); setScoreMsg(null) }}
                />
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setScoreParsed(parseScores(scoreText))}
                    disabled={!scoreText.trim()}
                    className="px-3 py-1 text-xs font-medium border border-slate-300 hover:bg-white disabled:opacity-40 transition-colors"
                  >
                    Preview ({parseScores(scoreText).length} detected)
                  </button>
                  {scoreParsed && scoreParsed.length > 0 && (
                    <button
                      onClick={saveScores}
                      disabled={!tid || scoreSaving}
                      className="px-3 py-1 text-xs font-medium bg-black text-white hover:bg-slate-800 disabled:opacity-40 transition-colors"
                    >
                      {scoreSaving ? 'Saving…' : `Save ${scoreParsed.length} scores`}
                    </button>
                  )}
                  {scoreMsg && <span className={`text-xs ${scoreMsg.startsWith('Error') ? 'text-red-600' : 'text-green-700'}`}>{scoreMsg}</span>}
                </div>
                {scoreParsed && scoreParsed.length > 0 && (
                  <div className="overflow-x-auto max-h-36 overflow-y-auto border border-slate-200 bg-white">
                    <table className="min-w-full text-[11px]">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          <th className="px-2 py-1 text-left text-slate-500 font-medium w-12">Place</th>
                          <th className="px-2 py-1 text-left text-slate-500 font-medium">School</th>
                          <th className="px-2 py-1 text-right text-slate-500 font-medium">Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {scoreParsed.map((s, i) => (
                          <tr key={i}>
                            <td className="px-2 py-1 tabular-nums text-slate-400">{s.place}</td>
                            <td className="px-2 py-1 font-medium text-slate-800">{s.school_name}</td>
                            <td className="px-2 py-1 tabular-nums text-right text-slate-600">{s.score}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* School list */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showSchools}
                onChange={e => { setShowSchools(e.target.checked); setSchoolResolved(null); setSchoolMsg(null) }}
                className="accent-black"
              />
              <span className="text-xs font-medium text-slate-700">School List</span>
            </label>
            {showSchools && (
              <div className="space-y-2 pl-5">
                {!tid && <p className="text-[11px] text-amber-600">Tournament must be imported before participants can be saved.</p>}
                <textarea
                  className={`${ta} h-28`}
                  placeholder={`Cherry Hill East\nKingsway\nSouthern Regional\nShawnee`}
                  value={schoolText}
                  onChange={e => { setSchoolText(e.target.value); setSchoolResolved(null); setSchoolMsg(null) }}
                />
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={resolveSchools}
                    disabled={!schoolText.trim() || schoolResolving}
                    className="px-3 py-1 text-xs font-medium border border-slate-300 hover:bg-white disabled:opacity-40 transition-colors"
                  >
                    {schoolResolving ? 'Resolving…' : `Resolve ${schoolText.trim().split('\n').filter(l => l.trim()).length} schools`}
                  </button>
                  {schoolResolved && (
                    <button
                      onClick={confirmSchools}
                      disabled={!tid || schoolSaving || !schoolResolved.some(r => r.school_id)}
                      className="px-3 py-1 text-xs font-medium bg-black text-white hover:bg-slate-800 disabled:opacity-40 transition-colors"
                    >
                      {schoolSaving ? 'Saving…' : `Confirm ${schoolResolved.filter(r => r.school_id).length} matched`}
                    </button>
                  )}
                  {schoolMsg && <span className={`text-xs ${schoolMsg.startsWith('Error') ? 'text-red-600' : 'text-green-700'}`}>{schoolMsg}</span>}
                </div>
                {schoolResolved && (
                  <>
                    {schoolResolved.some(r => !r.school_id) && (
                      <p className="text-[11px] text-amber-600">
                        {schoolResolved.filter(r => !r.school_id).length} unmatched — will be skipped. Fix spelling and re-resolve to include them.
                      </p>
                    )}
                    <div className="overflow-x-auto max-h-48 overflow-y-auto border border-slate-200 bg-white">
                      <table className="min-w-full text-[11px]">
                        <thead className="bg-slate-50 sticky top-0">
                          <tr>
                            <th className="px-2 py-1 text-left text-slate-500 font-medium">Pasted</th>
                            <th className="px-2 py-1 text-left text-slate-500 font-medium">Matched School</th>
                            <th className="px-2 py-1 text-left text-slate-500 font-medium w-12">Via</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {schoolResolved.map((r, i) => (
                            <tr key={i} className={!r.school_id ? 'bg-amber-50' : ''}>
                              <td className="px-2 py-1 font-mono text-slate-600">{r.raw}</td>
                              <td className="px-2 py-1 font-medium text-slate-800">
                                {r.display_name ?? <span className="text-amber-600 italic">not found</span>}
                              </td>
                              <td className="px-2 py-1">
                                {r.source === 'alias'     && <span className="text-[10px] text-emerald-600 font-semibold">alias</span>}
                                {r.source === 'name'      && <span className="text-[10px] text-slate-400">name</span>}
                                {r.source === 'unmatched' && <span className="text-[10px] text-amber-500 font-semibold">✗</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="pt-1">
          <button onClick={onClose} className="text-xs text-slate-400 hover:text-slate-700 transition-colors">
            Collapse ↑
          </button>
        </div>
      </div>
    </td>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function TournamentHubClient({ seasonM, seasonF }: { seasonM: string; seasonF: string }) {
  const { gender } = useAdminGender()
  const season = gender === 'M' ? seasonM : seasonF
  const router = useRouter()

  const [rows, setRows]               = useState<HubRow[]>([])
  const [loadError, setLoadError]     = useState<string | null>(null)
  const [loading, setLoading]         = useState(true)
  const fetchIdRef                    = useRef(0)
  const [filterType, setFilterType]   = useState<FilterType>('all')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [filterMonth, setFilterMonth] = useState('all')
  const [sort, setSort]               = useState<SortCol>('date_start')
  const [dir, setDir]                 = useState<'asc' | 'desc'>('asc')
  const [expandedId, setExpandedId]   = useState<string | null>(null)

  // Bulk import state
  const [showImport, setShowImport]   = useState(false)
  const [pasteText, setPasteText]     = useState('')

  const loadRows = useCallback(async () => {
    const id = ++fetchIdRef.current
    setLoading(true)
    setLoadError(null)
    try {
      const res = await fetch(`/api/admin/tournament-hub?season=${season}&gender=${gender}`)
      const data = await res.json()
      if (id === fetchIdRef.current) {
        if (!res.ok || data.error) {
          setLoadError(data.error ?? `HTTP ${res.status}`)
          setRows([])
        } else {
          setRows(data.rows ?? [])
        }
        setLoading(false)
      }
    } catch (e: unknown) {
      if (id === fetchIdRef.current) {
        setLoadError(e instanceof Error ? e.message : 'Failed to load')
        setLoading(false)
      }
    }
  }, [season, gender])

  useEffect(() => { loadRows() }, [loadRows])

  const handleSaved = useCallback((registryId: string, value: number | null) => {
    setRows(prev => prev.map(r => r.registry_id === registryId ? { ...r, point_value: value } : r))
  }, [])

  async function handleDelete(registryId: string) {
    if (!confirm('Remove this event from the hub?')) return
    await fetch(`/api/admin/tournament-hub?id=${registryId}`, { method: 'DELETE' })
    setRows(prev => prev.filter(r => r.registry_id !== registryId))
  }

  function toggleSort(col: SortCol) {
    if (sort === col) setDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSort(col); setDir('asc') }
  }

  const months = [...new Set(
    rows.filter(r => r.date_start).map(r => r.date_start!.slice(0, 7))
  )].sort()

  const filtered = rows.filter(r => {
    if (filterType !== 'all' && r.event_type !== filterType) return false
    if (filterStatus === 'imported' && !r.imported && !r.in_season_tournament_id) return false
    if (filterStatus === 'pending'  && (r.imported || r.in_season_tournament_id)) return false
    if (filterMonth !== 'all' && (!r.date_start || !r.date_start.startsWith(filterMonth))) return false
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    const av = a[sort]
    const bv = b[sort]
    const aN = av === null ? -Infinity : av
    const bN = bv === null ? -Infinity : bv
    const cmp = typeof av === 'number' || av === null
      ? (aN as number) - (bN as number)
      : String(av).localeCompare(String(bv))
    return dir === 'asc' ? cmp : -cmp
  })

  function handleOpenImportTool() {
    if (!pasteText.trim()) return
    sessionStorage.setItem('mw_pending_import', JSON.stringify({ type: 'tournament', text: pasteText, gender }))
    router.push('/admin/import-rtf')
  }

  function ColHd({ col, label }: { col: SortCol; label: string }) {
    const active = sort === col
    return (
      <th
        onClick={() => toggleSort(col)}
        className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase cursor-pointer select-none whitespace-nowrap hover:text-slate-800 transition-colors"
      >
        {label}{active && <span className="ml-1 text-slate-400">{dir === 'asc' ? '▲' : '▼'}</span>}
      </th>
    )
  }

  const prog     = gender === 'F' ? 'Girls' : 'Boys'
  const imported = rows.filter(r => r.imported || !!r.in_season_tournament_id).length
  const pending  = rows.length - imported
  const noPoints = rows.filter(r => r.point_value === null).length

  return (
    <div className="space-y-4 p-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900">{prog} Tournament Hub</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {rows.length} events · {imported} imported · {pending} pending
            {noPoints > 0 && <span className="text-amber-600"> · {noPoints} without point value</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/import-rtf"
            className="px-3 py-1.5 text-xs font-semibold bg-black text-white hover:bg-slate-800 transition-colors"
          >
            Import text →
          </Link>
          <button
            onClick={() => { setShowImport(v => !v); setPasteText('') }}
            className="px-3 py-1.5 text-xs font-semibold border border-black text-slate-800 hover:bg-slate-50 transition-colors"
          >
            {showImport ? 'Cancel' : '+ Add events'}
          </button>
        </div>
      </div>

      {/* Unified import panel — redirects to import-rtf with text pre-filled */}
      {showImport && (
        <div className="border border-slate-300 bg-slate-50 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-slate-800">Import {prog} Tournament Text</h3>
          <p className="text-xs text-slate-500">
            Paste anything — bracket results, team scores, placements, or a schedule list. The import tool will detect schools, wrestlers, venues, and results automatically.
          </p>
          <textarea
            className="w-full h-48 text-xs font-mono border border-slate-300 p-3 focus:outline-none focus:ring-1 focus:ring-black resize-y"
            placeholder="Paste tournament text here…"
            value={pasteText}
            onChange={e => setPasteText(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenImportTool}
              disabled={!pasteText.trim()}
              className="px-3 py-1.5 text-xs font-semibold bg-black text-white hover:bg-slate-800 disabled:opacity-40 transition-colors"
            >
              Open in Import Tool →
            </button>
            <span className="text-xs text-slate-400">Detects tournaments, schools, wrestlers, venues &amp; scores</span>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex border border-slate-300 overflow-hidden text-xs">
          {(['all', 'tournament', 'jamboree'] as FilterType[]).map((t, i) => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 font-medium transition-colors ${filterType === t ? 'bg-black text-white' : 'bg-white text-slate-600 hover:bg-slate-50'} ${i > 0 ? 'border-l border-slate-300' : ''}`}>
              {t === 'all' ? 'All types' : t === 'tournament' ? 'Tournaments' : 'Jamborees'}
            </button>
          ))}
        </div>
        <div className="flex border border-slate-300 overflow-hidden text-xs">
          {(['all', 'pending', 'imported'] as FilterStatus[]).map((t, i) => (
            <button key={t} onClick={() => setFilterStatus(t)}
              className={`px-3 py-1.5 font-medium transition-colors ${filterStatus === t ? 'bg-black text-white' : 'bg-white text-slate-600 hover:bg-slate-50'} ${i > 0 ? 'border-l border-slate-300' : ''}`}>
              {t === 'all' ? 'All' : t === 'pending' ? 'Pending' : 'Imported'}
            </button>
          ))}
        </div>
        <select
          value={filterMonth}
          onChange={e => setFilterMonth(e.target.value)}
          className="text-xs border border-slate-300 px-2 py-1.5 focus:outline-none"
        >
          <option value="all">All months</option>
          {months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} of {rows.length}</span>
      </div>

      {/* Main table */}
      {loading ? (
        <p className="text-sm text-slate-400 py-8 text-center">Loading…</p>
      ) : loadError ? (
        <div className="py-8 text-center">
          <p className="text-sm text-red-600 font-medium">Failed to load tournaments</p>
          <p className="text-xs text-red-400 mt-1 font-mono">{loadError}</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-slate-300">
          <p className="text-sm text-slate-500 mb-2">No {prog.toLowerCase()} events yet.</p>
          <button onClick={() => setShowImport(true)} className="text-xs text-blue-600 hover:underline">
            Add from tournament list →
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <ColHd col="date_start"         label="Date" />
                <ColHd col="name"               label="Name" />
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Type</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Points</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Status</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Bracket</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Data</th>
                <ColHd col="region_top4"        label="Reg.Quals" />
                <ColHd col="state_qualifiers"   label="St.Quals" />
                <ColHd col="total_nj_wrestlers" label="NJ Wr." />
                <th className="px-3 py-2 w-32"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => {
                const isExpanded = expandedId === r.registry_id
                return (
                  <>
                    <tr
                      key={r.registry_id}
                      className={`group ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'} hover:bg-blue-50/30 transition-colors ${isExpanded ? 'bg-blue-50/40' : ''}`}
                    >
                      <td className="px-3 py-2 tabular-nums text-slate-500 whitespace-nowrap">
                        {fmtDate(r.date_start)}{r.date_end && r.date_end !== r.date_start ? `–${fmtDate(r.date_end)}` : ''}
                      </td>
                      <td className="px-3 py-2 max-w-[220px] truncate">
                        <Link
                          href={`/admin/tournament-hub/${r.registry_id}`}
                          className="font-medium text-slate-900 hover:text-blue-700 hover:underline transition-colors"
                        >
                          {r.name}
                        </Link>
                      </td>
                      <td className="px-3 py-2"><TypeBadge type={r.event_type} /></td>
                      <td className="px-3 py-2"><PointDropdown row={r} onSaved={handleSaved} /></td>
                      <td className="px-3 py-2">
                        <StatusBadge imported={r.imported} linked={!!r.in_season_tournament_id} />
                      </td>
                      <td className="px-3 py-2"><BracketChips row={r} /></td>
                      <td className="px-3 py-2 tabular-nums text-slate-500 whitespace-nowrap">
                        {r.in_season_tournament_id ? (
                          <span className="flex items-center gap-1.5 text-[11px]">
                            <span title="Bouts">{r.bout_count ?? '—'} <span className="text-slate-400">bo</span></span>
                            <span className="text-slate-200">·</span>
                            <span title="Placements">{r.placement_count ?? '—'} <span className="text-slate-400">pl</span></span>
                            <span className="text-slate-200">·</span>
                            <span title="Team scores">{r.team_score_count ?? '—'} <span className="text-slate-400">ts</span></span>
                          </span>
                        ) : (
                          <span className="text-slate-300 text-[11px]">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-right"><Num n={r.region_top4} /></td>
                      <td className="px-3 py-2 tabular-nums text-right"><Num n={r.state_qualifiers} /></td>
                      <td className="px-3 py-2 tabular-nums text-right"><Num n={r.total_nj_wrestlers} /></td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          {/* Expand toggle — always visible */}
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : r.registry_id)}
                            className="text-[10px] font-medium text-slate-400 hover:text-slate-800 transition-colors px-1.5 py-0.5 border border-slate-200 hover:border-slate-400"
                            title="Quick paste"
                          >
                            {isExpanded ? '▾ Close' : '▸ Paste'}
                          </button>
                          {/* Hover actions */}
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {r.in_season_tournament_id ? (
                              <Link
                                href={`/admin/bracket?mode=in-season&tid=${r.in_season_tournament_id}`}
                                className="text-slate-500 hover:text-slate-900 text-[10px] font-medium whitespace-nowrap"
                              >
                                Bracket
                              </Link>
                            ) : (
                              <span className="text-slate-300 text-[10px] whitespace-nowrap">Bracket</span>
                            )}
                            <button
                              onClick={() => handleDelete(r.registry_id)}
                              className="text-slate-300 hover:text-red-500 text-[10px]"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${r.registry_id}-expand`} className="border-b border-slate-200">
                        <RowExpander
                          row={r}
                          gender={gender}
                          season={season}
                          onClose={() => setExpandedId(null)}
                          onTidCreated={tid => setRows(prev => prev.map(row => row.registry_id === r.registry_id ? { ...row, in_season_tournament_id: tid } : row))}
                        />
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer counts */}
      {rows.length > 0 && (
        <div className="flex gap-6 text-xs text-slate-400 pt-1">
          <span>{rows.filter(r => r.event_type === 'tournament').length} tournaments</span>
          <span>{rows.filter(r => r.event_type === 'jamboree').length} jamborees</span>
          <span>{imported} imported</span>
          <span>{pending} pending</span>
        </div>
      )}
    </div>
  )
}

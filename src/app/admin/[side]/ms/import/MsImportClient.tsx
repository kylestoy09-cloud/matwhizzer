'use client'

import { useAdminGender } from '@/components/admin/AdminGenderContext'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { MsWrestlerFlagCard } from './MsWrestlerFlagCard'
import type {
  MsWrestlerFlag,
  MsWrestlerOverride,
  ClubFlag,
  ClubOverride,
} from './msImportTypes'

// ── Types ────────────────────────────────────────────────────────────────────

type Tier = { id: number; name: string }

type Tournament = {
  id: number
  name: string
  season: string
  gender: string
  tier: Tier
  placement_count: number
}

type DraftPlacement = {
  uid: string
  weight_class: number | ''
  place: number | ''
  wrestler_name: string
  school_name: string
  dirty: boolean
}

type ValidPlacement = {
  weight_class: number
  place: number
  wrestler_name: string
  school_name: string | null
}

type Step = 'input' | 'review' | 'match' | 'done'

const PLACE_LABELS: Record<number, string> = {
  1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th', 6: '6th', 7: '7th', 8: '8th',
}

let uidCounter = 0
function nextUid() { return String(++uidCounter) }

function parsedToD(p: { weight_class: number; place: number; wrestler_name: string; school_name: string | null }): DraftPlacement {
  return { uid: nextUid(), weight_class: p.weight_class, place: p.place, wrestler_name: p.wrestler_name, school_name: p.school_name ?? '', dirty: false }
}

function emptyRow(): DraftPlacement {
  return { uid: nextUid(), weight_class: '', place: '', wrestler_name: '', school_name: '', dirty: true }
}

function confidenceLabel(c: MsWrestlerFlag['confidence'] | ClubFlag['confidence']) {
  const map: Record<string, string> = { exact: 'Exact', high: 'High', low: 'Low', none: 'New' }
  return map[c] ?? c
}

function confidenceStyle(c: MsWrestlerFlag['confidence'] | ClubFlag['confidence']) {
  const map: Record<string, string> = {
    exact: 'bg-green-100 text-green-700',
    high:  'bg-blue-100 text-blue-700',
    low:   'bg-amber-100 text-amber-700',
    none:  'bg-slate-100 text-slate-500',
  }
  return map[c] ?? ''
}

// ── PlacementRow ─────────────────────────────────────────────────────────────

function PlacementRow({ row, onChange, onDelete, isFirst }: {
  row: DraftPlacement
  onChange: (r: DraftPlacement) => void
  onDelete: () => void
  isFirst: boolean
}) {
  const set = (patch: Partial<DraftPlacement>) => onChange({ ...row, ...patch, dirty: true })
  return (
    <tr className={row.dirty ? 'bg-amber-50/40' : ''}>
      <td className="px-2 py-1">
        <input type="number" value={row.weight_class}
          onChange={e => set({ weight_class: e.target.value === '' ? '' : parseInt(e.target.value, 10) })}
          placeholder="106"
          className="w-16 text-center border border-slate-300 px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-black font-mono"
        />
      </td>
      <td className="px-2 py-1">
        <select value={row.place}
          onChange={e => set({ place: e.target.value === '' ? '' : parseInt(e.target.value, 10) })}
          className="border border-slate-300 px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-black"
        >
          <option value="">—</option>
          {[1,2,3,4,5,6,7,8].map(n => (
            <option key={n} value={n}>{PLACE_LABELS[n]}</option>
          ))}
        </select>
      </td>
      <td className="px-2 py-1">
        <input type="text" value={row.wrestler_name}
          onChange={e => set({ wrestler_name: e.target.value })}
          placeholder="First Last"
          className="w-full border border-slate-300 px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-black min-w-[160px]"
        />
      </td>
      <td className="px-2 py-1">
        <input type="text" value={row.school_name}
          onChange={e => set({ school_name: e.target.value })}
          placeholder="School or club"
          className="w-full border border-slate-300 px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-black min-w-[160px]"
        />
      </td>
      <td className="px-2 py-1">
        {!isFirst && (
          <button onClick={onDelete} className="text-xs text-slate-400 hover:text-red-600 transition-colors px-1" title="Remove row">✕</button>
        )}
      </td>
    </tr>
  )
}

// ── Club flag row ─────────────────────────────────────────────────────────────

function ClubFlagRow({ flag, override, onOverride, allClubs }: {
  flag: ClubFlag
  override: ClubOverride | undefined
  onOverride: (raw: string, o: ClubOverride | undefined) => void
  allClubs: { id: number; name: string }[]
}) {
  const [mode, setMode] = useState<'default' | 'search' | 'create'>('default')
  const [createName, setCreateName] = useState(flag.raw)
  const [searchQuery, setSearchQuery] = useState('')

  const isResolved = !!override

  const resolvedLabel = override?.type === 'existing'
    ? `→ ${override.club_name}`
    : override?.type === 'create'
    ? `+ new: ${override.name}`
    : override?.type === 'skip'
    ? '(skipped)'
    : null

  const filteredClubs = searchQuery.trim()
    ? allClubs.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : allClubs.slice(0, 15)

  return (
    <div className={`border text-xs ${isResolved ? 'border-green-200 bg-green-50' : flag.confidence === 'low' ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-center gap-2 px-3 py-2 flex-wrap">
        <span className="font-semibold text-slate-800">{flag.raw}</span>
        <span className="text-slate-400 text-[10px]">{flag.placement_count} placement{flag.placement_count !== 1 ? 's' : ''}</span>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${confidenceStyle(flag.confidence)}`}>
          {confidenceLabel(flag.confidence)}
        </span>
        {isResolved && resolvedLabel && <span className="text-green-700 font-medium">{resolvedLabel}</span>}
        {isResolved && (
          <button onClick={() => { onOverride(flag.raw, undefined); setMode('default') }} className="text-slate-400 hover:text-red-500 ml-auto">✕</button>
        )}
      </div>

      {!isResolved && mode === 'default' && (
        <div className="flex items-center gap-2 px-3 pb-2 flex-wrap">
          {flag.club_id && flag.club_name ? (
            <>
              <span className="text-slate-600">Best match: <span className="font-medium">{flag.club_name}</span></span>
              <button
                onClick={() => onOverride(flag.raw, { type: 'existing', club_id: flag.club_id!, club_name: flag.club_name! })}
                className="px-2 py-0.5 border border-green-400 text-green-700 hover:bg-green-100 transition-colors"
              >✓ Accept</button>
            </>
          ) : (
            <span className="text-slate-400">No match found</span>
          )}
          <button onClick={() => setMode('search')} className="px-2 py-0.5 border border-slate-300 text-slate-600 hover:border-black transition-colors">
            Link existing
          </button>
          <button onClick={() => { setCreateName(flag.raw); setMode('create') }} className="px-2 py-0.5 border border-slate-300 text-slate-600 hover:border-black transition-colors">
            Create new
          </button>
          <button onClick={() => onOverride(flag.raw, { type: 'skip' })} className="px-2 py-0.5 text-slate-400 hover:text-slate-600 transition-colors">
            Skip
          </button>
        </div>
      )}

      {!isResolved && mode === 'create' && (
        <div className="flex items-center gap-2 px-3 pb-2 flex-wrap">
          <input type="text" value={createName} onChange={e => setCreateName(e.target.value)}
            className="border border-slate-300 px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-black w-48"
          />
          <button onClick={() => onOverride(flag.raw, { type: 'create', name: createName.trim() })}
            disabled={!createName.trim()}
            className="px-3 py-0.5 bg-black text-white hover:bg-slate-800 transition-colors disabled:opacity-40"
          >✓ Create</button>
          <button onClick={() => setMode('default')} className="text-slate-400 hover:text-slate-600 transition-colors">cancel</button>
        </div>
      )}

      {!isResolved && mode === 'search' && (
        <div className="px-3 pb-3 space-y-1.5">
          <div className="flex items-center gap-2">
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search clubs…" autoFocus
              className="border border-slate-300 px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-black w-48"
            />
            <button onClick={() => { setMode('default'); setSearchQuery('') }} className="text-slate-400 hover:text-slate-600">cancel</button>
          </div>
          {filteredClubs.length === 0 ? (
            <p className="text-slate-400">No clubs match</p>
          ) : (
            <div className="border border-slate-200 bg-white max-h-32 overflow-y-auto">
              {filteredClubs.map(c => (
                <button key={c.id}
                  onClick={() => { onOverride(flag.raw, { type: 'existing', club_id: c.id, club_name: c.name }); setMode('default'); setSearchQuery('') }}
                  className="w-full text-left px-3 py-1.5 hover:bg-blue-50 transition-colors border-b border-slate-100 last:border-0"
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function MsImportClient({ preselectedTournamentId }: { preselectedTournamentId: number | null }) {
  // This side's events plus combined (MF) events
  const { gender: sideGender } = useAdminGender()
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loadingTournaments, setLoadingTournaments] = useState(true)

  const [step, setStep] = useState<Step>('input')
  const [tournamentId, setTournamentId] = useState<string>(
    preselectedTournamentId ? String(preselectedTournamentId) : '',
  )
  const [text, setText] = useState('')
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])

  const [rows, setRows] = useState<DraftPlacement[]>([])
  const [replace, setReplace] = useState(false)

  // Match step state
  const [matching, setMatching] = useState(false)
  const [matchError, setMatchError] = useState<string | null>(null)
  const [wrestlerFlags, setWrestlerFlags] = useState<MsWrestlerFlag[]>([])
  const [clubFlags, setClubFlags] = useState<ClubFlag[]>([])
  const [wrestlerOverrides, setWrestlerOverrides] = useState<Record<string, MsWrestlerOverride>>({})
  const [clubOverrides, setClubOverrides] = useState<Record<string, ClubOverride>>({})
  const [allWrestlers, setAllWrestlers] = useState<{ ms_wrestler_id: number; canonical_name: string }[]>([])
  const [allClubs, setAllClubs] = useState<{ id: number; name: string }[]>([])

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedCount, setSavedCount] = useState(0)
  const [savedTournamentName, setSavedTournamentName] = useState('')

  useEffect(() => {
    fetch('/api/admin/ms/tournaments')
      .then(r => r.json())
      .then(d => { setTournaments((d.tournaments ?? []).filter((t: { gender: string }) => t.gender === sideGender || t.gender === 'MF')); setLoadingTournaments(false) })
      .catch(() => setLoadingTournaments(false))
  }, [sideGender])

  const selectedTournament = tournaments.find(t => String(t.id) === tournamentId)

  function getValidPlacements(): ValidPlacement[] {
    return rows
      .filter(r => r.weight_class !== '' && r.place !== '' && r.wrestler_name.trim())
      .map(r => ({
        weight_class: Number(r.weight_class),
        place: Number(r.place),
        wrestler_name: r.wrestler_name.trim(),
        school_name: r.school_name.trim() || null,
      }))
  }

  // ── Parse ────────────────────────────────────────────────────────────────────

  async function handleParse() {
    if (!text.trim()) return
    setParsing(true); setParseError(null); setWarnings([])
    try {
      const res = await fetch('/api/admin/ms/import/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await res.json()
      if (data.error) { setParseError(data.error); setParsing(false); return }
      if (!data.placements?.length) {
        setParseError('No placements detected. Check that your text has weight class headers (e.g. "106 lbs") followed by place lines.')
        setParsing(false); return
      }
      setRows(data.placements.map(parsedToD))
      setWarnings(data.warnings ?? [])
      setStep('review')
    } catch {
      setParseError('Parse failed — try again.')
    }
    setParsing(false)
  }

  // ── Match ────────────────────────────────────────────────────────────────────

  async function handleMatch() {
    const valid = getValidPlacements()
    if (!valid.length) return
    setMatching(true); setMatchError(null)
    try {
      const res = await fetch('/api/admin/ms/import/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournament_id: Number(tournamentId), placements: valid }),
      })
      const data = await res.json()
      if (data.error) { setMatchError(data.error); setMatching(false); return }

      const wFlags: MsWrestlerFlag[] = data.wrestler_flags ?? []
      const cFlags: ClubFlag[] = data.club_flags ?? []

      // Pre-accept exact and high confidence wrestler matches
      const autoWrestlerOverrides: Record<string, MsWrestlerOverride> = {}
      for (const f of wFlags) {
        if ((f.confidence === 'exact' || f.confidence === 'high') && f.ms_wrestler_id && f.canonical_name) {
          autoWrestlerOverrides[f.key] = { type: 'existing', ms_wrestler_id: f.ms_wrestler_id, canonical_name: f.canonical_name }
        }
      }

      // Pre-accept exact and high confidence club matches
      const autoClubOverrides: Record<string, ClubOverride> = {}
      for (const f of cFlags) {
        if ((f.confidence === 'exact' || f.confidence === 'high') && f.club_id && f.club_name) {
          autoClubOverrides[f.raw] = { type: 'existing', club_id: f.club_id, club_name: f.club_name }
        }
      }

      // Load full wrestler/club lists for search
      const [wRes, cRes] = await Promise.all([
        fetch('/api/admin/ms/wrestlers?minimal=1').then(r => r.json()).catch(() => ({ wrestlers: [] })),
        fetch('/api/admin/nonnjsiaa/clubs').then(r => r.json()).catch(() => ({ clubs: [] })),
      ])
      setAllWrestlers((wRes.wrestlers ?? []).map((w: { id: number; canonical_name: string }) => ({
        ms_wrestler_id: w.id,
        canonical_name: w.canonical_name,
      })))
      setAllClubs(cRes.clubs ?? [])

      setWrestlerFlags(wFlags)
      setClubFlags(cFlags)
      setWrestlerOverrides(autoWrestlerOverrides)
      setClubOverrides(autoClubOverrides)
      setStep('match')
    } catch {
      setMatchError('Match failed — try again.')
    }
    setMatching(false)
  }

  // ── Save ─────────────────────────────────────────────────────────────────────

  async function handleSave() {
    const valid = getValidPlacements()
    if (!tournamentId || !valid.length) return
    setSaving(true); setSaveError(null)
    try {
      const res = await fetch('/api/admin/ms/import/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournament_id: Number(tournamentId),
          replace,
          placements: valid,
          wrestler_overrides: wrestlerOverrides,
          club_overrides: clubOverrides,
        }),
      })
      const data = await res.json()
      if (data.error) { setSaveError(data.error); setSaving(false); return }
      setSavedCount(data.inserted ?? valid.length)
      setSavedTournamentName(data.tournament_name ?? selectedTournament?.name ?? '')
      setStep('done')
    } catch {
      setSaveError('Save failed — try again.')
    }
    setSaving(false)
  }

  function reset() {
    setText(''); setRows([]); setWarnings([]); setParseError(null)
    setSaveError(null); setReplace(false); setStep('input')
    setWrestlerFlags([]); setClubFlags([])
    setWrestlerOverrides({}); setClubOverrides({})
    setMatchError(null)
  }

  // ── Import readiness check ───────────────────────────────────────────────────

  const unresolvedWrestlers = wrestlerFlags.filter(f =>
    (f.confidence === 'low' || f.confidence === 'none') && !wrestlerOverrides[f.key]
  )
  const unresolvedClubs = clubFlags.filter(f =>
    (f.confidence === 'low' || f.confidence === 'none') && !clubOverrides[f.raw]
  )
  const importReady = unresolvedWrestlers.length === 0 && unresolvedClubs.length === 0

  // ── Input step ──────────────────────────────────────────────────────────────

  if (step === 'input') {
    return (
      <div className="space-y-5">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Tournament *</label>
          {loadingTournaments ? (
            <p className="text-xs text-slate-400">Loading…</p>
          ) : tournaments.length === 0 ? (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2">
              No tournaments yet — <Link href="/admin/ms/tournaments" className="underline">create one first</Link>.
            </p>
          ) : (
            <select
              value={tournamentId}
              onChange={e => setTournamentId(e.target.value)}
              className="w-full max-w-sm border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-black"
            >
              <option value="">— select tournament —</option>
              {Array.from(new Set(tournaments.map(t => t.season))).sort((a,b) => b.localeCompare(a)).map(season => (
                <optgroup key={season} label={season}>
                  {tournaments.filter(t => t.season === season).map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.gender === 'M' ? 'Boys' : t.gender === 'F' ? 'Girls' : 'Combined'}) · {t.tier.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          )}
          {selectedTournament && selectedTournament.placement_count > 0 && (
            <p className="text-xs text-amber-700 mt-1.5 flex items-center gap-1.5">
              <span>⚠</span>
              {selectedTournament.placement_count} placements already exist for this tournament.
              Enable "Replace existing" below to overwrite them.
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Paste results text</label>
          <p className="text-xs text-slate-400 mb-2">
            Supported formats — weight class header then place lines:
            <span className="font-mono ml-2 bg-slate-100 px-1 py-0.5">106 lbs</span>
            <span className="font-mono ml-2 bg-slate-100 px-1 py-0.5">1st Place - John Smith, School</span>
            <span className="font-mono ml-2 bg-slate-100 px-1 py-0.5">1. John Smith (Club)</span>
          </p>
          <textarea
            className="w-full h-72 text-xs font-mono border border-slate-300 p-3 focus:outline-none focus:ring-1 focus:ring-black resize-y placeholder-slate-300"
            placeholder={`106 lbs\n1st Place - John Smith, Milltown MS\n2nd Place - James Jones, Central Middle\n\n113 lbs\n1st Place - ...`}
            value={text}
            onChange={e => setText(e.target.value)}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <input type="checkbox" checked={replace} onChange={e => setReplace(e.target.checked)} className="accent-black" />
          Replace existing placements for this tournament
        </label>

        {parseError && <p className="text-sm text-red-600">{parseError}</p>}

        <button
          onClick={handleParse}
          disabled={parsing || !text.trim() || !tournamentId}
          className="px-4 py-2 bg-black text-white text-sm font-medium disabled:opacity-40 hover:bg-slate-800 transition-colors"
        >
          {parsing ? 'Parsing…' : 'Parse results →'}
        </button>
      </div>
    )
  }

  // ── Review step ─────────────────────────────────────────────────────────────

  if (step === 'review') {
    const validCount = rows.filter(r => r.weight_class !== '' && r.place !== '' && r.wrestler_name.trim()).length
    const invalidCount = rows.length - validCount

    return (
      <div className="space-y-5">
        <div className="flex items-center gap-4 p-3 bg-slate-50 border border-slate-200 text-sm flex-wrap">
          <span className="font-semibold text-slate-800">{rows.length} placements parsed</span>
          {selectedTournament && (
            <span className="text-slate-500">{selectedTournament.name} · {selectedTournament.season}</span>
          )}
          {invalidCount > 0 && (
            <span className="text-amber-700">⚠ {invalidCount} incomplete row{invalidCount !== 1 ? 's' : ''} will be skipped</span>
          )}
          {warnings.map((w, i) => (
            <span key={i} className="text-amber-600 text-xs">{w}</span>
          ))}
        </div>

        <div className="overflow-x-auto border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-2 py-2 text-xs font-medium text-slate-500 w-20">Weight</th>
                <th className="text-left px-2 py-2 text-xs font-medium text-slate-500 w-24">Place</th>
                <th className="text-left px-2 py-2 text-xs font-medium text-slate-500">Wrestler name</th>
                <th className="text-left px-2 py-2 text-xs font-medium text-slate-500">School / Club</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, idx) => (
                <PlacementRow
                  key={row.uid}
                  row={row}
                  isFirst={idx === 0 && rows.length === 1}
                  onChange={updated => setRows(prev => prev.map(r => r.uid === updated.uid ? updated : r))}
                  onDelete={() => setRows(prev => prev.filter(r => r.uid !== row.uid))}
                />
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <button
            onClick={() => setRows(prev => [...prev, emptyRow()])}
            className="text-sm text-slate-500 hover:text-black underline transition-colors"
          >
            + Add row manually
          </button>
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer ml-auto">
            <input type="checkbox" checked={replace} onChange={e => setReplace(e.target.checked)} className="accent-black" />
            Replace existing placements
          </label>
        </div>

        {matchError && <p className="text-sm text-red-600">{matchError}</p>}

        <div className="flex items-center gap-3 border-t border-slate-200 pt-4">
          <button
            onClick={() => setStep('input')}
            className="px-3 py-1.5 text-sm border border-slate-300 hover:border-black transition-colors"
          >
            ← Back
          </button>
          <button
            onClick={handleMatch}
            disabled={matching || validCount === 0 || !tournamentId}
            className="px-4 py-2 bg-black text-white text-sm font-medium disabled:opacity-40 hover:bg-slate-800 transition-colors"
          >
            {matching ? 'Running match review…' : `Continue to match review →`}
          </button>
        </div>
      </div>
    )
  }

  // ── Match step ───────────────────────────────────────────────────────────────

  if (step === 'match') {
    const autoResolved = wrestlerFlags.filter(f =>
      (f.confidence === 'exact' || f.confidence === 'high') && wrestlerOverrides[f.key]
    ).length
    const needsReview = wrestlerFlags.filter(f =>
      f.confidence === 'low' || f.confidence === 'none'
    ).length
    const newCount = wrestlerFlags.filter(f => f.is_new).length

    const autoResolvedClubs = clubFlags.filter(f =>
      (f.confidence === 'exact' || f.confidence === 'high') && clubOverrides[f.raw]
    ).length
    const clubNeedsReview = clubFlags.filter(f =>
      f.confidence === 'low' || f.confidence === 'none'
    ).length

    return (
      <div className="space-y-6">
        {/* Summary */}
        <div className="p-3 bg-slate-50 border border-slate-200 text-xs text-slate-600 flex gap-4 flex-wrap">
          <span className="font-semibold text-slate-800 text-sm">Match Review</span>
          <span>{selectedTournament?.name} · {selectedTournament?.season}</span>
          <span>{wrestlerFlags.length} unique wrestler{wrestlerFlags.length !== 1 ? 's' : ''}</span>
          {autoResolved > 0 && <span className="text-green-700">{autoResolved} auto-matched</span>}
          {newCount > 0 && <span className="text-blue-700">{newCount} new</span>}
          {needsReview > 0 && <span className="text-amber-700">⚠ {needsReview} need{needsReview === 1 ? 's' : ''} review</span>}
        </div>

        {/* Wrestler flags */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Wrestlers</h3>
          <div className="space-y-1">
            {/* Show unresolved (low/none) first */}
            {[
              ...wrestlerFlags.filter(f => (f.confidence === 'low' || f.confidence === 'none') && !wrestlerOverrides[f.key]),
              ...wrestlerFlags.filter(f => (f.confidence === 'low' || f.confidence === 'none') && wrestlerOverrides[f.key]),
              ...wrestlerFlags.filter(f => f.confidence === 'exact' || f.confidence === 'high'),
            ].map(flag => (
              <MsWrestlerFlagCard
                key={flag.key}
                flag={flag}
                override={wrestlerOverrides[flag.key]}
                onOverride={(key, o) => setWrestlerOverrides(prev =>
                  o ? { ...prev, [key]: o } : Object.fromEntries(Object.entries(prev).filter(([k]) => k !== key))
                )}
                allWrestlers={allWrestlers}
              />
            ))}
          </div>
        </div>

        {/* Club flags */}
        {clubFlags.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
              Clubs / Schools ({clubFlags.length})
              {autoResolvedClubs > 0 && <span className="text-green-600 font-normal ml-2">{autoResolvedClubs} auto-matched</span>}
              {clubNeedsReview > 0 && <span className="text-amber-600 font-normal ml-2">{clubNeedsReview} need review</span>}
            </h3>
            <div className="space-y-1">
              {[
                ...clubFlags.filter(f => (f.confidence === 'low' || f.confidence === 'none') && !clubOverrides[f.raw]),
                ...clubFlags.filter(f => (f.confidence === 'low' || f.confidence === 'none') && clubOverrides[f.raw]),
                ...clubFlags.filter(f => f.confidence === 'exact' || f.confidence === 'high'),
              ].map(flag => (
                <ClubFlagRow
                  key={flag.raw}
                  flag={flag}
                  override={clubOverrides[flag.raw]}
                  onOverride={(raw, o) => setClubOverrides(prev =>
                    o ? { ...prev, [raw]: o } : Object.fromEntries(Object.entries(prev).filter(([k]) => k !== raw))
                  )}
                  allClubs={allClubs}
                />
              ))}
            </div>
          </div>
        )}

        {/* Unresolved callout */}
        {!importReady && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2">
            {unresolvedWrestlers.length > 0 && `${unresolvedWrestlers.length} wrestler${unresolvedWrestlers.length !== 1 ? 's' : ''} still need a decision. `}
            {unresolvedClubs.length > 0 && `${unresolvedClubs.length} club${unresolvedClubs.length !== 1 ? 's' : ''} still need a decision.`}
          </p>
        )}

        {saveError && <p className="text-sm text-red-600">{saveError}</p>}

        <div className="flex items-center gap-3 border-t border-slate-200 pt-4">
          <button
            onClick={() => setStep('review')}
            className="px-3 py-1.5 text-sm border border-slate-300 hover:border-black transition-colors"
          >
            ← Back
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !importReady || !tournamentId}
            className="px-4 py-2 bg-black text-white text-sm font-medium disabled:opacity-40 hover:bg-slate-800 transition-colors"
          >
            {saving ? 'Saving…' : `Import ${getValidPlacements().length} placement${getValidPlacements().length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    )
  }

  // ── Done step ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      <div className="p-5 bg-green-50 border border-green-200">
        <p className="font-semibold text-green-800">
          ✓ {savedCount} placement{savedCount !== 1 ? 's' : ''} saved
        </p>
        <p className="text-sm text-green-700 mt-1">{savedTournamentName}</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <button
          onClick={reset}
          className="px-4 py-2 bg-black text-white text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          Import another tournament
        </button>
        <Link href="/admin/ms/tournaments" className="px-4 py-2 text-sm border border-slate-300 hover:border-black transition-colors">
          View tournaments →
        </Link>
        <Link href="/admin/ms/wrestlers" className="px-4 py-2 text-sm border border-slate-300 hover:border-black transition-colors">
          View wrestler profiles →
        </Link>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { BracketBuilderView } from '@/app/admin/[side]/bracket/BracketBuilderView'

// ── Types ─────────────────────────────────────────────────────────────────────

type Registry = {
  id: string
  name: string
  date_start: string | null
  date_end: string | null
  event_type: 'tournament' | 'jamboree'
  point_value: number | null
  imported: boolean
  in_season_tournament_id: string | null
  notes: string | null
  season: string
  gender: 'M' | 'F'
}

type Tournament = {
  id: string
  name: string
  season: string
  season_id: number
  start_date: string | null
  end_date: string | null
  location: string | null
  gender: 'M' | 'F'
  source_format: string | null
  tournament_type: string | null
}

type Participant = {
  id: string
  school_id: number
  added_via: string
  schools: { id: number; display_name: string } | null
}

type Seed = {
  id: string
  weight_class: number
  seed: number
  wrestler_name_raw: string
  school_name_raw: string
  wrestler_id: string | null
  school_id: number | null
}

type Placement = {
  id: string
  weight_class: number
  place: number
  wrestler_name_raw: string
  school_name_raw: string
  school_id: number | null
  wrestler_id: string | null
}

type TeamScore = {
  id: string
  place: number
  school_name: string
  school_id: number | null
  score: number
}

type DetailData = {
  registry: Registry
  tournament: Tournament | null
  participants: Participant[]
  seeds: Seed[]
  placements: Placement[]
  team_scores: TeamScore[]
  bout_count: number
}

type Tab = 'overview' | 'schools' | 'seeds' | 'bracket' | 'scores' | 'winners'

const WEIGHT_CLASSES = [106, 113, 120, 126, 132, 138, 144, 150, 157, 165, 175, 190, 215, 285]

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return ''
  const [, m, d] = iso.split('-')
  return `${parseInt(m)}/${parseInt(d)}`
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 text-slate-400 inline-block" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({ data, onRefresh }: { data: DetailData; onRefresh: () => void }) {
  const reg = data.registry
  const tour = data.tournament

  const [name, setName]             = useState(reg.name)
  const [dateStart, setDateStart]   = useState(reg.date_start ?? '')
  const [dateEnd, setDateEnd]       = useState(reg.date_end ?? '')
  const [location, setLocation]     = useState(tour?.location ?? '')
  const [pointValue, setPointValue] = useState<string>(reg.point_value?.toString() ?? '')
  const [eventType, setEventType]   = useState<'tournament' | 'jamboree'>(reg.event_type)
  const [notes, setNotes]           = useState(reg.notes ?? '')
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [creating, setCreating]     = useState(false)
  const [linkId, setLinkId]         = useState('')
  const [linking, setLinking]       = useState(false)

  async function handleCreate() {
    setCreating(true); setError(null)
    try {
      const res = await fetch('/api/admin/tournament-detail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_and_link', registry_id: reg.id }),
      })
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      onRefresh()
    } catch (e) {
      setError(String(e))
    } finally {
      setCreating(false)
    }
  }

  async function handleLinkExisting() {
    if (!linkId.trim()) return
    setLinking(true); setError(null)
    try {
      const res = await fetch('/api/admin/tournament-detail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'link_existing', registry_id: reg.id, existing_tournament_id: linkId.trim() }),
      })
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      onRefresh()
    } catch (e) {
      setError(String(e))
    } finally {
      setLinking(false)
    }
  }

  async function handleSave() {
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/admin/tournament-detail', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registry_id: reg.id,
          in_season_tournament_id: reg.in_season_tournament_id,
          name,
          date_start: dateStart || null,
          date_end: dateEnd || null,
          location: location || null,
          start_date: dateStart || null,
          end_date: dateEnd || null,
          point_value: pointValue ? Number(pointValue) : null,
          event_type: eventType,
          notes: notes || null,
        }),
      })
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      onRefresh()
    } catch (e) {
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }

  const field = 'block text-sm w-full border border-slate-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black'

  return (
    <div className="space-y-6 max-w-lg">

      {/* Link banner — shown when no tournament record exists yet */}
      {!tour && (
        <div className="border border-amber-200 bg-amber-50 p-4 space-y-3">
          <p className="text-sm font-medium text-amber-800">No tournament record linked</p>
          <p className="text-xs text-amber-700">Creating a record enables bracket building, school management, seeds, and location.</p>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="px-4 py-2 text-sm font-medium bg-black text-white hover:bg-slate-800 disabled:opacity-40 transition-colors"
          >
            {creating ? 'Creating…' : 'Create tournament record'}
          </button>
          <div className="pt-1 space-y-1">
            <p className="text-[11px] text-amber-600 font-medium">Or link to an existing tournament record:</p>
            <div className="flex gap-2">
              <input
                value={linkId}
                onChange={e => setLinkId(e.target.value)}
                placeholder="Paste existing tournament UUID…"
                className="flex-1 text-xs border border-amber-300 bg-white px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-black font-mono"
              />
              <button
                onClick={handleLinkExisting}
                disabled={!linkId.trim() || linking}
                className="px-3 py-1.5 text-xs font-medium border border-slate-300 hover:bg-white disabled:opacity-40 transition-colors"
              >
                {linking ? 'Linking…' : 'Link'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Name</label>
          <input className={field} value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Start Date</label>
            <input type="date" className={field} value={dateStart} onChange={e => setDateStart(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">End Date</label>
            <input type="date" className={field} value={dateEnd} onChange={e => setDateEnd(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Location</label>
          <input
            className={field}
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="e.g. Cherry Hill East HS"
            disabled={!tour}
            title={!tour ? 'Create a tournament record first' : undefined}
          />
          {!tour && <p className="text-[10px] text-slate-400 mt-0.5">Available after creating a tournament record</p>}
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Point Value</label>
          <select className={field} value={pointValue} onChange={e => setPointValue(e.target.value)}>
            <option value="">— none —</option>
            {[1, 5, 10, 15, 20].map(v => <option key={v} value={v}>{v} pts</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Event Type</label>
          <select className={field} value={eventType} onChange={e => setEventType(e.target.value as 'tournament' | 'jamboree')}>
            <option value="tournament">Tournament</option>
            <option value="jamboree">Jamboree</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
          <textarea className={`${field} h-20 resize-y`} value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-black text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-40 transition-colors flex items-center gap-2"
        >
          {saving ? <><Spinner /> Saving…</> : 'Save changes'}
        </button>
        {saved && <span className="text-sm text-green-600">Saved</span>}
      </div>

      {/* Read-only info */}
      <div className="border-t border-slate-200 pt-4 space-y-2 text-xs text-slate-500">
        <p><span className="font-semibold">Season:</span> {reg.season}</p>
        <p><span className="font-semibold">Gender:</span> {reg.gender === 'M' ? 'Boys' : 'Girls'}</p>
        {tour && <p><span className="font-semibold">Format:</span> {tour.source_format ?? '—'}</p>}
        {tour && <p><span className="font-semibold">Type:</span> {tour.tournament_type ?? '—'}</p>}
        {reg.in_season_tournament_id && (
          <p><span className="font-semibold">Tournament ID:</span> <code className="bg-slate-100 px-1">{reg.in_season_tournament_id}</code></p>
        )}
      </div>
    </div>
  )
}

// ── Schools Tab ───────────────────────────────────────────────────────────────

function SchoolsTab({ data, onRefresh }: { data: DetailData; onRefresh: () => void }) {
  const tid = data.registry.in_season_tournament_id
  const [search, setSearch]           = useState('')
  const [searchResults, setSearchRes] = useState<{ id: number; display_name: string }[]>([])
  const [searching, setSearching]     = useState(false)
  const [removing, setRemoving]       = useState<number | null>(null)
  const [syncing, setSyncing]         = useState(false)
  const [syncMsg, setSyncMsg]         = useState<string | null>(null)

  async function syncFromBouts() {
    if (!tid) return
    setSyncing(true); setSyncMsg(null)
    try {
      const res = await fetch('/api/admin/tournament-detail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_participants_from_bouts', in_season_tournament_id: tid }),
      })
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      setSyncMsg(`Synced ${d.synced} schools from bouts`)
      onRefresh()
    } catch (e) {
      setSyncMsg(`Error: ${String(e)}`)
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    if (search.length < 2) { setSearchRes([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      const res = await fetch(`/api/admin/search-schools?q=${encodeURIComponent(search)}`)
      const d = await res.json()
      setSearchRes(d.schools ?? [])
      setSearching(false)
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  async function addSchool(schoolId: number) {
    if (!tid) return
    await fetch('/api/admin/tournament-detail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_participant', in_season_tournament_id: tid, school_id: schoolId }),
    })
    setSearch(''); setSearchRes([])
    onRefresh()
  }

  async function removeSchool(schoolId: number) {
    if (!tid) return
    setRemoving(schoolId)
    await fetch('/api/admin/tournament-detail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove_participant', in_season_tournament_id: tid, school_id: schoolId }),
    })
    setRemoving(null)
    onRefresh()
  }

  if (!tid) {
    return (
      <div className="py-8 text-center space-y-3">
        <p className="text-sm text-slate-500">No tournament record linked yet.</p>
        <p className="text-xs text-slate-400">Go to the <strong>Overview</strong> tab and click <em>Create tournament record</em> to enable school management.</p>
      </div>
    )
  }

  const { participants } = data

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-slate-600">{participants.length} school{participants.length !== 1 ? 's' : ''} participating</p>
        {data.bout_count > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={syncFromBouts}
              disabled={syncing}
              className="px-3 py-1.5 text-xs font-medium border border-slate-300 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              {syncing ? 'Syncing…' : 'Sync from bouts'}
            </button>
            {syncMsg && <span className={`text-xs ${syncMsg.startsWith('Error') ? 'text-red-600' : 'text-green-700'}`}>{syncMsg}</span>}
          </div>
        )}
      </div>

      {/* Search to add */}
      <div className="relative max-w-sm">
        <input
          className="w-full text-sm border border-slate-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
          placeholder="Search schools to add…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {searching && <span className="absolute right-3 top-2.5"><Spinner /></span>}
        {searchResults.length > 0 && (
          <div className="absolute z-10 w-full bg-white border border-slate-300 shadow-lg max-h-48 overflow-y-auto">
            {searchResults.map(s => (
              <button
                key={s.id}
                onClick={() => addSchool(s.id)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors"
              >
                {s.display_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Participant list */}
      {participants.length === 0 ? (
        <p className="text-sm text-slate-400">No schools added yet. Search above to add.</p>
      ) : (
        <div className="border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">School</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Added Via</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {participants.map(p => (
                <tr key={p.school_id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-2">{p.schools?.display_name ?? `School #${p.school_id}`}</td>
                  <td className="px-4 py-2 text-slate-400 text-xs">{p.added_via}</td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => removeSchool(p.school_id)}
                      disabled={removing === p.school_id}
                      className="text-slate-300 hover:text-red-500 text-xs transition-colors disabled:opacity-40"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Seeds Tab ─────────────────────────────────────────────────────────────────

function SeedsTab({ data, onRefresh }: { data: DetailData; onRefresh: () => void }) {
  const tid = data.registry.in_season_tournament_id
  const [pasteText, setPasteText] = useState('')
  const [parsed, setParsed]       = useState<Array<{ weight_class: number; seed: number; wrestler_name_raw: string; school_name_raw: string }> | null>(null)
  const [saving, setSaving]       = useState(false)
  const [msg, setMsg]             = useState<string | null>(null)

  function parseSeedText(text: string) {
    const lines = text.trim().split('\n')
    const rows: Array<{ weight_class: number; seed: number; wrestler_name_raw: string; school_name_raw: string }> = []
    let currentWeight = 0

    for (const raw of lines) {
      const line = raw.trim()
      if (!line) continue

      // Weight class header: "106", "106 lbs", "106 pounds"
      const weightMatch = line.match(/^(\d{2,3})(?:\s*(?:lbs?|pounds?))?\.?$/)
      if (weightMatch) {
        currentWeight = parseInt(weightMatch[1])
        continue
      }

      // Seed line: "1 Wrestler Name, School" or "1. Wrestler Name (School)"
      const seedMatch = line.match(/^(\d+)[.\s]+(.+?)(?:[,(]\s*(.+?)[\s,)]*)?$/)
      if (seedMatch && currentWeight > 0) {
        const seed = parseInt(seedMatch[1])
        const name = seedMatch[2]?.trim() ?? ''
        const school = seedMatch[3]?.trim() ?? ''
        if (name) rows.push({ weight_class: currentWeight, seed, wrestler_name_raw: name, school_name_raw: school })
      }
    }
    return rows
  }

  function handlePreview() {
    const rows = parseSeedText(pasteText)
    setParsed(rows)
    setMsg(rows.length > 0 ? null : 'No seeds detected. Check format.')
  }

  async function handleSave() {
    if (!parsed || !tid) return
    setSaving(true); setMsg(null)
    try {
      const res = await fetch('/api/admin/tournament-detail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_seeds', in_season_tournament_id: tid, seeds: parsed }),
      })
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      setMsg(`✓ Saved ${d.count} seeds`)
      setPasteText(''); setParsed(null)
      onRefresh()
    } catch (e) {
      setMsg(`Error: ${String(e)}`)
    } finally {
      setSaving(false)
    }
  }

  if (!tid) {
    return (
      <div className="py-8 text-center text-sm text-slate-500">
        Import tournament bracket data first before adding seeds.
      </div>
    )
  }

  // Group existing seeds by weight class
  const byWeight = data.seeds.reduce<Record<number, Seed[]>>((acc, s) => {
    if (!acc[s.weight_class]) acc[s.weight_class] = []
    acc[s.weight_class].push(s)
    return acc
  }, {})

  const weightClasses = Object.keys(byWeight).map(Number).sort((a, b) => a - b)

  return (
    <div className="space-y-6">
      {/* Existing seeds */}
      {weightClasses.length > 0 && (
        <div className="space-y-3">
          {weightClasses.map(wc => (
            <div key={wc} className="border border-slate-200">
              <div className="bg-slate-50 border-b border-slate-200 px-3 py-1.5">
                <span className="text-xs font-bold text-slate-700">{wc} lbs</span>
              </div>
              <table className="w-full text-xs">
                <tbody className="divide-y divide-slate-100">
                  {byWeight[wc].sort((a, b) => a.seed - b.seed).map(s => (
                    <tr key={s.id} className="px-3 py-1.5">
                      <td className="px-3 py-1.5 tabular-nums text-slate-400 w-8">#{s.seed}</td>
                      <td className="px-3 py-1.5 font-medium text-slate-800">{s.wrestler_name_raw}</td>
                      <td className="px-3 py-1.5 text-slate-500">{s.school_name_raw || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* Import seeds */}
      <div className="border border-slate-200 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-slate-800">Import Seeds from Text</h3>
        <p className="text-xs text-slate-500">
          Paste seeds in the format below. Weight class headers followed by numbered seed lines.
        </p>
        <pre className="text-[10px] bg-slate-50 border border-slate-200 p-2 text-slate-600">
{`106
1 Wrestler Name, School Name
2 Wrestler Name, School Name

113
1 Wrestler Name, School Name`}
        </pre>
        <textarea
          className="w-full h-48 text-xs font-mono border border-slate-300 p-3 focus:outline-none focus:ring-1 focus:ring-black resize-y"
          placeholder="Paste seeds here…"
          value={pasteText}
          onChange={e => { setPasteText(e.target.value); setParsed(null) }}
        />
        <div className="flex items-center gap-3">
          <button
            onClick={handlePreview}
            disabled={!pasteText.trim()}
            className="px-3 py-1.5 text-xs font-medium border border-black hover:bg-slate-50 disabled:opacity-40 transition-colors"
          >
            Preview
          </button>
          {parsed && parsed.length > 0 && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 text-xs font-medium bg-black text-white hover:bg-slate-800 disabled:opacity-40 transition-colors"
            >
              {saving ? 'Saving…' : `Save ${parsed.length} seeds (replaces existing)`}
            </button>
          )}
          {msg && <span className={`text-xs ${msg.startsWith('Error') ? 'text-red-600' : 'text-green-700'}`}>{msg}</span>}
        </div>

        {parsed && parsed.length > 0 && (
          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full text-xs border border-slate-200">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="text-left px-2 py-1 font-medium text-slate-500">Wt</th>
                  <th className="text-left px-2 py-1 font-medium text-slate-500">Seed</th>
                  <th className="text-left px-2 py-1 font-medium text-slate-500">Wrestler</th>
                  <th className="text-left px-2 py-1 font-medium text-slate-500">School</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parsed.map((s, i) => (
                  <tr key={i}>
                    <td className="px-2 py-1 tabular-nums">{s.weight_class}</td>
                    <td className="px-2 py-1 tabular-nums text-slate-400">#{s.seed}</td>
                    <td className="px-2 py-1">{s.wrestler_name_raw}</td>
                    <td className="px-2 py-1 text-slate-500">{s.school_name_raw || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Bracket Tab ───────────────────────────────────────────────────────────────

function BracketTab({ data }: { data: DetailData }) {
  const tid = data.registry.in_season_tournament_id

  if (!tid) {
    return (
      <div className="p-6 border border-dashed border-slate-300 text-center space-y-3">
        <p className="text-sm text-slate-600">No tournament record linked yet.</p>
        <p className="text-xs text-slate-400">
          Go to the <strong>Overview</strong> tab and click <em>Create tournament record</em> first.
        </p>
      </div>
    )
  }

  return (
    <div
      className="border border-slate-200 overflow-hidden"
      style={{ height: 'calc(100vh - 280px)', minHeight: 520 }}
    >
      <BracketBuilderView tid={tid} />
    </div>
  )
}

// ── Scores Tab ────────────────────────────────────────────────────────────────

function ScoresTab({ data, onRefresh }: { data: DetailData; onRefresh: () => void }) {
  const tid = data.registry.in_season_tournament_id
  const isJamboree = data.registry.event_type === 'jamboree'
  const [pasteText, setPasteText] = useState('')
  const [parsed, setParsed]       = useState<Array<{ place: number; school_name: string; score: number }> | null>(null)
  const [saving, setSaving]       = useState(false)
  const [msg, setMsg]             = useState<string | null>(null)
  const [computing, setComputing] = useState(false)
  const [computeMsg, setComputeMsg] = useState<string | null>(null)

  async function handleCompute() {
    if (!tid) return
    setComputing(true); setComputeMsg(null)
    try {
      const res = await fetch('/api/admin/compute-jamboree-scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournament_id: tid }),
      })
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      setComputeMsg(`✓ Computed scores for ${d.inserted} schools`)
      onRefresh()
    } catch (e) {
      setComputeMsg(`Error: ${String(e)}`)
    } finally {
      setComputing(false)
    }
  }

  function parseScoreText(text: string) {
    const lines = text.trim().split('\n')
    const rows: Array<{ place: number; school_name: string; score: number }> = []

    // Try single-line format first: "1 School Name 215.5" or "1. School Name 215.5"
    for (const raw of lines) {
      const line = raw.trim()
      if (!line) continue
      const m = line.match(/^(\d+)[.\s]+(.+?)\s+([\d.]+)\s*$/)
      if (m) rows.push({ place: parseInt(m[1]), school_name: m[2].trim(), score: parseFloat(m[3]) })
    }
    if (rows.length > 0) return rows

    // Multi-line triplet format: place / school / score on separate lines
    const cleaned = lines.map(l => l.trim())
    let i = 0
    while (i < cleaned.length) {
      while (i < cleaned.length && !cleaned[i]) i++
      if (i >= cleaned.length) break
      const placeLine = cleaned[i]
      if (!/^\d{1,2}$/.test(placeLine)) { i++; continue }
      let j = i + 1
      while (j < cleaned.length && !cleaned[j]) j++
      if (j >= cleaned.length || /^\d/.test(cleaned[j])) { i++; continue }
      const schoolLine = cleaned[j]
      let k = j + 1
      while (k < cleaned.length && !cleaned[k]) k++
      if (k >= cleaned.length || !/^\d+(\.\d+)?$/.test(cleaned[k])) { i++; continue }
      rows.push({ place: parseInt(placeLine), school_name: schoolLine.trim(), score: parseFloat(cleaned[k]) })
      i = k + 1
    }
    return rows
  }

  function handlePreview() {
    const rows = parseScoreText(pasteText)
    setParsed(rows)
    setMsg(rows.length > 0 ? null : 'No scores detected. Format: place, school, score')
  }

  async function handleSave() {
    if (!parsed || !tid) return
    setSaving(true); setMsg(null)
    try {
      const res = await fetch('/api/admin/save-team-scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournament_id: tid,
          scores: parsed.map(s => ({ ...s, school_id: null })),
        }),
      })
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      setMsg(`✓ Saved ${d.inserted} team scores`)
      setPasteText(''); setParsed(null)
      onRefresh()
    } catch (e) {
      setMsg(`Error: ${String(e)}`)
    } finally {
      setSaving(false)
    }
  }

  if (!tid) {
    return (
      <div className="py-8 text-center text-sm text-slate-500">
        Import tournament data first to track team scores.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Existing scores */}
      {data.team_scores.length > 0 && (() => {
        // Jamborees show all schools; tournaments show only NJ-matched schools
        const displayScores = isJamboree
          ? data.team_scores
          : data.team_scores.filter(s => s.school_id !== null)
        if (displayScores.length === 0) return null
        return (
          <div className="border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase w-12">Place</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">School</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayScores.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2 tabular-nums text-slate-500">{s.place}</td>
                    <td className="px-4 py-2 font-medium text-slate-800">
                      {s.school_name}
                      {isJamboree && s.school_id === null && (
                        <span className="ml-1.5 text-xs text-slate-400">(OOS)</span>
                      )}
                    </td>
                    <td className="px-4 py-2 tabular-nums text-right font-semibold text-slate-900">{s.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })()}

      {/* Jamboree: compute scores from bouts */}
      {isJamboree && data.bout_count > 0 && (
        <div className="border border-slate-200 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-slate-800">Compute Scores from Bouts</h3>
          <p className="text-xs text-slate-500">
            Automatically tallies team points from imported bouts — Fall/For = 6, TF = 5, MD = 4, Dec = 3.
            {data.team_scores.length > 0 && ' Replaces existing scores.'}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCompute}
              disabled={computing}
              className="px-3 py-1.5 text-xs font-medium bg-black text-white hover:bg-slate-800 disabled:opacity-40 transition-colors"
            >
              {computing ? 'Computing…' : data.team_scores.length > 0 ? 'Recompute Scores' : 'Compute Scores'}
            </button>
            {computeMsg && (
              <span className={`text-xs ${computeMsg.startsWith('Error') ? 'text-red-600' : 'text-green-700'}`}>
                {computeMsg}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Import scores */}
      <div className="border border-slate-200 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-slate-800">
          {data.team_scores.length > 0 ? 'Replace Scores from Text' : 'Import Scores from Text'}
        </h3>
        <p className="text-xs text-slate-500">One line per team: <code className="bg-slate-100 px-1">place  School Name  score</code></p>
        <textarea
          className="w-full h-40 text-xs font-mono border border-slate-300 p-3 focus:outline-none focus:ring-1 focus:ring-black resize-y"
          placeholder={`1  Cherry Hill East  215.5\n2  Kingsway  198.0\n3  Southern Regional  185.5`}
          value={pasteText}
          onChange={e => { setPasteText(e.target.value); setParsed(null) }}
        />
        <div className="flex items-center gap-3">
          <button
            onClick={handlePreview}
            disabled={!pasteText.trim()}
            className="px-3 py-1.5 text-xs font-medium border border-black hover:bg-slate-50 disabled:opacity-40 transition-colors"
          >
            Preview
          </button>
          {parsed && parsed.length > 0 && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 text-xs font-medium bg-black text-white hover:bg-slate-800 disabled:opacity-40 transition-colors"
            >
              {saving ? 'Saving…' : `Save ${parsed.length} scores${data.team_scores.length > 0 ? ' (replaces existing)' : ''}`}
            </button>
          )}
          {msg && <span className={`text-xs ${msg.startsWith('Error') ? 'text-red-600' : 'text-green-700'}`}>{msg}</span>}
        </div>

        {parsed && parsed.length > 0 && (
          <table className="w-full text-xs border border-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-2 py-1 font-medium text-slate-500 w-12">Place</th>
                <th className="text-left px-2 py-1 font-medium text-slate-500">School</th>
                <th className="text-right px-2 py-1 font-medium text-slate-500">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {parsed.map((s, i) => (
                <tr key={i}>
                  <td className="px-2 py-1 tabular-nums text-slate-500">{s.place}</td>
                  <td className="px-2 py-1">{s.school_name}</td>
                  <td className="px-2 py-1 tabular-nums text-right font-semibold">{s.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ── Winners Tab ───────────────────────────────────────────────────────────────

function WinnersTab({ data, onRefresh }: { data: DetailData; onRefresh: () => void }) {
  const tid = data.registry.in_season_tournament_id
  const [pasteText, setPasteText] = useState('')
  const [parsed, setParsed]       = useState<Array<{ weight_class: number; place: number; wrestler_name_raw: string; school_name_raw: string }> | null>(null)
  const [saving, setSaving]       = useState(false)
  const [msg, setMsg]             = useState<string | null>(null)

  function parsePlacementText(text: string) {
    const lines = text.trim().split('\n')
    const rows: Array<{ weight_class: number; place: number; wrestler_name_raw: string; school_name_raw: string }> = []
    let currentWeight = 0

    for (const raw of lines) {
      const line = raw.trim()
      if (!line) continue

      const weightMatch = line.match(/^(\d{2,3})(?:\s*(?:lbs?|pounds?))?\.?$/)
      if (weightMatch) {
        currentWeight = parseInt(weightMatch[1])
        continue
      }

      // Place line: "1st Wrestler Name (School)" or "1 Wrestler Name, School"
      const placeMatch = line.match(/^(\d+)(?:st|nd|rd|th)?[.\s]+(.+?)(?:[,(]\s*(.+?)[\s,)]*)?$/)
      if (placeMatch && currentWeight > 0) {
        const place = parseInt(placeMatch[1])
        const name = placeMatch[2]?.trim() ?? ''
        const school = placeMatch[3]?.trim() ?? ''
        if (name && place >= 1 && place <= 8) {
          rows.push({ weight_class: currentWeight, place, wrestler_name_raw: name, school_name_raw: school })
        }
      }
    }
    return rows
  }

  function handlePreview() {
    const rows = parsePlacementText(pasteText)
    setParsed(rows)
    setMsg(rows.length > 0 ? null : 'No placements detected.')
  }

  async function handleSave() {
    if (!parsed || !tid) return
    setSaving(true); setMsg(null)
    try {
      const rows = parsed.map(p => ({ ...p, school_id: null, wrestler_id: null }))
      const res = await fetch('/api/admin/tournament-detail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_placements', in_season_tournament_id: tid, placements: rows }),
      })
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      setMsg(`✓ Saved ${d.count} placements`)
      setPasteText(''); setParsed(null)
      onRefresh()
    } catch (e) {
      setMsg(`Error: ${String(e)}`)
    } finally {
      setSaving(false)
    }
  }

  if (!tid) {
    return (
      <div className="py-8 text-center text-sm text-slate-500">
        Import tournament data first before recording place winners.
      </div>
    )
  }

  // Group by weight class — NJ schools only (school_id IS NOT NULL)
  const njPlacements = data.placements.filter(p => p.school_id !== null)
  const byWeight = njPlacements.reduce<Record<number, Placement[]>>((acc, p) => {
    if (!acc[p.weight_class]) acc[p.weight_class] = []
    acc[p.weight_class].push(p)
    return acc
  }, {})

  const weightClasses = Object.keys(byWeight).map(Number).sort((a, b) => a - b)
  const allWeights = [...new Set([...weightClasses, ...WEIGHT_CLASSES])].sort((a, b) => a - b)

  return (
    <div className="space-y-6">
      {/* Existing placements */}
      {weightClasses.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {weightClasses.map(wc => (
            <div key={wc} className="border border-slate-200">
              <div className="bg-slate-50 border-b border-slate-200 px-3 py-1.5">
                <span className="text-xs font-bold text-slate-700">{wc} lbs</span>
              </div>
              <div className="divide-y divide-slate-100">
                {byWeight[wc].sort((a, b) => a.place - b.place).map(p => (
                  <div key={p.id} className="px-3 py-1.5 flex items-center gap-2 text-xs">
                    <span className="tabular-nums text-slate-400 w-5">{p.place}</span>
                    <span className="font-medium text-slate-800">{p.wrestler_name_raw}</span>
                    <span className="text-slate-400 truncate">{p.school_name_raw}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Import placements */}
      <div className="border border-slate-200 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-slate-800">
          {weightClasses.length > 0 ? 'Replace Placements from Text' : 'Import Placements from Text'}
        </h3>
        <p className="text-xs text-slate-500">Weight class headers, then place lines:</p>
        <pre className="text-[10px] bg-slate-50 border border-slate-200 p-2 text-slate-600">
{`106
1st Wrestler Name (School Name)
2nd Wrestler Name (School Name)
3rd Wrestler Name (School Name)

113
1 Wrestler Name, School Name`}
        </pre>
        <textarea
          className="w-full h-48 text-xs font-mono border border-slate-300 p-3 focus:outline-none focus:ring-1 focus:ring-black resize-y"
          placeholder="Paste placements here…"
          value={pasteText}
          onChange={e => { setPasteText(e.target.value); setParsed(null) }}
        />
        <div className="flex items-center gap-3">
          <button
            onClick={handlePreview}
            disabled={!pasteText.trim()}
            className="px-3 py-1.5 text-xs font-medium border border-black hover:bg-slate-50 disabled:opacity-40 transition-colors"
          >
            Preview
          </button>
          {parsed && parsed.length > 0 && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 text-xs font-medium bg-black text-white hover:bg-slate-800 disabled:opacity-40 transition-colors"
            >
              {saving ? 'Saving…' : `Save ${parsed.length} placements${weightClasses.length > 0 ? ' (replaces existing)' : ''}`}
            </button>
          )}
          {msg && <span className={`text-xs ${msg.startsWith('Error') ? 'text-red-600' : 'text-green-700'}`}>{msg}</span>}
        </div>

        {parsed && parsed.length > 0 && (
          <div className="overflow-x-auto max-h-48 overflow-y-auto">
            <table className="w-full text-xs border border-slate-200">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="text-left px-2 py-1 font-medium text-slate-500">Wt</th>
                  <th className="text-left px-2 py-1 font-medium text-slate-500">Place</th>
                  <th className="text-left px-2 py-1 font-medium text-slate-500">Wrestler</th>
                  <th className="text-left px-2 py-1 font-medium text-slate-500">School</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parsed.map((p, i) => (
                  <tr key={i}>
                    <td className="px-2 py-1 tabular-nums">{p.weight_class}</td>
                    <td className="px-2 py-1 tabular-nums text-slate-400">{p.place}</td>
                    <td className="px-2 py-1">{p.wrestler_name_raw}</td>
                    <td className="px-2 py-1 text-slate-500">{p.school_name_raw || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function TournamentDetailClient({ registryId }: { registryId: string }) {
  const [data, setData]     = useState<DetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)
  const [tab, setTab]       = useState<Tab>('overview')

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/admin/tournament-detail?id=${registryId}`)
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      setData(d)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [registryId])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="py-16 text-center text-sm text-slate-400">Loading…</div>
  if (error)   return <div className="py-8 text-sm text-red-600">{error}</div>
  if (!data)   return null

  const reg = data.registry
  const tid = reg.in_season_tournament_id

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'schools',  label: 'Schools',  count: data.participants.length },
    { id: 'seeds',    label: 'Seeds',    count: data.seeds.length },
    { id: 'bracket',  label: 'Bracket' },
    { id: 'scores',   label: 'Scores',   count: data.team_scores.filter(s => s.school_id !== null).length || data.team_scores.length },
    { id: 'winners',  label: 'Winners',  count: data.placements.filter(p => p.school_id !== null).length || data.placements.length },
  ]

  return (
    <div className="space-y-0">
      {/* Back nav + header */}
      <div className="mb-4">
        <Link href="/admin/tournament-hub" className="text-xs text-slate-400 hover:text-slate-700 transition-colors">
          ← Tournament Hub
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-lg font-bold text-slate-900">{reg.name}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {reg.date_start ? fmtDate(reg.date_start) : '—'}
            {reg.date_end && reg.date_end !== reg.date_start ? ` – ${fmtDate(reg.date_end)}` : ''}
            {data.tournament?.location ? ` · ${data.tournament.location}` : ''}
            {' · '}
            {reg.gender === 'M' ? 'Boys' : 'Girls'}
            {' · '}
            {reg.season}
            {reg.point_value ? ` · ${reg.point_value} pts` : ''}
            {tid ? ' · Imported' : ' · Not yet imported'}
          </p>
        </div>
        {tid && (
          <div className="flex gap-2 shrink-0">
            <Link
              href={`/admin/bout-audit?tid=${tid}`}
              className="px-3 py-1.5 text-xs font-medium border border-slate-300 hover:bg-slate-50 transition-colors text-slate-700"
            >
              Bout Audit
            </Link>
            <Link
              href={`/tournaments/${tid}/bracket`}
              target="_blank"
              className="px-3 py-1.5 text-xs font-medium border border-slate-300 hover:bg-slate-50 transition-colors text-slate-700"
            >
              Public Bracket ↗
            </Link>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-6">
        <nav className="flex gap-0 -mb-px overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                tab === t.id
                  ? 'border-black text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                  tab === t.id ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div>
        {tab === 'overview' && <OverviewTab data={data} onRefresh={load} />}
        {tab === 'schools'  && <SchoolsTab  data={data} onRefresh={load} />}
        {tab === 'seeds'    && <SeedsTab    data={data} onRefresh={load} />}
        {tab === 'bracket'  && <BracketTab  data={data} />}
        {tab === 'scores'   && <ScoresTab   data={data} onRefresh={load} />}
        {tab === 'winners'  && <WinnersTab  data={data} onRefresh={load} />}
      </div>
    </div>
  )
}

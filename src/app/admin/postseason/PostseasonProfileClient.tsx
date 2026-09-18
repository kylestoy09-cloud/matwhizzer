'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────────

type Tournament = {
  id: number
  name: string
  tournament_type: string
  gender: 'M' | 'F'
  season_id: number
  num: number
  [key: string]: any
}

type Entry = {
  id: string
  tournament_id: number
  wrestler_id: string | null
  weight: number
  seed: number | null
  wrestler_name: string | null
  school_name: string | null
}

type Placement = {
  id?: string
  tournament_id: number
  weight: number
  place: number
  wrestler_id?: string | null
  wrestler_name: string
  school_name: string | null
}

type TeamScore = {
  school_name: string | null
  school_id: number | null
  total_points: number
}

type ProfileData = {
  tournament: Tournament
  entries: Entry[]
  placements: Placement[]
  teamScores: TeamScore[]
}

type Tab = 'overview' | 'entries' | 'seeds' | 'bracket' | 'results' | 'scores'

const BOYS_WEIGHTS  = [106, 113, 120, 126, 132, 138, 144, 150, 157, 165, 175, 190, 215, 285]
const GIRLS_WEIGHTS = [100, 107, 114, 120, 126, 132, 138, 145, 152, 165, 185, 235]

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 text-slate-400 inline-block" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({ data }: { data: ProfileData }) {
  const t = data.tournament
  const typeLabel = t.tournament_type === 'districts' ? 'District' : 'Region'
  const gLabel    = t.gender === 'M' ? 'Boys' : 'Girls'

  const seededCount    = data.entries.filter(e => e.seed !== null).length
  const placementCount = data.placements.length
  const scoreCount     = data.teamScores.length

  return (
    <div className="space-y-6 max-w-lg">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Tournament',   value: t.name },
            { label: 'Type',         value: `${gLabel} ${typeLabel} ${t.num}` },
            { label: 'Gender',       value: gLabel },
            { label: 'Season ID',    value: String(t.season_id) },
            { label: 'Entries',      value: String(data.entries.length) },
            { label: 'Seeds set',    value: `${seededCount} / ${data.entries.length}` },
            { label: 'Placements',   value: String(placementCount) },
            { label: 'Team Scores',  value: String(scoreCount) },
          ].map(({ label, value }) => (
            <div key={label} className="border border-slate-100 rounded-lg bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">{label}</p>
              <p className="text-sm font-semibold text-slate-800">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-200 pt-4 flex gap-3 flex-wrap">
        <Link
          href={`/${t.gender === 'M' ? 'boys' : 'girls'}/${t.tournament_type}/${t.num}`}
          target="_blank"
          className="px-3 py-1.5 text-xs font-medium border border-slate-300 hover:bg-slate-50 transition-colors text-slate-700"
        >
          View public page ↗
        </Link>
      </div>
    </div>
  )
}

// ── Entries Tab ───────────────────────────────────────────────────────────────

function EntriesTab({ data }: { data: ProfileData }) {
  const weights = data.tournament.gender === 'F' ? GIRLS_WEIGHTS : BOYS_WEIGHTS
  const byWeight = new Map<number, Entry[]>()
  for (const e of data.entries) {
    const arr = byWeight.get(e.weight) ?? []
    arr.push(e)
    byWeight.set(e.weight, arr)
  }
  const usedWeights = weights.filter(w => byWeight.has(w))

  if (data.entries.length === 0) {
    return <p className="text-sm text-slate-400 py-8 text-center">No entries found for this tournament.</p>
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">{data.entries.length} total entries across {usedWeights.length} weight classes</p>
      {usedWeights.map(w => (
        <div key={w} className="border border-slate-200">
          <div className="bg-slate-50 border-b border-slate-200 px-3 py-1.5 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">{w} lbs</span>
            <span className="text-[10px] text-slate-400">{byWeight.get(w)!.length} entries</span>
          </div>
          <table className="w-full text-xs">
            <tbody className="divide-y divide-slate-100">
              {byWeight.get(w)!.sort((a, b) => (a.seed ?? 999) - (b.seed ?? 999)).map(e => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-3 py-1.5 tabular-nums text-slate-400 w-8">
                    {e.seed !== null ? `#${e.seed}` : '—'}
                  </td>
                  <td className="px-3 py-1.5 font-medium text-slate-800">
                    {e.wrestler_name ?? <span className="text-slate-400 italic">Unknown</span>}
                  </td>
                  <td className="px-3 py-1.5 text-slate-500">{e.school_name ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}

// ── Seeds Tab ─────────────────────────────────────────────────────────────────

function SeedsTab({ data, onRefresh }: { data: ProfileData; onRefresh: () => void }) {
  const weights = data.tournament.gender === 'F' ? GIRLS_WEIGHTS : BOYS_WEIGHTS
  const byWeight = new Map<number, Entry[]>()
  for (const e of data.entries) {
    const arr = byWeight.get(e.weight) ?? []
    arr.push(e)
    byWeight.set(e.weight, arr)
  }

  const [editSeeds, setEditSeeds] = useState<Record<string, string>>({})
  const [saving,    setSaving]    = useState<string | null>(null)
  const [savedIds,  setSavedIds]  = useState<Set<string>>(new Set())

  const [pasteText, setPasteText] = useState('')
  const [parsed,    setParsed]    = useState<Array<{ weight: number; seed: number; name: string; school: string }> | null>(null)
  const [bulkSaving, setBulkSaving] = useState(false)
  const [bulkMsg,    setBulkMsg]    = useState<string | null>(null)

  async function saveSeed(entryId: string, seed: number | null) {
    setSaving(entryId)
    await fetch('/api/admin/postseason-tournament', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_seed', entry_id: entryId, seed }),
    })
    setSaving(null)
    setSavedIds(prev => new Set([...prev, entryId]))
    setTimeout(() => setSavedIds(prev => { const n = new Set(prev); n.delete(entryId); return n }), 2000)
    onRefresh()
  }

  function parseBulkText(text: string) {
    const rows: Array<{ weight: number; seed: number; name: string; school: string }> = []
    let wt = 0
    for (const raw of text.trim().split('\n')) {
      const line = raw.trim()
      if (!line) continue
      const wtMatch = line.match(/^(\d{2,3})(?:\s*(?:lbs?|pounds?))?\.?$/)
      if (wtMatch) { wt = parseInt(wtMatch[1]); continue }
      const seedMatch = line.match(/^(\d+)[.\s]+(.+?)(?:[,(]\s*(.+?)[\s,)]*)?$/)
      if (seedMatch && wt > 0) {
        rows.push({ weight: wt, seed: parseInt(seedMatch[1]), name: seedMatch[2]?.trim() ?? '', school: seedMatch[3]?.trim() ?? '' })
      }
    }
    return rows
  }

  async function saveBulk() {
    if (!parsed?.length) return
    setBulkSaving(true); setBulkMsg(null)
    let saved = 0
    for (const row of parsed) {
      const entry = data.entries.find(e => e.weight === row.weight &&
        (e.wrestler_name?.toLowerCase().includes(row.name.toLowerCase()) ||
         row.name.toLowerCase().includes((e.wrestler_name ?? '').toLowerCase().split(' ').pop() ?? '')))
      if (entry) {
        await fetch('/api/admin/postseason-tournament', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update_seed', entry_id: entry.id, seed: row.seed }),
        })
        saved++
      }
    }
    setBulkMsg(`Matched and saved ${saved} of ${parsed.length} seeds`)
    setBulkSaving(false)
    setPasteText(''); setParsed(null)
    onRefresh()
  }

  const usedWeights = weights.filter(w => byWeight.has(w))

  return (
    <div className="space-y-6">
      {/* District formula note */}
      <div className="border border-blue-200 bg-blue-50 rounded-lg px-4 py-3 text-sm">
        <p className="font-medium text-blue-800">District Ranking Formula</p>
        <p className="text-blue-700 text-xs mt-0.5">
          Projected seeds based on the district formula are available at{' '}
          <Link href="/admin/district-preseed" className="underline hover:text-blue-900">
            /admin/district-preseed
          </Link>
          . Use those projections to inform manual seed assignments below.
        </p>
      </div>

      {/* Per-weight seed assignment */}
      {usedWeights.length > 0 ? (
        <div className="space-y-3">
          {usedWeights.map(w => (
            <div key={w} className="border border-slate-200">
              <div className="bg-slate-50 border-b border-slate-200 px-3 py-1.5">
                <span className="text-xs font-bold text-slate-700">{w} lbs</span>
              </div>
              <table className="w-full text-xs">
                <thead className="bg-slate-50/50 border-b border-slate-100">
                  <tr>
                    <th className="px-3 py-1.5 text-left text-slate-400 font-medium w-20">Seed</th>
                    <th className="px-3 py-1.5 text-left text-slate-400 font-medium">Wrestler</th>
                    <th className="px-3 py-1.5 text-left text-slate-400 font-medium">School</th>
                    <th className="px-3 py-1.5 w-20"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {byWeight.get(w)!.sort((a, b) => (a.seed ?? 999) - (b.seed ?? 999)).map(e => (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="px-3 py-1.5">
                        <input
                          type="number"
                          min="1"
                          max="20"
                          className="w-14 text-xs border border-slate-300 px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-black tabular-nums"
                          value={editSeeds[e.id] !== undefined ? editSeeds[e.id] : (e.seed ?? '')}
                          onChange={ev => setEditSeeds(prev => ({ ...prev, [e.id]: ev.target.value }))}
                          onBlur={ev => {
                            const v = ev.target.value ? parseInt(ev.target.value) : null
                            if (v !== e.seed) saveSeed(e.id, v)
                          }}
                          onKeyDown={ev => {
                            if (ev.key === 'Enter') {
                              const v = (ev.target as HTMLInputElement).value ? parseInt((ev.target as HTMLInputElement).value) : null
                              if (v !== e.seed) saveSeed(e.id, v)
                            }
                          }}
                        />
                      </td>
                      <td className="px-3 py-1.5 font-medium text-slate-800">
                        {e.wrestler_name ?? <span className="text-slate-400 italic">Unknown</span>}
                      </td>
                      <td className="px-3 py-1.5 text-slate-500">{e.school_name ?? '—'}</td>
                      <td className="px-3 py-1.5 text-right">
                        {saving === e.id && <Spinner />}
                        {savedIds.has(e.id) && <span className="text-[10px] text-green-600">✓</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400">No entries found.</p>
      )}

      {/* Bulk paste */}
      <div className="border border-slate-200 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-slate-800">Bulk Paste Seeds</h3>
        <p className="text-xs text-slate-500">Paste weight headers then numbered seed lines. Matches by wrestler name.</p>
        <pre className="text-[10px] bg-slate-50 border border-slate-200 p-2 text-slate-600">{`106\n1 Wrestler Name, School\n2 Wrestler Name, School\n\n113\n1 Wrestler Name, School`}</pre>
        <textarea
          className="w-full h-40 text-xs font-mono border border-slate-300 p-3 focus:outline-none focus:ring-1 focus:ring-black resize-y"
          placeholder="Paste seeds here…"
          value={pasteText}
          onChange={e => { setPasteText(e.target.value); setParsed(null) }}
        />
        <div className="flex items-center gap-3">
          <button
            onClick={() => setParsed(parseBulkText(pasteText))}
            disabled={!pasteText.trim()}
            className="px-3 py-1.5 text-xs font-medium border border-black hover:bg-slate-50 disabled:opacity-40 transition-colors"
          >
            Preview ({parseBulkText(pasteText).length} detected)
          </button>
          {parsed && parsed.length > 0 && (
            <button
              onClick={saveBulk}
              disabled={bulkSaving}
              className="px-3 py-1.5 text-xs font-medium bg-black text-white hover:bg-slate-800 disabled:opacity-40 transition-colors"
            >
              {bulkSaving ? 'Saving…' : `Save ${parsed.length} seeds`}
            </button>
          )}
          {bulkMsg && <span className={`text-xs ${bulkMsg.startsWith('Error') ? 'text-red-600' : 'text-green-700'}`}>{bulkMsg}</span>}
        </div>
        {parsed && parsed.length > 0 && (
          <div className="overflow-x-auto max-h-48 overflow-y-auto border border-slate-200">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-2 py-1 text-left font-medium text-slate-500">Wt</th>
                  <th className="px-2 py-1 text-left font-medium text-slate-500">Seed</th>
                  <th className="px-2 py-1 text-left font-medium text-slate-500">Name</th>
                  <th className="px-2 py-1 text-left font-medium text-slate-500">School</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parsed.map((r, i) => (
                  <tr key={i}>
                    <td className="px-2 py-1 tabular-nums">{r.weight}</td>
                    <td className="px-2 py-1 tabular-nums text-slate-400">#{r.seed}</td>
                    <td className="px-2 py-1">{r.name}</td>
                    <td className="px-2 py-1 text-slate-500">{r.school || '—'}</td>
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

function BracketTab({ data }: { data: ProfileData }) {
  const t = data.tournament
  const gStr = t.gender === 'M' ? 'boys' : 'girls'
  const typeStr = t.tournament_type === 'districts' ? 'districts' : 'regions'
  const weights = t.gender === 'F' ? GIRLS_WEIGHTS : BOYS_WEIGHTS

  const byWeight = new Map<number, Entry[]>()
  for (const e of data.entries) {
    const arr = byWeight.get(e.weight) ?? []
    arr.push(e)
    byWeight.set(e.weight, arr)
  }

  const seededWeights = weights.filter(w => {
    const entries = byWeight.get(w) ?? []
    return entries.some(e => e.seed !== null)
  })

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        Full bracket brackets are available on the public site. Seeds must be assigned in the Seeds tab first.
      </p>

      {seededWeights.length === 0 ? (
        <div className="border border-dashed border-slate-300 rounded-lg p-8 text-center">
          <p className="text-sm text-slate-500">No seeds assigned yet.</p>
          <p className="text-xs text-slate-400 mt-1">Assign seeds in the Seeds tab to see the bracket layout here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {seededWeights.map(w => {
            const entries = (byWeight.get(w) ?? []).filter(e => e.seed !== null).sort((a, b) => (a.seed ?? 999) - (b.seed ?? 999))
            return (
              <div key={w} className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-200 px-3 py-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">{w} lbs</span>
                  <Link
                    href={`/${gStr}/${typeStr}/${t.num}/${w}`}
                    target="_blank"
                    className="text-[10px] text-blue-500 hover:text-blue-700 hover:underline"
                  >
                    View bracket ↗
                  </Link>
                </div>
                <div className="divide-y divide-slate-100">
                  {entries.map(e => (
                    <div key={e.id} className="px-3 py-1.5 flex items-center gap-2 text-xs">
                      <span className="tabular-nums text-slate-400 w-5 shrink-0">#{e.seed}</span>
                      <span className="font-medium text-slate-800 truncate">{e.wrestler_name ?? '—'}</span>
                      <span className="text-slate-400 truncate text-[10px]">{e.school_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">All Weight Bracket Links</p>
        <div className="flex flex-wrap gap-2">
          {weights.map(w => (
            <Link
              key={w}
              href={`/${gStr}/${typeStr}/${t.num}/${w}`}
              target="_blank"
              className="px-2.5 py-1 text-xs border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-colors text-slate-600"
            >
              {w}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Results Tab ───────────────────────────────────────────────────────────────

function ResultsTab({ data, onRefresh }: { data: ProfileData; onRefresh: () => void }) {
  const t = data.tournament
  const weights = t.gender === 'F' ? GIRLS_WEIGHTS : BOYS_WEIGHTS

  const byWeight = new Map<number, Placement[]>()
  for (const p of data.placements) {
    const arr = byWeight.get(p.weight) ?? []
    arr.push(p)
    byWeight.set(p.weight, arr)
  }
  const usedWeights = weights.filter(w => byWeight.has(w))

  const [pasteText, setPasteText] = useState('')
  const [parsed, setParsed] = useState<Placement[] | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  function parsePlacementText(text: string): Placement[] {
    const rows: Placement[] = []
    let wt = 0
    for (const raw of text.trim().split('\n')) {
      const line = raw.trim()
      if (!line) continue
      const wtMatch = line.match(/^(\d{2,3})(?:\s*(?:lbs?|pounds?))?\.?$/)
      if (wtMatch) { wt = parseInt(wtMatch[1]); continue }
      const placeMatch = line.match(/^(\d+)(?:st|nd|rd|th)?[.\s]+(.+?)(?:[,(]\s*(.+?)[\s,)]*)?$/)
      if (placeMatch && wt > 0) {
        const place = parseInt(placeMatch[1])
        const name = placeMatch[2]?.trim() ?? ''
        const school = placeMatch[3]?.trim() ?? ''
        if (name && place >= 1 && place <= 8) {
          rows.push({ tournament_id: t.id, weight: wt, place, wrestler_name: name, school_name: school || null })
        }
      }
    }
    return rows
  }

  async function handleSave() {
    if (!parsed?.length) return
    setSaving(true); setMsg(null)
    try {
      const res = await fetch('/api/admin/postseason-tournament', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_placements', tournament_id: t.id, placements: parsed }),
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

  return (
    <div className="space-y-6">
      {/* Current placements */}
      {usedWeights.length > 0 && (
        <div>
          <p className="text-sm text-slate-600 mb-3">
            {data.placements.length} placements across {usedWeights.length} weight classes
          </p>
          <div className="overflow-x-auto border border-slate-200">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase w-14">Wt</th>
                  {[1, 2, 3, 4].map(p => (
                    <th key={p} className="px-3 py-2 text-left font-semibold text-slate-500 uppercase">
                      {p === 1 ? 'Champion' : p === 2 ? 'Runner-Up' : `${p}${p === 3 ? 'rd' : 'th'}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usedWeights.map((w, i) => {
                  const placesMap = new Map<number, Placement>()
                  byWeight.get(w)!.forEach(p => placesMap.set(p.place, p))
                  return (
                    <tr key={w} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                      <td className="px-3 py-2 font-bold text-slate-700">{w}</td>
                      {[1, 2, 3, 4].map(place => {
                        const p = placesMap.get(place)
                        return (
                          <td key={place} className="px-3 py-2">
                            {p ? (
                              <div>
                                <p className="font-medium text-slate-800">{p.wrestler_name}</p>
                                <p className="text-[10px] text-slate-400">{p.school_name}</p>
                              </div>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Paste import */}
      <div className="border border-slate-200 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-slate-800">
          {usedWeights.length > 0 ? 'Replace Placements from Text' : 'Import Placements from Text'}
        </h3>
        <p className="text-xs text-slate-500">Weight class headers, then place lines:</p>
        <pre className="text-[10px] bg-slate-50 border border-slate-200 p-2 text-slate-600">{`106\n1st Wrestler Name (School Name)\n2nd Wrestler Name (School Name)\n3rd Wrestler Name (School Name)\n\n113\n1 Wrestler Name, School Name`}</pre>
        <textarea
          className="w-full h-48 text-xs font-mono border border-slate-300 p-3 focus:outline-none focus:ring-1 focus:ring-black resize-y"
          placeholder="Paste placements here…"
          value={pasteText}
          onChange={e => { setPasteText(e.target.value); setParsed(null) }}
        />
        <div className="flex items-center gap-3">
          <button
            onClick={() => setParsed(parsePlacementText(pasteText))}
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
              {saving ? 'Saving…' : `Save ${parsed.length} placements${usedWeights.length > 0 ? ' (replaces existing)' : ''}`}
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
                    <td className="px-2 py-1 tabular-nums">{p.weight}</td>
                    <td className="px-2 py-1 tabular-nums text-slate-400">{p.place}</td>
                    <td className="px-2 py-1">{p.wrestler_name}</td>
                    <td className="px-2 py-1 text-slate-500">{p.school_name || '—'}</td>
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

// ── Scores Tab ────────────────────────────────────────────────────────────────

function ScoresTab({ data }: { data: ProfileData }) {
  if (data.teamScores.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-slate-400">No team scores yet.</p>
        <p className="text-xs text-slate-400 mt-1">Team scores are computed from the district/region scoring formula after results are entered.</p>
      </div>
    )
  }

  return (
    <div className="border border-slate-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase w-12">Place</th>
            <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">School</th>
            <th className="text-right px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Points</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.teamScores.map((s, i) => (
            <tr key={i} className={`hover:bg-slate-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
              <td className="px-4 py-2 tabular-nums text-slate-500">{i + 1}</td>
              <td className="px-4 py-2 font-medium text-slate-800">{s.school_name ?? '—'}</td>
              <td className="px-4 py-2 tabular-nums text-right font-semibold text-slate-900">{s.total_points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function PostseasonProfileClient({
  tournamentId,
  backHref,
  backLabel,
}: {
  tournamentId: number
  backHref: string
  backLabel: string
}) {
  const [data, setData]       = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [tab, setTab]         = useState<Tab>('overview')

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/admin/postseason-tournament?id=${tournamentId}`)
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      setData(d)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [tournamentId])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="py-16 text-center text-sm text-slate-400">Loading…</div>
  if (error)   return <div className="py-8 text-sm text-red-600">{error}</div>
  if (!data)   return null

  const t = data.tournament
  const seededCount = data.entries.filter(e => e.seed !== null).length

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'entries',  label: 'Entries',  count: data.entries.length },
    { id: 'seeds',    label: 'Seeds',    count: seededCount || undefined },
    { id: 'bracket',  label: 'Bracket' },
    { id: 'results',  label: 'Results',  count: data.placements.length || undefined },
    { id: 'scores',   label: 'Scores',   count: data.teamScores.length || undefined },
  ]

  const typeLabel = t.tournament_type === 'districts' ? 'District' : 'Region'
  const gLabel    = t.gender === 'M' ? 'Boys' : 'Girls'
  const gStr      = t.gender === 'M' ? 'boys' : 'girls'
  const typeStr   = t.tournament_type === 'districts' ? 'districts' : 'regions'

  return (
    <div>
      {/* Back nav */}
      <div className="mb-4">
        <Link href={backHref} className="text-xs text-slate-400 hover:text-slate-700 transition-colors">
          ← {backLabel}
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-lg font-bold text-slate-900">{t.name}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {gLabel} {typeLabel} {t.num}
            {' · '}Season {t.season_id}
            {' · '}
            {data.entries.length} entries
            {seededCount > 0 ? ` · ${seededCount} seeded` : ''}
            {data.placements.length > 0 ? ` · Results entered` : ''}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link
            href={`/${gStr}/${typeStr}/${t.num}`}
            target="_blank"
            className="px-3 py-1.5 text-xs font-medium border border-slate-300 hover:bg-slate-50 transition-colors text-slate-700"
          >
            Public Page ↗
          </Link>
        </div>
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
        {tab === 'overview' && <OverviewTab data={data} />}
        {tab === 'entries'  && <EntriesTab  data={data} />}
        {tab === 'seeds'    && <SeedsTab    data={data} onRefresh={load} />}
        {tab === 'bracket'  && <BracketTab  data={data} />}
        {tab === 'results'  && <ResultsTab  data={data} onRefresh={load} />}
        {tab === 'scores'   && <ScoresTab   data={data} />}
      </div>
    </div>
  )
}

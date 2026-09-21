'use client'

import { useState, useEffect, useCallback } from 'react'
import { parseEventList, type ParsedEvent } from './parseEventList'
import { useAdminGender } from '@/components/admin/AdminGenderContext'

type RegistryEvent = {
  id: string
  name: string
  date_start: string | null
  date_end: string | null
  state: string
  event_type: 'tournament' | 'jamboree'
  gender: 'M' | 'F' | 'both'
  season: string
  point_value: number | null
  imported: boolean
  notes: string | null
}

type FilterType = 'all' | 'tournament' | 'jamboree'
type FilterImport = 'all' | 'imported' | 'pending'

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  const [, m, d] = iso.split('-')
  return `${parseInt(m)}/${parseInt(d)}`
}

function TypeBadge({ type }: { type: 'tournament' | 'jamboree' }) {
  return (
    <span className={`inline-block text-xs font-medium px-1.5 py-0.5 ${
      type === 'tournament' ? 'bg-indigo-100 text-indigo-700' : 'bg-teal-100 text-teal-700'
    }`}>
      {type === 'tournament' ? 'Tournament' : 'Jamboree'}
    </span>
  )
}

function ImportBadge({ imported }: { imported: boolean }) {
  return (
    <span className={`inline-block text-xs font-medium px-1.5 py-0.5 ${
      imported ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
    }`}>
      {imported ? '✓ Imported' : 'Pending'}
    </span>
  )
}

export function TournamentRegistryClient({ seasonByGender }: { seasonByGender: Record<'M' | 'F', string> }) {
  const { gender } = useAdminGender()
  const season = seasonByGender[gender === 'F' ? 'F' : 'M']
  const [events, setEvents] = useState<RegistryEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [filterImport, setFilterImport] = useState<FilterImport>('all')
  const [filterMonth, setFilterMonth] = useState<string>('all')

  // Bulk import state
  const [showImport, setShowImport] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [preview, setPreview] = useState<ParsedEvent[] | null>(null)
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState<string | null>(null)

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPv, setEditPv] = useState<string>('')
  const [editImported, setEditImported] = useState(false)

  const loadEvents = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/tournament-registry?season=${season}&gender=${gender}`)
    const data = await res.json()
    setEvents(data.events ?? [])
    setLoading(false)
  }, [season, gender])

  useEffect(() => { loadEvents() }, [loadEvents])

  // Derive available months for filter
  const months = [...new Set(
    events
      .filter(e => e.date_start)
      .map(e => e.date_start!.slice(0, 7))
  )].sort()

  const filtered = events.filter(e => {
    if (filterType !== 'all' && e.event_type !== filterType) return false
    if (filterImport === 'imported' && !e.imported) return false
    if (filterImport === 'pending' && e.imported) return false
    if (filterMonth !== 'all' && (!e.date_start || !e.date_start.startsWith(filterMonth))) return false
    return true
  })

  function handlePreview() {
    const parsed = parseEventList(pasteText, gender)
    setPreview(parsed)
    setImportMsg(null)
  }

  async function handleImport() {
    if (!preview?.length) return
    setImporting(true)
    const res = await fetch('/api/admin/tournament-registry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        events: preview.map(e => ({ ...e, season })),
      }),
    })
    const data = await res.json()
    if (data.error) {
      setImportMsg(`Error: ${data.error}`)
    } else {
      setImportMsg(`✓ Imported ${data.inserted} events`)
      setPasteText('')
      setPreview(null)
      setShowImport(false)
      loadEvents()
    }
    setImporting(false)
  }

  function startEdit(e: RegistryEvent) {
    setEditingId(e.id)
    setEditPv(e.point_value != null ? String(e.point_value) : '')
    setEditImported(e.imported)
  }

  async function saveEdit(id: string) {
    const pv = editPv.trim() ? parseInt(editPv.trim(), 10) : null
    const res = await fetch('/api/admin/tournament-registry', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, point_value: pv, imported: editImported }),
    })
    const data = await res.json()
    if (!data.error) {
      setEvents(prev => prev.map(e => e.id === id ? { ...e, point_value: pv, imported: editImported } : e))
    }
    setEditingId(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this event from the registry?')) return
    await fetch(`/api/admin/tournament-registry?id=${id}`, { method: 'DELETE' })
    setEvents(prev => prev.filter(e => e.id !== id))
  }

  const monthLabel = (ym: string) => {
    const [y, m] = ym.split('-')
    const name = new Date(parseInt(y), parseInt(m) - 1).toLocaleString('default', { month: 'long' })
    return `${name} ${y}`
  }

  return (
    <div className="space-y-4">
      {/* Controls bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Type filter */}
          <div className="flex border border-slate-300 overflow-hidden text-xs">
            {(['all', 'tournament', 'jamboree'] as FilterType[]).map(t => (
              <button key={t} onClick={() => setFilterType(t)}
                className={`px-3 py-1.5 font-medium transition-colors ${filterType === t ? 'bg-black text-white' : 'bg-white text-slate-600 hover:bg-slate-50'} ${t !== 'all' ? 'border-l border-slate-300' : ''}`}>
                {t === 'all' ? 'All types' : t === 'tournament' ? 'Tournaments' : 'Jamborees'}
              </button>
            ))}
          </div>
          {/* Import filter */}
          <div className="flex border border-slate-300 overflow-hidden text-xs">
            {(['all', 'pending', 'imported'] as FilterImport[]).map(t => (
              <button key={t} onClick={() => setFilterImport(t)}
                className={`px-3 py-1.5 font-medium transition-colors ${filterImport === t ? 'bg-black text-white' : 'bg-white text-slate-600 hover:bg-slate-50'} ${t !== 'all' ? 'border-l border-slate-300' : ''}`}>
                {t === 'all' ? 'All' : t === 'pending' ? 'Pending' : 'Imported'}
              </button>
            ))}
          </div>
          {/* Month filter */}
          <select
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
            className="text-xs border border-slate-300 px-2 py-1.5 focus:outline-none"
          >
            <option value="all">All months</option>
            {months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>{filtered.length} of {events.length} events</span>
          <button
            onClick={() => { setShowImport(v => !v); setPreview(null); setImportMsg(null) }}
            className="px-3 py-1.5 border border-black text-slate-800 font-medium hover:bg-slate-50 transition-colors"
          >
            {showImport ? 'Cancel' : '+ Bulk import'}
          </button>
        </div>
      </div>

      {/* Bulk import panel */}
      {showImport && (
        <div className="border border-slate-300 bg-slate-50 p-4 space-y-3">
          <div className="flex items-center gap-4">
            <h3 className="text-sm font-semibold text-slate-800">
              Bulk Import from Text — {gender === 'F' ? 'Girls' : 'Boys'}
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            Paste the tournament list in the format: <code className="bg-white border border-slate-200 px-1">12/12 — Event Name, NJ</code> with month headers like <code className="bg-white border border-slate-200 px-1">December 2025</code>
          </p>
          <textarea
            className="w-full h-48 text-xs font-mono border border-slate-300 p-3 focus:outline-none focus:ring-1 focus:ring-black resize-y"
            placeholder="Paste tournament list here…"
            value={pasteText}
            onChange={e => { setPasteText(e.target.value); setPreview(null) }}
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handlePreview}
              disabled={!pasteText.trim()}
              className="px-3 py-1.5 text-xs font-medium border border-black hover:bg-slate-100 disabled:opacity-40 transition-colors"
            >
              Preview ({parseEventList(pasteText, gender).length} events detected)
            </button>
            {preview && (
              <button
                onClick={handleImport}
                disabled={importing || preview.length === 0}
                className="px-3 py-1.5 text-xs font-medium bg-black text-white hover:bg-slate-800 disabled:opacity-40 transition-colors"
              >
                {importing ? 'Importing…' : `Confirm import (${preview.length})`}
              </button>
            )}
            {importMsg && <span className="text-xs text-green-700">{importMsg}</span>}
          </div>

          {/* Preview table */}
          {preview && preview.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-slate-200">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="text-left px-2 py-1 font-medium text-slate-600">Date</th>
                    <th className="text-left px-2 py-1 font-medium text-slate-600">Name</th>
                    <th className="text-left px-2 py-1 font-medium text-slate-600">Type</th>
                    <th className="text-left px-2 py-1 font-medium text-slate-600">State</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((e, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-2 py-1 tabular-nums text-slate-500">
                        {fmtDate(e.date_start)}{e.date_end && e.date_end !== e.date_start ? `–${fmtDate(e.date_end)}` : ''}
                      </td>
                      <td className="px-2 py-1 text-slate-800">{e.name}</td>
                      <td className="px-2 py-1"><TypeBadge type={e.event_type} /></td>
                      <td className="px-2 py-1 text-slate-500">{e.state}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Main table */}
      {loading ? (
        <p className="text-sm text-slate-400 py-8 text-center">Loading…</p>
      ) : events.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-slate-300">
          <p className="text-sm text-slate-500 mb-2">No events in registry yet.</p>
          <button onClick={() => setShowImport(true)} className="text-xs text-blue-600 hover:underline">
            Bulk import from your tournament list →
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border border-slate-200">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-slate-600 w-20">Date</th>
                <th className="text-left px-3 py-2 font-medium text-slate-600">Name</th>
                <th className="text-left px-3 py-2 font-medium text-slate-600 w-24">Type</th>
                <th className="text-left px-3 py-2 font-medium text-slate-600 w-16">State</th>
                <th className="text-left px-3 py-2 font-medium text-slate-600 w-20">Points</th>
                <th className="text-left px-3 py-2 font-medium text-slate-600 w-24">Status</th>
                <th className="w-16"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.id} className="group border-t border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-2 tabular-nums text-slate-500">
                    {fmtDate(e.date_start)}
                    {e.date_end && e.date_end !== e.date_start ? `–${fmtDate(e.date_end)}` : ''}
                  </td>
                  <td className="px-3 py-2 text-slate-800 font-medium">{e.name}</td>
                  <td className="px-3 py-2"><TypeBadge type={e.event_type} /></td>
                  <td className="px-3 py-2 text-slate-500">{e.state}</td>
                  <td className="px-3 py-2">
                    {editingId === e.id ? (
                      <input
                        type="number" min={1} max={20}
                        value={editPv}
                        onChange={ev => setEditPv(ev.target.value)}
                        className="w-14 border border-slate-300 px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-black text-xs"
                        placeholder="1–20"
                      />
                    ) : (
                      <span className={e.point_value != null ? 'text-slate-800 font-medium' : 'text-slate-300'}>
                        {e.point_value != null ? e.point_value : '—'}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {editingId === e.id ? (
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editImported}
                          onChange={ev => setEditImported(ev.target.checked)}
                          className="accent-green-600"
                        />
                        <span className="text-slate-600">Imported</span>
                      </label>
                    ) : (
                      <ImportBadge imported={e.imported} />
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {editingId === e.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => saveEdit(e.id)} className="text-green-700 hover:underline">Save</button>
                        <span className="text-slate-300">|</span>
                        <button onClick={() => setEditingId(null)} className="text-slate-400 hover:underline">✕</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                        <button onClick={() => startEdit(e)} className="text-slate-400 hover:text-slate-700">Edit</button>
                        <span className="text-slate-200">|</span>
                        <button onClick={() => handleDelete(e.id)} className="text-slate-400 hover:text-red-600">✕</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary counts */}
      {events.length > 0 && (
        <div className="flex gap-6 text-xs text-slate-400 pt-1">
          <span>{events.filter(e => e.event_type === 'tournament').length} tournaments</span>
          <span>{events.filter(e => e.event_type === 'jamboree').length} jamborees</span>
          <span>{events.filter(e => e.imported).length} imported</span>
          <span>{events.filter(e => !e.imported).length} pending</span>
        </div>
      )}
    </div>
  )
}

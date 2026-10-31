'use client'

import { useAdminGender } from '@/components/admin/AdminGenderContext'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSeasons } from '@/components/SeasonsProvider'

type Tournament = {
  id: number
  name: string
  season: string
  date: string | null
  gender: string
  notes: string | null
  placement_count: number
}

const GENDER_LABELS: Record<string, string> = { M: 'Boys', F: 'Girls', MF: 'Combined' }
const OLDEST_SEASON_START = 2022

function TournamentForm({
  initial,
  onSave,
  onCancel,
  saving,
  error,
}: {
  initial: Partial<Tournament>
  onSave: (fields: Omit<Tournament, 'id' | 'placement_count'>) => void
  onCancel: () => void
  saving: boolean
  error: string | null
}) {
  const SEASONS = useSeasons().labelsBackTo(OLDEST_SEASON_START)
  const [name,   setName]   = useState(initial.name   ?? '')
  const [season, setSeason] = useState(initial.season ?? SEASONS[0])
  const [date,   setDate]   = useState(initial.date   ?? '')
  const [gender, setGender] = useState(initial.gender ?? 'M')
  const [notes,  setNotes]  = useState(initial.notes  ?? '')

  return (
    <div className="border border-slate-300 bg-slate-50 p-4 space-y-3 text-sm">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="col-span-2">
          <label className="block text-xs text-slate-500 mb-0.5">Name *</label>
          <input
            type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="Tournament name"
            className="w-full border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-black"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-0.5">Season *</label>
          <select value={season} onChange={e => setSeason(e.target.value)}
            className="w-full border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-black"
          >
            {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-0.5">Gender *</label>
          <select value={gender} onChange={e => setGender(e.target.value)}
            className="w-full border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-black"
          >
            <option value="M">Boys</option>
            <option value="F">Girls</option>
            <option value="MF">Combined</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-0.5">Date</label>
          <input
            type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-black"
          />
        </div>
        <div className="col-span-3">
          <label className="block text-xs text-slate-500 mb-0.5">Notes</label>
          <input
            type="text" value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Optional notes"
            className="w-full border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-black"
          />
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onSave({ name: name.trim(), season, date: date || null, gender, notes: notes.trim() || null })}
          disabled={saving || !name.trim() || !season}
          className="px-3 py-1.5 bg-black text-white text-sm disabled:opacity-40 hover:bg-slate-800 transition-colors"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button onClick={onCancel} className="px-3 py-1.5 text-sm border border-slate-300 hover:border-black transition-colors">
          Cancel
        </button>
      </div>
    </div>
  )
}

export function OffseasonTournamentsClient() {
  // This side's events plus combined (MF) events
  const { gender: sideGender } = useAdminGender()
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/nonnjsiaa/offseason')
      .then(r => r.json())
      .then(d => { setTournaments(d.tournaments ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function handleCreate(fields: Omit<Tournament, 'id' | 'placement_count'>) {
    setSaving(true); setFormError(null)
    const res = await fetch('/api/admin/nonnjsiaa/offseason', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
    const data = await res.json()
    if (data.error) { setFormError(data.error); setSaving(false); return }
    setTournaments(prev => [data.tournament, ...prev])
    setShowCreate(false)
    setSaving(false)
  }

  async function handleEdit(id: number, fields: Omit<Tournament, 'id' | 'placement_count'>) {
    setSaving(true); setFormError(null)
    const res = await fetch(`/api/admin/nonnjsiaa/offseason/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
    const data = await res.json()
    if (data.error) { setFormError(data.error); setSaving(false); return }
    setTournaments(prev => prev.map(t => t.id === id ? { ...t, ...data.tournament } : t))
    setEditId(null)
    setSaving(false)
  }

  async function handleDelete(id: number) {
    setDeleteError(null)
    const res = await fetch(`/api/admin/nonnjsiaa/offseason/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.error) { setDeleteError(data.error); return }
    setTournaments(prev => prev.filter(t => t.id !== id))
  }

  const mine = tournaments.filter(t => t.gender === sideGender || t.gender === 'MF')
  const bySeason = new Map<string, Tournament[]>()
  for (const t of mine) {
    if (!bySeason.has(t.season)) bySeason.set(t.season, [])
    bySeason.get(t.season)!.push(t)
  }
  const sortedSeasons = [...bySeason.keys()].sort((a, b) => b.localeCompare(a))

  return (
    <div className="space-y-6">
      {/* Create */}
      {showCreate ? (
        <TournamentForm
          initial={{ gender: sideGender }}
          onSave={handleCreate}
          onCancel={() => { setShowCreate(false); setFormError(null) }}
          saving={saving}
          error={formError}
        />
      ) : (
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-black text-white text-sm hover:bg-slate-800 transition-colors"
        >
          + New tournament
        </button>
      )}

      {deleteError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2">{deleteError}</p>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : mine.length === 0 ? (
        <p className="text-sm text-slate-400">No HS off-season tournaments yet.</p>
      ) : (
        sortedSeasons.map(season => (
          <div key={season}>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">{season}</p>
            <div className="space-y-1">
              {bySeason.get(season)!.map(t => (
                <div key={t.id}>
                  {editId === t.id ? (
                    <TournamentForm
                      initial={t}
                      onSave={fields => handleEdit(t.id, fields)}
                      onCancel={() => { setEditId(null); setFormError(null) }}
                      saving={saving}
                      error={formError}
                    />
                  ) : (
                    <div className="flex items-center gap-3 px-3 py-2 border border-slate-200 bg-white text-sm">
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-slate-900">{t.name}</span>
                        <span className="ml-2 text-xs text-slate-400">{GENDER_LABELS[t.gender] ?? t.gender}</span>
                        {t.date && <span className="ml-2 text-xs text-slate-400">{t.date}</span>}
                        {t.placement_count > 0 && (
                          <span className="ml-2 text-xs text-slate-400">{t.placement_count} placement{t.placement_count !== 1 ? 's' : ''}</span>
                        )}
                        {t.notes && <span className="ml-2 text-xs text-slate-300 italic truncate max-w-xs hidden sm:inline">{t.notes}</span>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          href={`/admin/nonnjsiaa/offseason/import?tournament=${t.id}`}
                          className="text-xs px-2 py-1 border border-slate-300 hover:border-slate-600 transition-colors"
                        >
                          Import
                        </Link>
                        <button
                          onClick={() => { setEditId(t.id); setFormError(null) }}
                          className="text-xs px-2 py-1 border border-slate-300 hover:border-black transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          disabled={t.placement_count > 0}
                          className="text-xs px-2 py-1 border border-slate-300 hover:border-red-400 hover:text-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          title={t.placement_count > 0 ? 'Has placements — delete via import replace' : 'Delete tournament'}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

'use client'

import { useAdminGender } from '@/components/admin/AdminGenderContext'
import { useState, useEffect } from 'react'
import { useSeasons } from '@/components/SeasonsProvider'
import Link from 'next/link'

// ── Types ────────────────────────────────────────────────────────────────────

type Tier = {
  id: number
  name: string
  credit_1: number | null
  credit_2: number | null
  credit_3: number | null
  credit_4: number | null
  credit_5: number | null
  credit_6: number | null
  credit_7: number | null
  credit_8: number | null
}

type Tournament = {
  id: number
  name: string
  season: string
  date: string | null
  gender: 'M' | 'F' | 'MF'
  notes: string | null
  tier: Tier
  placement_count: number
}

type Placement = {
  id: number
  wrestler_name: string
  school_name: string | null
  weight_class: number
  place: number
  hs_wrestler: { id: string; first_name: string; last_name: string } | null
}

// ── Constants ────────────────────────────────────────────────────────────────

const OLDEST_SEASON_START = 2020

const GENDER_LABELS: Record<string, string> = { M: 'Boys', F: 'Girls', MF: 'Combined' }

const PLACE_LABELS: Record<number, string> = {
  1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th', 6: '6th', 7: '7th', 8: '8th',
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function ordinal(n: number) {
  return PLACE_LABELS[n] ?? `${n}th`
}

function tierCredit(tier: Tier, place: number): number | null {
  const key = `credit_${place}` as keyof Tier
  return tier[key] as number | null
}

// ── Form types ───────────────────────────────────────────────────────────────

type TournamentForm = {
  name: string
  tier_id: string
  season: string
  date: string
  gender: string
  notes: string
}

const EMPTY_FORM: TournamentForm = {
  name: '',
  tier_id: '',
  season: '',  // set to the newest season in the component
  date: '',
  gender: 'M',
  notes: '',
}

function tournamentToForm(t: Tournament): TournamentForm {
  return {
    name: t.name,
    tier_id: String(t.tier.id),
    season: t.season,
    date: t.date ?? '',
    gender: t.gender,
    notes: t.notes ?? '',
  }
}

function formToPayload(f: TournamentForm) {
  return {
    name: f.name.trim(),
    tier_id: Number(f.tier_id),
    season: f.season,
    date: f.date || null,
    gender: f.gender,
    notes: f.notes.trim() || null,
  }
}

// ── Sub-components ───────────────────────────────────────────────────────────

function TournamentForm({
  form,
  tiers,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
  saving,
  error,
}: {
  form: TournamentForm
  tiers: Tier[]
  onChange: (f: TournamentForm) => void
  onSubmit: () => void
  onCancel: () => void
  submitLabel: string
  saving: boolean
  error: string | null
}) {
  const SEASONS = useSeasons().labelsBackTo(OLDEST_SEASON_START)
  const selectedTier = tiers.find(t => String(t.id) === form.tier_id)

  return (
    <div className="border border-black bg-white p-5 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Tournament name *</label>
          <input
            type="text"
            value={form.name}
            onChange={e => onChange({ ...form, name: e.target.value })}
            placeholder="e.g. NJSIAA MS State Championship"
            className="w-full border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-black"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Tier *</label>
          {tiers.length === 0 ? (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2">
              No tiers yet — <Link href="/admin/ms/tiers" className="underline">create a tier first</Link>.
            </p>
          ) : (
            <select
              value={form.tier_id}
              onChange={e => onChange({ ...form, tier_id: e.target.value })}
              className="w-full border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-black"
            >
              <option value="">— select tier —</option>
              {tiers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
          {selectedTier && (
            <p className="text-xs text-slate-400 mt-1">
              1st = {selectedTier.credit_1 ?? '—'} pts · 2nd = {selectedTier.credit_2 ?? '—'} · 3rd = {selectedTier.credit_3 ?? '—'}
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Season *</label>
          <select
            value={form.season}
            onChange={e => onChange({ ...form, season: e.target.value })}
            className="w-full border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-black"
          >
            {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Date</label>
          <input
            type="date"
            value={form.date}
            onChange={e => onChange({ ...form, date: e.target.value })}
            className="w-full border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-black"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Gender *</label>
          <select
            value={form.gender}
            onChange={e => onChange({ ...form, gender: e.target.value })}
            className="w-full border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-black"
          >
            <option value="M">Boys</option>
            <option value="F">Girls</option>
            <option value="MF">Combined</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Notes</label>
          <input
            type="text"
            value={form.notes}
            onChange={e => onChange({ ...form, notes: e.target.value })}
            placeholder="Optional notes"
            className="w-full border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-black"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          onClick={onSubmit}
          disabled={saving || !form.name.trim() || !form.tier_id || !form.season}
          className="px-4 py-2 bg-black text-white text-sm font-medium disabled:opacity-40 hover:bg-slate-800 transition-colors"
        >
          {saving ? 'Saving…' : submitLabel}
        </button>
        <button onClick={onCancel} className="px-3 py-2 text-sm border border-slate-300 hover:border-black transition-colors">
          Cancel
        </button>
      </div>
    </div>
  )
}

function PlacementTable({ tournamentId }: { tournamentId: number }) {
  const [placements, setPlacements] = useState<Placement[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/admin/ms/tournaments/${tournamentId}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setPlacements(d.placements ?? [])
      })
      .catch(() => setError('Failed to load placements'))
  }, [tournamentId])

  if (error) return <p className="text-sm text-red-600 px-4 pb-4">{error}</p>
  if (placements === null) return <p className="text-xs text-slate-400 px-4 pb-4">Loading…</p>
  if (placements.length === 0) {
    return (
      <p className="text-xs text-slate-400 px-4 pb-4">
        No placements yet — use <Link href="/admin/ms/import" className="underline">Import Results</Link> to add them.
      </p>
    )
  }

  // Group by weight class
  const byWeight = new Map<number, Placement[]>()
  for (const p of placements) {
    if (!byWeight.has(p.weight_class)) byWeight.set(p.weight_class, [])
    byWeight.get(p.weight_class)!.push(p)
  }

  return (
    <div className="px-4 pb-4 overflow-x-auto">
      <table className="w-full text-sm border border-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="text-left px-3 py-1 text-xs font-medium text-slate-500 border-b border-slate-200">Weight</th>
            <th className="text-left px-3 py-1 text-xs font-medium text-slate-500 border-b border-slate-200">Place</th>
            <th className="text-left px-3 py-1 text-xs font-medium text-slate-500 border-b border-slate-200">Wrestler</th>
            <th className="text-left px-3 py-1 text-xs font-medium text-slate-500 border-b border-slate-200">School / Club</th>
            <th className="text-left px-3 py-1 text-xs font-medium text-slate-500 border-b border-slate-200">HS Profile</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {placements.map(p => (
            <tr key={p.id} className={p.hs_wrestler ? 'bg-green-50/40' : ''}>
              <td className="px-3 py-1 font-mono text-slate-700">{p.weight_class}</td>
              <td className="px-3 py-1 font-semibold text-slate-800">{ordinal(p.place)}</td>
              <td className="px-3 py-1 text-slate-900">{p.wrestler_name}</td>
              <td className="px-3 py-1 text-slate-500">{p.school_name ?? '—'}</td>
              <td className="px-3 py-1">
                {p.hs_wrestler
                  ? <span className="text-xs text-green-700 bg-green-100 px-1.5 py-0.5 rounded">
                      {p.hs_wrestler.first_name} {p.hs_wrestler.last_name}
                    </span>
                  : <span className="text-xs text-slate-400">not linked</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function MsTournamentsClient() {
  // This side's events plus combined (MF) events; new events default to this side
  const { gender: sideGender } = useAdminGender()
  const SEASONS = useSeasons().labelsBackTo(OLDEST_SEASON_START)
  const emptyForm: TournamentForm = { ...EMPTY_FORM, season: SEASONS[0], gender: sideGender }
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [tiers, setTiers] = useState<Tier[]>([])
  const [loading, setLoading] = useState(true)

  const [filterSeason, setFilterSeason] = useState<string>('all')
  const [filterGender, setFilterGender] = useState<string>('all')

  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState<TournamentForm>(emptyForm)
  const [addSaving, setAddSaving] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const [editId, setEditId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<TournamentForm>(emptyForm)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/ms/tournaments').then(r => r.json()),
      fetch('/api/admin/ms/tiers').then(r => r.json()),
    ]).then(([td, tierd]) => {
      setTournaments(td.tournaments ?? [])
      setTiers(tierd.tiers ?? [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  async function handleAdd() {
    setAddSaving(true); setAddError(null)
    const res = await fetch('/api/admin/ms/tournaments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formToPayload(addForm)),
    })
    const data = await res.json()
    setAddSaving(false)
    if (data.error) { setAddError(data.error); return }
    setTournaments(prev => [data.tournament, ...prev])
    setAddForm(emptyForm)
    setShowAdd(false)
  }

  async function handleEdit() {
    if (editId == null) return
    setEditSaving(true); setEditError(null)
    const res = await fetch(`/api/admin/ms/tournaments/${editId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formToPayload(editForm)),
    })
    const data = await res.json()
    setEditSaving(false)
    if (data.error) { setEditError(data.error); return }
    setTournaments(prev => prev.map(t =>
      t.id === editId ? { ...data.tournament, placement_count: t.placement_count } : t,
    ))
    setEditId(null)
  }

  async function handleDelete(id: number) {
    setDeleteError(null)
    const res = await fetch(`/api/admin/ms/tournaments/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.error) { setDeleteError(data.error); return }
    setTournaments(prev => prev.filter(t => t.id !== id))
    if (expandedId === id) setExpandedId(null)
  }

  const filtered = tournaments.filter(t => {
    if (filterSeason !== 'all' && t.season !== filterSeason) return false
    if (t.gender !== sideGender && t.gender !== 'MF') return false
    if (filterGender !== 'all' && t.gender !== filterGender) return false
    return true
  })

  // Group by season
  const grouped = new Map<string, Tournament[]>()
  for (const t of filtered) {
    if (!grouped.has(t.season)) grouped.set(t.season, [])
    grouped.get(t.season)!.push(t)
  }
  const seasons = [...grouped.keys()].sort((a, b) => b.localeCompare(a))

  if (loading) return <p className="text-sm text-slate-400">Loading…</p>

  return (
    <div className="space-y-6">

      {/* Filters + Add button */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={filterSeason}
          onChange={e => setFilterSeason(e.target.value)}
          className="text-sm border border-slate-300 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-black"
        >
          <option value="all">All seasons</option>
          {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          value={filterGender}
          onChange={e => setFilterGender(e.target.value)}
          className="text-sm border border-slate-300 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-black"
        >
          <option value="all">{sideGender === 'F' ? 'Girls' : 'Boys'} + combined</option>
          <option value={sideGender}>{sideGender === 'F' ? 'Girls' : 'Boys'} only</option>
          <option value="MF">Combined only</option>
        </select>

        <button
          onClick={() => { setShowAdd(true); setAddForm(emptyForm); setAddError(null) }}
          disabled={showAdd}
          className="ml-auto px-4 py-1.5 bg-black text-white text-sm font-medium disabled:opacity-40 hover:bg-slate-800 transition-colors"
        >
          + Add tournament
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <TournamentForm
          form={addForm}
          tiers={tiers}
          onChange={setAddForm}
          onSubmit={handleAdd}
          onCancel={() => { setShowAdd(false); setAddError(null) }}
          submitLabel="Create tournament"
          saving={addSaving}
          error={addError}
        />
      )}

      {deleteError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2">{deleteError}</p>
      )}

      {/* Empty state */}
      {filtered.length === 0 && !showAdd && (
        <p className="text-sm text-slate-400 py-4">
          {tournaments.length === 0
            ? 'No tournaments yet — create one above.'
            : 'No tournaments match the current filters.'}
        </p>
      )}

      {/* Grouped list */}
      {seasons.map(season => (
        <div key={season} className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 border-b border-slate-200 pb-1">
            {season} · {grouped.get(season)!.length} tournament{grouped.get(season)!.length !== 1 ? 's' : ''}
          </h2>

          {grouped.get(season)!.map(t => (
            <div key={t.id}>
              {editId === t.id ? (
                <TournamentForm
                  form={editForm}
                  tiers={tiers}
                  onChange={setEditForm}
                  onSubmit={handleEdit}
                  onCancel={() => { setEditId(null); setEditError(null) }}
                  submitLabel="Save changes"
                  saving={editSaving}
                  error={editError}
                />
              ) : (
                <div className="border border-slate-200 bg-white">
                  {/* Header row */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <button
                      onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                      className="flex-1 flex items-start gap-3 text-left hover:bg-slate-50 -mx-4 px-4 py-0 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-900">{t.name}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                            t.gender === 'M' ? 'bg-blue-50 text-blue-700' :
                            t.gender === 'F' ? 'bg-pink-50 text-pink-700' :
                            'bg-purple-50 text-purple-700'
                          }`}>
                            {GENDER_LABELS[t.gender]}
                          </span>
                          <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                            {t.tier.name}
                          </span>
                          {t.date && (
                            <span className="text-xs text-slate-400">{t.date}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-0.5 text-xs text-slate-500">
                          <span>{t.placement_count} placement{t.placement_count !== 1 ? 's' : ''}</span>
                          {t.placement_count > 0 && (
                            <span className="text-slate-400">
                              1st = {tierCredit(t.tier, 1) ?? '—'} pts · 2nd = {tierCredit(t.tier, 2) ?? '—'} · 3rd = {tierCredit(t.tier, 3) ?? '—'}
                            </span>
                          )}
                          {t.notes && <span className="text-slate-400 italic">{t.notes}</span>}
                        </div>
                      </div>
                      <span className="text-xs text-slate-400 shrink-0 mt-1">{expandedId === t.id ? '▲' : '▼'}</span>
                    </button>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => { setEditId(t.id); setEditForm(tournamentToForm(t)); setEditError(null) }}
                        className="text-xs px-3 py-1.5 border border-slate-300 hover:border-black transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        disabled={t.placement_count > 0}
                        title={t.placement_count > 0 ? 'Delete placements first' : 'Delete tournament'}
                        className="text-xs px-3 py-1.5 border border-slate-300 hover:border-red-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Expandable placements */}
                  {expandedId === t.id && (
                    <div className="border-t border-slate-200">
                      <div className="flex items-center justify-between px-4 py-2 bg-slate-50">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Placements</p>
                        <Link
                          href={`/admin/ms/import?tournament_id=${t.id}`}
                          className="text-xs text-slate-500 hover:text-black underline transition-colors"
                        >
                          + Import results
                        </Link>
                      </div>
                      <PlacementTable tournamentId={t.id} />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'

type Club = {
  id: number
  name: string
  abbreviation: string | null
  location: string | null
  notes: string | null
  ms_placement_count: number
  hs_placement_count: number
}

type FormState = {
  name: string
  abbreviation: string
  location: string
  notes: string
}

const EMPTY_FORM: FormState = { name: '', abbreviation: '', location: '', notes: '' }

function clubToForm(c: Club): FormState {
  return {
    name:         c.name,
    abbreviation: c.abbreviation ?? '',
    location:     c.location ?? '',
    notes:        c.notes ?? '',
  }
}

function ClubForm({
  initial,
  onSave,
  onCancel,
  saving,
  error,
}: {
  initial: FormState
  onSave: (f: FormState) => void
  onCancel: () => void
  saving: boolean
  error: string | null
}) {
  const [form, setForm] = useState(initial)
  const set = (k: keyof FormState, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  return (
    <div className="space-y-3 p-4 border border-slate-200 bg-slate-50">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Club name *</label>
          <input
            type="text"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="Jersey Intensity"
            className="w-full border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-black"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Abbreviation</label>
          <input
            type="text"
            value={form.abbreviation}
            onChange={e => set('abbreviation', e.target.value)}
            placeholder="JI"
            className="w-full border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-black"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Location</label>
          <input
            type="text"
            value={form.location}
            onChange={e => set('location', e.target.value)}
            placeholder="Woodbridge, NJ"
            className="w-full border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-black"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Notes</label>
          <input
            type="text"
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            className="w-full border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-black"
          />
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={() => onSave(form)}
          disabled={saving || !form.name.trim()}
          className="px-4 py-1.5 bg-black text-white text-sm disabled:opacity-40 hover:bg-slate-800 transition-colors"
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

export function ClubsClient() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<Record<number, string>>({})

  useEffect(() => {
    fetch('/api/admin/nonnjsiaa/clubs')
      .then(r => r.json())
      .then(d => { setClubs(d.clubs ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function handleCreate(form: FormState) {
    setSaving(true); setFormError(null)
    const res = await fetch('/api/admin/nonnjsiaa/clubs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (data.error) { setFormError(data.error); setSaving(false); return }
    setClubs(prev => [...prev, { ...data.club, ms_placement_count: 0, hs_placement_count: 0 }].sort((a, b) => a.name.localeCompare(b.name)))
    setShowAdd(false)
    setSaving(false)
  }

  async function handleEdit(id: number, form: FormState) {
    setSaving(true); setFormError(null)
    const res = await fetch(`/api/admin/nonnjsiaa/clubs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (data.error) { setFormError(data.error); setSaving(false); return }
    setClubs(prev => prev.map(c => c.id === id ? { ...c, ...data.club } : c).sort((a, b) => a.name.localeCompare(b.name)))
    setEditId(null)
    setSaving(false)
  }

  async function handleDelete(id: number) {
    setDeleteError(prev => { const n = { ...prev }; delete n[id]; return n })
    const res = await fetch(`/api/admin/nonnjsiaa/clubs/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.error) { setDeleteError(prev => ({ ...prev, [id]: data.error })); return }
    setClubs(prev => prev.filter(c => c.id !== id))
  }

  const totalPlacements = (c: Club) => c.ms_placement_count + c.hs_placement_count

  return (
    <div className="space-y-4">
      {/* Add button */}
      {!showAdd && (
        <button
          onClick={() => { setShowAdd(true); setFormError(null) }}
          className="px-4 py-2 bg-black text-white text-sm hover:bg-slate-800 transition-colors"
        >
          + Add club
        </button>
      )}

      {showAdd && (
        <ClubForm
          initial={EMPTY_FORM}
          onSave={handleCreate}
          onCancel={() => { setShowAdd(false); setFormError(null) }}
          saving={saving}
          error={formError}
        />
      )}

      {/* Club list */}
      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : clubs.length === 0 && !showAdd ? (
        <p className="text-sm text-slate-400">No clubs yet. Add the first one above.</p>
      ) : (
        <div className="border border-slate-200 divide-y divide-slate-100">
          {clubs.map(club => (
            <div key={club.id}>
              {editId === club.id ? (
                <div className="p-2">
                  <ClubForm
                    initial={clubToForm(club)}
                    onSave={form => handleEdit(club.id, form)}
                    onCancel={() => { setEditId(null); setFormError(null) }}
                    saving={saving}
                    error={formError}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3 px-3 py-2.5 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-slate-900">{club.name}</span>
                      {club.abbreviation && (
                        <span className="text-xs text-slate-400 font-mono">{club.abbreviation}</span>
                      )}
                      {club.location && (
                        <span className="text-xs text-slate-400">{club.location}</span>
                      )}
                    </div>
                    {club.notes && (
                      <p className="text-xs text-slate-400 mt-0.5">{club.notes}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      {club.ms_placement_count > 0 && (
                        <span>{club.ms_placement_count} MS placement{club.ms_placement_count !== 1 ? 's' : ''}</span>
                      )}
                      {club.hs_placement_count > 0 && (
                        <span>{club.hs_placement_count} HS off-season placement{club.hs_placement_count !== 1 ? 's' : ''}</span>
                      )}
                      {totalPlacements(club) === 0 && (
                        <span className="text-slate-300">No results yet</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => { setEditId(club.id); setFormError(null) }}
                      className="text-xs text-slate-400 hover:text-black transition-colors px-2 py-1 border border-slate-200 hover:border-slate-400"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(club.id)}
                      disabled={totalPlacements(club) > 0}
                      title={totalPlacements(club) > 0 ? 'Cannot delete — club has linked results' : 'Delete club'}
                      className="text-xs text-slate-400 hover:text-red-600 transition-colors px-2 py-1 border border-slate-200 hover:border-red-300 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Delete
                    </button>
                  </div>
                  {deleteError[club.id] && (
                    <p className="w-full text-xs text-red-600 mt-1">{deleteError[club.id]}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

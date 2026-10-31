'use client'

import { useState, useEffect } from 'react'

type Tier = {
  id: number
  name: string
  description: string | null
  credit_1: number | null
  credit_2: number | null
  credit_3: number | null
  credit_4: number | null
  credit_5: number | null
  credit_6: number | null
  credit_7: number | null
  credit_8: number | null
  tournament_count: number
  created_at: string
}

const PLACES = [1, 2, 3, 4, 5, 6, 7, 8] as const
type Place = typeof PLACES[number]
type CreditKey = `credit_${Place}`

// Postseason scale reference (from hammer_score_config)
const REFERENCE = [
  { label: 'State champion',        value: 50 },
  { label: 'State 2nd',             value: 49 },
  { label: 'State 3rd/4th',         value: 48 },
  { label: 'State 5th/6th',         value: 47 },
  { label: 'State 7th/8th',         value: 46 },
  { label: 'State qual. (3+ wins)', value: 40 },
  { label: 'State qual. (2 wins)',  value: 38 },
  { label: 'State qual. (1 win)',   value: 36 },
  { label: 'State qual. (0 wins)', value: 32 },
  { label: 'District champion',    value: 20 },
  { label: 'District runner-up',   value: 16 },
  { label: 'District 3rd',         value: 10 },
  { label: 'District entry',       value:  4 },
]

const EMPTY_FORM = {
  name: '',
  description: '',
  credit_1: '', credit_2: '', credit_3: '', credit_4: '',
  credit_5: '', credit_6: '', credit_7: '', credit_8: '',
}

type FormState = typeof EMPTY_FORM

function tierToForm(t: Tier): FormState {
  return {
    name: t.name,
    description: t.description ?? '',
    credit_1: t.credit_1 != null ? String(t.credit_1) : '',
    credit_2: t.credit_2 != null ? String(t.credit_2) : '',
    credit_3: t.credit_3 != null ? String(t.credit_3) : '',
    credit_4: t.credit_4 != null ? String(t.credit_4) : '',
    credit_5: t.credit_5 != null ? String(t.credit_5) : '',
    credit_6: t.credit_6 != null ? String(t.credit_6) : '',
    credit_7: t.credit_7 != null ? String(t.credit_7) : '',
    credit_8: t.credit_8 != null ? String(t.credit_8) : '',
  }
}

function formToPayload(f: FormState) {
  const parseCredit = (v: string) => v.trim() === '' ? null : parseFloat(v)
  return {
    name: f.name.trim(),
    description: f.description.trim() || null,
    credit_1: parseCredit(f.credit_1),
    credit_2: parseCredit(f.credit_2),
    credit_3: parseCredit(f.credit_3),
    credit_4: parseCredit(f.credit_4),
    credit_5: parseCredit(f.credit_5),
    credit_6: parseCredit(f.credit_6),
    credit_7: parseCredit(f.credit_7),
    credit_8: parseCredit(f.credit_8),
  }
}

function CreditInput({ value, onChange, place }: { value: string; onChange: (v: string) => void; place: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[10px] text-slate-400 font-medium">{place === 1 ? '1st' : place === 2 ? '2nd' : place === 3 ? '3rd' : `${place}th`}</span>
      <input
        type="number"
        min="0"
        max="50"
        step="0.5"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="—"
        className="w-14 text-center text-sm border border-slate-300 px-1 py-1 focus:outline-none focus:ring-1 focus:ring-black"
      />
    </div>
  )
}

function TierForm({
  form,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
  saving,
  error,
}: {
  form: FormState
  onChange: (f: FormState) => void
  onSubmit: () => void
  onCancel: () => void
  submitLabel: string
  saving: boolean
  error: string | null
}) {
  return (
    <div className="border border-black bg-white p-5 space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Tier name *</label>
          <input
            type="text"
            value={form.name}
            onChange={e => onChange({ ...form, name: e.target.value })}
            placeholder="e.g. National, State, Regional"
            className="w-full border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-black"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Description</label>
          <input
            type="text"
            value={form.description}
            onChange={e => onChange({ ...form, description: e.target.value })}
            placeholder="e.g. NJSIAA MS State Championship"
            className="w-full border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-black"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
          Postseason credit by place
          <span className="ml-2 font-normal text-slate-400 normal-case tracking-normal">Leave blank for no credit at that place</span>
        </label>
        <div className="flex flex-wrap gap-3">
          {PLACES.map(p => (
            <CreditInput
              key={p}
              place={p}
              value={form[`credit_${p}` as CreditKey]}
              onChange={v => onChange({ ...form, [`credit_${p}`]: v })}
            />
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          onClick={onSubmit}
          disabled={saving || !form.name.trim()}
          className="px-4 py-2 bg-black text-white text-sm font-medium disabled:opacity-40 hover:bg-slate-800 transition-colors"
        >
          {saving ? 'Saving…' : submitLabel}
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-2 text-sm border border-slate-300 hover:border-black transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

function CreditBar({ tier }: { tier: Tier }) {
  const max = 50
  return (
    <div className="flex items-end gap-1 h-8">
      {PLACES.map(p => {
        const v = tier[`credit_${p}` as CreditKey]
        const pct = v != null ? Math.round((v / max) * 100) : 0
        return (
          <div key={p} className="flex flex-col items-center gap-0.5 group relative">
            <div
              className={`w-5 rounded-sm ${v != null ? 'bg-slate-700' : 'bg-slate-200'}`}
              style={{ height: v != null ? `${Math.max(4, pct * 0.28)}rem` : '0.25rem' }}
            />
            {v != null && (
              <div className="absolute bottom-full mb-1 hidden group-hover:block bg-slate-900 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                {p === 1 ? '1st' : p === 2 ? '2nd' : p === 3 ? '3rd' : `${p}th`}: {v}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function MsTiersClient() {
  const [tiers, setTiers] = useState<Tier[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState<FormState>(EMPTY_FORM)
  const [addSaving, setAddSaving] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [editId, setEditId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [showRef, setShowRef] = useState(false)

  useEffect(() => {
    fetch('/api/admin/ms/tiers')
      .then(r => r.json())
      .then(d => { setTiers(d.tiers ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function handleAdd() {
    setAddSaving(true); setAddError(null)
    const res = await fetch('/api/admin/ms/tiers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formToPayload(addForm)),
    })
    const data = await res.json()
    setAddSaving(false)
    if (data.error) { setAddError(data.error); return }
    setTiers(prev => [...prev, { ...data.tier, tournament_count: 0 }])
    setAddForm(EMPTY_FORM)
    setShowAdd(false)
  }

  async function handleEdit() {
    if (editId == null) return
    setEditSaving(true); setEditError(null)
    const res = await fetch(`/api/admin/ms/tiers/${editId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formToPayload(editForm)),
    })
    const data = await res.json()
    setEditSaving(false)
    if (data.error) { setEditError(data.error); return }
    setTiers(prev => prev.map(t => t.id === editId ? { ...data.tier, tournament_count: t.tournament_count } : t))
    setEditId(null)
  }

  async function handleDelete(id: number) {
    setDeleteError(null)
    const res = await fetch(`/api/admin/ms/tiers/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.error) { setDeleteError(data.error); return }
    setTiers(prev => prev.filter(t => t.id !== id))
  }

  if (loading) {
    return <p className="text-sm text-slate-400">Loading…</p>
  }

  return (
    <div className="space-y-6">

      {/* Reference legend */}
      <div className="border border-slate-200 bg-slate-50">
        <button
          onClick={() => setShowRef(v => !v)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-left"
        >
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Postseason scale reference</span>
          <span className="text-xs text-slate-400">{showRef ? '▲ hide' : '▼ show'}</span>
        </button>
        {showRef && (
          <div className="px-4 pb-4 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 border-t border-slate-200 pt-3">
            {REFERENCE.map(r => (
              <div key={r.label} className="flex items-center justify-between text-xs text-slate-600">
                <span>{r.label}</span>
                <span className="font-mono font-semibold text-slate-800 ml-3">{r.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tier list */}
      {tiers.length === 0 && !showAdd && (
        <p className="text-sm text-slate-400 py-4">No tiers yet — add one below to get started.</p>
      )}

      {tiers.map(tier => (
        <div key={tier.id}>
          {editId === tier.id ? (
            <TierForm
              form={editForm}
              onChange={setEditForm}
              onSubmit={handleEdit}
              onCancel={() => setEditId(null)}
              submitLabel="Save changes"
              saving={editSaving}
              error={editError}
            />
          ) : (
            <div className="border border-slate-200 bg-white">
              <div className="flex items-start justify-between px-5 py-4 gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="font-semibold text-slate-900">{tier.name}</h2>
                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                      {tier.tournament_count} tournament{tier.tournament_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {tier.description && (
                    <p className="text-sm text-slate-500 mt-0.5">{tier.description}</p>
                  )}
                  <div className="mt-3">
                    <CreditBar tier={tier} />
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
                      {PLACES.map(p => {
                        const v = tier[`credit_${p}` as CreditKey]
                        if (v == null) return null
                        return (
                          <span key={p} className="text-xs text-slate-500">
                            <span className="text-slate-400">{p === 1 ? '1st' : p === 2 ? '2nd' : p === 3 ? '3rd' : `${p}th`}</span>
                            {' '}<span className="font-semibold text-slate-800">{v}</span>
                          </span>
                        )
                      })}
                      {PLACES.every(p => tier[`credit_${p}` as CreditKey] == null) && (
                        <span className="text-xs text-slate-400 italic">No credits set</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => { setEditId(tier.id); setEditForm(tierToForm(tier)); setEditError(null) }}
                    className="text-xs px-3 py-1.5 border border-slate-300 hover:border-black transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(tier.id)}
                    disabled={tier.tournament_count > 0}
                    title={tier.tournament_count > 0 ? 'Reassign tournaments before deleting' : 'Delete tier'}
                    className="text-xs px-3 py-1.5 border border-slate-300 hover:border-red-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      {deleteError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2">{deleteError}</p>
      )}

      {/* Add new tier */}
      {showAdd ? (
        <TierForm
          form={addForm}
          onChange={setAddForm}
          onSubmit={handleAdd}
          onCancel={() => { setShowAdd(false); setAddForm(EMPTY_FORM); setAddError(null) }}
          submitLabel="Create tier"
          saving={addSaving}
          error={addError}
        />
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-black text-white text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          + Add tier
        </button>
      )}
    </div>
  )
}

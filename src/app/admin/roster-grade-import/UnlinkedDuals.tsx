'use client'

import { useState, useEffect, useCallback } from 'react'
import { SuggestionBox, type Suggestion } from './SuggestionBox'

type Side = { match_id: string; side: 'a' | 'b'; date: string | null; weight: number; opponent: string | null; result: string; won: boolean | null }
type Candidate = { id: string; first_name: string; last_name: string; grade: string | null; is_active: boolean; is_oos: boolean; schools: { id: number; name: string }[] }
type UnlinkedSuggestion = Suggestion & {
  action: 'link' | 'new' | 'skip'
  wrestler_id?: string
  grade?: string | null
  split_from?: string | null
}
type Item = {
  key: string
  school_id: number | null
  school_name: string
  name: string
  sides: Side[]
  candidates: Candidate[]
  suggestion: UnlinkedSuggestion | null
}

type Choice = { action: 'link' | 'new' | 'skip'; wrestler_id: string; grade: string; split_from: string }

const GRADES = ['Fr', 'So', 'Jr', 'Sr']

function initialChoice(item: Item): Choice {
  const s = item.suggestion
  if (s) return { action: s.action, wrestler_id: s.wrestler_id ?? '', grade: s.grade ?? '', split_from: s.split_from ?? '' }
  const here = item.candidates.find(c => c.schools.some(sc => sc.id === item.school_id))
  return here
    ? { action: 'link', wrestler_id: here.id, grade: '', split_from: '' }
    : { action: 'new', wrestler_id: '', grade: '', split_from: '' }
}

export function UnlinkedDuals({ onBack, onCount }: { onBack: () => void; onCount: (n: number) => void }) {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [choices, setChoices] = useState<Record<string, Choice>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [itemError, setItemError] = useState<Record<string, string>>({})
  const [minProb, setMinProb] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/unlinked-duals')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const list: Item[] = data.items ?? []
      setItems(list)
      setChoices(Object.fromEntries(list.map(i => [i.key, initialChoice(i)])))
      onCount(list.length)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [onCount])

  useEffect(() => { load() }, [load])

  async function resolve(item: Item) {
    const c = choices[item.key]
    setSaving(item.key)
    setItemError(p => { const n = { ...p }; delete n[item.key]; return n })
    try {
      const res = await fetch('/api/admin/unlinked-duals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: item.key, action: c.action,
          wrestler_id: c.action === 'link' ? c.wrestler_id : undefined,
          grade: c.action === 'new' ? (c.grade || null) : undefined,
          split_from: c.action === 'new' ? (c.split_from || null) : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const next = items.filter(i => i.key !== item.key)
      setItems(next)
      onCount(next.length)
    } catch (e: unknown) {
      setItemError(p => ({ ...p, [item.key]: e instanceof Error ? e.message : String(e) }))
    } finally {
      setSaving(null)
    }
  }

  const visible = items.filter(i => (i.suggestion?.probability ?? 0) >= minProb)

  return (
    <div>
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <button className="text-sm text-slate-500 hover:text-slate-900" onClick={onBack}>← Schools</button>
        <h2 className="text-lg font-semibold text-slate-900">Unlinked Dual Matches</h2>
        {!loading && <span className="text-sm text-slate-500">{items.length} wrestler{items.length !== 1 ? 's' : ''} · {items.reduce((n, i) => n + i.sides.length, 0)} match sides</span>}
        <label className="ml-auto text-xs text-slate-500 flex items-center gap-1">
          Show suggestions ≥
          <select value={minProb} onChange={e => setMinProb(Number(e.target.value))} className="border border-slate-300 rounded px-1 py-0.5">
            {[0, 0.5, 0.8, 0.9].map(p => <option key={p} value={p}>{p * 100}%</option>)}
          </select>
        </label>
      </div>
      <p className="text-sm text-slate-500 mb-6 max-w-2xl">
        Dual match sides imported with a wrestler&apos;s name but no wrestler, so they&apos;re missing from their school&apos;s
        roster and record. Link them to an existing wrestler or create the wrestler. Winners are set from the team points.
      </p>

      {loading && <p className="text-sm text-slate-500">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && !error && items.length === 0 && <p className="text-sm text-green-700">Nothing unlinked.</p>}

      <div className="space-y-3">
        {visible.map(item => {
          const c = choices[item.key]
          if (!c) return null
          const set = (patch: Partial<Choice>) => setChoices(p => ({ ...p, [item.key]: { ...p[item.key], ...patch } }))
          const sharedHere = item.candidates.filter(cd => cd.schools.some(s => s.id === item.school_id))
          const canResolve = c.action !== 'link' || !!c.wrestler_id

          return (
            <div key={item.key} className="border border-slate-200 rounded p-3 bg-white">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <span className="font-medium text-slate-800">{item.name}</span>
                <span className="text-xs text-slate-500">{item.school_name}</span>
                <span className="text-xs text-slate-400">{item.sides.length} match{item.sides.length !== 1 ? 'es' : ''} · wt {[...new Set(item.sides.map(s => s.weight))].join('/')}</span>
              </div>

              {item.suggestion && (
                <SuggestionBox
                  suggestion={item.suggestion}
                  onApply={() => setChoices(p => ({ ...p, [item.key]: initialChoice(item) }))}
                />
              )}

              <details className="mb-2">
                <summary className="text-xs text-slate-500 cursor-pointer">Matches</summary>
                <table className="w-full text-xs border-collapse mt-1">
                  <tbody>
                    {item.sides.map(s => (
                      <tr key={`${s.match_id}${s.side}`} className="border-b border-slate-50">
                        <td className="px-3 py-1 text-slate-500 tabular-nums">{s.date ?? '—'}</td>
                        <td className="px-3 py-1 tabular-nums">{s.weight}</td>
                        <td className="px-3 py-1">vs {s.opponent ?? '—'}</td>
                        <td className="px-3 py-1">{s.won === true ? 'W' : s.won === false ? 'L' : '?'} {s.result}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>

              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={c.action}
                  onChange={e => set({ action: e.target.value as Choice['action'] })}
                  className="text-xs border border-slate-300 rounded px-1.5 py-0.5"
                >
                  <option value="link">Link to existing wrestler</option>
                  <option value="new">Create wrestler at {item.school_name}</option>
                  <option value="skip">Leave unlinked</option>
                </select>

                {c.action === 'link' && (
                  <select
                    value={c.wrestler_id}
                    onChange={e => set({ wrestler_id: e.target.value })}
                    className="text-xs border border-slate-300 rounded px-1.5 py-0.5"
                  >
                    <option value="">Pick…</option>
                    {item.candidates.map(cd => (
                      <option key={cd.id} value={cd.id}>
                        {cd.first_name} {cd.last_name} · {cd.grade ?? '—'} · {cd.schools.map(s => s.name).join(', ') || 'no school'}{cd.is_oos ? ' · OOS' : ''}{!cd.is_active ? ' · inactive' : ''}
                      </option>
                    ))}
                  </select>
                )}

                {c.action === 'new' && (
                  <>
                    <select value={c.grade} onChange={e => set({ grade: e.target.value })} className="text-xs border border-slate-300 rounded px-1.5 py-0.5">
                      <option value="">Grade —</option>
                      {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                    {sharedHere.length > 0 && (
                      <select value={c.split_from} onChange={e => set({ split_from: e.target.value })} className="text-xs border border-slate-300 rounded px-1.5 py-0.5">
                        <option value="">Brand-new record</option>
                        {sharedHere.map(cd => (
                          <option key={cd.id} value={cd.id}>Split off {cd.first_name} {cd.last_name} ({cd.schools.map(s => s.name).join(', ')})</option>
                        ))}
                      </select>
                    )}
                  </>
                )}

                <button
                  disabled={!canResolve || saving === item.key}
                  onClick={() => resolve(item)}
                  className="ml-auto px-3 py-1 rounded bg-green-700 text-white text-xs font-medium disabled:opacity-40"
                >
                  {saving === item.key ? 'Saving…' : c.action === 'skip' ? 'Skip' : 'Resolve'}
                </button>
              </div>
              {itemError[item.key] && <p className="text-xs text-red-600 mt-1">{itemError[item.key]}</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

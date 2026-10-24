'use client'

import { useState, useEffect, useCallback } from 'react'
import { SuggestionBox, type Suggestion } from './SuggestionBox'

// ── Types ──────────────────────────────────────────────────────────────────────

type Row = {
  id: string
  first_name_raw: string
  last_name_raw: string
  weight_class: number | null
  grade: string
  school_id: number | null
  school_name: string
}

type Item = {
  wrestler: { id: string; first_name: string; last_name: string; grade: string | null; grade_confirmed_source: string | null }
  school_id: number | null
  school_name: string
  reason: 'two_schools' | 'two_rows' | 'grade_differs' | 'pending'
  rows: Row[]
  suggestion: (Suggestion & { grade: string | null; actions: Record<string, Action> }) | null
}

type Action = 'same' | 'new' | 'none'
type Decision = { grade: string; actions: Record<string, Action> }

const GRADES = ['Fr', 'So', 'Jr', 'Sr']

const REASON_LABEL: Record<Item['reason'], string> = {
  two_schools:   "On two schools' rosters",
  two_rows:      'Two import rows',
  grade_differs: 'Grade differs',
  pending:       'Not yet confirmed',
}

function gradeBadge(grade: string | null) {
  if (!grade) return <span className="text-xs text-slate-400">—</span>
  const cls = grade === 'Sr' ? 'bg-slate-200 text-slate-700' :
              grade === 'Jr' ? 'bg-blue-100 text-blue-700'   :
              grade === 'So' ? 'bg-green-100 text-green-700' :
                               'bg-amber-100 text-amber-700'
  return <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${cls}`}>{grade}</span>
}

// Default: every row is this wrestler; grade preselected only when the import
// agrees with itself and there's nothing to overrule
function initialDecision(item: Item): Decision {
  // Claude's pre-worked suggestion, when there is one
  if (item.suggestion) return { grade: item.suggestion.grade ?? '', actions: { ...item.suggestion.actions } }
  const actions: Record<string, Action> = {}
  for (const r of item.rows) actions[r.id] = 'same'
  const grades = new Set(item.rows.map(r => r.grade))
  const grade = item.reason === 'pending' && grades.size === 1 ? item.rows[0].grade : ''
  return { grade, actions }
}

// ── Component ──────────────────────────────────────────────────────────────────

export function UnresolvedGrades({ onBack, onCount }: { onBack: () => void; onCount: (n: number) => void }) {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [decisions, setDecisions] = useState<Record<string, Decision>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [rowError, setRowError] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/roster-grade-import/unresolved')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const list: Item[] = data.items ?? []
      setItems(list)
      setDecisions(Object.fromEntries(list.map(i => [i.wrestler.id, initialDecision(i)])))
      onCount(list.length)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [onCount])

  useEffect(() => { load() }, [load])

  async function resolve(item: Item) {
    const d = decisions[item.wrestler.id]
    const hasSame = Object.values(d.actions).includes('same')
    setSaving(item.wrestler.id)
    setRowError(p => { const n = { ...p }; delete n[item.wrestler.id]; return n })
    try {
      const res = await fetch('/api/admin/roster-grade-import/unresolved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wrestler_id: item.wrestler.id,
          grade: hasSame ? d.grade : null,
          rows: item.rows.map(r => ({ id: r.id, action: d.actions[r.id] })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const next = items.filter(i => i.wrestler.id !== item.wrestler.id)
      setItems(next)
      onCount(next.length)
    } catch (e: unknown) {
      setRowError(p => ({ ...p, [item.wrestler.id]: e instanceof Error ? e.message : String(e) }))
    } finally {
      setSaving(null)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <button className="text-sm text-slate-500 hover:text-slate-900" onClick={onBack}>← Schools</button>
        <h2 className="text-lg font-semibold text-slate-900">Grades Unresolved</h2>
        {!loading && <span className="text-sm text-slate-500">{items.length} wrestler{items.length !== 1 ? 's' : ''}</span>}
      </div>
      <p className="text-sm text-slate-500 mb-6 max-w-2xl">
        Import rows that need a decision. &ldquo;On two schools&apos; rosters&rdquo; is almost always two different
        wrestlers sharing a name and one record — mark the other school&apos;s row as a different wrestler to split them
        (their matches at that school move with them). Otherwise pick the grade, then Resolve.
      </p>

      {loading && <p className="text-sm text-slate-500">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p className="text-sm text-green-700">Nothing unresolved.</p>
      )}

      <div className="space-y-3">
        {items.map(item => {
          const w = item.wrestler
          const d = decisions[w.id]
          if (!d) return null
          const hasSame = Object.values(d.actions).includes('same')
          const canResolve = !hasSame || !!d.grade
          const importGrades = [...new Set(item.rows.filter(r => d.actions[r.id] === 'same').map(r => r.grade))]
          const setAction = (rowId: string, a: Action) =>
            setDecisions(p => ({ ...p, [w.id]: { ...p[w.id], actions: { ...p[w.id].actions, [rowId]: a } } }))
          const setGrade = (g: string) =>
            setDecisions(p => ({ ...p, [w.id]: { ...p[w.id], grade: g } }))

          return (
            <div key={w.id} className="border border-slate-200 rounded p-3 bg-white">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <span className="font-medium text-slate-800">{w.first_name} {w.last_name}</span>
                <span className="text-xs text-slate-500">{item.school_name}</span>
                <span className="text-xs text-slate-500">Current: {gradeBadge(w.grade)}{w.grade_confirmed_source ? <span className="text-slate-400"> ({w.grade_confirmed_source})</span> : null}</span>
                <span className="ml-auto text-xs px-1.5 py-0.5 rounded bg-amber-50 text-amber-800">{REASON_LABEL[item.reason]}</span>
              </div>

              {item.suggestion && (
                <SuggestionBox
                  suggestion={item.suggestion}
                  onApply={() => setDecisions(p => ({ ...p, [w.id]: initialDecision(item) }))}
                />
              )}

              <table className="w-full text-sm border-collapse mb-2">
                <thead>
                  <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                    <th className="px-3 py-1">Import name</th>
                    <th className="px-3 py-1">School</th>
                    <th className="px-3 py-1">Wt</th>
                    <th className="px-3 py-1">Import grade</th>
                    <th className="px-3 py-1">This row is…</th>
                  </tr>
                </thead>
                <tbody>
                  {item.rows.map(r => (
                    <tr key={r.id} className="border-b border-slate-50">
                      <td className="px-3 py-1 text-slate-700">{r.first_name_raw} {r.last_name_raw}</td>
                      <td className="px-3 py-1 text-slate-500 text-xs">{r.school_name}</td>
                      <td className="px-3 py-1 text-slate-500 tabular-nums">{r.weight_class ?? '—'}</td>
                      <td className="px-3 py-1">{gradeBadge(r.grade)}</td>
                      <td className="px-3 py-1">
                        <select
                          value={d.actions[r.id]}
                          onChange={e => setAction(r.id, e.target.value as Action)}
                          className="text-xs border border-slate-300 rounded px-1.5 py-0.5"
                        >
                          <option value="same">{w.first_name} {w.last_name} (this wrestler)</option>
                          <option value="new">A different wrestler at {r.school_name} — split off with their {r.school_name} matches ({r.grade})</option>
                          <option value="none">Not this wrestler — unlink</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex items-center gap-2 flex-wrap">
                {hasSame ? (
                  <>
                    <span className="text-xs text-slate-500">Grade for {w.first_name} {w.last_name}:</span>
                    {w.grade && (
                      <button
                        onClick={() => setGrade(w.grade!)}
                        className={`text-xs px-2 py-0.5 border ${d.grade === w.grade ? 'border-black bg-slate-100' : 'border-slate-300 hover:border-black'}`}
                      >
                        Keep current ({w.grade})
                      </button>
                    )}
                    {importGrades.filter(g => g !== w.grade).map(g => (
                      <button
                        key={g}
                        onClick={() => setGrade(g)}
                        className={`text-xs px-2 py-0.5 border ${d.grade === g ? 'border-black bg-slate-100' : 'border-slate-300 hover:border-black'}`}
                      >
                        Use import ({g})
                      </button>
                    ))}
                    <select
                      value={d.grade}
                      onChange={e => setGrade(e.target.value)}
                      className="text-xs border border-slate-300 rounded px-1.5 py-0.5"
                    >
                      <option value="">Other…</option>
                      {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </>
                ) : (
                  <span className="text-xs text-slate-500">{w.first_name} {w.last_name}&apos;s grade stays {w.grade ?? 'unset'}.</span>
                )}
                <button
                  disabled={!canResolve || saving === w.id}
                  onClick={() => resolve(item)}
                  className="ml-auto px-3 py-1 rounded bg-green-700 text-white text-xs font-medium disabled:opacity-40"
                >
                  {saving === w.id ? 'Saving…' : 'Resolve'}
                </button>
              </div>
              {rowError[w.id] && <p className="text-xs text-red-600 mt-1">{rowError[w.id]}</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

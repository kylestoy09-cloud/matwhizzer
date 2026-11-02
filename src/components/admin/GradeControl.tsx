'use client'

// A new wrestler's grade in an import review. The single exact stored Track roster match
// is filled in; close spellings are only offered; anything can be changed or cleared
// before the import is saved. choice undefined = the roster suggestion (or none).

import type { Grade, GradeChoice, GradeSuggestion } from '@/lib/rosterGradeSuggest'

const GRADES: Grade[] = ['Fr', 'So', 'Jr', 'Sr']

export function GradeControl({ suggestion, choice, onChange }: {
  suggestion: GradeSuggestion | undefined
  choice:     GradeChoice | undefined
  onChange:   (c: GradeChoice | null) => void
}) {
  const exact   = suggestion?.exact ?? null
  const options = suggestion?.options ?? []
  const current = choice !== undefined ? choice : exact ? { grade: exact.grade, rosterId: exact.rosterId } : null
  const fromRoster = current?.rosterId
    ? [exact, ...options].find(o => o?.rosterId === current.rosterId) ?? null
    : null
  return (
    <span className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
      {!current?.grade && options.length > 0 && (
        <span className="flex items-center gap-1">
          <span className="text-[10px] text-slate-400">Track:</span>
          {options.map(o => (
            <button key={o.rosterId} onClick={() => onChange({ grade: o.grade, rosterId: o.rosterId })}
              title={`Stored Track roster player at this school${o.weight ? ` (${o.weight} lb)` : ''}: use this grade`}
              className="text-[10px] px-1 py-0.5 border border-sky-300 bg-sky-50 text-sky-800 hover:bg-sky-100">
              {o.name} · {o.grade}
            </button>
          ))}
        </span>
      )}
      {fromRoster && <span className="text-[10px] text-sky-700" title={`From the Track roster: ${fromRoster.name}`}>Track roster</span>}
      <select
        value={current?.grade ?? ''}
        onChange={e => onChange(e.target.value
          ? { grade: e.target.value as Grade, rosterId: fromRoster && fromRoster.grade === e.target.value ? fromRoster.rosterId : null }
          : { grade: null, rosterId: null })}
        className={`text-[11px] border px-1 py-0.5 ${current?.grade ? 'border-sky-400 bg-white text-slate-800' : 'border-slate-300 text-slate-400'}`}
        title="Grade for this wrestler"
      >
        <option value="">Grade</option>
        {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
      </select>
      {choice !== undefined && (
        <button onClick={() => onChange(null)} title="Back to the Track roster suggestion" className="text-[10px] text-slate-400 hover:text-slate-700">↺</button>
      )}
    </span>
  )
}

'use client'

// Claude's pre-worked answer for a review item (src/data/reviewSuggestions.json):
// what to do, how likely it is right, and why.

export type Suggestion = { probability: number; summary: string; rationale: string }

export function SuggestionBox({ suggestion, onApply }: { suggestion: Suggestion; onApply: () => void }) {
  const p = Math.round(suggestion.probability * 100)
  const cls = p >= 90 ? 'border-green-200 bg-green-50 text-green-800'
    : p >= 70 ? 'border-amber-200 bg-amber-50 text-amber-800'
    : 'border-red-200 bg-red-50 text-red-800'
  return (
    <div className={`border rounded px-3 py-2 mb-2 text-xs ${cls}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-semibold tabular-nums">{p}%</span>
        <span className="font-medium">{suggestion.summary}</span>
        <button onClick={onApply} className="ml-auto underline">Apply suggestion</button>
      </div>
      <p className="mt-1 opacity-80">{suggestion.rationale}</p>
    </div>
  )
}

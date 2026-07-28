'use client'

import type { BoutForReview } from './types'
import { getRoundOptions } from '@/lib/parseRtf'

function ConfidenceBadge({ b }: { b: BoutForReview }) {
  if (b.inference_confidence === 'explicit') return null
  if (b.inference_confidence === 'inferred') {
    return (
      <span
        title={b.inference_note ?? undefined}
        className="inline-block text-[10px] px-1 py-0.5 rounded bg-slate-100 text-slate-500 cursor-help select-none"
      >
        ~
      </span>
    )
  }
  return (
    <span
      title={b.inference_note ?? undefined}
      className="inline-block text-[10px] px-1 py-0.5 rounded bg-amber-100 text-amber-700 cursor-help select-none"
    >
      ⚠
    </span>
  )
}

export function BoutRow({
  bout,
  round,
  isDuplicate,
  onRoundChange,
  onDuplicateToggle,
}: {
  bout: BoutForReview
  round: string
  isDuplicate: boolean
  onRoundChange: (round: string) => void
  onDuplicateToggle: () => void
}) {
  const options = getRoundOptions(bout.bracket_size)
  const weakRow = bout.inference_confidence === 'weak' && !isDuplicate

  const resultLabel = bout.is_bye
    ? 'Bye'
    : bout.result_detail
    ? `${bout.result_type} ${bout.result_detail}`
    : bout.result_type

  return (
    <tr className={`text-xs border-b border-slate-100 ${isDuplicate ? 'opacity-40' : ''} ${weakRow ? 'bg-amber-50' : ''}`}>
      {/* Section school */}
      <td className="px-2 py-1.5 text-slate-400 whitespace-nowrap max-w-[90px] truncate" title={bout.section_school}>
        {bout.section_school}
      </td>

      {/* Match */}
      <td className="px-2 py-1.5 text-slate-700">
        <span className="font-medium">{bout.wrestler1_name}</span>
        <span className="text-slate-400 mx-1">({bout.wrestler1_school})</span>
        {!bout.is_bye && (
          <>
            <span className="text-slate-400">over </span>
            <span className="font-medium">{bout.wrestler2_name}</span>
            <span className="text-slate-400 mx-1">({bout.wrestler2_school})</span>
          </>
        )}
        <span className="text-slate-400">· {resultLabel}</span>
      </td>

      {/* Round assignment */}
      <td className="px-2 py-1.5 whitespace-nowrap">
        <div className="flex items-center gap-1">
          <ConfidenceBadge b={bout} />
          {bout.is_bye ? (
            <span className="text-slate-400 italic">{round}</span>
          ) : (
            <select
              value={round}
              onChange={e => onRoundChange(e.target.value)}
              disabled={isDuplicate}
              className="text-xs border border-slate-300 px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-black disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {options.map(o => <option key={o} value={o}>{o}</option>)}
              {!options.includes(round) && <option value={round}>{round}</option>}
            </select>
          )}
        </div>
      </td>

      {/* Duplicate toggle */}
      <td className="px-2 py-1.5 whitespace-nowrap">
        <button
          onClick={onDuplicateToggle}
          className={`text-[10px] px-1.5 py-0.5 border rounded transition-colors ${
            isDuplicate
              ? 'border-slate-400 bg-slate-100 text-slate-600'
              : 'border-slate-200 text-slate-400 hover:border-slate-400 hover:text-slate-600'
          }`}
        >
          {isDuplicate ? 'duplicate' : 'mark dup'}
        </button>
      </td>
    </tr>
  )
}

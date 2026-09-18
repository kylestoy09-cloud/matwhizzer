'use client'

import { useState, useEffect } from 'react'
import type { AdminGender } from './AdminGenderContext'

type GenderState = {
  stage: string
  is_public_default: boolean
  finalized_at: string | null
} | null

type Season = {
  id: number
  year_label: string | null
  genderState: { M: GenderState; F: GenderState }
}

type Props = {
  value: number
  onChange: (seasonId: number) => void
  gender?: AdminGender
  className?: string
}

export function AdminSeasonToggle({ value, onChange, gender = 'M', className = '' }: Props) {
  const [seasons, setSeasons] = useState<Season[]>([])

  useEffect(() => {
    fetch('/api/admin/seasons')
      .then(r => r.json())
      .then(d => { if (d.seasons) setSeasons(d.seasons) })
      .catch(() => {/* non-fatal */})
  }, [])

  if (seasons.length === 0) return null

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label className="text-xs font-medium text-slate-500 whitespace-nowrap">Season</label>
      <select
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="text-sm border border-slate-200 rounded px-2 py-1 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {seasons.map(s => {
          const gs = s.genderState[gender]
          return (
            <option key={s.id} value={s.id}>
              {s.year_label ?? `Season ${s.id}`}
              {gs?.is_public_default ? ' (live)' : ''}
            </option>
          )
        })}
      </select>
    </div>
  )
}

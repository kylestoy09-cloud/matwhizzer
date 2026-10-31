'use client'

import { useState, useEffect } from 'react'
import { HammerScoresClient, type HammerRow } from './HammerScoresClient'
import { RATING_SHORT } from '@/lib/rating'

export function HammerScoresPageClient({ gender }: { gender: 'M' | 'F' }) {
  const [rows,         setRows]         = useState<HammerRow[]>([])
  const [calculatedAt, setCalculatedAt] = useState<string | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [fetchError,   setFetchError]   = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setFetchError(null)
    setRows([])
    setCalculatedAt(null)

    fetch(`/api/admin/hammer-scores?gender=${gender}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error)
        setRows(d.rows ?? [])
        setCalculatedAt(d.calculatedAt ?? null)
      })
      .catch(e => setFetchError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }, [gender])

  const prog = gender === 'F' ? 'Girls' : 'Boys'

  if (loading) {
    return <p className="text-sm text-slate-400 py-12 text-center">Loading {prog} {RATING_SHORT}…</p>
  }

  if (fetchError) {
    return (
      <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        <p className="font-semibold mb-1">Failed to load scores</p>
        <p className="font-mono text-xs">{fetchError}</p>
        <p className="mt-2 text-xs">
          If the rating tables are missing, run the rating schema migration (20260811).
        </p>
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-700">
        <p className="font-semibold mb-1">No {prog} scores yet</p>
        {gender === 'M' ? (
          <>
            <p>Click <strong>Recalculate Scores</strong> below to run the first calculation.</p>
            <div className="mt-4">
              <HammerScoresClient rows={[]} calculatedAt={null} gender={gender} />
            </div>
          </>
        ) : (
          <p>Girls {RATING_SHORT} calculation is not yet configured. Check back once the girls season data is in place.</p>
        )}
      </div>
    )
  }

  return <HammerScoresClient rows={rows} calculatedAt={calculatedAt} gender={gender} />
}

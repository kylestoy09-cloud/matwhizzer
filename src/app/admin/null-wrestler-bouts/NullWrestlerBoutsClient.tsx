'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAdminGender } from '@/components/admin/AdminGenderContext'

type Bout = {
  id: string
  in_season_tournament_id: string
  weight_class: number
  round: string | null
  result_type: string
  result_detail: string | null
  wrestler1_id: string | null
  wrestler1_name: string | null
  wrestler1_school_raw: string | null
  wrestler1_school_id: number | null
  wrestler2_id: string | null
  wrestler2_name: string | null
  wrestler2_school_raw: string | null
  wrestler2_school_id: number | null
}

type TourInfo = { name: string; start_date: string | null }

type WrestlerOption = { id: string; display_name: string }

function fmtDate(iso: string | null) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${parseInt(m)}/${parseInt(d)}/${y}`
}

function resultLabel(rt: string, rd: string | null) {
  return rd ? `${rt} (${rd})` : rt
}

function WrestlerSearchBox({
  boutId,
  slot,
  rawName,
  schoolId,
  gender,
  onResolved,
}: {
  boutId: string
  slot: 'wrestler1' | 'wrestler2'
  rawName: string | null
  schoolId: number | null
  gender: string
  onResolved: () => void
}) {
  const [query, setQuery] = useState(rawName ?? '')
  const [results, setResults] = useState<WrestlerOption[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<WrestlerOption | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    setSearching(true)
    try {
      const url = schoolId
        ? `/api/admin/search-wrestlers?school_id=${schoolId}&gender=${gender}`
        : `/api/admin/search-wrestlers?q=${encodeURIComponent(q)}&gender=${gender}`
      const res = await fetch(url)
      const data = await res.json()
      const list: WrestlerOption[] = data.wrestlers ?? []
      // filter locally when using school roster
      const filtered = schoolId
        ? list.filter(w => w.display_name.toLowerCase().includes(q.toLowerCase()))
        : list
      setResults(filtered.slice(0, 8))
    } finally {
      setSearching(false)
    }
  }, [schoolId, gender])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(query), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, search])

  async function handleSave() {
    if (!selected) return
    setSaving(true); setMsg(null)
    try {
      const res = await fetch('/api/admin/null-wrestler-bouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bout_id: boutId,
          slot,
          wrestler_id: selected.id,
          raw_name: rawName,
          school_id: schoolId,
          gender,
        }),
      })
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      setMsg(`✓ Linked`)
      onResolved()
    } catch (e) {
      setMsg(`Error: ${String(e)}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setSelected(null); setMsg(null) }}
          placeholder={rawName ?? 'Search wrestler…'}
          className="w-full border border-slate-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-black"
        />
        {searching && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">…</span>
        )}
      </div>

      {results.length > 0 && !selected && (
        <div className="border border-slate-200 bg-white shadow-sm max-h-40 overflow-y-auto">
          {results.map(w => (
            <button
              key={w.id}
              onClick={() => { setSelected(w); setResults([]) }}
              className="w-full text-left px-2 py-1 text-xs hover:bg-slate-50 transition-colors"
            >
              {w.display_name}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-800 bg-slate-100 px-2 py-0.5">{selected.display_name}</span>
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-xs px-2 py-0.5 bg-black text-white hover:bg-slate-800 disabled:opacity-40 transition-colors"
          >
            {saving ? 'Saving…' : 'Link'}
          </button>
          <button
            onClick={() => { setSelected(null); setQuery(rawName ?? '') }}
            className="text-xs text-slate-400 hover:text-slate-700"
          >
            ✕
          </button>
        </div>
      )}

      {msg && (
        <p className={`text-xs ${msg.startsWith('Error') ? 'text-red-600' : 'text-green-700'}`}>{msg}</p>
      )}
    </div>
  )
}

export function NullWrestlerBoutsClient() {
  const { gender } = useAdminGender()
  const [bouts, setBouts] = useState<Bout[]>([])
  const [tournaments, setTournaments] = useState<Record<string, TourInfo>>({})
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resolved, setResolved] = useState(new Set<string>()) // bout IDs with all nulls resolved
  const [slotResolved, setSlotResolved] = useState(new Set<string>()) // "boutId:slot" resolved pairs

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/admin/null-wrestler-bouts?gender=${gender}&limit=300`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setBouts(data.bouts ?? [])
      setTournaments(data.tournaments ?? {})
      setTotal(data.total ?? 0)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [gender])

  useEffect(() => { load() }, [load])

  function handleSlotResolved(boutId: string, slot: 'wrestler1' | 'wrestler2') {
    const key = `${boutId}:${slot}`
    setSlotResolved(prev => new Set([...prev, key]))

    // Check if all null slots for this bout are now resolved
    const bout = bouts.find(b => b.id === boutId)
    if (!bout) return
    const w1Key = `${boutId}:wrestler1`
    const w2Key = `${boutId}:wrestler2`
    const w1Done = bout.wrestler1_id != null || slotResolved.has(w1Key) || slot === 'wrestler1'
    const w2Done = bout.wrestler2_id != null || slotResolved.has(w2Key) || slot === 'wrestler2'
    if (w1Done && w2Done) {
      setResolved(prev => new Set([...prev, boutId]))
    }
  }

  // Group bouts by tournament
  const byTournament = new Map<string, Bout[]>()
  for (const bout of bouts) {
    if (resolved.has(bout.id)) continue
    const tid = bout.in_season_tournament_id ?? 'unknown'
    if (!byTournament.has(tid)) byTournament.set(tid, [])
    byTournament.get(tid)!.push(bout)
  }

  const visibleCount = [...byTournament.values()].reduce((sum, arr) => sum + arr.length, 0)

  if (loading) {
    return <div className="py-16 text-center text-sm text-slate-400">Loading…</div>
  }

  if (error) {
    return (
      <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
    )
  }

  if (bouts.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-2xl mb-2">✓</p>
        <p className="text-sm text-slate-600 font-medium">All clear — no unlinked wrestlers found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center gap-4 text-sm">
        <span className="font-semibold text-slate-900">{total} bouts with unlinked wrestlers</span>
        {resolved.size > 0 && (
          <span className="text-green-700">{resolved.size} resolved this session</span>
        )}
        <button
          onClick={load}
          className="text-xs text-slate-400 hover:text-slate-700 underline underline-offset-2"
        >
          Refresh
        </button>
      </div>

      {/* Tournament groups */}
      {[...byTournament.entries()].map(([tid, tbouts]) => {
        const tour = tournaments[tid]
        return (
          <div key={tid} className="border border-slate-200 overflow-hidden">
            {/* Tournament header */}
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center gap-3">
              <span className="font-semibold text-sm text-slate-800">{tour?.name ?? 'Unknown Tournament'}</span>
              {tour?.start_date && (
                <span className="text-xs text-slate-400">{fmtDate(tour.start_date)}</span>
              )}
              <span className="text-xs text-slate-400 ml-auto">{tbouts.length} bouts</span>
            </div>

            {/* Bouts */}
            <div className="divide-y divide-slate-100">
              {tbouts.map(bout => {
                const w1Null = bout.wrestler1_id === null && !slotResolved.has(`${bout.id}:wrestler1`)
                const w2Null = bout.wrestler2_id === null && !slotResolved.has(`${bout.id}:wrestler2`)
                return (
                  <div key={bout.id} className="px-4 py-3 grid grid-cols-[6rem_1fr_1fr] gap-4 items-start text-sm">
                    {/* Weight + result */}
                    <div>
                      <p className="font-semibold text-slate-800">{bout.weight_class} lb</p>
                      <p className="text-xs text-slate-400">{resultLabel(bout.result_type, bout.result_detail)}</p>
                      {bout.round && <p className="text-xs text-slate-400">{bout.round}</p>}
                    </div>

                    {/* Winner (wrestler1) */}
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Winner</p>
                      <p className="font-medium text-slate-800">{bout.wrestler1_name ?? '—'}</p>
                      <p className="text-xs text-slate-400">{bout.wrestler1_school_raw ?? '—'}</p>
                      {w1Null ? (
                        <WrestlerSearchBox
                          boutId={bout.id}
                          slot="wrestler1"
                          rawName={bout.wrestler1_name}
                          schoolId={bout.wrestler1_school_id}
                          gender={gender}
                          onResolved={() => handleSlotResolved(bout.id, 'wrestler1')}
                        />
                      ) : (
                        <span className="text-xs text-green-700">✓ Linked</span>
                      )}
                    </div>

                    {/* Loser (wrestler2) */}
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Loser</p>
                      <p className="font-medium text-slate-800">{bout.wrestler2_name ?? '—'}</p>
                      <p className="text-xs text-slate-400">{bout.wrestler2_school_raw ?? '—'}</p>
                      {w2Null ? (
                        <WrestlerSearchBox
                          boutId={bout.id}
                          slot="wrestler2"
                          rawName={bout.wrestler2_name}
                          schoolId={bout.wrestler2_school_id}
                          gender={gender}
                          onResolved={() => handleSlotResolved(bout.id, 'wrestler2')}
                        />
                      ) : (
                        <span className="text-xs text-green-700">✓ Linked</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {visibleCount === 0 && resolved.size > 0 && (
        <div className="py-8 text-center">
          <p className="text-sm text-slate-500">All visible bouts resolved — click Refresh to reload remaining.</p>
          <button onClick={load} className="mt-2 text-xs text-black underline underline-offset-2">Refresh</button>
        </div>
      )}
    </div>
  )
}

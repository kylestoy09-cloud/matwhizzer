'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

const SEED_ORDER_12 = [1, 9, 8, 5, 12, 4, 3, 11, 6, 7, 10, 2]

const REGIONS = [
  { label: 'Girls Region 1', tid: 181 },
  { label: 'Girls Region 2', tid: 182 },
  { label: 'Girls Region 3', tid: 183 },
  { label: 'Girls Region 4', tid: 184 },
]

const WEIGHTS = [100, 107, 114, 120, 126, 132, 138, 145, 152, 165, 185, 235]

type Entry = {
  id: string
  wrestler_name: string
  school: string
  seed: number | null
  weight: number
}

type Slot = {
  position: number
  seed: number
  entry_id: string | null
  name: string
}

export default function RegionSeedsPage() {
  const [selectedTid, setSelectedTid] = useState(181)
  const [selectedWeight, setSelectedWeight] = useState(100)
  const [slots, setSlots] = useState<Slot[]>([])
  const [entries, setEntries] = useState<Entry[]>([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const loadData = useCallback(async () => {
    setMessage('')

    // Get all entries for this tournament + weight
    const { data } = await supabase.rpc('admin_region_seed_entries', {
      p_tournament_id: selectedTid,
      p_weight: selectedWeight,
    })

    const allEntries = (data ?? []) as Entry[]
    setEntries(allEntries)

    // Build slots from entries that have seeds
    const seeded = allEntries
      .filter(e => e.seed !== null)
      .sort((a, b) => {
        const aIdx = SEED_ORDER_12.indexOf(a.seed!)
        const bIdx = SEED_ORDER_12.indexOf(b.seed!)
        return aIdx - bIdx
      })

    const newSlots: Slot[] = SEED_ORDER_12.map((seed, i) => {
      const entry = seeded.find(e => e.seed === seed)
      return {
        position: i + 1,
        seed,
        entry_id: entry?.id ?? null,
        name: entry?.wrestler_name ?? '(empty)',
      }
    })

    setSlots(newSlots)
  }, [selectedTid, selectedWeight])

  useEffect(() => {
    loadData()
  }, [loadData])

  const unassigned = entries.filter(
    e => !slots.some(s => s.entry_id === e.id)
  )

  function handleSlotChange(position: number, entryId: string) {
    setSlots(prev =>
      prev.map(s => {
        if (s.position === position) {
          if (entryId === '__empty__') {
            return { ...s, entry_id: null, name: '(empty)' }
          }
          if (entryId === '__forfeit__') {
            return { ...s, entry_id: null, name: 'Forfeit' }
          }
          const entry = entries.find(e => e.id === entryId)
          return {
            ...s,
            entry_id: entryId,
            name: entry?.wrestler_name ?? '?',
          }
        }
        return s
      })
    )
  }

  function handleRemove(position: number) {
    setSlots(prev =>
      prev.map(s =>
        s.position === position
          ? { ...s, entry_id: null, name: '(empty)' }
          : s
      )
    )
  }

  async function handleSave() {
    setSaving(true)
    setMessage('')

    // Clear all seeds for this tournament + weight first
    for (const entry of entries) {
      if (entry.seed !== null) {
        await supabase
          .from('tournament_entries')
          .update({ seed: null })
          .eq('id', entry.id)
      }
    }

    // Write new seeds
    let written = 0
    for (const slot of slots) {
      if (slot.entry_id) {
        await supabase
          .from('tournament_entries')
          .update({ seed: slot.seed })
          .eq('id', slot.entry_id)
        written++
      }
    }

    setMessage(`Saved ${written} seeds`)
    setSaving(false)
    await loadData()
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-xl font-bold text-slate-900 mb-6">
        Region Bracket Seeding
      </h1>

      {/* Selectors */}
      <div className="flex gap-4 mb-6">
        <select
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
          value={selectedTid}
          onChange={e => setSelectedTid(Number(e.target.value))}
        >
          {REGIONS.map(r => (
            <option key={r.tid} value={r.tid}>{r.label}</option>
          ))}
        </select>
        <select
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
          value={selectedWeight}
          onChange={e => setSelectedWeight(Number(e.target.value))}
        >
          {WEIGHTS.map(w => (
            <option key={w} value={w}>{w} lb</option>
          ))}
        </select>
      </div>

      {/* Slot list */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
              <th className="px-3 py-2 text-left w-12">#</th>
              <th className="px-3 py-2 text-left w-14">Seed</th>
              <th className="px-3 py-2 text-left">Wrestler</th>
              <th className="px-3 py-2 w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {slots.map(slot => (
              <tr key={slot.position} className={slot.name === '(empty)' ? 'bg-amber-50' : ''}>
                <td className="px-3 py-2 text-slate-400">{slot.position}</td>
                <td className="px-3 py-2 font-semibold text-slate-700">{slot.seed}</td>
                <td className="px-3 py-2">
                  {slot.entry_id || slot.name === 'Forfeit' ? (
                    <span className={`font-medium ${slot.name === 'Forfeit' ? 'text-slate-400 italic' : 'text-slate-800'}`}>
                      {slot.name}
                    </span>
                  ) : (
                    <select
                      className="border border-slate-300 rounded px-2 py-1 text-sm w-full"
                      value=""
                      onChange={e => handleSlotChange(slot.position, e.target.value)}
                    >
                      <option value="">— select —</option>
                      <option value="__forfeit__">Forfeit</option>
                      {unassigned.map(e => (
                        <option key={e.id} value={e.id}>
                          {e.wrestler_name} ({e.school})
                        </option>
                      ))}
                      {entries
                        .filter(e => !unassigned.some(u => u.id === e.id) && !slots.some(s => s.entry_id === e.id))
                        .map(e => (
                          <option key={e.id} value={e.id}>
                            {e.wrestler_name} ({e.school})
                          </option>
                        ))}
                    </select>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {(slot.entry_id || slot.name === 'Forfeit') && (
                    <button
                      className="text-xs text-red-500 hover:text-red-700"
                      onClick={() => handleRemove(slot.position)}
                    >
                      remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Unassigned entries */}
      {unassigned.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">
            Unassigned Entries ({unassigned.length})
          </h3>
          <div className="text-sm text-slate-600 space-y-1">
            {unassigned.map(e => (
              <div key={e.id}>{e.wrestler_name} — {e.school}</div>
            ))}
          </div>
        </div>
      )}

      {/* Save */}
      <div className="flex items-center gap-4">
        <button
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Seeds'}
        </button>
        {message && (
          <span className="text-sm text-emerald-600 font-medium">{message}</span>
        )}
      </div>
    </div>
  )
}

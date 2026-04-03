'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
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

// Brackets with known issues — bracket-only or DB-only wrestlers
const FLAGGED_BRACKETS: { tid: number; weight: number; issue: string }[] = [
  // Bracket only (pulled out, seeding may have shifted)
  { tid: 181, weight: 100, issue: 'Faith Mellito on bracket, not in DB' },
  { tid: 181, weight: 120, issue: 'Daraly Estevez on bracket, not in DB' },
  { tid: 181, weight: 132, issue: 'Scarlett Miele on bracket, not in DB — Valeria Veliz in DB, not on bracket' },
  { tid: 181, weight: 145, issue: 'Izvella Avila on bracket, not in DB' },
  { tid: 181, weight: 165, issue: 'Julia Cirillo on bracket, not in DB' },
  { tid: 181, weight: 235, issue: 'Stefany Dovale on bracket, not in DB' },
  { tid: 182, weight: 152, issue: 'Madison Favereaux on bracket, not in DB — Gania Moran in DB, not on bracket' },
  { tid: 182, weight: 185, issue: 'Issy Beam on bracket, not in DB — Azalea Tejada in DB, not on bracket' },
  { tid: 183, weight: 107, issue: 'Haylen Vega & Sephora Jean on bracket, not in DB' },
  { tid: 183, weight: 120, issue: 'Genesis Erroa on bracket, not in DB — Ariana Dugo in DB, not on bracket' },
  { tid: 183, weight: 138, issue: 'Kelin DeJesus on bracket, not in DB' },
  { tid: 183, weight: 152, issue: 'Isabella Kay on bracket, not in DB' },
  { tid: 184, weight: 100, issue: 'Lily Cohen on bracket, not in DB' },
  { tid: 184, weight: 107, issue: 'Malayah Calm & Josalyn Hurlburt on bracket, not in DB' },
  { tid: 184, weight: 114, issue: 'Brianna Roeder on bracket, not in DB — Gianna Petracci in DB, not on bracket' },
  { tid: 184, weight: 126, issue: 'Iyanna McCombs on bracket, not in DB' },
  { tid: 184, weight: 138, issue: 'Haley Batista on bracket, not in DB — McKenna Thomas in DB, not on bracket' },
  { tid: 184, weight: 145, issue: "Key'ari Jones on bracket, not in DB" },
  { tid: 184, weight: 152, issue: 'Lailah Bolton & Zahily Avery on bracket, not in DB — Mackenzi Cerchiaro in DB, not on bracket' },
  { tid: 184, weight: 185, issue: 'Haliey Reyes & Samaiya Figueroa on bracket, not in DB — Audra Marcinkiewicz & Destiny Cabarcas Rincon in DB, not on bracket' },
  { tid: 184, weight: 235, issue: "Aniyah Parker-Taylor on bracket, not in DB" },
]

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
  const [resolved, setResolved] = useState<Set<string>>(new Set())

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
    setResolved(prev => new Set([...prev, `${selectedTid}:${selectedWeight}`]))
    await loadData()
  }

  const remainingFlags = FLAGGED_BRACKETS.filter(f => !resolved.has(`${f.tid}:${f.weight}`))
  const currentFlag = remainingFlags.find(f => f.tid === selectedTid && f.weight === selectedWeight)

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-4">
        <span>←</span> Back to Admin
      </Link>
      <h1 className="text-xl font-bold text-slate-900 mb-6">
        Region Bracket Seeding
      </h1>

      {/* Selectors */}
      <div className="flex gap-4 mb-4">
        <select
          className="border border-slate-300 rounded-none px-3 py-2 text-sm"
          value={selectedTid}
          onChange={e => setSelectedTid(Number(e.target.value))}
        >
          {REGIONS.map(r => (
            <option key={r.tid} value={r.tid}>{r.label}</option>
          ))}
        </select>
        <select
          className="border border-slate-300 rounded-none px-3 py-2 text-sm"
          value={selectedWeight}
          onChange={e => setSelectedWeight(Number(e.target.value))}
        >
          {WEIGHTS.map(w => (
            <option key={w} value={w}>{w} lb</option>
          ))}
        </select>
      </div>

      {/* Flagged brackets quick-jump */}
      <div className="mb-6">
        <label className="text-xs text-slate-500 font-medium block mb-1">Jump to flagged bracket:</label>
        <select
          className="border border-red-300 bg-red-50 rounded-none px-3 py-2 text-sm w-full"
          value=""
          onChange={e => {
            const [tid, weight] = e.target.value.split(':').map(Number)
            if (tid && weight) { setSelectedTid(tid); setSelectedWeight(weight) }
          }}
        >
          <option value="">— {remainingFlags.length} brackets with issues —</option>
          {remainingFlags.map(f => {
            const region = REGIONS.find(r => r.tid === f.tid)?.label ?? ''
            return (
              <option key={`${f.tid}:${f.weight}`} value={`${f.tid}:${f.weight}`}>
                {region} {f.weight}lb — {f.issue.slice(0, 60)}
              </option>
            )
          })}
        </select>
      </div>

      {/* Issue banner */}
      {currentFlag && (
        <div className="bg-red-50 border border-red-200 rounded-none px-4 py-3 mb-4 text-sm text-red-800">
          <span className="font-semibold">Issue:</span> {currentFlag.issue}
        </div>
      )}

      {/* Slot list */}
      <div className="bg-white rounded-none border border-black shadow-none overflow-hidden mb-6">
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
                  <select
                    className="border border-slate-300 rounded px-2 py-1 text-sm w-full"
                    value={slot.entry_id ?? (slot.name === 'Forfeit' ? '__forfeit__' : '')}
                    onChange={e => handleSlotChange(slot.position, e.target.value)}
                  >
                    <option value="">— empty —</option>
                    <option value="__forfeit__">Forfeit</option>
                    {entries.map(e => (
                      <option key={e.id} value={e.id}>
                        {e.wrestler_name} ({e.school})
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2 text-right">
                  {(slot.entry_id || slot.name === 'Forfeit') && (
                    <button
                      className="text-xs text-red-500 hover:text-red-700"
                      onClick={() => handleRemove(slot.position)}
                    >
                      clear
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
          className="px-4 py-2 bg-emerald-600 text-white rounded-none font-medium hover:bg-emerald-700 disabled:opacity-50"
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

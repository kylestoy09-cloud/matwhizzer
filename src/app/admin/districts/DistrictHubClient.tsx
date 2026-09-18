'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAdminGender } from '@/components/admin/AdminGenderContext'

type HubItem = {
  num: number
  tournament_id: number | null
  name: string
  logo_url: string | null
  display_name: string | null
  entry_count: number
  placement_count: number
}

type ParsedPlacement = {
  weight: number
  place: number
  wrestler_name: string
  school_name: string | null
}

function parsePlacementText(text: string): ParsedPlacement[] {
  const rows: ParsedPlacement[] = []
  let wt = 0
  for (const raw of text.trim().split('\n')) {
    const line = raw.trim()
    if (!line) continue
    const wtMatch = line.match(/^(\d{2,3})(?:\s*(?:lbs?|pounds?))?\.?$/)
    if (wtMatch) { wt = parseInt(wtMatch[1]); continue }
    const placeMatch = line.match(/^(\d+)(?:st|nd|rd|th)?[.\s]+(.+?)(?:[,(]\s*(.+?)[\s,)]*)?$/)
    if (placeMatch && wt > 0) {
      const place = parseInt(placeMatch[1])
      const name  = placeMatch[2]?.trim() ?? ''
      const school = placeMatch[3]?.trim() ?? ''
      if (name && place >= 1 && place <= 8) {
        rows.push({ weight: wt, place, wrestler_name: name, school_name: school || null })
      }
    }
  }
  return rows
}

function RowExpander({ item, onSaved, onClose }: {
  item: HubItem
  onSaved: () => void
  onClose: () => void
}) {
  const [pasteText, setPasteText] = useState('')
  const [parsed,    setParsed]    = useState<ParsedPlacement[] | null>(null)
  const [saving,    setSaving]    = useState(false)
  const [msg,       setMsg]       = useState<string | null>(null)

  async function handleSave() {
    if (!parsed?.length || !item.tournament_id) return
    setSaving(true); setMsg(null)
    try {
      const res = await fetch('/api/admin/postseason-tournament', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_placements',
          tournament_id: item.tournament_id,
          placements: parsed,
        }),
      })
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      setMsg(`✓ Saved ${d.count} placements`)
      setPasteText(''); setParsed(null)
      onSaved()
    } catch (e) {
      setMsg(`Error: ${String(e)}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <td colSpan={7} className="px-0 py-0 border-t-0">
      <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-700">Paste Placements — {item.name}</p>
          {item.tournament_id && (
            <Link
              href={`/admin/districts/${item.tournament_id}`}
              className="text-xs text-blue-600 hover:underline"
            >
              Open full profile →
            </Link>
          )}
        </div>

        {!item.tournament_id ? (
          <p className="text-xs text-amber-600">No tournament record found for this district. Contact admin to create one.</p>
        ) : (
          <>
            <p className="text-[10px] text-slate-400">Format: weight header, then place lines. e.g. <code>106 / 1st Name (School) / 2nd Name (School)</code></p>
            <textarea
              className="w-full h-32 text-xs font-mono border border-slate-300 p-2.5 focus:outline-none focus:ring-1 focus:ring-black resize-y bg-white"
              placeholder={`106\n1st Wrestler Name (School)\n2nd Wrestler Name (School)\n\n113\n1 Wrestler Name, School`}
              value={pasteText}
              onChange={e => { setPasteText(e.target.value); setParsed(null); setMsg(null) }}
            />
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setParsed(parsePlacementText(pasteText))}
                disabled={!pasteText.trim()}
                className="px-3 py-1.5 text-xs font-medium border border-slate-300 hover:bg-white disabled:opacity-40 transition-colors"
              >
                Preview ({parsePlacementText(pasteText).length} detected)
              </button>
              {parsed && parsed.length > 0 && (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-3 py-1.5 text-xs font-medium bg-black text-white hover:bg-slate-800 disabled:opacity-40 transition-colors"
                >
                  {saving ? 'Saving…' : `Save ${parsed.length} placements`}
                </button>
              )}
              {msg && (
                <span className={`text-xs ${msg.startsWith('Error') ? 'text-red-600' : 'text-green-700'}`}>{msg}</span>
              )}
            </div>

            {parsed && parsed.length > 0 && (
              <div className="overflow-x-auto max-h-40 overflow-y-auto border border-slate-200 bg-white">
                <table className="min-w-full text-[11px]">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="px-2 py-1 text-left text-slate-500 font-medium">Wt</th>
                      <th className="px-2 py-1 text-left text-slate-500 font-medium">Place</th>
                      <th className="px-2 py-1 text-left text-slate-500 font-medium">Wrestler</th>
                      <th className="px-2 py-1 text-left text-slate-500 font-medium">School</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsed.map((p, i) => (
                      <tr key={i}>
                        <td className="px-2 py-1 tabular-nums text-slate-500">{p.weight}</td>
                        <td className="px-2 py-1 tabular-nums text-slate-500">{p.place}</td>
                        <td className="px-2 py-1 font-medium text-slate-800">{p.wrestler_name}</td>
                        <td className="px-2 py-1 text-slate-500">{p.school_name || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        <div className="pt-1">
          <button onClick={onClose} className="text-xs text-slate-400 hover:text-slate-700 transition-colors">
            Collapse ↑
          </button>
        </div>
      </div>
    </td>
  )
}

export function DistrictHubClient({ season }: { season: number }) {
  const { gender } = useAdminGender()
  const gStr = gender === 'F' ? 'girls' : 'boys'

  const [items,    setItems]    = useState<HubItem[]>([])
  const [loading,  setLoading]  = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)

  const maxNum   = gender === 'M' ? 32 : 12
  const withData = items.filter(i => i.placement_count > 0).length
  const pending  = maxNum - withData

  function loadItems() {
    setLoading(true)
    setExpanded(null)
    fetch(`/api/admin/postseason-hub?type=district&gender=${gender}&season=${season}`)
      .then(r => r.json())
      .then(d => setItems(d.items ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadItems() }, [gender, season]) // eslint-disable-line react-hooks/exhaustive-deps

  function StatusBadge({ item }: { item: HubItem }) {
    const status = item.placement_count > 0 ? 'results'
      : item.entry_count > 0 ? 'entries'
      : 'pending'
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 ${
        status === 'results'  ? 'bg-green-100 text-green-700'
        : status === 'entries' ? 'bg-blue-100 text-blue-700'
        : 'bg-amber-100 text-amber-700'
      }`}>
        {status === 'results' ? '✓ Results' : status === 'entries' ? 'Entries' : 'Pending'}
      </span>
    )
  }

  return (
    <div className="space-y-4 p-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900">{gender === 'M' ? 'Boys' : 'Girls'} Districts</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {maxNum} districts · {withData} with results · {pending} pending
          </p>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-sm text-slate-400 py-8 text-center">Loading…</p>
      ) : (
        <div className="overflow-x-auto border border-slate-200">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase whitespace-nowrap w-16">#</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Tournament</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Entries</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Placers</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="px-3 py-2 w-40"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const isExpanded = expanded === item.num
                return (
                  <>
                    <tr
                      key={item.num}
                      className={`group ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'} hover:bg-blue-50/30 transition-colors ${isExpanded ? 'bg-blue-50/40' : ''}`}
                    >
                      <td className="px-3 py-2 tabular-nums text-slate-500 font-semibold">{item.num}</td>
                      <td className="px-3 py-2 max-w-[240px] truncate">
                        {item.tournament_id ? (
                          <Link
                            href={`/admin/districts/${item.tournament_id}`}
                            className="font-medium text-slate-900 hover:text-blue-700 hover:underline transition-colors"
                          >
                            {item.name}
                          </Link>
                        ) : (
                          <span className="font-medium text-slate-500">{item.name}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-slate-600">{item.entry_count > 0 ? item.entry_count : <span className="text-slate-300">—</span>}</td>
                      <td className="px-3 py-2 tabular-nums text-slate-600">{item.placement_count > 0 ? item.placement_count : <span className="text-slate-300">—</span>}</td>
                      <td className="px-3 py-2"><StatusBadge item={item} /></td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setExpanded(isExpanded ? null : item.num)}
                            className="text-[10px] font-medium text-slate-400 hover:text-slate-800 transition-colors px-1.5 py-0.5 border border-slate-200 hover:border-slate-400"
                          >
                            {isExpanded ? '▾ Close' : '▸ Paste'}
                          </button>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {item.tournament_id && (
                              <Link
                                href={`/admin/districts/${item.tournament_id}`}
                                className="text-slate-500 hover:text-slate-900 text-[10px] font-medium whitespace-nowrap"
                              >
                                Profile
                              </Link>
                            )}
                            <Link
                              href={`/${gStr}/districts/${item.num}`}
                              target="_blank"
                              className="text-slate-500 hover:text-slate-900 text-[10px] font-medium whitespace-nowrap"
                            >
                              Public ↗
                            </Link>
                          </div>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${item.num}-expand`} className="border-b border-slate-200">
                        <RowExpander
                          item={item}
                          onSaved={() => loadItems()}
                          onClose={() => setExpanded(null)}
                        />
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      {items.length > 0 && (
        <div className="flex gap-6 text-xs text-slate-400 pt-1">
          <span>{maxNum} districts</span>
          <span>{withData} with results</span>
          <span>{pending} pending</span>
        </div>
      )}
    </div>
  )
}

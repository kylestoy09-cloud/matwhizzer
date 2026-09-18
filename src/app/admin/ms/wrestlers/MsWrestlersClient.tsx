'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

// ─�� Types ────────────────────────────────────────────────────────────────────

type PlacementRow = {
  id: number
  wrestler_name: string
  school_name: string | null
  weight_class: number
  place: number
  credit: number | null
  tournament_id: number | null
  tournament_name: string
  season: string
  date: string | null
  tier_name: string
}

type Profile = {
  ms_wrestler_id: number
  canonical_name: string
  hs_wrestler_id: string | null
  hs_wrestler_name: string | null
  raw_names: string[]
  placements: PlacementRow[]
  best_credit: number
  total_computed_credit: number
}

type HsWrestler = {
  id: string
  name: string
  gender: string
  school: string | null
}

// ── Constants ────────────────────────────────────────────────────────────────

const PLACE_LABELS: Record<number, string> = {
  1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th', 6: '6th', 7: '7th', 8: '8th',
}

const PS_REFERENCE = [
  { label: 'State champ', value: 50 },
  { label: 'State 2nd', value: 49 },
  { label: 'State 7th/8th', value: 46 },
  { label: 'State qual. 1 win', value: 36 },
  { label: 'State qual. 0 wins', value: 32 },
  { label: 'District champ', value: 20 },
  { label: 'District entry', value: 4 },
]

function creditLabel(v: number): string {
  const ref = PS_REFERENCE.find(r => r.value <= v)
  return ref ? `≈ ${ref.label}` : ''
}

// ── Link modal ────────────────────────────────────────────────────────────────

function LinkModal({
  profile,
  onClose,
  onLinked,
}: {
  profile: Profile
  onClose: () => void
  onLinked: (msWrestlerId: number, hsId: string, hsName: string) => void
}) {
  const [searchQ, setSearchQ] = useState(profile.canonical_name)
  const [results, setResults] = useState<HsWrestler[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<HsWrestler | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return }
    setSearching(true)
    try {
      const res = await fetch(`/api/admin/ms/wrestlers/search-hs?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(data.wrestlers ?? [])
    } catch { setResults([]) }
    setSearching(false)
  }, [])

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => doSearch(searchQ), 300)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [searchQ, doSearch])

  useEffect(() => { doSearch(profile.canonical_name) }, [profile.canonical_name, doSearch])

  async function handleConfirm() {
    if (!selected) { setError('Select a HS wrestler first.'); return }
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/admin/ms/wrestlers/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ms_wrestler_id: profile.ms_wrestler_id,
          hs_wrestler_id: selected.id,
        }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); setSaving(false); return }
      onLinked(profile.ms_wrestler_id, selected.id, selected.name)
      onClose()
    } catch {
      setError('Save failed — try again.')
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white border border-black w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">Link to HS wrestler</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-lg leading-none">✕</button>
        </div>

        <div className="p-5 space-y-5">
          {/* Profile summary */}
          <div className="bg-slate-50 border border-slate-200 p-3 text-sm space-y-1">
            <p className="font-semibold text-slate-800">{profile.canonical_name}</p>
            {profile.raw_names.filter(n => n !== profile.canonical_name).length > 0 && (
              <p className="text-xs text-slate-400">
                Also recorded as: {profile.raw_names.filter(n => n !== profile.canonical_name).join(', ')}
              </p>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
              {profile.placements.map(p => (
                <span key={p.id} className="text-xs text-slate-600">
                  {p.season} · {p.tournament_name} · {p.weight_class} lbs · <strong>{PLACE_LABELS[p.place]}</strong>
                  {p.credit != null && <span className="text-slate-400 ml-1">({p.credit} pts)</span>}
                </span>
              ))}
            </div>
            {profile.best_credit > 0 && (
              <div className="pt-1 border-t border-slate-200 mt-2 flex items-center gap-4 text-xs text-slate-500">
                <span>Best placement: <strong className="text-slate-800">{profile.best_credit} pts</strong> {creditLabel(profile.best_credit)}</span>
                <span>Total: <strong className="text-slate-800">{profile.total_computed_credit.toFixed(1)} pts</strong></span>
              </div>
            )}
          </div>

          {/* HS wrestler search */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Search HS wrestler</label>
            <input
              type="text"
              value={searchQ}
              onChange={e => { setSearchQ(e.target.value); setSelected(null) }}
              placeholder="First Last"
              className="w-full border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-black"
            />
            {searching && <p className="text-xs text-slate-400 mt-1">Searching…</p>}
            {!searching && results.length > 0 && !selected && (
              <div className="border border-slate-200 divide-y divide-slate-100 mt-1 max-h-48 overflow-y-auto">
                {results.map(w => (
                  <button
                    key={w.id}
                    onClick={() => { setSelected(w); setSearchQ(w.name) }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors"
                  >
                    <span className="font-medium text-slate-900">{w.name}</span>
                    {w.school && <span className="text-slate-400 text-xs ml-2">{w.school}</span>}
                    <span className={`text-xs ml-2 ${w.gender === 'F' ? 'text-pink-600' : 'text-blue-600'}`}>{w.gender}</span>
                  </button>
                ))}
              </div>
            )}
            {!searching && results.length === 0 && searchQ.length >= 2 && !selected && (
              <p className="text-xs text-slate-400 mt-1">No HS wrestlers found.</p>
            )}
            {selected && (
              <div className="mt-1 flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 text-sm">
                <span className="font-medium text-green-800">{selected.name}</span>
                {selected.school && <span className="text-green-600 text-xs">{selected.school}</span>}
                <button onClick={() => setSelected(null)} className="ml-auto text-xs text-slate-400 hover:text-slate-700">change</button>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-400">
            Linking connects this MS record to the HS wrestler profile for hammer score credit computation.
          </p>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleConfirm}
              disabled={saving || !selected}
              className="px-4 py-2 bg-black text-white text-sm font-medium disabled:opacity-40 hover:bg-slate-800 transition-colors"
            >
              {saving ? 'Saving…' : 'Confirm link'}
            </button>
            <button onClick={onClose} className="px-3 py-2 text-sm border border-slate-300 hover:border-black transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Profile card ──────────────────────────────────────────────────────────────

function ProfileCard({
  profile,
  onLink,
  onUnlink,
}: {
  profile: Profile
  onLink: (p: Profile) => void
  onUnlink: (p: Profile) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const isLinked = !!profile.hs_wrestler_id

  const bySeason = new Map<string, PlacementRow[]>()
  for (const p of profile.placements) {
    if (!bySeason.has(p.season)) bySeason.set(p.season, [])
    bySeason.get(p.season)!.push(p)
  }
  const seasons = [...bySeason.keys()].sort((a, b) => b.localeCompare(a))

  const aliasNames = profile.raw_names.filter(n => n !== profile.canonical_name)

  return (
    <div className={`border bg-white ${isLinked ? 'border-green-300' : 'border-slate-200'}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex-1 flex items-start gap-3 text-left"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-900">{profile.canonical_name}</span>
              {aliasNames.length > 0 && (
                <span className="text-xs text-slate-400 italic">
                  also: {aliasNames.slice(0, 2).join(', ')}{aliasNames.length > 2 ? ` +${aliasNames.length - 2}` : ''}
                </span>
              )}
              {isLinked && (
                <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">
                  → {profile.hs_wrestler_name}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-0.5 text-xs text-slate-500 flex-wrap">
              <span>{profile.placements.length} placement{profile.placements.length !== 1 ? 's' : ''}</span>
              <span>Best: <strong className="text-slate-700">{profile.best_credit > 0 ? `${profile.best_credit} pts` : '—'}</strong></span>
              {seasons.map(s => {
                const ps = bySeason.get(s)!
                const best = ps.reduce((a, b) => a.place < b.place ? a : b)
                return (
                  <span key={s} className="text-slate-400">
                    {s}: {best.weight_class} lbs · {PLACE_LABELS[best.place]} @ {best.tournament_name}
                  </span>
                )
              })}
            </div>
          </div>
          <span className="text-xs text-slate-400 shrink-0 mt-1">{expanded ? '▲' : '▼'}</span>
        </button>

        <div className="flex items-center gap-2 shrink-0">
          {isLinked ? (
            <button
              onClick={() => onUnlink(profile)}
              className="text-xs px-3 py-1.5 border border-slate-300 hover:border-red-400 hover:text-red-600 transition-colors"
            >
              Unlink
            </button>
          ) : (
            <button
              onClick={() => onLink(profile)}
              className="text-xs px-3 py-1.5 border border-slate-600 bg-slate-800 text-white hover:bg-black transition-colors"
            >
              Link to HS wrestler
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-200 px-4 py-3">
          {seasons.map(season => (
            <div key={season} className="mb-3 last:mb-0">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{season}</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-400">
                    <th className="text-left font-medium pb-1 pr-4">Tournament</th>
                    <th className="text-left font-medium pb-1 pr-4">Tier</th>
                    <th className="text-right font-medium pb-1 pr-4">Weight</th>
                    <th className="text-right font-medium pb-1 pr-4">Place</th>
                    <th className="text-right font-medium pb-1 pr-4">Credit</th>
                    <th className="text-left font-medium pb-1">School / Club</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bySeason.get(season)!.sort((a, b) => a.weight_class - b.weight_class).map(p => (
                    <tr key={p.id}>
                      <td className="py-1 pr-4 text-slate-800">{p.tournament_name}</td>
                      <td className="py-1 pr-4 text-xs text-slate-500">{p.tier_name}</td>
                      <td className="py-1 pr-4 text-right font-mono text-slate-700">{p.weight_class}</td>
                      <td className="py-1 pr-4 text-right font-semibold text-slate-800">{PLACE_LABELS[p.place]}</td>
                      <td className="py-1 pr-4 text-right">
                        {p.credit != null
                          ? <span className="font-semibold text-slate-800">{p.credit}</span>
                          : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="py-1 text-xs text-slate-500">{p.school_name ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          {profile.best_credit > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-6 text-xs text-slate-500">
              <span>Best single: <strong className="text-slate-800">{profile.best_credit} pts</strong> {creditLabel(profile.best_credit)}</span>
              <span>Sum total: <strong className="text-slate-800">{profile.total_computed_credit.toFixed(1)} pts</strong></span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function MsWrestlersClient() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQ, setSearchQ] = useState('')
  const [filterLinked, setFilterLinked] = useState<'all' | 'linked' | 'unlinked'>('all')
  const [linkTarget, setLinkTarget] = useState<Profile | null>(null)
  const [unlinkError, setUnlinkError] = useState<string | null>(null)

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchProfiles = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/ms/wrestlers${q ? `?q=${encodeURIComponent(q)}` : ''}`)
      const data = await res.json()
      setProfiles(data.profiles ?? [])
    } catch { /* non-fatal */ }
    setLoading(false)
  }, [])

  useEffect(() => { fetchProfiles('') }, [fetchProfiles])

  function handleSearchChange(q: string) {
    setSearchQ(q)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => fetchProfiles(q), 350)
  }

  function handleLinked(msWrestlerId: number, hsId: string, hsName: string) {
    setProfiles(prev => prev.map(p =>
      p.ms_wrestler_id === msWrestlerId
        ? { ...p, hs_wrestler_id: hsId, hs_wrestler_name: hsName }
        : p,
    ))
  }

  async function handleUnlink(profile: Profile) {
    setUnlinkError(null)
    const res = await fetch('/api/admin/ms/wrestlers/link', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ms_wrestler_id: profile.ms_wrestler_id }),
    })
    const data = await res.json()
    if (data.error) { setUnlinkError(data.error); return }
    setProfiles(prev => prev.map(p =>
      p.ms_wrestler_id === profile.ms_wrestler_id
        ? { ...p, hs_wrestler_id: null, hs_wrestler_name: null }
        : p,
    ))
  }

  const filtered = profiles.filter(p => {
    if (filterLinked === 'linked' && !p.hs_wrestler_id) return false
    if (filterLinked === 'unlinked' && p.hs_wrestler_id) return false
    return true
  })

  const linkedCount = profiles.filter(p => p.hs_wrestler_id).length
  const unlinkedCount = profiles.filter(p => !p.hs_wrestler_id).length

  return (
    <>
      {linkTarget && (
        <LinkModal
          profile={linkTarget}
          onClose={() => setLinkTarget(null)}
          onLinked={handleLinked}
        />
      )}

      <div className="space-y-5">
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="text"
            value={searchQ}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="Search by name…"
            className="border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-black w-52"
          />
          <div className="flex items-center border border-slate-300 overflow-hidden text-sm">
            {(['all', 'linked', 'unlinked'] as const).map(v => (
              <button
                key={v}
                onClick={() => setFilterLinked(v)}
                className={`px-3 py-1.5 transition-colors ${filterLinked === v ? 'bg-black text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                {v === 'all' ? `All (${profiles.length})` : v === 'linked' ? `Linked (${linkedCount})` : `Unlinked (${unlinkedCount})`}
              </button>
            ))}
          </div>
        </div>

        {unlinkError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2">{unlinkError}</p>
        )}

        {loading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-slate-400 py-4">
            {profiles.length === 0
              ? 'No MS wrestlers in the database yet — import some results first.'
              : 'No profiles match the current filter.'}
          </p>
        ) : (
          <div className="space-y-2">
            {filtered.map(p => (
              <ProfileCard
                key={p.ms_wrestler_id}
                profile={p}
                onLink={setLinkTarget}
                onUnlink={handleUnlink}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

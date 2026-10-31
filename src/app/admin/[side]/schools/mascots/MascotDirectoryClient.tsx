'use client'

import { useState, useMemo } from 'react'

type SchoolRow = {
  id: number
  display_name: string
  mascot: string | null
  logo_url: string | null
  logo_direction: 'left' | 'right' | null
  header_background: string | null
  color_primary: string | null
  color_secondary: string | null
  color_tertiary: string | null
  primary_color: string | null
  secondary_color: string | null
}

function flipStyle(direction: 'left' | 'right' | null | undefined, position: 'away' | 'home') {
  if (!direction) return {}
  const needsFlip = position === 'away' ? direction === 'left' : direction === 'right'
  return needsFlip ? { transform: 'scaleX(-1)' } : {}
}

function ColorSwatch({ hex, size = 'md' }: { hex: string | null; size?: 'sm' | 'md' }) {
  if (!hex) return <span className="text-slate-300 text-xs">—</span>
  const dim = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'
  return (
    <div className="flex items-center gap-1.5">
      <div className={`${dim} rounded border border-slate-200 shrink-0`} style={{ backgroundColor: hex }} />
      <span className="text-xs font-mono text-slate-600">{hex}</span>
    </div>
  )
}

// ─── Tab 1: Direction ─────────────────────────────────────────────────────────

function DirectionTab({ schools: initial }: { schools: SchoolRow[] }) {
  const [schools, setSchools] = useState<SchoolRow[]>(initial)
  const [query,   setQuery]   = useState('')
  const [filter,  setFilter]  = useState<'all' | 'left' | 'right' | 'none'>('all')
  const [saving,  setSaving]  = useState<number | null>(null)
  const [msg,     setMsg]     = useState<{ id: number; text: string; ok: boolean } | null>(null)

  const filtered = useMemo(() => {
    let rows = schools
    if (query.trim()) {
      const q = query.toLowerCase()
      rows = rows.filter(s => s.display_name.toLowerCase().includes(q) || (s.mascot?.toLowerCase().includes(q) ?? false))
    }
    if (filter === 'left')  rows = rows.filter(s => s.logo_direction === 'left')
    if (filter === 'right') rows = rows.filter(s => s.logo_direction === 'right')
    if (filter === 'none')  rows = rows.filter(s => !s.logo_direction)
    return rows
  }, [schools, query, filter])

  const counts = {
    left:  schools.filter(s => s.logo_direction === 'left').length,
    right: schools.filter(s => s.logo_direction === 'right').length,
    none:  schools.filter(s => !s.logo_direction).length,
  }

  const save = async (school: SchoolRow, direction: 'left' | 'right' | null) => {
    setSaving(school.id); setMsg(null)
    try {
      const r = await fetch('/api/admin/school-profile', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId: school.id, fields: { logo_direction: direction } }),
      })
      const d = await r.json()
      if (d.error) throw new Error(d.error)
      setSchools(prev => prev.map(s => s.id === school.id ? { ...s, logo_direction: direction } : s))
      setMsg({ id: school.id, text: 'Saved', ok: true })
      setTimeout(() => setMsg(m => m?.id === school.id ? null : m), 2000)
    } catch (e) {
      setMsg({ id: school.id, text: e instanceof Error ? e.message : 'Failed', ok: false })
    } finally { setSaving(null) }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap items-center">
        {(['all', 'left', 'right', 'none'] as const).map(f => {
          const label = f === 'all' ? `All (${schools.length})` : f === 'none' ? `No direction (${counts.none})` : `${f} (${counts[f as 'left' | 'right']})`
          return (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded border transition-colors ${filter === f ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-500'}`}>
              {label}
            </button>
          )
        })}
        <input type="text" placeholder="Search name or mascot…" value={query} onChange={e => setQuery(e.target.value)}
          className="ml-auto border border-slate-300 rounded px-3 py-1.5 text-sm bg-white w-56" />
      </div>

      <div className="border border-slate-200 rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-600 border-b border-slate-200">
            <tr>
              <th className="px-3 py-2 text-left w-8">#</th>
              <th className="px-3 py-2 text-left">School</th>
              <th className="px-3 py-2 text-left">Mascot</th>
              <th className="px-3 py-2 text-center">Direction</th>
              <th className="px-3 py-2 text-center w-44">Preview (away · home)</th>
              <th className="px-3 py-2 text-left w-44">Set</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(s => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="px-3 py-2 text-slate-400 text-xs">{s.id}</td>
                <td className="px-3 py-2 font-medium">
                  <a href={`/admin/schools/${s.id}`} className="text-blue-700 hover:underline">{s.display_name}</a>
                </td>
                <td className="px-3 py-2 text-slate-600">{s.mascot ?? <span className="text-slate-300">—</span>}</td>
                <td className="px-3 py-2 text-center">
                  {s.logo_direction
                    ? <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${s.logo_direction === 'left' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{s.logo_direction}</span>
                    : <span className="text-xs text-slate-300">—</span>}
                </td>
                <td className="px-3 py-2">
                  {s.logo_url ? (
                    <div className="flex items-center justify-center gap-3">
                      {(['away', 'home'] as const).map(pos => (
                        <div key={pos} className="flex flex-col items-center gap-0.5">
                          <span className="text-[9px] text-slate-400">{pos}</span>
                          <img src={s.logo_url!} alt="" aria-hidden
                            style={{ width: 28, height: 28, objectFit: 'contain', ...flipStyle(s.logo_direction, pos) }} />
                        </div>
                      ))}
                    </div>
                  ) : <span className="text-slate-300 text-xs block text-center">no logo</span>}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    {(['left', 'right', null] as const).map(d => (
                      <button key={String(d)} onClick={() => save(s, d)} disabled={saving === s.id || s.logo_direction === d}
                        className={`text-xs px-2 py-1 rounded border transition-colors disabled:opacity-40 ${s.logo_direction === d ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-700'}`}>
                        {d ?? 'none'}
                      </button>
                    ))}
                    {msg?.id === s.id && (
                      <span className={`text-xs font-medium ${msg.ok ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-400 text-sm">No schools match.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Tab 2: Background Color ──────────────────────────────────────────────────

const COLOR_FIELDS: Array<{ key: keyof SchoolRow; label: string }> = [
  { key: 'color_primary',   label: 'Primary' },
  { key: 'color_secondary', label: 'Secondary' },
  { key: 'color_tertiary',  label: 'Tertiary' },
  { key: 'primary_color',   label: 'Legacy Primary' },
  { key: 'secondary_color', label: 'Legacy Secondary' },
]

const PRESET_COLORS = [
  { label: 'White',        hex: '#FFFFFF' },
  { label: 'Light Gray',   hex: '#D1D5DB' },
  { label: 'Charcoal',     hex: '#374151' },
  { label: 'Black',        hex: '#000000' },
]

function BgColorTab({ schools: initial }: { schools: SchoolRow[] }) {
  const [schools, setSchools] = useState<SchoolRow[]>(initial)
  const [query,   setQuery]   = useState('')
  const [saving,  setSaving]  = useState<number | null>(null)
  const [msg,     setMsg]     = useState<{ id: number; text: string; ok: boolean } | null>(null)

  const filtered = useMemo(() => {
    if (!query.trim()) return schools
    const q = query.toLowerCase()
    return schools.filter(s => s.display_name.toLowerCase().includes(q))
  }, [schools, query])

  const save = async (school: SchoolRow, hex: string | null) => {
    setSaving(school.id); setMsg(null)
    try {
      const r = await fetch('/api/admin/school-profile', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId: school.id, fields: { header_background: hex } }),
      })
      const d = await r.json()
      if (d.error) throw new Error(d.error)
      setSchools(prev => prev.map(s => s.id === school.id ? { ...s, header_background: hex } : s))
      setMsg({ id: school.id, text: 'Saved', ok: true })
      setTimeout(() => setMsg(m => m?.id === school.id ? null : m), 2000)
    } catch (e) {
      setMsg({ id: school.id, text: e instanceof Error ? e.message : 'Failed', ok: false })
    } finally { setSaving(null) }
  }

  return (
    <div className="space-y-3">
      <input type="text" placeholder="Filter schools…" value={query} onChange={e => setQuery(e.target.value)}
        className="border border-slate-300 rounded px-3 py-1.5 text-sm bg-white w-56" />

      <div className="border border-slate-200 rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-600 border-b border-slate-200">
            <tr>
              <th className="px-3 py-2 text-left">School</th>
              <th className="px-3 py-2 text-center w-36">Logo Preview</th>
              <th className="px-3 py-2 text-left w-44">Current Background</th>
              <th className="px-3 py-2 text-left">Select Background Color</th>
              <th className="px-3 py-2 w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(s => {
              const bg = s.header_background ?? '#1e293b'
              const colorOptions = COLOR_FIELDS
                .map(f => ({ label: f.label, hex: s[f.key] as string | null }))
                .filter(o => o.hex)

              return (
                <tr key={s.id} className="hover:bg-slate-50 align-middle">
                  <td className="px-3 py-3 font-medium">
                    <a href={`/admin/schools/${s.id}`} className="text-blue-700 hover:underline">{s.display_name}</a>
                  </td>

                  {/* Logo in circle as it appears on the profile */}
                  <td className="px-3 py-3">
                    <div className="flex justify-center">
                      {s.logo_url ? (
                        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: bg }}>
                          <img src={s.logo_url} alt="" aria-hidden
                            style={{ width: 36, height: 36, objectFit: 'contain' }} />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: bg }}>
                          <span className="text-xs font-bold text-white">{s.display_name.split(' ').map(w => w[0]).join('').slice(0, 2)}</span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Current background color */}
                  <td className="px-3 py-3">
                    <ColorSwatch hex={s.header_background} />
                  </td>

                  {/* Color picker */}
                  <td className="px-3 py-3">
                    <div className="space-y-2">
                      {/* School's own colors */}
                      {colorOptions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {colorOptions.map(o => {
                            const isActive = s.header_background?.toLowerCase() === o.hex!.toLowerCase()
                            return (
                              <button key={o.hex} onClick={() => !isActive && save(s, o.hex)}
                                disabled={saving === s.id || isActive} title={`${o.label}: ${o.hex}`}
                                className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded border transition-colors disabled:opacity-60 ${isActive ? 'border-slate-800 bg-slate-100 font-medium text-slate-800' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-500'}`}>
                                <div className="w-3.5 h-3.5 rounded-sm border border-slate-200 shrink-0" style={{ backgroundColor: o.hex! }} />
                                <span>{o.label}</span>
                                <span className="font-mono text-[10px] text-slate-400">{o.hex}</span>
                              </button>
                            )
                          })}
                        </div>
                      )}
                      {/* Preset neutrals */}
                      <div className="flex flex-wrap gap-1.5">
                        {PRESET_COLORS.map(o => {
                          const isActive = s.header_background?.toLowerCase() === o.hex.toLowerCase()
                          return (
                            <button key={o.hex} onClick={() => !isActive && save(s, o.hex)}
                              disabled={saving === s.id || isActive} title={o.hex}
                              className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded border transition-colors disabled:opacity-60 ${isActive ? 'border-slate-800 bg-slate-100 font-medium text-slate-800' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-500'}`}>
                              <div className="w-3.5 h-3.5 rounded-sm border border-slate-300 shrink-0" style={{ backgroundColor: o.hex }} />
                              <span>{o.label}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </td>

                  <td className="px-3 py-3">
                    {msg?.id === s.id && (
                      <span className={`text-xs font-medium ${msg.ok ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</span>
                    )}
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-400 text-sm">No schools match.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export function MascotDirectoryClient({ schools }: { schools: SchoolRow[] }) {
  const [tab, setTab] = useState<'direction' | 'background'>('direction')

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-slate-200">
        {([
          { id: 'direction',  label: 'Logo Direction' },
          { id: 'background', label: 'Background Color' },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'direction'  && <DirectionTab  schools={schools} />}
      {tab === 'background' && <BgColorTab    schools={schools} />}
    </div>
  )
}

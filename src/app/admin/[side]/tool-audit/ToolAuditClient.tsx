'use client'

import { useState, useCallback, useEffect } from 'react'
import { useAdminGender } from '@/components/admin/AdminGenderContext'
import type { ToolRegistryRow } from '@/app/api/admin/tool-registry/route'

const PHASES = [
  { key: 'show_offseason',  label: 'Offseason' },
  { key: 'show_preseason',  label: 'Preseason' },
  { key: 'show_season',     label: 'In-Season' },
  { key: 'show_postseason', label: 'Postseason' },
] as const

type PhaseKey = typeof PHASES[number]['key']

export function ToolAuditClient() {
  const { gender } = useAdminGender()
  const [tools,   setTools]   = useState<ToolRegistryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  // Reload tools whenever gender switches
  useEffect(() => {
    setLoading(true)
    setSaved(false)
    fetch(`/api/admin/tool-registry?gender=${gender}`)
      .then(r => r.json())
      .then(d => setTools(d.tools ?? []))
      .catch(() => setTools([]))
      .finally(() => setLoading(false))
  }, [gender])

  const toggle = useCallback((key: string, phase: PhaseKey) => {
    setTools(prev => prev.map(t => t.key === key ? { ...t, [phase]: !t[phase] } : t))
    setSaved(false)
  }, [])

  const toggleColumn = useCallback((phase: PhaseKey) => {
    setTools(prev => {
      const allChecked = prev.every(t => t[phase])
      return prev.map(t => ({ ...t, [phase]: !allChecked }))
    })
    setSaved(false)
  }, [])

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/tool-registry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tools: tools.map(t => ({
          key:             t.key,
          show_offseason:  t.show_offseason,
          show_preseason:  t.show_preseason,
          show_season:     t.show_season,
          show_postseason: t.show_postseason,
        })) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Save failed')
      setSaved(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-sm text-slate-400 py-8 text-center">Loading tools…</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{tools.length} tools — check each phase where the tool should appear in the task tool-picker.</p>
        <div className="flex items-center gap-3">
          {saved  && <span className="text-xs text-green-600 font-medium">Saved</span>}
          {error  && <span className="text-xs text-red-600">{error}</span>}
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-1.5 bg-slate-800 text-white text-sm font-semibold rounded hover:bg-slate-700 disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Tool</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Path</th>
              {PHASES.map(p => (
                <th key={p.key} className="px-3 py-2 text-center w-28">
                  <button
                    onClick={() => toggleColumn(p.key)}
                    className="text-xs font-semibold text-slate-500 uppercase tracking-wide hover:text-slate-800 transition-colors"
                    title={`Toggle all ${p.label}`}
                  >
                    {p.label}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tools.map((tool, i) => (
              <tr key={tool.key} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                <td className="px-3 py-2">
                  <div className="font-medium text-slate-800 text-xs">{tool.label}</div>
                  {tool.description && (
                    <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">{tool.description}</div>
                  )}
                </td>
                <td className="px-3 py-2">
                  <code className="text-[11px] text-indigo-600">{tool.path}</code>
                </td>
                {PHASES.map(p => (
                  <td key={p.key} className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={tool[p.key]}
                      onChange={() => toggle(tool.key, p.key)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 cursor-pointer accent-blue-600"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

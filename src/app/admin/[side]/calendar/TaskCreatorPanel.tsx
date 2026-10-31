'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import { useAdminGender } from '@/components/admin/AdminGenderContext'
import type { SeasonBounds } from './CalendarHeader'
import type { ToolRegistryRow } from '@/app/api/admin/tool-registry/route'

type TaskType = 'process' | 'flex'
type Phase = 'offseason' | 'preseason' | 'season' | 'postseason'

function detectPhase(bounds: SeasonBounds, date: string): Phase {
  if (date >= bounds.postseason_start && date <= bounds.postseason_end) return 'postseason'
  if (date >= bounds.season_start     && date <  bounds.postseason_start) return 'season'
  if (date >= bounds.preseason_start  && date <  bounds.season_start)     return 'preseason'
  return 'offseason'
}

const PHASE_LABELS: Record<Phase, string> = {
  offseason:  'Offseason',
  preseason:  'Preseason',
  season:     'In-Season',
  postseason: 'Postseason',
}

const PHASE_COLORS: Record<Phase, string> = {
  offseason:  'bg-slate-100 text-slate-600',
  preseason:  'bg-blue-100 text-blue-700',
  season:     'bg-green-100 text-green-700',
  postseason: 'bg-amber-100 text-amber-700',
}

type Props = {
  currentUser: string
  defaultDate?: string
  bounds: SeasonBounds
  onCreated?: () => void
}

export function TaskCreatorPanel({ currentUser, defaultDate, bounds, onCreated }: Props) {
  const { gender } = useAdminGender()
  const today = new Date().toISOString().slice(0, 10)
  const [title,    setTitle]    = useState('')
  const [notes,    setNotes]    = useState('')
  const [dueDate,  setDueDate]  = useState(defaultDate ?? today)
  const [taskType, setTaskType] = useState<TaskType>('flex')
  const [saving,   setSaving]   = useState(false)
  const [flash,    setFlash]    = useState<{ msg: string; ok: boolean } | null>(null)

  // Phase derived from date
  const [phase,    setPhase]    = useState<Phase>(() => detectPhase(bounds, defaultDate ?? today))
  // Dashboard can be overridden from auto-detected phase
  const [dashboard, setDashboard] = useState<string>(detectPhase(bounds, defaultDate ?? today))

  // Tool picker
  const [tools,       setTools]       = useState<ToolRegistryRow[]>([])
  const [toolKey,     setToolKey]     = useState<string>('')
  const [loadingTools, setLoadingTools] = useState(false)

  const supabase = createSupabaseBrowser()

  // When date changes → detect phase → update dashboard
  useEffect(() => {
    if (defaultDate) setDueDate(defaultDate)
  }, [defaultDate])

  useEffect(() => {
    const detected = detectPhase(bounds, dueDate)
    setPhase(detected)
    setDashboard(detected)
    setToolKey('')
  }, [dueDate, bounds])

  // When dashboard or gender changes → load tools filtered by phase + gender
  const loadTools = useCallback(async (ph: string, g: 'M' | 'F') => {
    setLoadingTools(true)
    try {
      const res = await fetch(`/api/admin/tool-registry?phase=${ph}`)
      const data = await res.json()
      const genderStr = g === 'M' ? 'boys' : 'girls'
      const filtered = (data.tools ?? [] as ToolRegistryRow[]).filter(
        (t: ToolRegistryRow) => t.gender === 'both' || t.gender === genderStr
      )
      setTools(filtered)
    } catch {
      setTools([])
    } finally {
      setLoadingTools(false)
    }
  }, [])

  useEffect(() => {
    loadTools(dashboard, gender)
    setToolKey('')
  }, [dashboard, gender, loadTools])

  async function handleCreate() {
    if (!title.trim()) return
    setSaving(true)
    const selectedTool = tools.find(t => t.key === toolKey)
    const { error } = await supabase.from('admin_tasks').insert({
      dashboard,
      gender,
      group_type:     taskType === 'process' ? 'process' : 'freestyle',
      title:          title.trim(),
      description:    notes.trim() || null,
      due_date:       dueDate || null,
      created_by:     currentUser,
      workspace_tool: toolKey || null,
      workspace_href: selectedTool?.path ?? null,
      order_index:    0,
    })
    setSaving(false)
    if (error) {
      setFlash({ msg: 'Failed to save. Try again.', ok: false })
    } else {
      setFlash({ msg: 'Task created!', ok: true })
      setTitle('')
      setNotes('')
      setToolKey('')
      onCreated?.()
    }
    setTimeout(() => setFlash(null), 2500)
  }

  return (
    <div className="flex flex-col gap-3 p-3 h-full overflow-y-auto">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Create Task</p>
      </div>

      {/* Task type toggle */}
      <div className="flex rounded-lg border border-slate-200 overflow-hidden">
        {(['process', 'flex'] as TaskType[]).map(t => (
          <button
            key={t}
            onClick={() => setTaskType(t)}
            className={`flex-1 py-1.5 text-xs font-semibold transition-colors capitalize ${t !== 'process' ? 'border-l border-slate-200' : ''} ${
              taskType === t ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            {t === 'process' ? 'Process' : 'Flex'}
          </button>
        ))}
      </div>

      <p className="text-[10px] text-slate-400 leading-relaxed">
        {taskType === 'process'
          ? 'Process tasks are part of the vital daily flow and must complete the same day.'
          : 'Flex tasks are reminders that can hang 1-2 days without issue.'}
      </p>

      {/* Title */}
      <div>
        <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">Title</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Task name…"
          className="w-full text-xs border border-slate-200 rounded px-2.5 py-2 focus:outline-none focus:border-slate-400"
        />
      </div>

      {/* Due date */}
      <div>
        <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">Due Date</label>
        <input
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          className="w-full text-xs border border-slate-200 rounded px-2.5 py-2 focus:outline-none focus:border-slate-400"
        />
      </div>

      {/* Dashboard — auto-set by date, still overridable */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Dashboard</label>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${PHASE_COLORS[phase]}`}>
            auto: {PHASE_LABELS[phase]}
          </span>
        </div>
        <select
          value={dashboard}
          onChange={e => setDashboard(e.target.value)}
          className="w-full text-xs border border-slate-200 rounded px-2.5 py-2 focus:outline-none focus:border-slate-400"
        >
          <option value="preseason">Preseason</option>
          <option value="season">In-Season</option>
          <option value="postseason">Postseason</option>
          <option value="offseason">Offseason</option>
        </select>
      </div>

      {/* Tool picker */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
            Tool {loadingTools && <span className="text-slate-300">…</span>}
          </label>
          <Link
            href="/admin/tool-audit"
            className="text-[9px] text-indigo-500 hover:text-indigo-700 underline"
          >
            Manage tools
          </Link>
        </div>
        <select
          value={toolKey}
          onChange={e => setToolKey(e.target.value)}
          disabled={loadingTools}
          className="w-full text-xs border border-slate-200 rounded px-2.5 py-2 focus:outline-none focus:border-slate-400 disabled:opacity-50"
        >
          <option value="">— No tool linked —</option>
          {tools.map(t => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>
        {toolKey && tools.find(t => t.key === toolKey) && (
          <p className="text-[10px] text-slate-400 mt-1 font-mono">
            {tools.find(t => t.key === toolKey)?.path}
          </p>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Optional notes…"
          rows={3}
          className="w-full text-xs border border-slate-200 rounded px-2.5 py-2 focus:outline-none focus:border-slate-400 resize-none"
        />
      </div>

      {/* Submit */}
      <button
        onClick={handleCreate}
        disabled={!title.trim() || saving}
        className="w-full py-2 bg-slate-800 text-white text-xs font-semibold rounded hover:bg-slate-700 disabled:opacity-40 transition-colors"
      >
        {saving ? 'Saving…' : 'Create Task'}
      </button>

      {flash && (
        <p className={`text-xs text-center ${flash.ok ? 'text-green-600' : 'text-red-500'}`}>{flash.msg}</p>
      )}

      <div className="border-t border-slate-100 pt-3 mt-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Quick Tips</p>
        <ul className="space-y-1.5 text-[10px] text-slate-400">
          <li>Click any day in the calendar to auto-fill the date.</li>
          <li>Dashboard is set automatically from the date — override if needed.</li>
          <li>Link a tool so clicking this task on the dashboard opens it directly.</li>
        </ul>
      </div>
    </div>
  )
}

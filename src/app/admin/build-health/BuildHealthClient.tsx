'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase/client'

type Task = {
  id: string
  section: string
  description: string
  created_at: string
}

const SECTIONS = [
  { id: 'chat',         label: 'Chat',          future: true },
  { id: 'dashboards',   label: 'Dashboards',    future: false },
  { id: 'profiles',     label: 'Profiles',      future: false },
  { id: 'calendar',     label: 'Calendar',      future: true },
  { id: 'blog',         label: 'Articles / Blog', future: true },
  { id: 'nonnjsiaa',    label: 'Non-NJSIAA',    future: false },
  { id: 'store',        label: 'Store',         future: true },
  { id: 'past-seasons', label: 'Past Seasons',  future: false },
  { id: 'finances',     label: 'Finances',      future: false },
  { id: 'banners',      label: 'Banners',       future: true },
  { id: 'tools',        label: 'Tools',         future: false },
  { id: 'build-health', label: 'Build Health',  future: false },
]

function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-4 h-4 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
      fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function TaskRow({ task, onComplete, onUpdate }: { task: Task; onComplete: (id: string) => void; onUpdate: (id: string, description: string) => void }) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(task.description)
  const [saving, setSaving] = useState(false)

  async function handleComplete() {
    setDeleting(true)
    onComplete(task.id)
  }

  async function handleSaveEdit() {
    if (!editText.trim() || editText.trim() === task.description) { setEditing(false); return }
    setSaving(true)
    const supabase = createSupabaseBrowser()
    const { error } = await supabase
      .from('admin_build_health_tasks')
      .update({ description: editText.trim() })
      .eq('id', task.id)
    setSaving(false)
    if (!error) {
      onUpdate(task.id, editText.trim())
      setEditing(false)
    }
  }

  function handleCancelEdit() {
    setEditText(task.description)
    setEditing(false)
  }

  return (
    <div className={`border border-slate-200 rounded bg-white p-3 transition-opacity ${deleting ? 'opacity-40' : ''}`}>
      {editing ? (
        <>
          <textarea
            value={editText}
            onChange={e => setEditText(e.target.value)}
            rows={3}
            autoFocus
            className="w-full text-sm text-slate-700 border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:border-slate-400 resize-none transition-colors"
          />
          <div className="flex items-center justify-end gap-2 mt-2">
            <button
              onClick={handleCancelEdit}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={saving || !editText.trim()}
              className="text-xs px-2 py-0.5 bg-slate-800 text-white rounded hover:bg-slate-700 disabled:opacity-40 transition-colors"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{task.description}</p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400">{new Date(task.created_at).toLocaleDateString()}</span>
              <button
                onClick={() => { setEditing(true); setConfirming(false) }}
                className="text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
              >
                Edit
              </button>
            </div>
            {confirming ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Done?</span>
                <button
                  onClick={handleComplete}
                  className="text-xs px-2 py-0.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                  Yes, complete
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirming(true)}
                className="text-xs px-2 py-0.5 border border-slate-200 text-slate-400 rounded hover:border-green-400 hover:text-green-600 transition-colors"
              >
                Mark complete
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function SectionAccordion({
  section,
  tasks,
  onTaskAdded,
  onTaskComplete,
  onTaskUpdate,
}: {
  section: typeof SECTIONS[number]
  tasks: Task[]
  onTaskAdded: (task: Task) => void
  onTaskComplete: (id: string) => void
  onTaskUpdate: (id: string, description: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleAdd() {
    if (!text.trim()) return
    setSaving(true)
    const supabase = createSupabaseBrowser()
    const { data, error } = await supabase
      .from('admin_build_health_tasks')
      .insert({ section: section.id, description: text.trim() })
      .select()
      .single()
    setSaving(false)
    if (!error && data) {
      onTaskAdded(data as Task)
      setText('')
    }
  }

  return (
    <div className="border border-slate-200 rounded bg-white overflow-hidden">
      {/* Header row — always visible */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-700">{section.label}</span>
          {section.future && (
            <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400 border border-slate-200 rounded px-1.5 py-0.5">
              Coming soon
            </span>
          )}
          {tasks.length > 0 && (
            <span className="text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 min-w-[20px] text-center">
              {tasks.length}
            </span>
          )}
          {tasks.length === 0 && !open && (
            <span className="text-[10px] text-slate-400">No tasks</span>
          )}
        </div>
        <ChevronDown open={open} />
      </button>

      {/* Expanded content */}
      {open && (
        <div className="px-4 pb-4 border-t border-slate-100">
          <div className="mt-3 space-y-2">
            {tasks.map(task => (
              <TaskRow key={task.id} task={task} onComplete={onTaskComplete} onUpdate={onTaskUpdate} />
            ))}
          </div>

          {/* Add task textarea */}
          <div className="mt-3">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Describe the task or paste the prompt that needs to be completed…"
              rows={3}
              className="w-full text-sm text-slate-700 placeholder-slate-400 border border-slate-200 rounded px-3 py-2 focus:outline-none focus:border-slate-400 resize-none transition-colors"
            />
            <div className="flex justify-end mt-1.5">
              <button
                onClick={handleAdd}
                disabled={saving || !text.trim()}
                className="text-xs px-3 py-1.5 bg-slate-800 text-white rounded hover:bg-slate-700 disabled:opacity-40 transition-colors"
              >
                {saving ? 'Saving…' : 'Add Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function BuildHealthClient() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createSupabaseBrowser()
    supabase
      .from('admin_build_health_tasks')
      .select('*')
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setTasks((data as Task[]) ?? [])
        setLoading(false)
      })
  }, [])

  function handleAdded(task: Task) {
    setTasks(prev => [...prev, task])
  }

  function handleUpdate(id: string, description: string) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, description } : t))
  }

  async function handleComplete(id: string) {
    const supabase = createSupabaseBrowser()
    await supabase.from('admin_build_health_tasks').delete().eq('id', id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  const totalTasks = tasks.length

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 mb-1">Admin Build Health</h1>
        <p className="text-slate-500 text-sm">
          Track what needs to be built. Expand any section to add tasks or mark them complete. Tasks are visible to everyone and deleted when done.
        </p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          Error loading tasks: {error}
        </div>
      )}

      {totalTasks === 0 && !loading && !error && (
        <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded text-sm text-green-700 font-medium">
          All clear — no open tasks.
        </div>
      )}

      {totalTasks > 0 && (
        <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
          <p className="text-sm text-amber-700">
            <span className="font-bold">{totalTasks} task{totalTasks !== 1 ? 's' : ''}</span> remaining
          </p>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 bg-slate-200 rounded animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {SECTIONS.map(section => (
            <SectionAccordion
              key={section.id}
              section={section}
              tasks={tasks.filter(t => t.section === section.id)}
              onTaskAdded={handleAdded}
              onTaskComplete={handleComplete}
              onTaskUpdate={handleUpdate}
            />
          ))}
        </div>
      )}
    </div>
  )
}

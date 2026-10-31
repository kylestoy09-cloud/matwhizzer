'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase/client'

export type Task = {
  id: string
  dashboard: string
  group_type: 'freestyle' | 'process'
  process_key: string | null
  title: string
  description: string | null
  workspace_tool: string | null
  workspace_href: string | null
  due_date: string | null
  order_index: number
  completed_at: string | null
  created_by: string | null
}

const DASHBOARD_COLORS: Record<string, string> = {
  preseason:  'bg-blue-100 text-blue-700',
  season:     'bg-green-100 text-green-700',
  postseason: 'bg-amber-100 text-amber-700',
  offseason:  'bg-slate-100 text-slate-500',
  calendar:   'bg-purple-100 text-purple-700',
}

function today() { return new Date().toISOString().slice(0, 10) }

function dateLabel(due: string | null) {
  if (!due) return ''
  const t = today()
  if (due === t) return 'Today'
  const diff = Math.round((new Date(due + 'T00:00:00').getTime() - new Date(t + 'T00:00:00').getTime()) / 86400000)
  if (diff === 1)  return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  if (diff > 0 && diff < 7) return new Date(due + 'T00:00:00').toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
  return new Date(due + 'T00:00:00').toLocaleDateString([], { month: 'short', day: 'numeric' })
}

type Props = { currentUser: string; dashboard?: string }

export function GlobalTaskPanel({ currentUser, dashboard }: Props) {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const activeTaskId = searchParams.get('task')

  const [tasks,    setTasks]    = useState<Task[]>([])
  const [newTitle, setNewTitle] = useState('')
  const [newDue,   setNewDue]   = useState(today())
  const [newDash,  setNewDash]  = useState(dashboard ?? 'preseason')
  const [adding,   setAdding]   = useState(false)
  const supabase = createSupabaseBrowser()

  useEffect(() => { loadTasks() }, [])

  async function loadTasks() {
    const { data } = await supabase
      .from('admin_tasks')
      .select('*')
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('order_index')
    setTasks((data ?? []) as Task[])
  }

  function goToday() { router.push('/admin') }

  function selectTask(task: Task) {
    router.push(`/admin/${task.dashboard}?task=${task.id}`)
  }

  async function toggleComplete(e: React.MouseEvent, task: Task) {
    e.stopPropagation()
    if (task.completed_at) {
      await supabase.from('admin_tasks').update({ completed_at: null, completed_by: null }).eq('id', task.id)
    } else {
      await supabase.from('admin_tasks').update({ completed_at: new Date().toISOString(), completed_by: currentUser }).eq('id', task.id)
    }
    loadTasks()
  }

  async function addTask() {
    if (!newTitle.trim()) return
    setAdding(true)
    await supabase.from('admin_tasks').insert({
      dashboard: newDash,
      group_type: 'freestyle',
      title: newTitle.trim(),
      due_date: newDue || null,
      created_by: currentUser,
      order_index: tasks.length,
    })
    setNewTitle('')
    setAdding(false)
    loadTasks()
  }

  const t = today()
  const visible  = dashboard ? tasks.filter(tk => tk.dashboard === dashboard) : tasks
  const overdue  = visible.filter(tk => !tk.completed_at && tk.due_date && tk.due_date < t)
  const todayTks = visible.filter(tk => !tk.completed_at && tk.due_date === t)
  const upcoming = visible.filter(tk => !tk.completed_at && (!tk.due_date || tk.due_date > t))
  const done     = visible.filter(tk => !!tk.completed_at)

  function TaskRow({ task }: { task: Task }) {
    const isActive = task.id === activeTaskId
    const isDone   = !!task.completed_at
    return (
      <div
        onClick={() => selectTask(task)}
        className={`group flex items-start gap-2 px-3 py-2 cursor-pointer transition-colors rounded mx-1 ${
          isActive ? 'bg-slate-200' : 'hover:bg-slate-100'
        } ${isDone ? 'opacity-50' : ''}`}
      >
        <button
          onClick={e => toggleComplete(e, task)}
          className={`mt-0.5 shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
            isDone ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 hover:border-slate-500'
          }`}
        >
          {isDone && <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M12.416 3.376a.75.75 0 010 1.06l-6 6a.75.75 0 01-1.06 0l-3-3a.75.75 0 011.06-1.06L6 8.818l5.356-5.442a.75.75 0 011.06 0z" clipRule="evenodd"/></svg>}
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-xs leading-snug ${isDone ? 'line-through text-slate-400' : 'text-slate-800'}`}>
            {task.title}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className={`text-[9px] font-semibold uppercase px-1 rounded ${DASHBOARD_COLORS[task.dashboard] ?? 'bg-slate-100 text-slate-500'}`}>
              {task.dashboard}
            </span>
            {task.due_date && (
              <span className="text-[10px] text-slate-400">{dateLabel(task.due_date)}</span>
            )}
          </div>
        </div>
      </div>
    )
  }

  function Section({ label, items, accent }: { label: string; items: Task[]; accent?: string }) {
    if (items.length === 0) return null
    return (
      <div>
        <p className={`px-3 pt-2 pb-0.5 text-[9px] font-bold uppercase tracking-widest ${accent ?? 'text-slate-400'}`}>
          {label}
        </p>
        {items.map(t => <TaskRow key={t.id} task={t} />)}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white border-r border-slate-200">
      {/* Today button */}
      <div className="px-3 py-2.5 border-b border-slate-100 shrink-0">
        <button
          onClick={goToday}
          className="w-full flex items-center justify-center gap-2 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-semibold hover:bg-slate-700 transition-colors"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
            <path fillRule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z" clipRule="evenodd"/>
          </svg>
          Today
        </button>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto py-1 space-y-0.5">
        <Section label="Overdue"  items={overdue}  accent="text-red-500" />
        <Section label="Today"    items={todayTks}  accent="text-blue-500" />
        <Section label="Upcoming" items={upcoming} />
        <Section label="Done"     items={done} />
      </div>

      {/* Add task */}
      <div className="border-t border-slate-100 p-2 shrink-0 space-y-1.5">
        <input
          type="text"
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTask()}
          placeholder="Add a task…"
          className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-slate-400"
        />
        <div className="flex gap-1.5">
          <input
            type="date"
            value={newDue}
            onChange={e => setNewDue(e.target.value)}
            className="flex-1 text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-slate-400"
          />
          <select
            value={newDash}
            onChange={e => setNewDash(e.target.value)}
            className="text-xs border border-slate-200 rounded px-1.5 py-1 focus:outline-none focus:border-slate-400"
          >
            <option value="preseason">Preseason</option>
            <option value="season">Season</option>
            <option value="postseason">Postseason</option>
            <option value="offseason">Offseason</option>
          </select>
        </div>
        <button
          onClick={addTask}
          disabled={!newTitle.trim() || adding}
          className="w-full text-xs py-1.5 bg-slate-800 text-white rounded hover:bg-slate-700 disabled:opacity-40 transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  )
}

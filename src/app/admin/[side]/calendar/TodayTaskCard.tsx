'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase/client'

type Task = {
  id: string
  dashboard: string
  group_type: string
  title: string
  due_date: string | null
  completed_at: string | null
  workspace_tool: string | null
  workspace_href: string | null
}

const DASH_COLORS: Record<string, string> = {
  preseason:  'bg-blue-100 text-blue-700',
  season:     'bg-green-100 text-green-700',
  postseason: 'bg-amber-100 text-amber-700',
  offseason:  'bg-slate-100 text-slate-500',
}

type Props = { currentUser: string }

export function TodayTaskCard({ currentUser }: Props) {
  const router   = useRouter()
  const [tasks,  setTasks]  = useState<Task[]>([])
  const today    = new Date().toISOString().slice(0, 10)
  const supabase = createSupabaseBrowser()

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase
      .from('admin_tasks')
      .select('*')
      .eq('due_date', today)
      .order('order_index')
    setTasks((data ?? []) as Task[])
  }

  async function toggle(task: Task) {
    if (task.completed_at) {
      await supabase.from('admin_tasks').update({ completed_at: null, completed_by: null }).eq('id', task.id)
    } else {
      await supabase.from('admin_tasks').update({ completed_at: new Date().toISOString(), completed_by: currentUser }).eq('id', task.id)
    }
    load()
  }

  function openTask(task: Task) {
    if (task.workspace_tool && task.workspace_href) {
      router.push(task.workspace_href)
    } else {
      router.push(`/admin/${task.dashboard}?task=${task.id}`)
    }
  }

  function goToday() { router.push('/admin') }

  const pending = tasks.filter(t => !t.completed_at)
  const done    = tasks.filter(t => !!t.completed_at)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 shrink-0 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Today's Tasks</p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
          </p>
        </div>
        <button
          onClick={goToday}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 text-white text-[10px] font-semibold hover:bg-slate-700 transition-colors"
        >
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
            <path fillRule="evenodd" d="M4 1.75a.75.75 0 011.5 0V3h5V1.75a.75.75 0 011.5 0V3h.25A2.25 2.25 0 0114.5 5.25v7.5A2.25 2.25 0 0112.25 15H3.75A2.25 2.25 0 011.5 12.75v-7.5A2.25 2.25 0 013.75 3H4V1.75zm-.25 3.5A.75.75 0 003 6.25V6h10v.25a.75.75 0 010 1.5H3a.75.75 0 01-.25-.5V6a.75.75 0 01.75-.75h.25z" clipRule="evenodd"/>
          </svg>
          Today
        </button>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto py-2">
        {tasks.length === 0 && (
          <p className="text-xs text-slate-400 text-center mt-6 px-4">No tasks due today.</p>
        )}

        {pending.length > 0 && (
          <div>
            {pending.map(task => (
              <div
                key={task.id}
                onClick={() => openTask(task)}
                className="group flex items-start gap-2 px-3 py-2 cursor-pointer hover:bg-slate-50 rounded mx-1 transition-colors"
              >
                <button
                  onClick={e => { e.stopPropagation(); toggle(task) }}
                  className="mt-0.5 shrink-0 w-4 h-4 rounded border border-slate-300 hover:border-slate-500 flex items-center justify-center transition-colors"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-800 leading-snug">{task.title}</p>
                  <span className={`text-[9px] font-semibold uppercase px-1 rounded mt-0.5 inline-block ${DASH_COLORS[task.dashboard] ?? 'bg-slate-100 text-slate-500'}`}>
                    {task.dashboard}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {done.length > 0 && (
          <div className="mt-2 border-t border-slate-100 pt-2">
            <p className="px-3 text-[9px] font-bold uppercase tracking-widest text-slate-300 pb-1">Done</p>
            {done.map(task => (
              <div
                key={task.id}
                onClick={() => openTask(task)}
                className="flex items-start gap-2 px-3 py-2 opacity-50 cursor-pointer hover:opacity-70 transition-opacity"
              >
                <button
                  onClick={e => { e.stopPropagation(); toggle(task) }}
                  className="mt-0.5 shrink-0 w-4 h-4 rounded border bg-green-500 border-green-500 flex items-center justify-center"
                >
                  <svg viewBox="0 0 16 16" fill="white" className="w-3 h-3">
                    <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 010 1.06l-6 6a.75.75 0 01-1.06 0l-3-3a.75.75 0 011.06-1.06L6 8.818l5.356-5.442a.75.75 0 011.06 0z" clipRule="evenodd"/>
                  </svg>
                </button>
                <p className="text-xs text-slate-400 line-through leading-snug">{task.title}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

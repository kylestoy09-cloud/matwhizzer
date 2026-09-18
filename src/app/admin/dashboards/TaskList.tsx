'use client'

import { useState } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase/client'

export type Task = {
  id: string
  group_type: 'freestyle' | 'process'
  process_key: string | null
  title: string
  description: string | null
  workspace_tool: string | null
  workspace_href: string | null
  due_date: string | null
  order_index: number
  completed_at: string | null
}

type Props = {
  dashboard: string
  processTasks: Task[]
  freestyleTasks: Task[]
  selectedTaskId: string | null
  onSelectTask: (task: Task) => void
  onTasksChanged: () => void
  currentUser: string
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
      <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 010 1.06l-6 6a.75.75 0 01-1.06 0l-3-3a.75.75 0 011.06-1.06L6 8.818l5.356-5.442a.75.75 0 011.06 0z" clipRule="evenodd"/>
    </svg>
  )
}

function TaskRow({ task, isSelected, onSelect, onToggleComplete, onDelete }: {
  task: Task
  isSelected: boolean
  onSelect: () => void
  onToggleComplete: () => void
  onDelete?: () => void
}) {
  const done = !!task.completed_at

  return (
    <div
      className={`group flex items-start gap-2 px-3 py-2 rounded cursor-pointer transition-colors text-sm ${
        isSelected ? 'bg-slate-200' : 'hover:bg-slate-100'
      } ${done ? 'opacity-50' : ''}`}
      onClick={onSelect}
    >
      {/* Complete toggle */}
      <button
        onClick={e => { e.stopPropagation(); onToggleComplete() }}
        className={`mt-0.5 shrink-0 w-4 h-4 rounded border transition-colors flex items-center justify-center ${
          done
            ? 'bg-green-500 border-green-500 text-white'
            : 'border-slate-300 hover:border-slate-500'
        }`}
      >
        {done && <CheckIcon />}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`leading-snug ${done ? 'line-through text-slate-400' : 'text-slate-800'}`}>
          {task.title}
        </p>
        {task.due_date && (
          <p className="text-[10px] text-slate-400 mt-0.5">
            Due {new Date(task.due_date + 'T00:00:00').toLocaleDateString([], { month: 'short', day: 'numeric' })}
          </p>
        )}
      </div>

      {onDelete && (
        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity leading-none text-base px-0.5"
        >
          ×
        </button>
      )}
    </div>
  )
}

export function TaskList({ dashboard, processTasks, freestyleTasks, selectedTaskId, onSelectTask, onTasksChanged, currentUser }: Props) {
  const [newTitle, setNewTitle] = useState('')
  const [newDue, setNewDue]     = useState('')
  const [adding, setAdding]     = useState(false)
  const supabase = createSupabaseBrowser()

  async function toggleComplete(task: Task) {
    if (task.completed_at) {
      await supabase.from('admin_tasks').update({ completed_at: null, completed_by: null }).eq('id', task.id)
    } else {
      await supabase.from('admin_tasks').update({ completed_at: new Date().toISOString(), completed_by: currentUser }).eq('id', task.id)
    }
    onTasksChanged()
  }

  async function addTask() {
    if (!newTitle.trim()) return
    setAdding(true)
    await supabase.from('admin_tasks').insert({
      dashboard,
      group_type: 'freestyle',
      title: newTitle.trim(),
      due_date: newDue || null,
      created_by: currentUser,
      order_index: freestyleTasks.length,
    })
    setNewTitle('')
    setNewDue('')
    setAdding(false)
    onTasksChanged()
  }

  async function deleteTask(id: string) {
    await supabase.from('admin_tasks').delete().eq('id', id)
    onTasksChanged()
  }

  const pendingProcess   = processTasks.filter(t => !t.completed_at)
  const completedProcess = processTasks.filter(t => t.completed_at)
  const pendingFree      = freestyleTasks.filter(t => !t.completed_at)
  const completedFree    = freestyleTasks.filter(t => t.completed_at)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto py-2 space-y-4">

        {/* Process group */}
        <div>
          <p className="px-3 pt-1 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Process
          </p>
          {pendingProcess.map(t => (
            <TaskRow
              key={t.id}
              task={t}
              isSelected={selectedTaskId === t.id}
              onSelect={() => onSelectTask(t)}
              onToggleComplete={() => toggleComplete(t)}
            />
          ))}
          {completedProcess.map(t => (
            <TaskRow
              key={t.id}
              task={t}
              isSelected={selectedTaskId === t.id}
              onSelect={() => onSelectTask(t)}
              onToggleComplete={() => toggleComplete(t)}
            />
          ))}
          {processTasks.length === 0 && (
            <p className="px-3 py-1 text-xs text-slate-400 italic">No process tasks</p>
          )}
        </div>

        {/* Freestyle group */}
        <div>
          <p className="px-3 pt-1 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            To Do
          </p>
          {pendingFree.map(t => (
            <TaskRow
              key={t.id}
              task={t}
              isSelected={selectedTaskId === t.id}
              onSelect={() => onSelectTask(t)}
              onToggleComplete={() => toggleComplete(t)}
              onDelete={() => deleteTask(t.id)}
            />
          ))}
          {completedFree.map(t => (
            <TaskRow
              key={t.id}
              task={t}
              isSelected={selectedTaskId === t.id}
              onSelect={() => onSelectTask(t)}
              onToggleComplete={() => toggleComplete(t)}
              onDelete={() => deleteTask(t.id)}
            />
          ))}
          {pendingFree.length === 0 && completedFree.length === 0 && (
            <p className="px-3 py-1 text-xs text-slate-400 italic">No tasks yet</p>
          )}
        </div>
      </div>

      {/* Add task input */}
      <div className="border-t border-slate-200 p-2 shrink-0">
        <input
          type="text"
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTask()}
          placeholder="Add a task…"
          className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-slate-400 mb-1.5"
        />
        <div className="flex gap-1.5 items-center">
          <input
            type="date"
            value={newDue}
            onChange={e => setNewDue(e.target.value)}
            className="flex-1 text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-slate-400"
          />
          <button
            onClick={addTask}
            disabled={!newTitle.trim() || adding}
            className="text-xs px-2.5 py-1 bg-slate-800 text-white rounded hover:bg-slate-700 disabled:opacity-40 transition-colors"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  )
}

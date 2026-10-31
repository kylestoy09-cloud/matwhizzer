'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import { GlobalTaskPanel } from './GlobalTaskPanel'
import { Workspace } from './Workspace'
import type { Task } from './GlobalTaskPanel'

type Props = {
  dashboard: 'preseason' | 'season' | 'postseason' | 'offseason' | 'calendar'
  header: React.ReactNode
  defaultContent?: React.ReactNode
}

function DashboardShellInner({ dashboard, header, defaultContent }: Props) {
  const searchParams = useSearchParams()
  const taskId       = searchParams.get('task')

  const [activeTask,   setActiveTask]   = useState<Task | null>(null)
  const [currentUser,  setCurrentUser]  = useState('')
  const supabase = createSupabaseBrowser()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUser(data.user?.email ?? '')
    })
  }, [])

  useEffect(() => {
    if (!taskId) { setActiveTask(null); return }
    supabase
      .from('admin_tasks')
      .select('*')
      .eq('id', taskId)
      .single()
      .then(({ data }) => setActiveTask((data as Task) ?? null))
  }, [taskId])

  return (
    <div className="p-4 flex flex-col gap-4" style={{ minHeight: 'calc(100vh - 3rem)', minWidth: 1400 }}>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {header}
      </div>

      {/* Body: task card + workspace card */}
      <div className="flex gap-4 flex-1">

        {/* Task card — global task panel */}
        <div className="w-72 shrink-0 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden" style={{ minHeight: 400 }}>
          {currentUser && <GlobalTaskPanel currentUser={currentUser} dashboard={dashboard} />}
        </div>

        {/* Workspace card */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col" style={{ minHeight: 400 }}>
          {activeTask && (
            <div className="px-4 py-3 border-b border-slate-100 shrink-0">
              <p className="text-sm font-semibold text-slate-800">{activeTask.title}</p>
              {activeTask.description && (
                <p className="text-xs text-slate-400 mt-0.5">{activeTask.description}</p>
              )}
            </div>
          )}
          <div className="flex-1 overflow-auto">
            <Workspace task={activeTask} defaultContent={defaultContent} />
          </div>
        </div>

      </div>
    </div>
  )
}

export function DashboardShell(props: Props) {
  return (
    <Suspense fallback={null}>
      <DashboardShellInner {...props} />
    </Suspense>
  )
}

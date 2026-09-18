'use client'

import { Suspense, useEffect, useState } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import { GlobalTaskPanel } from './GlobalTaskPanel'

type Props = {
  header: React.ReactNode
  children: React.ReactNode
}

function HubShellInner({ header, children }: Props) {
  const [currentUser, setCurrentUser] = useState('')

  useEffect(() => {
    createSupabaseBrowser().auth.getUser().then(({ data }) => {
      setCurrentUser(data.user?.email ?? '')
    })
  }, [])

  return (
    <div className="p-4 flex flex-col gap-4" style={{ minHeight: 'calc(100vh - 3rem)' }}>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {header}
      </div>

      {/* Body: task card + workspace card */}
      <div className="flex gap-4 flex-1">

        {/* Task card */}
        <div className="w-72 shrink-0 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden" style={{ minHeight: 400 }}>
          {currentUser && <GlobalTaskPanel currentUser={currentUser} />}
        </div>

        {/* Workspace — always visible, no task selection */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden overflow-y-auto" style={{ minHeight: 400 }}>
          {children}
        </div>

      </div>
    </div>
  )
}

export function HubShell(props: Props) {
  return (
    <Suspense>
      <HubShellInner {...props} />
    </Suspense>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import { AdminTopBar }     from './AdminTopBar'
import { AdminIconRail }   from './AdminIconRail'
import { AdminChat }       from './chat/AdminChat'
import { MicrocheckPanel }  from './microcheck/MicrocheckPanel'

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [chatOpen,      setChatOpen]      = useState(false)
  const [microcheckOpen, setMicrocheckOpen] = useState(false)
  const [currentUser,   setCurrentUser]   = useState<string | null>(null)

  useEffect(() => {
    createSupabaseBrowser().auth.getUser().then(({ data }) => {
      setCurrentUser(data.user?.email ?? null)
    })
  }, [])

  return (
    <div className="min-h-screen bg-slate-100">
      <AdminTopBar />
      <AdminIconRail
        onChatClick={() => setChatOpen(p => !p)}
        chatOpen={chatOpen}
        onMicrocheckClick={() => setMicrocheckOpen(p => !p)}
        microcheckOpen={microcheckOpen}
      />
      <main className="pt-12 pl-14 min-h-screen overflow-x-auto">{children}</main>
      {chatOpen && currentUser && (
        <AdminChat currentUser={currentUser} onClose={() => setChatOpen(false)} />
      )}
      {microcheckOpen && (
        <MicrocheckPanel onClose={() => setMicrocheckOpen(false)} />
      )}
    </div>
  )
}

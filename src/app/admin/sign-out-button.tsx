'use client'

import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase/client'

export function SignOutButton() {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createSupabaseBrowser()
    await supabase.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleSignOut}
      className="text-sm text-slate-500 hover:text-slate-900 transition-colors px-3 py-1.5
                 rounded-lg border border-slate-200 hover:border-slate-400"
    >
      Sign Out
    </button>
  )
}

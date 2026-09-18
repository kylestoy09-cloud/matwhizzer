'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import { useAdminGender } from '@/components/admin/AdminGenderContext'
import { AdminSearch } from './AdminSearch'

export function AdminTopBar() {
  const { gender, setGender } = useAdminGender()
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createSupabaseBrowser()
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null)
    })
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleSignOut() {
    const supabase = createSupabaseBrowser()
    await supabase.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  const displayName = userEmail ? userEmail.split('@')[0] : '...'
  const isGirls = gender === 'F'
  const bg      = isGirls ? 'bg-rose-900' : 'bg-slate-900'

  return (
    <header className={`fixed top-0 left-0 right-0 z-40 h-12 ${bg} flex items-center pl-[60px] pr-4 gap-3 transition-colors duration-200`} style={{ boxShadow: '0 1px 0 rgba(0,0,0,0.4)' }}>
      {/* Search */}
      <div className="flex-1 max-w-sm">
        <AdminSearch />
      </div>

      <div className="flex-1" />

      {/* Gender toggle */}
      <div className="flex items-center rounded overflow-hidden border border-slate-600 shrink-0">
        <button
          onClick={() => setGender('M')}
          className={`px-3 py-1 text-xs font-bold transition-colors ${
            gender === 'M'
              ? 'bg-blue-500 text-white'
              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          Boys
        </button>
        <button
          onClick={() => setGender('F')}
          className={`px-3 py-1 text-xs font-bold transition-colors border-l border-slate-600 ${
            gender === 'F'
              ? 'bg-pink-500 text-white'
              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          Girls
        </button>
      </div>

      {/* User dropdown */}
      <div className="relative shrink-0" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(o => !o)}
          className="flex items-center gap-2 px-3 py-1.5 rounded text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <span className="text-xs font-medium max-w-[120px] truncate">{displayName}</span>
          <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {dropdownOpen && (
          <div className={`absolute right-0 top-full mt-1 w-44 rounded shadow-xl z-[200] ${isGirls ? 'bg-rose-800' : 'bg-slate-800'}`} style={{ border: '1px solid rgba(0,0,0,0.3)' }}>
            <Link
              href="/admin/settings"
              className={`flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:text-white ${isGirls ? 'hover:bg-rose-700' : 'hover:bg-slate-700'} transition-colors`}
              onClick={() => setDropdownOpen(false)}
            >
              Settings
            </Link>
            <div style={{ borderTop: '1px solid rgba(0,0,0,0.3)' }} />
            <button
              onClick={handleSignOut}
              className={`w-full text-left flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:text-red-300 ${isGirls ? 'hover:bg-rose-700' : 'hover:bg-slate-700'} transition-colors`}
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

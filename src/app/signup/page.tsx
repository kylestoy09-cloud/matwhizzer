'use client'

import { useState, useEffect, useRef } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import Link from 'next/link'

type SchoolOption = { id: number; display_name: string }

function SchoolPicker({ value, onChange }: { value: SchoolOption | null; onChange: (s: SchoolOption | null) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SchoolOption[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (query.length < 2) { setResults([]); return }
    const supabase = createSupabaseBrowser()
    const timer = setTimeout(async () => {
      const { data } = await supabase.rpc('search_schools', { p_query: query })
      setResults((data ?? []) as SchoolOption[])
      setShowDropdown(true)
    }, 200)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowDropdown(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <label className="block text-xs font-medium text-slate-600 mb-1">School</label>
      {value ? (
        <div className="flex items-center justify-between border border-slate-300 rounded-lg px-3 py-2">
          <span className="text-sm text-slate-800">{value.display_name}</span>
          <button type="button" onClick={() => { onChange(null); setQuery('') }}
            className="text-xs text-slate-400 hover:text-red-500">change</button>
        </div>
      ) : (
        <input
          type="text"
          placeholder="Search for your school..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setShowDropdown(true)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}
      {showDropdown && results.length > 0 && !value && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {results.map(s => (
            <button key={s.id} type="button"
              onClick={() => { onChange(s); setShowDropdown(false); setQuery('') }}
              className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-100 text-slate-800">
              {s.display_name}
            </button>
          ))}
        </div>
      )}
      {showDropdown && query.length >= 2 && results.length === 0 && !value && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-sm text-slate-400">
          No schools found
        </div>
      )}
    </div>
  )
}

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [school, setSchool] = useState<SchoolOption | null>(null)
  const [preference, setPreference] = useState<'boys' | 'girls' | 'both'>('both')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (username.length < 3) { setError('Username must be at least 3 characters'); return }
    if (!school) { setError('Please select your school'); return }

    setLoading(true)
    const supabase = createSupabaseBrowser()

    // Check username availability
    const { data: existing } = await supabase
      .from('users').select('id').eq('username', username).maybeSingle()
    if (existing) { setError('Username is already taken'); setLoading(false); return }

    // Sign up — trigger creates public.users row with school from metadata
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, primary_school_id: String(school.id), wrestling_preference: preference },
      },
    })

    if (authError) { setError(authError.message); setLoading(false); return }

    document.cookie = `wrestling_pref=${preference};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`
    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="max-w-sm mx-auto px-4 py-20 text-center">
        <h1 className="text-xl font-bold text-slate-900 mb-4">Check Your Email</h1>
        <p className="text-sm text-slate-600 mb-6">
          We sent a confirmation link to <span className="font-medium">{email}</span>.
          Click the link to activate your account.
        </p>
        <Link href="/signin" className="text-sm text-blue-600 hover:underline">Go to Sign In</Link>
      </div>
    )
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-20">
      <h1 className="text-xl font-bold text-slate-900 mb-6 text-center">Create Account</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Username</label>
          <input type="text" required value={username} onChange={e => setUsername(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <SchoolPicker value={school} onChange={setSchool} />
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Wrestling Preference</label>
          <div className="flex gap-2">
            {(['boys', 'girls', 'both'] as const).map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => setPreference(opt)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  preference === opt
                    ? opt === 'boys' ? 'bg-slate-900 text-white border-slate-900'
                    : opt === 'girls' ? 'bg-rose-700 text-white border-rose-700'
                    : 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                }`}
              >
                {opt === 'boys' ? 'Boys' : opt === 'girls' ? 'Girls' : 'Both'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Password</label>
          <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Confirm Password</label>
          <input type="password" required value={confirm} onChange={e => setConfirm(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <button type="submit" disabled={loading}
          className="w-full bg-slate-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors">
          {loading ? 'Creating account...' : 'Sign Up'}
        </button>
      </form>
      <p className="text-center text-sm text-slate-500 mt-6">
        Already have an account? <Link href="/signin" className="text-blue-600 hover:underline">Sign in</Link>
      </p>
    </div>
  )
}

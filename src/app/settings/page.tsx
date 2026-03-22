'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

// ── Types ────────────────────────────────────────────────────────────────────

type ProfileData = {
  username: string | null
  primary_school_id: number | null
  followed_school_ids: number[] | null
  followed_wrestler_ids: string[] | null
  wrestling_preference: string | null
}

type SchoolInfo = {
  id: number
  abbreviation: string
  school_name: string
}

type SchoolOption = { id: number; display_name: string }

type WrestlerInfo = {
  id: string
  first_name: string
  last_name: string
  gender: string
}

type Preference = 'boys' | 'girls' | 'both'

// ── School Picker ────────────────────────────────────────────────────────────

function SchoolSearch({ onSelect }: { onSelect: (s: SchoolOption) => void }) {
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
      <input
        type="text"
        placeholder="Search for a school..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => query.length >= 2 && setShowDropdown(true)}
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {showDropdown && results.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {results.map(s => (
            <button key={s.id} type="button"
              onClick={() => { onSelect(s); setShowDropdown(false); setQuery('') }}
              className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-100 text-slate-800">
              {s.display_name}
            </button>
          ))}
        </div>
      )}
      {showDropdown && query.length >= 2 && results.length === 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-sm text-slate-400">
          No schools found
        </div>
      )}
    </div>
  )
}

// ── Wrestler Search ──────────────────────────────────────────────────────────

function WrestlerSearch({ onSelect }: { onSelect: (w: WrestlerInfo) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<WrestlerInfo[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (query.length < 2) { setResults([]); return }
    const supabase = createSupabaseBrowser()
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('wrestlers')
        .select('id, first_name, last_name, gender')
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
        .order('last_name').order('first_name').limit(15)
      setResults((data ?? []) as WrestlerInfo[])
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
      <input
        type="text"
        placeholder="Search by wrestler name..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => query.length >= 2 && setShowDropdown(true)}
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {showDropdown && results.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {results.map(w => (
            <button key={w.id} type="button"
              onClick={() => { onSelect(w); setShowDropdown(false); setQuery('') }}
              className="flex items-center justify-between w-full text-left px-3 py-2 text-sm hover:bg-slate-100 text-slate-800">
              <span>{w.first_name} {w.last_name}</span>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                w.gender === 'F' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {w.gender === 'F' ? 'Girls' : 'Boys'}
              </span>
            </button>
          ))}
        </div>
      )}
      {showDropdown && query.length >= 2 && results.length === 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-sm text-slate-400">
          No wrestlers found
        </div>
      )}
    </div>
  )
}

// ── Settings Page ────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [primarySchool, setPrimarySchool] = useState<SchoolInfo | null>(null)
  const [followedSchools, setFollowedSchools] = useState<SchoolInfo[]>([])
  const [followedWrestlers, setFollowedWrestlers] = useState<WrestlerInfo[]>([])
  const [preference, setPreference] = useState<Preference>('both')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createSupabaseBrowser()

    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/signin'); return }
      setUser(data.user)

      let { data: prof } = await supabase
        .from('users')
        .select('username, primary_school_id, followed_school_ids, followed_wrestler_ids, wrestling_preference')
        .eq('id', data.user.id)
        .maybeSingle()

      // Create row if missing (accounts created before the trigger)
      if (!prof) {
        const username = data.user.user_metadata?.username ?? null
        await supabase.from('users').upsert({
          id: data.user.id,
          username,
          wrestling_preference: 'both',
        })
        prof = { username, primary_school_id: null, followed_school_ids: null, followed_wrestler_ids: null, wrestling_preference: 'both' }
      }

      const p = prof as ProfileData
      setProfile(p)
      setPreference((p.wrestling_preference as Preference) ?? 'both')

      // Fetch schools
      const allSchoolIds = [
        ...(p?.primary_school_id ? [p.primary_school_id] : []),
        ...(p?.followed_school_ids ?? []),
      ]
      if (allSchoolIds.length > 0) {
        const { data: schools } = await supabase
          .from('school_names')
          .select('id, abbreviation, school_name')
          .in('id', allSchoolIds)
        const schoolMap = new Map((schools as SchoolInfo[] ?? []).map(s => [s.id, s]))
        if (p?.primary_school_id && schoolMap.has(p.primary_school_id)) {
          setPrimarySchool(schoolMap.get(p.primary_school_id)!)
        }
        setFollowedSchools(
          (p?.followed_school_ids ?? [])
            .filter(id => id !== p?.primary_school_id && schoolMap.has(id))
            .map(id => schoolMap.get(id)!)
        )
      }

      // Fetch wrestlers
      const wrestlerIds = p?.followed_wrestler_ids ?? []
      if (wrestlerIds.length > 0) {
        const { data: wrestlers } = await supabase
          .from('wrestlers')
          .select('id, first_name, last_name, gender')
          .in('id', wrestlerIds)
        if (wrestlers) setFollowedWrestlers(wrestlers as WrestlerInfo[])
      }

      setLoading(false)
    })
  }, [router])

  // ── Preference ──

  async function handlePreferenceChange(newPref: Preference) {
    if (!user) return
    setPreference(newPref)
    setSaving(true)
    const supabase = createSupabaseBrowser()
    await supabase.from('users').update({ wrestling_preference: newPref }).eq('id', user.id)
    document.cookie = `wrestling_pref=${newPref};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`
    setSaving(false)
  }

  // ── Primary School ──

  async function handleSetPrimary(school: SchoolOption) {
    if (!user || !profile) return
    setSaving(true)
    const supabase = createSupabaseBrowser()
    const { error: dbErr } = await supabase.from('users').update({ primary_school_id: school.id }).eq('id', user.id)
    if (dbErr) { setError(`Failed to save school: ${dbErr.message}`); setSaving(false); return }

    const { data: info } = await supabase
      .from('school_names').select('id, abbreviation, school_name').eq('id', school.id).maybeSingle()
    if (info) setPrimarySchool(info as SchoolInfo)
    setProfile({ ...profile, primary_school_id: school.id })
    setSaving(false)
  }

  async function handleClearPrimary() {
    if (!user || !profile) return
    setSaving(true)
    const supabase = createSupabaseBrowser()
    await supabase.from('users').update({ primary_school_id: null }).eq('id', user.id)
    setPrimarySchool(null)
    setProfile({ ...profile, primary_school_id: null })
    setSaving(false)
  }

  // ── Followed Schools ──

  async function handleAddSchool(school: SchoolOption) {
    if (!user || !profile) return
    const current = profile.followed_school_ids ?? []
    if (current.includes(school.id) || school.id === profile.primary_school_id) return
    setSaving(true)
    const updated = [...current, school.id]
    const supabase = createSupabaseBrowser()
    const { error: dbErr } = await supabase.from('users').update({ followed_school_ids: updated }).eq('id', user.id)
    if (dbErr) { setError(`Failed to save school: ${dbErr.message}`); setSaving(false); return }

    const { data: info } = await supabase
      .from('school_names').select('id, abbreviation, school_name').eq('id', school.id).maybeSingle()
    if (info) setFollowedSchools([...followedSchools, info as SchoolInfo])
    setProfile({ ...profile, followed_school_ids: updated })
    setSaving(false)
  }

  async function handleRemoveSchool(schoolId: number) {
    if (!user || !profile) return
    const updated = (profile.followed_school_ids ?? []).filter(id => id !== schoolId)
    const supabase = createSupabaseBrowser()
    await supabase.from('users').update({ followed_school_ids: updated }).eq('id', user.id)
    setProfile({ ...profile, followed_school_ids: updated })
    setFollowedSchools(followedSchools.filter(s => s.id !== schoolId))
  }

  // ── Followed Wrestlers ──

  async function handleAddWrestler(wrestler: WrestlerInfo) {
    if (!user || !profile) return
    const current = profile.followed_wrestler_ids ?? []
    if (current.includes(wrestler.id)) return
    setSaving(true)
    const updated = [...current, wrestler.id]
    const supabase = createSupabaseBrowser()
    await supabase.from('users').update({ followed_wrestler_ids: updated }).eq('id', user.id)
    setFollowedWrestlers([...followedWrestlers, wrestler])
    setProfile({ ...profile, followed_wrestler_ids: updated })
    setSaving(false)
  }

  async function handleRemoveWrestler(wrestlerId: string) {
    if (!user || !profile) return
    const updated = (profile.followed_wrestler_ids ?? []).filter(id => id !== wrestlerId)
    const supabase = createSupabaseBrowser()
    await supabase.from('users').update({ followed_wrestler_ids: updated }).eq('id', user.id)
    setProfile({ ...profile, followed_wrestler_ids: updated })
    setFollowedWrestlers(followedWrestlers.filter(w => w.id !== wrestlerId))
  }

  // ── Helpers ──

  function schoolHref(abbreviation: string) {
    const base = preference === 'girls' ? '/girls' : '/boys'
    return `${base}/schools/${encodeURIComponent(abbreviation)}`
  }

  const totalSchools = (primarySchool ? 1 : 0) + followedSchools.length

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <p className="text-sm text-slate-500">Loading settings...</p>
      </div>
    )
  }

  if (!user || !profile) return null

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <h1 className="text-xl font-bold text-slate-900 mb-6">Settings</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-6">
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="text-xs text-red-500 hover:underline mt-1">dismiss</button>
        </div>
      )}

      {/* ── Account ── */}
      <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-sm font-semibold text-slate-800 mb-4">Account</h2>
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-slate-500 mb-0.5">Username</p>
            <p className="text-sm font-semibold text-slate-900">{profile.username ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 mb-0.5">Email</p>
            <p className="text-sm text-slate-700">{user.email}</p>
          </div>
        </div>
      </section>

      {/* ── Wrestling Preference ── */}
      <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-sm font-semibold text-slate-800 mb-3">Wrestling Preference</h2>
        <div className="flex gap-2">
          {(['boys', 'girls', 'both'] as const).map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => handlePreferenceChange(opt)}
              disabled={saving}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                preference === opt
                  ? opt === 'boys' ? 'bg-slate-900 text-white border-slate-900'
                  : opt === 'girls' ? 'bg-rose-700 text-white border-rose-700'
                  : 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
              } disabled:opacity-50`}
            >
              {opt === 'boys' ? 'Boys' : opt === 'girls' ? 'Girls' : 'Both'}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-slate-400 mt-1.5">
          {preference === 'both'
            ? 'Homepage shows combined boys and girls content'
            : `Homepage defaults to ${preference} wrestling`}
        </p>
      </section>

      {/* ── Schools ── */}
      <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-sm font-semibold text-slate-800 mb-4">Schools</h2>

        {/* Primary School */}
        <div className="mb-4">
          <p className="text-xs font-medium text-slate-500 mb-1.5">Primary School</p>
          {primarySchool ? (
            <div className="flex items-center justify-between border border-blue-200 bg-blue-50 rounded-lg px-3 py-2.5">
              <Link href={schoolHref(primarySchool.abbreviation)} className="text-sm font-medium text-blue-800 hover:underline">
                {primarySchool.school_name}
              </Link>
              <button onClick={handleClearPrimary} className="text-xs text-slate-400 hover:text-red-500">change</button>
            </div>
          ) : (
            <SchoolSearch onSelect={handleSetPrimary} />
          )}
          {totalSchools === 1 && primarySchool && (
            <p className="text-[11px] text-blue-500 mt-1">Your homepage will feature {primarySchool.school_name}</p>
          )}
        </div>

        {/* Followed Schools */}
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1.5">Following</p>
          {followedSchools.length > 0 && (
            <div className="space-y-1.5 mb-3">
              {followedSchools.map(s => (
                <div key={s.id} className="flex items-center justify-between border border-slate-200 rounded-lg px-3 py-2">
                  <Link href={schoolHref(s.abbreviation)} className="text-sm font-medium text-slate-800 hover:text-blue-600 hover:underline">
                    {s.school_name}
                  </Link>
                  <button onClick={() => handleRemoveSchool(s.id)} className="text-xs text-slate-400 hover:text-red-500">remove</button>
                </div>
              ))}
            </div>
          )}
          <SchoolSearch onSelect={handleAddSchool} />
        </div>
      </section>

      {/* ── Wrestlers ── */}
      <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <h2 className="text-sm font-semibold text-slate-800 mb-4">Wrestlers</h2>
        {followedWrestlers.length > 0 && (
          <div className="space-y-1.5 mb-3">
            {followedWrestlers.map(w => (
              <div key={w.id} className="flex items-center justify-between border border-slate-200 rounded-lg px-3 py-2">
                <Link href={`/wrestler/${w.id}`} className="text-sm font-medium text-slate-800 hover:text-blue-600 hover:underline">
                  {w.first_name} {w.last_name}
                </Link>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                    w.gender === 'F' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {w.gender === 'F' ? 'Girls' : 'Boys'}
                  </span>
                  <button onClick={() => handleRemoveWrestler(w.id)} className="text-xs text-slate-400 hover:text-red-500">remove</button>
                </div>
              </div>
            ))}
          </div>
        )}
        <WrestlerSearch onSelect={handleAddWrestler} />
        {followedWrestlers.length === 0 && (
          <p className="text-[11px] text-slate-400 mt-2">Follow wrestlers to track them across tournaments</p>
        )}
      </section>
    </div>
  )
}

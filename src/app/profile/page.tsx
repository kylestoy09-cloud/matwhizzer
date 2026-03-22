'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

type ProfileData = {
  username: string | null
  primary_school_id: number | null
  followed_school_ids: number[] | null
  wrestling_preference: string | null
}

type SchoolInfo = {
  id: number
  abbreviation: string
  school_name: string
}

type Preference = 'boys' | 'girls' | 'both'

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [primarySchool, setPrimarySchool] = useState<SchoolInfo | null>(null)
  const [followedSchools, setFollowedSchools] = useState<SchoolInfo[]>([])
  const [preference, setPreference] = useState<Preference>('both')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createSupabaseBrowser()

    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.push('/signin')
        return
      }
      setUser(data.user)

      const { data: prof } = await supabase
        .from('users')
        .select('username, primary_school_id, followed_school_ids, wrestling_preference')
        .eq('id', data.user.id)
        .maybeSingle()

      const p = prof as ProfileData | null
      setProfile(p)
      setPreference((p?.wrestling_preference as Preference) ?? 'both')

      // Fetch all school info in one query
      const allIds = [
        ...(p?.primary_school_id ? [p.primary_school_id] : []),
        ...(p?.followed_school_ids ?? []),
      ]
      if (allIds.length > 0) {
        const { data: schools } = await supabase
          .from('school_names')
          .select('id, abbreviation, school_name')
          .in('id', allIds)
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

      setLoading(false)
    })
  }, [router])

  async function handlePreferenceChange(newPref: Preference) {
    if (!user) return
    setPreference(newPref)
    setSaving(true)

    const supabase = createSupabaseBrowser()
    await supabase
      .from('users')
      .update({ wrestling_preference: newPref })
      .eq('id', user.id)

    // Update cookie for middleware redirect
    document.cookie = `wrestling_pref=${newPref};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`
    setSaving(false)
  }

  async function handleUnfollow(schoolId: number) {
    if (!user || !profile) return
    const supabase = createSupabaseBrowser()
    const updated = (profile.followed_school_ids ?? []).filter(id => id !== schoolId)
    await supabase
      .from('users')
      .update({ followed_school_ids: updated })
      .eq('id', user.id)
    setProfile({ ...profile, followed_school_ids: updated })
    setFollowedSchools(followedSchools.filter(s => s.id !== schoolId))
  }

  function schoolHref(abbreviation: string) {
    const base = preference === 'girls' ? '/girls' : '/boys'
    return `${base}/schools/${encodeURIComponent(abbreviation)}`
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <p className="text-sm text-slate-500">Loading profile...</p>
      </div>
    )
  }

  if (!user || !profile) return null

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <h1 className="text-xl font-bold text-slate-900 mb-6">Profile</h1>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-5">
        {/* Username */}
        <div>
          <p className="text-xs font-medium text-slate-500 mb-0.5">Username</p>
          <p className="text-sm font-semibold text-slate-900">{profile.username ?? '—'}</p>
        </div>

        {/* Primary School */}
        <div>
          <p className="text-xs font-medium text-slate-500 mb-0.5">Primary School</p>
          {primarySchool ? (
            <Link
              href={schoolHref(primarySchool.abbreviation)}
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              {primarySchool.school_name}
            </Link>
          ) : (
            <p className="text-sm text-slate-400">None selected</p>
          )}
        </div>

        {/* Wrestling Preference */}
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1.5">Wrestling Preference</p>
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
          <p className="text-[11px] text-slate-400 mt-1">
            {preference === 'both'
              ? 'Homepage shows combined boys and girls content'
              : `Homepage defaults to ${preference} wrestling`}
          </p>
        </div>
      </div>

      {/* Following */}
      <div className="mt-8">
        <h2 className="text-base font-semibold text-slate-800 mb-3">Following</h2>
        {followedSchools.length === 0 ? (
          <p className="text-sm text-slate-400">
            You aren&apos;t following any schools yet. Visit a school page to follow them.
          </p>
        ) : (
          <div className="space-y-2">
            {followedSchools.map(s => (
              <div
                key={s.id}
                className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-4 py-3 shadow-sm"
              >
                <Link
                  href={schoolHref(s.abbreviation)}
                  className="text-sm font-medium text-slate-800 hover:text-blue-600 hover:underline"
                >
                  {s.school_name}
                </Link>
                <button
                  onClick={() => handleUnfollow(s.id)}
                  className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                >
                  Unfollow
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

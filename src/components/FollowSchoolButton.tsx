'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createSupabaseBrowser } from '@/lib/supabase/client'

export function FollowSchoolButton({ schoolAbbreviation }: { schoolAbbreviation: string }) {
  const [schoolId, setSchoolId] = useState<number | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [following, setFollowing] = useState(false)
  const [isPrimary, setIsPrimary] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showSignIn, setShowSignIn] = useState(false)

  useEffect(() => {
    const supabase = createSupabaseBrowser()

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      setUserId(user.id)

      const { data: school } = await supabase
        .from('school_names')
        .select('id')
        .eq('abbreviation', schoolAbbreviation)
        .maybeSingle()

      if (!school) { setLoading(false); return }
      const sid = (school as { id: number }).id
      setSchoolId(sid)

      const { data: profile } = await supabase
        .from('users')
        .select('primary_school_id, followed_school_ids')
        .eq('id', user.id)
        .maybeSingle()

      if (profile) {
        const p = profile as { primary_school_id: number | null; followed_school_ids: number[] | null }
        setIsPrimary(p.primary_school_id === sid)
        setFollowing((p.followed_school_ids ?? []).includes(sid))
      }
      setLoading(false)
    }

    load()
  }, [schoolAbbreviation])

  async function handleToggle() {
    // Not logged in — show sign-in prompt
    if (!userId) {
      setShowSignIn(true)
      return
    }
    if (!schoolId) return
    setLoading(true)
    const supabase = createSupabaseBrowser()

    const { data: profile } = await supabase
      .from('users')
      .select('followed_school_ids')
      .eq('id', userId)
      .maybeSingle()

    const current = ((profile as { followed_school_ids: number[] | null } | null)?.followed_school_ids) ?? []

    let updated: number[]
    if (following) {
      updated = current.filter(id => id !== schoolId)
    } else {
      updated = [...current, schoolId]
    }

    await supabase
      .from('users')
      .update({ followed_school_ids: updated })
      .eq('id', userId)

    setFollowing(!following)
    setLoading(false)
  }

  if (loading) return null

  // Sign-in prompt for non-logged-in users
  if (showSignIn && !userId) {
    return (
      <div className="inline-flex items-center gap-2">
        <Link
          href="/signin"
          className="text-xs px-3 py-1.5 rounded-full font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          Sign in to follow
        </Link>
      </div>
    )
  }

  return (
    <div className="inline-flex items-center gap-2">
      {isPrimary && (
        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
          Your School
        </span>
      )}
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
          following
            ? 'bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        } disabled:opacity-50`}
      >
        {following ? 'Following' : 'Follow'}
      </button>
    </div>
  )
}

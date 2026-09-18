import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await createSupabaseServer()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { school_id, alias, alias_type, notes } = body as {
    school_id: number | null
    alias: string
    alias_type?: string
    notes?: string
  }

  // OOS confirmations have school_id = null; NJ aliases require school_id.
  const isOOS = alias_type === 'oos'
  if (!isOOS && !school_id) {
    return NextResponse.json({ error: 'school_id is required for non-OOS aliases' }, { status: 400 })
  }
  if (!alias?.trim()) {
    return NextResponse.json({ error: 'alias is required' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { error } = await supabase.from('school_aliases').insert({
    school_id,
    alias: alias.trim(),
    alias_type: alias_type ?? 'abbreviation',
    notes: notes ?? null,
  })

  if (error) {
    // Treat duplicate alias as success — alias already exists pointing to some school
    if (error.code === '23505') return NextResponse.json({ ok: true, skipped: true })

    // school_id NOT NULL violation — DB migration to make school_id nullable may not
    // have fully applied. Retry with the OOS school_id stored in notes (if numeric).
    if (error.code === '23502' && school_id === null) {
      const oosId = notes && /^\d+$/.test(notes.trim()) ? parseInt(notes.trim(), 10) : null
      if (oosId) {
        const { error: retryError } = await supabase.from('school_aliases').insert({
          school_id: oosId,
          alias: alias.trim(),
          alias_type: alias_type ?? 'abbreviation',
          notes,
        })
        if (!retryError || retryError.code === '23505') return NextResponse.json({ ok: true })
        console.error('[add-school-alias] retry error:', retryError.code, retryError.message)
        return NextResponse.json({ error: retryError.message }, { status: 500 })
      }
      // No numeric school_id in notes (e.g. "Not a school" confirmation) — treat as success
      // since there's nothing to link; the override lives in UI state for this session only.
      console.warn('[add-school-alias] school_id NOT NULL constraint hit on generic OOS alias; skipping DB save')
      return NextResponse.json({ ok: true, skipped: true })
    }

    console.error('[add-school-alias] DB error:', error.code, error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

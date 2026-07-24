import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import type { PipeImportJSON } from '@/app/admin/import-tournament/types'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await createSupabaseServer()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { payload: PipeImportJSON; filename: string }
  const { payload, filename } = body
  if (!payload || !filename) {
    return NextResponse.json({ error: 'payload and filename are required' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Primary flags = schools requiring explicit decisions + wrestler issues + new wrestlers.
  // fuzzy_school_count/fuzzy_wrestler_count are optional review items — not counted in total_flags
  // so they don't inflate the "X of Y resolved" denominator on the list page.
  const total_flags =
    (payload.summary.flagged_school_count ?? 0) +
    (payload.summary.flagged_wrestler_count ?? 0) +
    (payload.summary.new_wrestler_count ?? 0)

  const { data, error } = await supabase
    .from('staged_imports')
    .insert({
      filename,
      source_format: payload.source_format,
      status: 'in_review',
      payload,
      total_bouts: payload.summary.total_bouts,
      total_flags,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ import_id: data.id })
}

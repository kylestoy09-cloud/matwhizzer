import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const userSupabase = await createSupabaseServer()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) return { user: null }
  const { data: appUser } = await userSupabase.from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') return { user: null }
  return { user }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db() { return createClient<any>(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', process.env.SUPABASE_SERVICE_ROLE_KEY ?? '') }

// GET /api/admin/content/layout?page_type=wrestler_profile
// Returns sections for the given page type, ordered by display_order.
export async function GET(req: NextRequest) {
  const { user } = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const pageType = req.nextUrl.searchParams.get('page_type')
  if (!pageType) return NextResponse.json({ error: 'page_type required' }, { status: 400 })

  const { data, error } = await db()
    .from('page_sections')
    .select('id, section_key, display_order, is_visible')
    .eq('page_type', pageType)
    .order('display_order')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sections: data ?? [] })
}

// POST /api/admin/content/layout
// Body: { page_type: string, sections: {section_key, display_order, is_visible}[] }
// Upserts all sections for the given page type.
export async function POST(req: NextRequest) {
  const { user } = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { page_type, sections } = body as {
    page_type: string
    sections: { section_key: string; display_order: number; is_visible: boolean }[]
  }

  if (!page_type || !Array.isArray(sections)) {
    return NextResponse.json({ error: 'page_type and sections required' }, { status: 400 })
  }

  const rows = sections.map(s => ({
    page_type,
    section_key: s.section_key,
    display_order: s.display_order,
    is_visible: s.is_visible,
  }))

  const { error } = await db()
    .from('page_sections')
    .upsert(rows, { onConflict: 'page_type,section_key' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  try {
    await db().rpc('log_admin_activity', {
      p_action: 'update_page_layout',
      p_entity_type: 'page_sections',
      p_entity_id: page_type,
      p_details: { section_count: sections.length },
    })
  } catch { /* non-fatal */ }

  return NextResponse.json({ ok: true })
}

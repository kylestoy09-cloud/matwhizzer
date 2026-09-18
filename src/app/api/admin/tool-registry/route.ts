import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const userSb = await createSupabaseServer()
  const { data: { user } } = await userSb.auth.getUser()
  if (!user) return null
  const db = createSupabaseAdmin()
  const { data: appUser } = await db.from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') return null
  return user
}

export type ToolRegistryRow = {
  key: string
  label: string
  path: string
  description: string | null
  gender: string
  show_offseason: boolean
  show_preseason: boolean
  show_season: boolean
  show_postseason: boolean
}

// GET /api/admin/tool-registry
// Returns all tools; optionally filtered by ?phase=preseason|season|postseason|offseason
export async function GET(req: NextRequest) {
  const db = createSupabaseAdmin()
  const url    = new URL(req.url)
  const phase  = url.searchParams.get('phase')
  const gender = url.searchParams.get('gender') // 'M' | 'F' | null

  const { data, error } = await db.from('admin_tool_registry').select('*').order('label')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let tools = (data ?? []) as ToolRegistryRow[]

  // Filter to only tools enabled for the requested phase
  if (phase === 'offseason')  tools = tools.filter(t => t.show_offseason)
  if (phase === 'preseason')  tools = tools.filter(t => t.show_preseason)
  if (phase === 'season')     tools = tools.filter(t => t.show_season)
  if (phase === 'postseason') tools = tools.filter(t => t.show_postseason)

  // Filter to gender-appropriate tools only
  if (gender === 'M') tools = tools.filter(t => t.gender === 'both' || t.gender === 'boys')
  if (gender === 'F') tools = tools.filter(t => t.gender === 'both' || t.gender === 'girls')

  return NextResponse.json({ tools })
}

// POST /api/admin/tool-registry
// body: { tools: Array<{ key, show_offseason, show_preseason, show_season, show_postseason }> }
export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { tools } = body as {
    tools: Array<{ key: string; show_offseason: boolean; show_preseason: boolean; show_season: boolean; show_postseason: boolean }>
  }
  if (!tools?.length) return NextResponse.json({ error: 'No tools provided' }, { status: 400 })

  const db = createSupabaseAdmin()

  // Update each tool's phase flags
  const updates = tools.map(t =>
    db.from('admin_tool_registry').update({
      show_offseason:  t.show_offseason,
      show_preseason:  t.show_preseason,
      show_season:     t.show_season,
      show_postseason: t.show_postseason,
      updated_at: new Date().toISOString(),
    }).eq('key', t.key)
  )

  const results = await Promise.all(updates)
  const firstError = results.find(r => r.error)
  if (firstError?.error) return NextResponse.json({ error: firstError.error.message }, { status: 500 })

  return NextResponse.json({ ok: true, updated: tools.length })
}

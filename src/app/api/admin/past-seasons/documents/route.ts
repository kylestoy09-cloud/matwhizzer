import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

const BUCKET = 'njsiaa-documents'

// NJSIAA originals the archived copies were downloaded from, by storage path.
const SOURCE_URLS: Record<string, string> = {
  '2026/boys/regular-season-rules.pdf':       'https://www.njsiaa.org/sites/default/files/documents/2025-09/boys-wrestling-regular-season-rules-2025-26.pdf',
  '2026/boys/team-tournament-regs.pdf':       'https://www.njsiaa.org/sites/default/files/documents/2025-11/wrestling-boys-team-regs-2025-26.pdf',
  '2026/boys/individual-tournament-regs.pdf': 'https://www.njsiaa.org/sites/default/files/documents/2025-11/wrestling-boys-individual-regs-2025-26.pdf',
}

async function requireAdmin() {
  const userSb = await createSupabaseServer()
  const { data: { user } } = await userSb.auth.getUser()
  if (!user) return null
  const { data: appUser } = await userSb.from('app_users').select('role').eq('id', user.id).single()
  return appUser?.role === 'admin' ? user : null
}

// GET ?end_year=2026&gender=M — archived NJSIAA PDFs for that season and program
export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const endYear = parseInt(req.nextUrl.searchParams.get('end_year') ?? '')
  if (!Number.isInteger(endYear)) return NextResponse.json({ error: 'end_year required' }, { status: 400 })
  const program = req.nextUrl.searchParams.get('gender') === 'F' ? 'girls' : 'boys'
  const prefix = `${endYear}/${program}`

  const storage = createSupabaseAdmin().storage.from(BUCKET)
  const { data, error } = await storage.list(prefix, { sortBy: { column: 'name', order: 'asc' } })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const documents = (data ?? [])
    .filter(f => f.name.endsWith('.pdf'))
    .map(f => {
      const path = `${prefix}/${f.name}`
      return {
        name:       f.name,
        size:       (f.metadata as { size?: number } | null)?.size ?? null,
        archivedAt: f.created_at,
        url:        storage.getPublicUrl(path).data.publicUrl,
        sourceUrl:  SOURCE_URLS[path] ?? null,
      }
    })

  return NextResponse.json({ documents })
}

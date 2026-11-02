import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { parseMsResults } from '@/lib/parseMsResults'
import { isAdminUser } from '@/lib/auth/isAdminUser'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await isAdminUser(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let text: string
  try {
    const body = await req.json()
    text = body.text ?? ''
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (!text.trim()) {
    return NextResponse.json({ error: 'No text provided' }, { status: 400 })
  }

  const result = parseMsResults(text)
  return NextResponse.json(result)
}

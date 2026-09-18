import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { parseMsResults } from '@/lib/parseMsResults'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let text: string
  try {
    const body = await req.json()
    text = body.text ?? ''
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (!text.trim()) return NextResponse.json({ error: 'No text provided' }, { status: 400 })

  return NextResponse.json(parseMsResults(text))
}

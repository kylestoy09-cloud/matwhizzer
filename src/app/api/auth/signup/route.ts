// Sign-up: creates the account and emails the confirmation link through Resend (src/lib/authEmail.ts).
// The account's details (username, school, boys / girls preference) go in as user metadata, as the
// signup page sent them before; the database trigger makes the public.users row from them.
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { sendAuthEmail } from '@/lib/authEmail'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  const username = typeof body?.username === 'string' ? body.username.trim() : ''
  if (!email || !password) return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  if (password.length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  if (username.length < 3) return NextResponse.json({ error: 'Username must be at least 3 characters' }, { status: 400 })

  const { data: taken } = await createSupabaseAdmin().from('users').select('id').eq('username', username).maybeSingle()
  if (taken) return NextResponse.json({ error: 'Username is already taken' }, { status: 409 })

  const data: Record<string, unknown> = { username, wrestling_preference: body?.wrestling_preference ?? 'both' }
  if (body?.primary_school_id) data.primary_school_id = String(body.primary_school_id)

  const { error } = await sendAuthEmail({ type: 'signup', email, password, data })
  if (error) {
    const msg = /already|registered|exists/i.test(error) ? 'An account with this email already exists. Try signing in or resetting your password.' : error
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  return NextResponse.json({ ok: true })
}

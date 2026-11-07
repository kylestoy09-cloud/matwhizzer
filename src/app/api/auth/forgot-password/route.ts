// Public "Forgot password": emails a reset link through Resend (src/lib/authEmail.ts). The answer is the
// same whether or not the address has an account, so the form can't be used to find accounts.
import { NextRequest, NextResponse } from 'next/server'
import { sendAuthEmail } from '@/lib/authEmail'

export async function POST(req: NextRequest) {
  const { email } = await req.json().catch(() => ({}))
  if (!email || typeof email !== 'string') return NextResponse.json({ error: 'Email is required' }, { status: 400 })

  const { error } = await sendAuthEmail({ type: 'recovery', email: email.trim().toLowerCase() })
  if (error && !/not.?found|no user/i.test(error)) {
    console.error('[forgot-password]', error)
    return NextResponse.json({ error: 'Something went wrong sending the email. Please try again.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

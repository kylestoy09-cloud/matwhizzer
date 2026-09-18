import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data, error } = await db.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: 'https://matwhizzer.com/auth/reset-password' },
  })

  if (error) {
    console.error('generateLink error:', error.message)
    return NextResponse.json({ error: 'Could not generate reset link.' }, { status: 400 })
  }

  const resetUrl = data.properties?.action_link
  if (!resetUrl) return NextResponse.json({ error: 'No reset link returned.' }, { status: 500 })

  const { error: emailError } = await resend.emails.send({
    from: 'Mat Whizzer <noreply@matwhizzer.com>',
    to: email,
    subject: 'Reset your Mat Whizzer password',
    html: `
      <p>You requested a password reset for your Mat Whizzer account.</p>
      <p><a href="${resetUrl}" style="background:#1e293b;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;display:inline-block;">Reset Password</a></p>
      <p style="color:#64748b;font-size:13px;">If you didn't request this, you can ignore this email. The link expires in 1 hour.</p>
    `,
  })

  if (emailError) {
    console.error('Resend error:', emailError)
    return NextResponse.json({ error: 'Failed to send email. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

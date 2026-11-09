import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code       = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type       = searchParams.get('type')

  // Build the redirect response first so we can attach session cookies to it
  // reset and invite links open the set-a-password page; sign-up confirmations the confirmed page
  const dest = (type === 'recovery' || type === 'invite') ? '/auth/reset-password' : '/email-confirmed'
  const redirectResponse = NextResponse.redirect(new URL(dest, origin))
  // a used or expired reset / invite link: say so on the set-a-password page, with a way to get a new one
  // An old-style link (sent before 2026-11-07) carries its details after a '#', which never reaches the server,
  // so it arrives with no code, token or type: treat it as an expired password link, not a sign-in error.
  const passwordLink = type === 'recovery' || type === 'invite' || (!code && !token_hash)
  const failResponse     = NextResponse.redirect(new URL(passwordLink ? '/auth/reset-password?expired=1' : '/signin?error=confirmation-failed', origin))

  // Supabase client that writes session cookies onto the redirect response
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            redirectResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return redirectResponse
  }

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type: type as EmailOtpType })
    if (!error) return redirectResponse
  }

  return failResponse
}

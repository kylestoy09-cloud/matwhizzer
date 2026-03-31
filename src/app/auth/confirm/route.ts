import { createSupabaseServer } from '@/lib/supabase/server'
import { type NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as 'signup' | 'email' | 'recovery' | null
  const next = searchParams.get('next') ?? '/'

  if (token_hash && type) {
    const supabase = await createSupabaseServer()
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })

    if (!error) {
      return NextResponse.redirect(new URL('/email-confirmed', request.url))
    }
  }

  // If verification fails, redirect to sign-in with an error hint
  return NextResponse.redirect(new URL('/signin?error=confirmation-failed', request.url))
}

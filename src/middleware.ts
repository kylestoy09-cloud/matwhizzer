import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Homepage personalization: redirect based on wrestling preference cookie
  if (pathname === '/') {
    const pref = request.cookies.get('wrestling_pref')?.value
    if (pref === 'boys') return NextResponse.redirect(new URL('/boys', request.url))
    if (pref === 'girls') return NextResponse.redirect(new URL('/girls', request.url))
    return NextResponse.next()
  }

  // Only protect /admin routes (except the login page itself)
  if (!pathname.startsWith('/admin')) return NextResponse.next()
  if (pathname === '/admin/login') return handleSessionRefresh(request)

  // --- Auth gate for /admin/* ---
  const { response, supabase } = createSupabaseMiddlewareClient(request)

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  // Check admin role in app_users
  const { data: appUser } = await supabase
    .from('app_users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!appUser || appUser.role !== 'admin') {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  return response
}

/** Refresh session cookies on the login page so a logged-in admin gets fresh tokens. */
function handleSessionRefresh(request: NextRequest) {
  const { response } = createSupabaseMiddlewareClient(request)
  return response
}

function createSupabaseMiddlewareClient(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  return { response, supabase }
}

export const config = {
  matcher: ['/', '/admin/:path*'],
}

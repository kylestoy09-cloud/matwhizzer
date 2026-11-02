import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { routeAdmin } from '@/lib/admin-routing'
import { isAdminUser } from '@/lib/auth/isAdminUser'

// The gate in front of the admin panel: every /admin page and every /api/admin route.
// Only admins (app_users.role = 'admin') get through; signing in is not enough, fans have
// accounts too. The daily crons call /api/admin with Authorization: Bearer <CRON_SECRET>.
// (Next 16 runs proxy.ts on the Node.js runtime, so the role lookup here is fine; the old
// Edge middleware couldn't do it in time.) Each admin route also checks on its own, and
// scripts/check-admin-routes.mjs fails the build if one doesn't.

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Homepage personalization: redirect based on wrestling preference cookie
  if (pathname === '/') {
    const pref = request.cookies.get('wrestling_pref')?.value
    if (pref === 'boys') return NextResponse.redirect(new URL('/boys', request.url))
    if (pref === 'girls') return NextResponse.redirect(new URL('/girls', request.url))
    return NextResponse.next()
  }

  const isApi = pathname.startsWith('/api/admin')
  if (!isApi && !pathname.startsWith('/admin')) return NextResponse.next()
  if (pathname === '/admin/login') return NextResponse.redirect(new URL('/signin', request.url))

  if (isApi) {
    const secret = process.env.CRON_SECRET
    if (secret && (request.headers.get('authorization') === `Bearer ${secret}` || request.headers.get('x-cron-secret') === secret)) {
      return NextResponse.next()
    }
  }

  const { response, supabase } = createSupabaseProxyClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return isApi
      ? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      : NextResponse.redirect(new URL('/signin', request.url))
  }
  if (!(await isAdminUser(user.id))) {
    return isApi
      ? NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      : NextResponse.redirect(new URL('/', request.url))
  }

  return isApi ? response : routeAdmin(request, response)
}

function createSupabaseProxyClient(request: NextRequest) {
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
  matcher: ['/', '/admin/:path*', '/api/admin/:path*'],
}

import { NextResponse, type NextRequest } from 'next/server'
import {
  ADMIN_SIDE_COOKIE, UNIVERSAL_ADMIN_SEGMENTS, isAdminSide, sideFromPath, type AdminSide,
} from '@/lib/admin-side'

// Old addresses of tools that had a separate page per gender: [old path, side, new path]
const LEGACY_GENDER_PAGES: [string, AdminSide, string][] = [
  ['/snapshot-girls',            'girls', '/snapshot'],
  ['/rankings-hub-girls',        'girls', '/rankings-hub'],
  ['/resolve-unknowns-girls',    'girls', '/resolve-unknowns'],
  ['/roster-grade-import-girls', 'girls', '/roster-grade-import'],
  ['/past-seasons-girls',        'girls', '/past-seasons'],
  ['/import-jamboree-girls',     'girls', '/import-jamboree'],
  ['/import-girls',              'girls', '/import'],
  ['/import-boys',               'boys',  '/import'],
  ['/rankings/individual-girls', 'girls', '/rankings/individual'],
  ['/rankings/team-girls',       'girls', '/rankings/team'],
]

/** A tool path (no /admin, no side) rewritten off any old per-gender address. */
function normalizeToolPath(path: string): { side: AdminSide | null; path: string } {
  for (const [old, side, now] of LEGACY_GENDER_PAGES) {
    if (path === old || path.startsWith(old + '/')) return { side, path: now + path.slice(old.length) }
  }
  return { side: null, path }
}

/**
 * Admin addresses. Gender tools live at /admin/boys/... and /admin/girls/...;
 * the side visited last is remembered in a cookie. An address without a side
 * (an old bookmark, a stored link, a link inside a tool) is sent to the side
 * the click came from, else the remembered side.
 */
export function routeAdmin(request: NextRequest, response: NextResponse): NextResponse {
  const { pathname, search } = request.nextUrl
  const remembered = request.cookies.get(ADMIN_SIDE_COOKIE)?.value
  const rest = pathname.replace(/^\/admin/, '').replace(/\/$/, '')
  // The side of the page the click came from: per tab, unlike the cookie
  let fromSide: AdminSide | null = null
  try { fromSide = sideFromPath(new URL(request.headers.get('referer') ?? '').pathname) } catch {}
  const knownSide = fromSide ?? (isAdminSide(remembered) ? remembered : null)

  if (rest === '') {
    if (knownSide) return NextResponse.redirect(new URL(`/admin/${knownSide}${search}`, request.url))
    return response
  }

  const first = rest.split('/')[1]
  if ((UNIVERSAL_ADMIN_SEGMENTS as readonly string[]).includes(first)) return response
  if (rest === '/content/layout') return NextResponse.redirect(new URL(`/admin/page-layout${search}`, request.url))

  if (isAdminSide(first)) {
    const tool = normalizeToolPath(rest.slice(first.length + 1))
    if (tool.side || tool.path !== rest.slice(first.length + 1)) {
      return NextResponse.redirect(new URL(`/admin/${tool.side ?? first}${tool.path}${search}`, request.url))
    }
    if (remembered !== first) {
      response.cookies.set(ADMIN_SIDE_COOKIE, first, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
    }
    return response
  }

  const tool = normalizeToolPath(rest)
  const side = tool.side ?? knownSide ?? 'boys'
  return NextResponse.redirect(new URL(`/admin/${side}${tool.path}${search}`, request.url))
}


// The admin has a boys side and a girls side: every gender tool lives at
// /admin/boys/<tool> or /admin/girls/<tool>, and the address decides the gender.
// Universal tools (settings, microcheck, chat, finances, build health) keep plain
// /admin/<tool> addresses and belong to neither side.

export type AdminSide = 'boys' | 'girls'
export type AdminGenderCode = 'M' | 'F'

export const ADMIN_SIDE_COOKIE = 'mw_admin_side'

/** Top-level /admin/<segment> folders that are not on a side. */
export const UNIVERSAL_ADMIN_SEGMENTS = [
  'login',
  'microcheck',
  'chat',
  'finances',
  'build-health',
  'help-desk',
  'admin-profiles',
  'activity-log',
  'data-browser',
  'data-health',
  'page-layout',
  'homepage-test',
] as const

export const sideOfGender = (g: AdminGenderCode): AdminSide => (g === 'F' ? 'girls' : 'boys')
export const genderOfSide = (s: AdminSide): AdminGenderCode => (s === 'girls' ? 'F' : 'M')
export const isAdminSide = (s: unknown): s is AdminSide => s === 'boys' || s === 'girls'
export const sideLabel = (s: AdminSide) => (s === 'girls' ? 'Girls' : 'Boys')

/** 'boys' / 'girls' when the path is on a side, otherwise null. */
export function sideFromPath(pathname: string | null | undefined): AdminSide | null {
  const m = /^\/admin\/(boys|girls)(?:\/|$)/.exec(pathname ?? '')
  return m ? (m[1] as AdminSide) : null
}

/** `/admin/<side><path>`; path is the tool path without the side, e.g. '/team-scores'. */
export function adminHref(side: AdminSide, path = ''): string {
  return `/admin/${side}${path === '/' ? '' : path}`
}

// A record id in a path: all digits, or a uuid
const ID_SEGMENT = /^(\d+|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i

/**
 * The same tool on the other side. A record page (a school, a wrestler, a
 * tournament) has no counterpart on the other side, so the path stops at the
 * tool's own page before the first record id.
 */
export function swapSidePath(pathname: string, to: AdminSide): string {
  const rest = pathname.replace(/^\/admin\/(boys|girls)/, '')
  const kept: string[] = []
  for (const seg of rest.split('/').filter(Boolean)) {
    if (ID_SEGMENT.test(seg)) break
    kept.push(seg)
  }
  return adminHref(to, kept.length ? '/' + kept.join('/') : '')
}

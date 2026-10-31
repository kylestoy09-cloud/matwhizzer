// Checks the admin address rules in src/lib/admin-routing.ts.
// Run: npx tsx scripts/test_admin_routing.mts
import { NextRequest, NextResponse } from 'next/server'
import { routeAdmin } from '../src/lib/admin-routing'

const BASE = 'https://www.matwhizzer.com'
type Case = { path: string; referer?: string; cookie?: string; expect: string | 'pass'; setsCookie?: string }
const cases: Case[] = [
  { path: '/admin', expect: 'pass' },                                              // no side known: chooser
  { path: '/admin', cookie: 'girls', expect: '/admin/girls' },
  { path: '/admin', referer: '/admin/boys/team-scores', cookie: 'girls', expect: '/admin/boys' },
  { path: '/admin/girls/team-scores', expect: 'pass', setsCookie: 'girls' },
  { path: '/admin/boys/team-scores', cookie: 'boys', expect: 'pass' },
  { path: '/admin/finances', expect: 'pass' },
  { path: '/admin/help-desk', cookie: 'girls', expect: 'pass' },
  { path: '/admin/microcheck/cant-find', expect: 'pass' },
  { path: '/admin/content/layout', expect: '/admin/page-layout' },
  { path: '/admin/team-scores', referer: '/admin/girls/season', cookie: 'boys', expect: '/admin/girls/team-scores' },
  { path: '/admin/team-scores', cookie: 'girls', expect: '/admin/girls/team-scores' },
  { path: '/admin/team-scores', expect: '/admin/boys/team-scores' },
  { path: '/admin/schools/123?tab=x', referer: '/admin/girls/schools', expect: '/admin/girls/schools/123?tab=x' },
  { path: '/admin/snapshot-girls', referer: '/admin/boys/season', expect: '/admin/girls/snapshot' },
  { path: '/admin/import-boys', cookie: 'girls', expect: '/admin/boys/import' },
  { path: '/admin/rankings/team-girls', expect: '/admin/girls/rankings/team' },
  { path: '/admin/import-jamboree-girls', expect: '/admin/girls/import-jamboree' },
  { path: '/admin/boys/snapshot-girls', expect: '/admin/girls/snapshot' },
  { path: '/admin/girls/roster-grade-import-girls', expect: '/admin/girls/roster-grade-import' },
  { path: '/admin/team-scores', referer: 'https://www.matwhizzer.com/girls/tournaments/5', cookie: 'boys', expect: '/admin/boys/team-scores' },
]

let failed = 0
for (const c of cases) {
  const headers = new Headers()
  if (c.referer) headers.set('referer', c.referer.startsWith('http') ? c.referer : BASE + c.referer)
  if (c.cookie) headers.set('cookie', `mw_admin_side=${c.cookie}`)
  const req = new NextRequest(BASE + c.path, { headers })
  const res = routeAdmin(req, NextResponse.next())
  const loc = res.headers.get('location')
  const got = loc ? new URL(loc).pathname + new URL(loc).search : 'pass'
  const cookie = res.cookies.get('mw_admin_side')?.value
  const ok = got === c.expect && (c.setsCookie === undefined || cookie === c.setsCookie)
  if (!ok) failed++
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${c.path}${c.referer ? ' from ' + c.referer : ''}${c.cookie ? ' [' + c.cookie + ']' : ''} -> ${got}${cookie ? ' (cookie ' + cookie + ')' : ''}`)
}
console.log(failed ? `${failed} failed` : 'all passed')
process.exit(failed ? 1 : 0)

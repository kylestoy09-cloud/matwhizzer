// Build check: every admin API route must refuse non-admins, and the proxy must guard the
// admin panel. Signing in is not enough: fans have accounts (2026-11-02, 61 routes checked
// only for a session). A route passes if it uses the shared check (isAdminUser /
// getAdminUser), compares the role to 'admin' itself, or imports a local helper (_auth.ts)
// that does. A route with no check at all must be listed in CRON_ONLY with a reason.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'

const ROOT = 'src/app/api/admin'
const CHECK = /isAdminUser|getAdminUser|role\s*[!=]==\s*'admin'/
const CRON_ONLY = new Set([])          // e.g. 'src/app/api/admin/x/route.ts' — none today

function walk(d) {
  return readdirSync(d).flatMap(n => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p] })
}

const bad = []
for (const f of walk(ROOT).filter(p => p.endsWith('route.ts'))) {
  const s = readFileSync(f, 'utf8')
  if (CHECK.test(s) || CRON_ONLY.has(f)) continue
  // a local helper imported with a relative path
  const helpers = [...s.matchAll(/from '(\.{1,2}\/[^']+)'/g)].map(m => resolve(dirname(f), m[1]) + '.ts').filter(existsSync)
  if (helpers.some(h => CHECK.test(readFileSync(h, 'utf8')))) continue
  bad.push(f)
}

const proxy = existsSync('src/proxy.ts') ? readFileSync('src/proxy.ts', 'utf8') : ''
const proxyOk = proxy.includes("'/admin/:path*'") && proxy.includes("'/api/admin/:path*'") && /isAdminUser/.test(proxy)

if (bad.length || !proxyOk) {
  if (bad.length) console.error(`✗ ${bad.length} admin route(s) don't check for an admin:\n  ${bad.join('\n  ')}`)
  if (!proxyOk) console.error('✗ src/proxy.ts must guard /admin/:path* and /api/admin/:path* with isAdminUser')
  process.exit(1)
}
console.log('✓ Every admin route checks for an admin; the proxy guards /admin and /api/admin')

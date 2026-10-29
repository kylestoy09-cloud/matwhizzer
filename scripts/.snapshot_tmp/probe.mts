import { createClient } from '@supabase/supabase-js'
import { computeSnapshot } from './compute.ts'
const real = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
// log each query's table + duration
const db: any = new Proxy(real, { get(t: any, p) { if (p !== 'from') return t[p]; return (table: string) => { const b = t.from(table); const wrap = (q: any): any => new Proxy(q, { get(o: any, k) { if (k === 'then') { const st = Date.now(); return (res: any, rej: any) => o.then((r: any) => { const ms = Date.now() - st; if (ms > 2000 || r.error) console.log(`  ${table} ${ms}ms ${r.error ? 'ERROR ' + r.error.message : ''}`); return res(r) }, rej) } const v = o[k]; return typeof v === 'function' ? (...a: any[]) => wrap(v.apply(o, a)) : v } }); return wrap(b) } } })
const t0 = Date.now()
try { await computeSnapshot('2026-02-14', '2025-26', 2026, db); console.log('ok', Date.now() - t0, 'ms') } catch (e: any) { console.log('failed', e.message ?? e, Date.now() - t0, 'ms') }

import { createClient } from '@supabase/supabase-js'
import { loadSeason, unloadSeason } from '../../src/lib/playoffHistory/load'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const [g, y, act] = [process.argv[2] as 'M' | 'F', Number(process.argv[3]), process.argv[4] ?? 'load']
const t = Date.now()
console.log(JSON.stringify(act === 'unload' ? await unloadSeason(db as never, g, y) : await loadSeason(db as never, g, y, 'claude (test load)')), `${Math.round((Date.now() - t) / 1000)}s`)

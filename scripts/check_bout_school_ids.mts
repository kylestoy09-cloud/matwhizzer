import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([^=]+)=(.*)$/)
  if (m) process.env[m[1].trim()] = m[2].trim()
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
)

const ETHAN_ID = '1aea0f0f-3d71-4cb6-a2d8-b50da3abe817'

// Check the actual FK columns on tournament_bouts for Ethan
const { data: bouts } = await supabase
  .from('tournament_bouts')
  .select('id, wrestler1_id, wrestler2_id, wrestler1_school_id, wrestler2_school_id, wrestler1_school_raw, wrestler2_school_raw')
  .or(`wrestler1_id.eq.${ETHAN_ID},wrestler2_id.eq.${ETHAN_ID}`)

console.log('Ethan bouts with school FKs:', JSON.stringify(bouts, null, 2))

// Also check the dual meet for Ethan to see team school linkage
const { data: meet } = await supabase
  .from('dual_meets')
  .select('id, team1_school_id, team2_school_id, school_a:schools!team1_school_id(id, display_name), school_b:schools!team2_school_id(id, display_name)')
  .eq('id', 'e9a82480-bdc7-404e-bfe7-cbc824ccfbbd')

console.log('\nEthan dual meet school data:', JSON.stringify(meet, null, 2))

// Broad scope: how many tournament_bouts have null wrestler1_school_id?
const { count: nullSchool1 } = await supabase
  .from('tournament_bouts')
  .select('*', { count: 'exact', head: true })
  .is('wrestler1_school_id', null)

const { count: nullSchool2 } = await supabase
  .from('tournament_bouts')
  .select('*', { count: 'exact', head: true })
  .is('wrestler2_school_id', null)

const { count: totalBouts } = await supabase
  .from('tournament_bouts')
  .select('*', { count: 'exact', head: true })

console.log(`\nTotal bouts: ${totalBouts}`)
console.log(`Bouts with null wrestler1_school_id: ${nullSchool1}`)
console.log(`Bouts with null wrestler2_school_id: ${nullSchool2}`)

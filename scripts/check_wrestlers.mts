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

// Look up Ethan Hale specifically
const { data: ethan } = await supabase
  .from('wrestlers')
  .select('id, name, school_id, image_url, created_at')
  .ilike('name', '%ethan hale%')

console.log('Ethan Hale:', JSON.stringify(ethan, null, 2))

// Count wrestlers with no school_id
const { count: noSchool } = await supabase
  .from('wrestlers')
  .select('*', { count: 'exact', head: true })
  .is('school_id', null)

console.log('\nWrestlers with no school_id:', noSchool)

// Count wrestlers with no image or placeholder image
const { count: noImage } = await supabase
  .from('wrestlers')
  .select('*', { count: 'exact', head: true })
  .or('image_url.is.null,image_url.eq.')

console.log('Wrestlers with no image_url:', noImage)

// Sample of wrestlers with null school_id to understand pattern
const { data: sample } = await supabase
  .from('wrestlers')
  .select('id, name, school_id, created_at')
  .is('school_id', null)
  .order('created_at', { ascending: false })
  .limit(10)

console.log('\nRecent wrestlers missing school_id:', JSON.stringify(sample, null, 2))

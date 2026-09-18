import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const RTF_PATH = '/Users/thebrain/Desktop/wrestling_brackets/Whizzer Upload/2025-26 Power Points.rtf'
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Check school 3 display_name raw
const { data: school } = await client.from('schools').select('id, display_name, is_nj').eq('id', 3).single()
console.log('School 3 raw:', JSON.stringify(school))
console.log('display_name bytes:', [...(school?.display_name ?? '')].map(c => c.charCodeAt(0)))

// Check alias table for school 3
const { data: aliases } = await client.from('school_aliases').select('alias, school_id').eq('school_id', 3)
console.log('Aliases for school 3:', aliases)

// Parse RTF and find Emerson Boro entry
const raw = readFileSync(RTF_PATH, 'utf8')
const idx = raw.indexOf('Emerson Boro')
const surrounding = raw.slice(idx - 20, idx + 50)
console.log('RTF around Emerson Boro:', JSON.stringify(surrounding))

// Verify what normalize produces for both
const normalize = (n: string) => n.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
const rtfName = 'Emerson Boro'
const dbName = school?.display_name ?? ''
console.log(`normalize(RTF): "${normalize(rtfName)}"`)
console.log(`db.toLowerCase(): "${dbName.toLowerCase()}"`)
console.log(`match: ${normalize(rtfName) === dbName.toLowerCase()}`)

// Check current power_points for school 3
const { data: pp } = await client.from('power_points').select('*').eq('school_id', 3)
console.log('Current PP rows for school 3:', pp)

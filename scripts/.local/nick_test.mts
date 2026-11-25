import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { otherForms } from '../../src/lib/nicknames'
console.log('matt →', otherForms('Matt'), '| zachary →', otherForms('Zachary'))
const I = await import('../../src/app/api/admin/hub/import/route')
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data: t } = await db.from('boys_hub_tournaments').select('id').eq('name', 'Mobbin Classic Preseason Open').single()
const { data: e } = await db.from('boys_hub_events').select('id').eq('tournament_id', t!.id).single()
const text = 'Weight,Place,Name,Club,State,Division,Style,Class\n150,1,Matt Gorbatuk,Yale Street,,High School,folkstyle,\n150,2,Bobby Penman,Collingswood,,High School,folkstyle,'
const d = await (await I.POST(new NextRequest('http://l/api', { method: 'POST', body: JSON.stringify({ gender: 'M', event_id: e!.id, kind: 'podium', style: 'folkstyle', text }) }))).json()
for (const p of d.people) console.log(p.name, '→ suggestion', JSON.stringify(p.suggestion), '| offered:', p.wrestlers.map((w: any) => `${w.name} ${w.class_year}`).join(', '), p.prospects.map((x: any) => `prospect ${x.name} (${x.wrestler})`).join(', '))

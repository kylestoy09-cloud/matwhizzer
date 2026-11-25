// Kyle 2026-11-18 ("none of the diii colleges have colors … wilkes is blue and yellow"): colors for every college an NJ
// wrestler competed for that had none — mostly DIII and NAIA, a few DI / DII added with the older brackets. Each
// school's official set as best known (Kyle checks colors: colors_checked stays false). Only rows with no
// primary_color are written. Dry run unless --apply.
import { createClient } from '@supabase/supabase-js'

const APPLY = process.argv.includes('--apply')
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// id | name (as a check) | primary | secondary
const ROWS = `
184|Arizona|#CC0033|#003366
186|Auburn|#0C2340|#E87722
189|Baldwin Wallace|#B5985A|#4F2C1D
206|Central Connecticut|#1B49A2|#FFFFFF
208|Cheyney|#003DA5|#FFFFFF
210|Chicago|#800000|#FFFFFF
212|Clemson|#F56600|#522D80
213|Coast Guard|#003366|#F0A500
214|Coe|#9D2235|#C5B783
216|TCNJ|#293F6F|#A6802E
221|UConn|#000E2F|#FFFFFF
225|Delaware Valley|#00563F|#FFC72C
226|Delaware|#00539F|#FFD200
229|Drake|#004477|#FFFFFF
234|Elizabethtown|#0047AB|#C0C0C0
237|Florida|#0021A5|#FA4616
239|George Washington|#033C5A|#AA9868
240|Georgia State|#0039A6|#C60C30
242|Georgia|#BA0C2F|#000000
243|Gettysburg|#F26522|#003F87
253|Indiana State|#00669A|#FFFFFF
254|Ithaca|#003B71|#FFC72C
259|Kentucky|#0033A0|#FFFFFF
260|Merchant Marine|#003366|#A2AAAD
267|LSU|#461D7C|#FDD023
269|Lycoming|#5F259F|#FFC72C
282|Montclair State|#D11242|#FFFFFF
284|Muhlenberg|#A6192E|#A2AAAD
286|New Hampshire|#003591|#FFFFFF
288|NYU|#57068C|#FFFFFF
299|RIT|#F76902|#000000
301|Rowan|#57150B|#F1C400
305|SUNY Cortland|#BB0000|#FFFFFF
307|SUNY Oneonta|#004D2E|#FFFFFF
308|SUNY Oswego|#235937|#FFC72C
314|South Carolina State|#841A2B|#003F87
316|Southern Connecticut|#0047AB|#FFFFFF
320|Springfield|#7A0019|#FFFFFF
325|Syracuse|#F76900|#000E54
327|Temple|#9D2235|#FFFFFF
331|Toledo|#003E7E|#FFD200
335|Ursinus|#B91C2E|#FFC72C
341|Wartburg|#F47321|#000000
342|Washington & Jefferson|#9D2235|#000000
343|Washington and Lee|#003399|#FFFFFF
348|Wesleyan|#C8102E|#000000
349|West Chester|#582C83|#FFC72C
353|Wilkes|#002D72|#FFC72C
354|William & Mary|#115740|#B9975B
356|Williams|#500082|#FFC72C
362|UW-Whitewater|#582C83|#FFFFFF
377|Bridgewater State|#C8102E|#FFFFFF
379|Castleton|#00573F|#FFFFFF
380|Centenary (NJ)|#002F6C|#FFC72C
382|Eastern|#00337F|#C99700
384|Ferrum|#000000|#FFC72C
387|Hunter|#5F259F|#FFC72C
389|Johnson & Wales|#00205B|#B1B3B3
391|Wisconsin-La Crosse|#862633|#A2AAAD
397|McDaniel|#00205B|#C99700
398|Messiah|#002F6C|#FFFFFF
405|New Jersey City|#00205B|#A6192E
414|Wisconsin-Platteville|#002D72|#FF8200
418|Roger Williams|#003C71|#FFC72C
419|Southern Maine|#003A70|#A2AAAD
423|Southern Virginia|#002D72|#C8102E
427|Stevens|#A32638|#A2AAAD
433|Wabash|#A6192E|#FFFFFF
437|York (PA)|#00573F|#FFFFFF
440|Baker|#E56A28|#000000
442|Bethany (KS)|#002D72|#FFC72C
448|Campbellsville|#7A1F35|#A2AAAD
455|Cumberland (TN)|#000000|#C8102E
458|Dickinson State|#003DA5|#FFFFFF
464|Georgetown (KY)|#FF8200|#000000
465|Graceland|#002D72|#FFC72C
466|Grand View|#00205B|#C8102E
469|Indiana Tech|#ED8B00|#000000
473|Keiser|#003087|#C99700
475|Life Pacific|#00205B|#C99700
477|Lindsey Wilson|#003087|#FFFFFF
483|Missouri Baptist|#00205B|#C8102E
484|Missouri Valley|#4F2C1D|#FFC72C
491|Reinhardt|#003087|#C99700
498|St. Thomas (FL)|#00843D|#FFC72C
504|Warner Pacific|#00205B|#A2AAAD
509|Williams Baptist|#5F259F|#FFC72C
511|Midland|#FF8200|#000000
513|York (NE)|#002D72|#FFC72C
516|Dana|#C8102E|#000000
536|Florida Tech|#7A0019|#A2AAAD
559|Kean|#002D72|#C99700
566|Rutgers-Newark|#CC0033|#000000
`.trim().split('\n').map(l => { const [id, name, primary, secondary] = l.split('|'); return { id: Number(id), name, primary, secondary } })

const { data } = await db.from('colleges').select('id, name, primary_color').in('id', ROWS.map(r => r.id))
const byId = new Map((data ?? []).map(c => [c.id, c]))
let n = 0
for (const r of ROWS) {
  const c = byId.get(r.id)
  if (!c) { console.log(`STOP: no college ${r.id} ${r.name}`); process.exit(1) }
  if (c.name !== r.name) { console.log(`STOP: ${r.id} is ${c.name}, not ${r.name}`); process.exit(1) }
  if (c.primary_color) continue
  n++
  if (APPLY) { const { error } = await db.from('colleges').update({ primary_color: r.primary, secondary_color: r.secondary }).eq('id', r.id).is('primary_color', null); if (error) throw new Error(error.message) }
}
console.log(APPLY ? `colored ${n}` : `dry run: ${n} to color`)

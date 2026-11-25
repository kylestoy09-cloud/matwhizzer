// Medals from before our postseason records begin (Kyle 2026-11-14): a wrestler whose profile starts in the first
// Playoff History season (boys 2012-13) may have state places or region titles from the seasons before, on file only in
// history_finishes (njwrestlinghistory.info). One is put on the profile when it's the same school, in the four seasons
// before the wrestler's first season on file, and the same name: exactly, by a common nickname (Rob / Robert), or by
// initials (BJ / Bryant) when only one of the school's wrestlers fits. Service role, cached an hour.
import { unstable_cache } from 'next/cache'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { schoolMatcher, historyFinishSchools } from '@/lib/historySchools'
import { sameLastName } from '@/lib/trophyRows'

export type PreRecordFinish = { year: number; level: 'state' | 'region'; region: number | null; weight: string; place: number; name: string; school_id: number }

export const NICKNAMES = [
  ['rob', 'robert', 'bob', 'bobby', 'robbie'], ['rich', 'richard', 'rick', 'richie', 'ricky'], ['joe', 'joseph', 'joey'],
  ['zach', 'zachary', 'zack', 'zachery'], ['nick', 'nicholas', 'nicolas', 'nicky'], ['sal', 'salvatore'], ['mike', 'michael'],
  ['matt', 'matthew'], ['chris', 'christopher'], ['tom', 'thomas', 'tommy'], ['dan', 'daniel', 'danny'], ['dave', 'david'],
  ['jim', 'james', 'jimmy'], ['bill', 'william', 'will', 'billy', 'liam'], ['tony', 'anthony'], ['steve', 'steven', 'stephen'],
  ['alex', 'alexander'], ['ben', 'benjamin'], ['sam', 'samuel'], ['jake', 'jacob'], ['josh', 'joshua'], ['andy', 'andrew', 'drew'],
  ['greg', 'gregory'], ['pat', 'patrick'], ['ed', 'edward', 'eddie'], ['frank', 'francis', 'frankie'], ['vince', 'vincent', 'vinny'],
  ['jeff', 'jeffrey'], ['ken', 'kenneth', 'kenny'], ['tim', 'timothy'], ['ron', 'ronald'], ['don', 'donald'], ['nate', 'nathan', 'nathaniel'],
  ['jon', 'jonathan'], ['ray', 'raymond'], ['phil', 'phillip', 'philip'], ['charlie', 'charles', 'chuck'], ['lou', 'louis', 'luis'],
]
const nick = new Map<string, number>(NICKNAMES.flatMap((g, i) => g.map(n => [n, i] as [string, number])))
const norm = (s: string) => s.toLowerCase().replace(/\b(jr|sr|ii|iii|iv)\b\.?/g, '').replace(/[^a-z]/g, '')

const load = unstable_cache(async (gender: 'M' | 'F', before: number): Promise<PreRecordFinish[]> => {
  const db = createSupabaseAdmin()
  const fin: { year: number; level: string; region: number | null; weight: string; place: number; name: string; school: string | null }[] = []
  for (let from = 0; ; from += 1000) {   // all of them: a shared school name is settled by the same wrestler's region title
    const { data, error } = await db.from('history_finishes').select('year, level, region, weight, place, name, school').eq('gender', gender).order('id').range(from, from + 999)
    if (error) throw new Error(error.message)
    fin.push(...(data ?? []))
    if ((data ?? []).length < 1000) break
  }
  const ids = historyFinishSchools(fin, await schoolMatcher(db), sameLastName)
  return fin.flatMap((f, i) => f.year < before && ids[i] != null && (f.level === 'state' || (f.level === 'region' && f.place === 1))
    ? [{ year: f.year, level: f.level as 'state' | 'region', region: f.region, weight: f.weight, place: f.place, name: f.name, school_id: ids[i]! }] : [])
}, ['pre-record-finishes-v3'], { revalidate: 3600 })

/** The wrestler's medals from before `before` (the first postseason season on file), given the seasons and schools on the profile */
export async function preRecordFinishes(gender: 'M' | 'F', before: number, wrestler: { first_name: string; last_name: string }, seasons: { season: number; school_id: number | null }[]): Promise<PreRecordFinish[]> {
  const first = Math.min(...seasons.map(s => s.season))
  if (!seasons.length || first > before + 3) return []
  const schools = [...new Set(seasons.map(s => s.school_id).filter((x): x is number => x != null))]
  const last = norm(wrestler.last_name), given = norm(wrestler.first_name)
  const cands = (await load(gender, before)).filter(f => f.year >= first - 3 && schools.includes(f.school_id) && norm(f.name).endsWith(last) && norm(f.name).length > last.length)
  if (!cands.length) return []
  let mates: { first_name: string; last_name: string; first: number }[] | null = null
  const schoolmates = async () => {   // the schools' wrestlers with this last name, each with their first season
    const { data } = await createSupabaseAdmin().from('tournament_entries')
      .select('wrestler:wrestlers!inner(first_name, last_name), tournament:tournaments!inner(season_id, gender)')
      .in('school_id', schools).eq('tournament.gender', gender).lte('tournament.season_id', before + 3).ilike('wrestler.last_name', wrestler.last_name)
    const by = new Map<string, { first_name: string; last_name: string; first: number }>()
    for (const r of (data ?? []) as unknown as { wrestler: { first_name: string; last_name: string }; tournament: { season_id: number } }[]) {
      const k = norm(r.wrestler.first_name), cur = by.get(k)
      by.set(k, { ...r.wrestler, first: Math.min(cur?.first ?? 9999, r.tournament.season_id) })
    }
    return [...by.values()]
  }
  const out: PreRecordFinish[] = []
  for (const f of cands) {
    const fFirst = norm(f.name).slice(0, -last.length)
    if (fFirst === given || (nick.has(fFirst) && nick.get(fFirst) === nick.get(given))) { out.push(f); continue }
    // initials (BJ, CJ): the one wrestler at the school with that last name, that first letter and a first season in reach
    if (/^[A-Z]{2}$/.test(f.name.trim().split(/\s+/)[0]) && fFirst[0] === given[0]) {
      mates ??= await schoolmates()
      const fits = mates.filter(m => norm(m.last_name) === last && norm(m.first_name)[0] === fFirst[0] && m.first <= f.year + 3)
      if (fits.length === 1 && norm(fits[0].first_name) === given) out.push(f)
    }
  }
  return out
}

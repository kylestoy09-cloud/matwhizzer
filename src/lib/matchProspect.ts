// Match a new high school wrestler's name against the tournament hub prospects (kids seen on a Middle
// School or Offseason Hub podium or in a hub bout) on the same side. Used in the HS import review so a
// new wrestler can be linked to the prospect they were (prospect.wrestler_id). Replaces matchMsWrestler
// (the unused Aug 2026 MS tables, 2026-11-12).

import type { ProspectFinish, ProspectCandidate } from '@/app/admin/[side]/import-rtf/types'
import { hubTables, hubSeasonLabel, placeLabel, type HubGender, type HubKey } from '@/lib/hub'

export type ProspectRow = { pool: HubGender; prospect_id: number; name: string; finishes: ProspectFinish[] }

const STOP_WORDS = new Set(['jr', 'sr', 'ii', 'iii', 'iv', 'the', 'van', 'de', 'del'])

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z ]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 2 && !STOP_WORDS.has(t))
    .join(' ')
    .trim()
}

function scoreNames(hsName: string, prospectName: string): number {
  const h = normalize(hsName)
  const m = normalize(prospectName)
  if (!h || !m) return 0
  if (h === m) return 100

  const hToks = h.split(' ')
  const mToks = m.split(' ')
  const hSet = new Set(hToks)
  const mSet = new Set(mToks)

  const hLast = hToks[hToks.length - 1]
  const mLast = mToks[mToks.length - 1]
  if (!hLast || !mLast || hLast !== mLast) return 0

  let inter = 0
  for (const t of hSet) if (mSet.has(t)) inter++
  const union = new Set([...hSet, ...mSet]).size
  const jaccard = inter / union

  const hFirst = hToks[0]
  const mFirst = mToks[0]
  const firstBoost = hFirst && mFirst && hFirst === mFirst ? 15 : 0
  const initialBoost = hFirst && mFirst && hFirst.length === 1 && mFirst[0] === hFirst[0] ? 8 : 0

  return Math.min(99, Math.round(jaccard * 70) + firstBoost + initialBoost)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = { from: (t: string) => any }

/** Prospects not yet linked to a high school wrestler, with their hub finishes: this side's Offseason Hub
 *  list plus the mixed Middle School pool (a middle schooler can become a boys or girls wrestler). */
export async function loadUnlinkedProspects(db: Db, gender: 'M' | 'F'): Promise<ProspectRow[]> {
  return [...(await loadPool(db, gender)), ...(await loadPool(db, 'X'))]
}

async function loadPool(db: Db, gender: HubGender): Promise<ProspectRow[]> {
  const T = hubTables(gender)
  const prospects: { id: number; first_name: string; last_name: string }[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(T.prospects).select('id, first_name, last_name').is('wrestler_id', null).order('id').range(from, from + 999)
    if (error || !data) break
    prospects.push(...data)
    if (data.length < 1000) break
  }
  if (!prospects.length) return []
  const finishes = new Map<number, ProspectFinish[]>()
  const ids = prospects.map(p => p.id)
  const placements: { id: number; prospect_id: number; event_id: number; weight: string; place: number; place_to: number | null; style: string }[] = []
  for (let i = 0; i < ids.length; i += 500) {
    const { data } = await db.from(T.placements).select('id, prospect_id, event_id, weight, place, place_to, style').in('prospect_id', ids.slice(i, i + 500))
    placements.push(...(data ?? []))
  }
  const evIds = [...new Set(placements.map(p => p.event_id))]
  const { data: evs } = evIds.length ? await db.from(T.events).select('id, season, tournament_id').in('id', evIds) : { data: [] }
  const tIds = [...new Set(((evs ?? []) as { tournament_id: number }[]).map(e => e.tournament_id))]
  const { data: ts } = tIds.length ? await db.from(T.tournaments).select('id, name, hub').in('id', tIds) : { data: [] }
  const ev = new Map(((evs ?? []) as { id: number; season: number; tournament_id: number }[]).map(e => [e.id, e]))
  const tn = new Map(((ts ?? []) as { id: number; name: string }[]).map(t => [t.id, t.name]))
  const th = new Map(((ts ?? []) as { id: number; hub: HubKey }[]).map(t => [t.id, t.hub]))
  for (const p of placements) {
    const e = ev.get(p.event_id)
    finishes.set(p.prospect_id, [...(finishes.get(p.prospect_id) ?? []), {
      id: p.id, tournament_name: tn.get(e?.tournament_id ?? 0) ?? '?', season: e ? hubSeasonLabel(th.get(e.tournament_id) ?? 'ms', e.season) : '?',
      weight: p.weight, place: p.place, label: `${placeLabel(p.place, p.place_to)}${p.style === 'freestyle' ? ' (freestyle)' : ''}`,
    }])
  }
  return prospects.map(p => ({ pool: gender, prospect_id: p.id, name: `${p.first_name} ${p.last_name}`, finishes: finishes.get(p.id) ?? [] }))
}

export function findProspectCandidates(rawName: string, prospects: ProspectRow[], minScore = 60): ProspectCandidate[] {
  if (!prospects.length) return []
  const candidates: ProspectCandidate[] = []
  for (const p of prospects) {
    const score = scoreNames(rawName, p.name)
    if (score < minScore) continue
    candidates.push({ pool: p.pool, prospect_id: p.prospect_id, primary_name: p.name, score, finishes: p.finishes })
  }
  return candidates.sort((a, b) => b.score - a.score || b.finishes.length - a.finishes.length).slice(0, 3)
}

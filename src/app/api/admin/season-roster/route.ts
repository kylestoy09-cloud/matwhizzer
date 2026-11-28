// Roster Import (preseason step 3): this season's Track rosters against last season's rollover. Admin only.
// src/lib/trackIntake/rosterReview.ts has the rules.
//   GET  ?side=boys|girls  → every school's roster loads, the rows to review, each school's missing wrestlers
//   POST { side, action: 'load', rosters }  → matches and saves a file (a school read again: confirmed rows stay,
//          the rest are matched again; names not on the new copy are kept)
//   POST { side, action: 'resolve', id, pick: { kind: 'wrestler' | 'pool', id } | 'new', grade: 'track' | 'ours' }
//          → a picked wrestler at another school is logged as a transfer (src/lib/logTransfer.ts)
//   POST { side, action: 'accept-new', schoolId? }  → every new name with nothing suggested, stored as new
//   POST { side, action: 'dismiss', id }   → drops one row of the import (not a wrestler: Track's line only)
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/auth/isAdminUser'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { getPreviousSeason, getWorkingSeason } from '@/lib/season-context'
import { fetchAllRows } from '@/lib/fetchAllRows'
import { schoolIdsOfWrestlers } from '@/lib/hubSchools'
import { logTransfer } from '@/lib/logTransfer'
import { personKey, type TrackRoster } from '@/lib/trackIntake/rosters'
import { loadOurData, type Side } from '@/lib/trackIntake/teamReview'
import { planRosters, varsityIn, type PlannedRow, type Suggestion } from '@/lib/trackIntake/rosterReview'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

type Row = {
  id: string; season_id: number; school_id: number; name: string; weight: number | null; grade: string | null; track_gender: string | null
  eligible: string | null; record: string | null; wrestler_id: string | null; pool_id: string | null; match: 'wrestler' | 'pool' | 'new'
  expected_grade: string | null; varsity_last: boolean; last_weight: number | null; status: 'confirmed' | 'review'; review_reason: string | null
  suggestions: Suggestion[]; round: number; first_seen: string; last_seen: string
}
const sideOf = (v: unknown): Side | null => (v === 'boys' || v === 'girls' ? v : null)
const split = (name: string) => { const p = name.trim().split(/\s+/); return { first: p[0] ?? '', last: p.slice(1).join(' ') } }

export async function GET(req: NextRequest) {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const side = sideOf(req.nextUrl.searchParams.get('side'))
  if (!side) return NextResponse.json({ error: 'side must be boys or girls' }, { status: 400 })
  const season = await getWorkingSeason(side === 'boys' ? 'M' : 'F')
  const db = createSupabaseAdmin()
  const probe = await db.from(`${side}_season_rosters`).select('id').limit(1)
  if (probe.error) return NextResponse.json({ migrationPending: true, season, error: probe.error.message })
  return NextResponse.json({ season, ...(await state(db, side, season.id)) })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function state(db: any, side: Side, seasonId: number) {
  const [rows, loads] = await Promise.all([
    fetchAllRows<Row>((f, t) => db.from(`${side}_season_rosters`).select('*').eq('season_id', seasonId).order('id').range(f, t)),
    fetchAllRows<{ id: number; school_id: number; track_team: string; round: number; listed: number; missing: { id: string; name: string; grade: string | null; kind: string }[]; loaded_at: string }>((f, t) => db.from(`${side}_roster_loads`).select('*').eq('season_id', seasonId).order('id').range(f, t)),
  ])
  if (rows.error || loads.error) return { error: (rows.error ?? loads.error)!.message }
  const our = await loadOurData(db, side, seasonId)
  const latest = new Map<number, (typeof loads.data)[number]>()
  for (const l of loads.data) latest.set(l.school_id, l)
  // a missing wrestler resolved since the load (picked on another roster, a transfer) isn't missing any more
  const placed = new Set(rows.data.map(r => r.wrestler_id).concat(rows.data.map(r => r.pool_id)).filter(Boolean))
  const schools = [...latest.values()].map(l => {
    const mine = rows.data.filter(r => r.school_id === l.school_id)
    return {
      schoolId: l.school_id, name: our.schools.get(l.school_id)?.name ?? l.track_team, team: l.track_team, round: l.round, loadedAt: l.loaded_at,
      listed: l.listed, confirmed: mine.filter(r => r.status === 'confirmed').length, review: mine.filter(r => r.status === 'review').length,
      shown: mine.filter(r => r.status === 'confirmed' && r.wrestler_id && r.varsity_last).length,
      dropped: mine.filter(r => r.last_seen < l.loaded_at).length,
      missing: l.missing.filter(m => !placed.has(m.id)),
    }
  }).sort((a, b) => a.name.localeCompare(b.name))
  const review = rows.data.filter(r => r.status === 'review').map(r => ({ ...r, schoolName: our.schools.get(r.school_id)?.name ?? '' })).sort((a, b) => a.schoolName.localeCompare(b.schoolName) || a.name.localeCompare(b.name))
  return { schools, review, total: rows.data.length }
}

export async function POST(req: NextRequest) {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const side = sideOf(body.side)
  if (!side) return NextResponse.json({ error: 'side must be boys or girls' }, { status: 400 })
  const g = side === 'boys' ? 'M' : 'F'
  const season = await getWorkingSeason(g)
  const prev = await getPreviousSeason(season)
  const db = createSupabaseAdmin()
  const table = `${side}_season_rosters`
  const who = user.email ?? null
  const now = new Date().toISOString()
  const fail = (m: string, status = 500) => NextResponse.json({ error: m }, { status })

  // a new name stored as a Track roster player, so match uploads find its grade (src/lib/rosterGradeSuggest.ts)
  const storePlayer = async (r: { name: string; weight: number | null; grade: string | null; school_id: number }, team: string, round: number) => {
    if (!r.grade) return null
    const { first, last } = split(r.name)
    const { data, error } = await db.from('roster_grade_import').insert({
      school_name_raw: team, first_name_raw: first, last_name_raw: last, weight_class: r.weight, grade: r.grade, school_id: r.school_id,
      status: 'no_match', import_batch: `${now.slice(0, 10)}_track_roster_r${round}`, season_id: season.id, gender: g,
    }).select('id').single()
    if (error) throw new Error(`roster_grade_import: ${error.message}`)
    return data.id as string
  }
  // an exact match whose grade we didn't have: Track's fills it (never over a grade we have)
  const fillGrade = async (wrestlerId: string, grade: string | null) => {
    if (!grade) return
    await db.from('wrestlers').update({ grade, grade_confirmed_at: now, grade_confirmed_source: 'roster_upload' }).eq('id', wrestlerId).is('grade', null)
  }

  try {
    switch (body.action) {
      case 'load': {
        const rosters = (body.rosters ?? []) as TrackRoster[]
        if (!rosters.length) return fail('No rosters in the file', 400)
        const our = await loadOurData(db, side, season.id)
        const have = (await fetchAllRows<Row>((f, t) => db.from(table).select('*').eq('season_id', season.id).order('id').range(f, t))).data
        const loadedElsewhere = new Map<string, { schoolId: number; name: string }[]>()
        for (const r of have) { const k = personKey(r.name); loadedElsewhere.set(k, [...(loadedElsewhere.get(k) ?? []), { schoolId: r.school_id, name: r.name }]) }
        const plan = await planRosters(db, side, season, prev.label, rosters, our, loadedElsewhere)
        const { data: priorLoads } = await db.from(`${side}_roster_loads`).select('school_id, round').eq('season_id', season.id).limit(50000)
        let inserted = 0, updated = 0
        for (const sp of plan.schools) {
          const round = Math.max(0, ...(priorLoads ?? []).filter(l => l.school_id === sp.schoolId).map(l => l.round)) + 1
          const mine = new Map(have.filter(r => r.school_id === sp.schoolId).map(r => [r.name, r]))
          const fresh: Record<string, unknown>[] = []
          for (const p of sp.rows) {
            const old = mine.get(p.row.name)
            const fields = rowFields(p)
            if (old?.status === 'confirmed') {
              // settled before: Track's current weight / grade / record; the match stays
              const { error } = await db.from(table).update({ weight: p.row.weight, grade: p.row.grade, record: p.row.record, eligible: p.row.eligible, last_seen: now }).eq('id', old.id)
              if (error) return fail(error.message)
              updated++; continue
            }
            if (p.status === 'confirmed' && p.match === 'new') fields.pool_id = await storePlayer({ name: p.row.name, weight: p.row.weight, grade: p.row.grade, school_id: sp.schoolId }, sp.team, round)
            if (p.status === 'confirmed' && p.wrestlerId) await fillGrade(p.wrestlerId, p.row.grade)
            if (old) {
              const { error } = await db.from(table).update({ ...fields, last_seen: now }).eq('id', old.id)
              if (error) return fail(error.message)
              updated++
            } else fresh.push({ ...fields, season_id: season.id, school_id: sp.schoolId, name: p.row.name, round, first_seen: now, last_seen: now })
          }
          for (let i = 0; i < fresh.length; i += 300) {
            const { error } = await db.from(table).insert(fresh.slice(i, i + 300))
            if (error) return fail(error.message)
          }
          inserted += fresh.length
          const { error } = await db.from(`${side}_roster_loads`).insert({ season_id: season.id, school_id: sp.schoolId, track_team: sp.team, round, listed: sp.rows.length, missing: sp.missing, loaded_by: who })
          if (error) return fail(error.message)
        }
        await db.from('admin_activity_log').insert({ admin_email: who, action: `season_roster_load_${side}`, details: { schools: plan.schools.length, inserted, updated, unmatched: plan.unmatchedTeams.map(u => u.team) } })
        return NextResponse.json({ inserted, updated, unmatchedTeams: plan.unmatchedTeams, ...(await state(db, side, season.id)) })
      }
      case 'resolve': {
        const { data: r, error } = await db.from(table).select('*').eq('id', body.id).maybeSingle()
        if (error) return fail(error.message)
        if (!r) return fail('No such row', 404)
        const row = r as Row
        const patch: Record<string, unknown> = { status: 'confirmed', review_reason: null, reviewed_at: now, reviewed_by: who }
        let note = ''
        if (body.pick === 'new') {
          Object.assign(patch, { match: 'new', wrestler_id: null, expected_grade: null, varsity_last: false, last_weight: null, pool_id: row.pool_id ?? await storePlayer(row, String(row.school_id), row.round) })
        } else if (body.pick?.kind === 'wrestler') {
          const wid = String(body.pick.id)
          const { data: w } = await db.from('wrestlers').select('id, grade, gender').eq('id', wid).maybeSingle()
          if (!w || w.gender !== g) return fail('That wrestler is not on this side', 400)
          const from = (await schoolIdsOfWrestlers(db, [wid])).get(wid) ?? null
          if (from !== row.school_id) {
            const t = await logTransfer(db, g, wid, row.school_id, `Track ${season.label} roster`, who)
            if (!t.ok) return fail(`Transfer not logged: ${t.error}`, t.status)
            note = 'transfer logged'
          }
          const v = await varsityIn(db, side, prev.id, prev.label, [wid])
          Object.assign(patch, { match: 'wrestler', wrestler_id: wid, pool_id: null, expected_grade: w.grade, varsity_last: v.has(wid), last_weight: v.get(wid) ?? null })
          if (body.grade === 'track' && row.grade) await db.from('wrestlers').update({ grade: row.grade, grade_confirmed_at: now, grade_confirmed_source: 'roster_upload' }).eq('id', wid)
          else await fillGrade(wid, row.grade)
        } else if (body.pick?.kind === 'pool') {
          const pid = String(body.pick.id)
          const { data: p } = await db.from('roster_grade_import').select('id, grade').eq('id', pid).maybeSingle()
          if (!p) return fail('No such roster player', 400)
          Object.assign(patch, { match: 'pool', pool_id: pid, wrestler_id: null, expected_grade: p.grade, varsity_last: false, last_weight: null })
          if (body.grade === 'track' && row.grade) await db.from('roster_grade_import').update({ grade: row.grade }).eq('id', pid)
        } else return fail('Pick who this is', 400)
        const { error: uErr } = await db.from(table).update(patch).eq('id', row.id)
        if (uErr) return fail(uErr.message)
        await db.from('admin_activity_log').insert({ admin_email: who, action: `season_roster_resolve_${side}`, details: { id: row.id, name: row.name, pick: body.pick, grade: body.grade ?? null, note } })
        return NextResponse.json({ note, ...(await state(db, side, season.id)) })
      }
      case 'accept-new': {
        const rows = (await fetchAllRows<Row>((f, t) => db.from(table).select('*').eq('season_id', season.id).eq('status', 'review').order('id').range(f, t))).data
          .filter(r => r.match === 'new' && !r.suggestions.length && (body.schoolId == null || r.school_id === Number(body.schoolId)) && r.track_gender === g)
        for (const r of rows) {
          const pool = r.pool_id ?? await storePlayer(r, String(r.school_id), r.round)
          const { error } = await db.from(table).update({ status: 'confirmed', review_reason: null, pool_id: pool, reviewed_at: now, reviewed_by: who }).eq('id', r.id)
          if (error) return fail(error.message)
        }
        return NextResponse.json({ accepted: rows.length, ...(await state(db, side, season.id)) })
      }
      case 'dismiss': {
        const { data: r } = await db.from(table).select('*').eq('id', body.id).maybeSingle()
        if (!r) return fail('No such row', 404)
        await db.from('admin_activity_log').insert({ admin_email: who, action: `season_roster_dismiss_${side}`, details: r })
        const { error } = await db.from(table).delete().eq('id', body.id)
        return error ? fail(error.message) : NextResponse.json(await state(db, side, season.id))
      }
    }
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e))
  }
  return fail('Unknown action', 400)
}

function rowFields(p: PlannedRow): Record<string, unknown> {
  return {
    weight: p.row.weight, grade: p.row.grade, track_gender: p.row.gender, eligible: p.row.eligible || null, record: p.row.record || null,
    wrestler_id: p.wrestlerId, pool_id: p.poolId, match: p.match, expected_grade: p.expectedGrade, varsity_last: p.varsity, last_weight: p.lastWeight,
    status: p.status, review_reason: p.reason, suggestions: p.suggestions,
  }
}

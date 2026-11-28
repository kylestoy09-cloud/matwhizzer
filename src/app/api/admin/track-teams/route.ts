// School Data Review (preseason step 1): Track's season Teams page against our schools. Admin only.
//   GET  ?side=boys|girls                       → the season's review (every Track team read so far)
//   POST { side, action: 'load', teams, total }  → saves the teams read from a file (new ones added; a team already
//                                                  reviewed keeps its status) and returns the review
//   POST { side, action: 'confirm', key, schoolId, district?: 'track', region?: 'track' }
//                                                → links the team to the school, saves Track's names + abbreviation as
//                                                  the school's aliases, and (when chosen) writes Track's district /
//                                                  region for the season
//   POST { side, action: 'confirm-clean' }       → confirms every pending team matched by its exact name with nothing
//                                                  to settle
//   POST { side, action: 'add-program', key, schoolId, district?, region? } → the school becomes a program on this side
//   POST { side, action: 'new-school', key, name, district?, region? }      → a new school; Track's district / region when chosen
//   POST { side, action: 'skip', key, note } | { action: 'reopen', key }
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/auth/isAdminUser'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { getWorkingSeason } from '@/lib/season-context'
import { fetchAllRows } from '@/lib/fetchAllRows'
import type { TrackTeam } from '@/lib/trackIntake/teams'
import { loadOurData, reviewTeam, summarize, type Side, type StoredTeam, type ReviewRow } from '@/lib/trackIntake/teamReview'

export const dynamic = 'force-dynamic'

const sideOf = (v: unknown): Side | null => (v === 'boys' || v === 'girls' ? v : null)
const teamOf = (r: StoredTeam): TrackTeam => {
  const num = (re: RegExp) => [...new Set(r.leagues.map(l => re.exec(l)?.[1]).filter((x): x is string => !!x).map(Number))]
  return {
    seasonName: r.season_name, globalName: r.global_name, state: r.state, abbr: r.abbr ?? '', govBody: r.gov_body ?? '', leagues: r.leagues,
    districts: num(/^NJ District (\d+)$/i), regions: num(/^NJ Region (\d+)$/i), others: r.leagues.filter(l => !/^NJ (District|Region) \d+$/i.test(l)),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function review(db: any, side: Side, seasonId: number) {
  const { data, error } = await fetchAllRows<StoredTeam>((f, t) => db.from(`${side}_track_teams`).select('*').eq('season_id', seasonId).order('season_name').order('global_name').range(f, t))
  if (error) return { error: error.message }
  const our = await loadOurData(db, side, seasonId)
  const rows = data.map(r => reviewTeam(teamOf(r), r, our))
  const { data: meta } = await db.from('admin_activity_log').select('details').eq('action', `track_teams_load_${side}`).order('created_at', { ascending: false }).limit(1)
  return { summary: summarize(rows, our, meta?.[0]?.details?.total ?? null) }
}

export async function GET(req: NextRequest) {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const side = sideOf(req.nextUrl.searchParams.get('side'))
  if (!side) return NextResponse.json({ error: 'side must be boys or girls' }, { status: 400 })
  const season = await getWorkingSeason(side === 'boys' ? 'M' : 'F')
  const db = createSupabaseAdmin()
  const probe = await db.from(`${side}_track_teams`).select('season_id').limit(1)
  if (probe.error) return NextResponse.json({ migrationPending: true, season, error: probe.error.message })
  const r = await review(db, side, season.id)
  // every NJ school, for linking a team by hand (programs on this side first)
  const our = await loadOurData(db, side, season.id)
  const schools = [...our.schools.values()].map(s => ({ id: s.id, name: s.name, program: our.programs.has(s.id) })).sort((a, b) => Number(b.program) - Number(a.program) || a.name.localeCompare(b.name))
  return NextResponse.json({ season, schools, ...r })
}

export async function POST(req: NextRequest) {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const side = sideOf(body.side)
  if (!side) return NextResponse.json({ error: 'side must be boys or girls' }, { status: 400 })
  const season = await getWorkingSeason(side === 'boys' ? 'M' : 'F')
  const db = createSupabaseAdmin()
  const table = `${side}_track_teams`
  const who = user.email ?? null
  const now = new Date().toISOString()
  const [seasonName, globalName] = String(body.key ?? '').split('|')
  const keyMatch = { season_id: season.id, season_name: seasonName, global_name: globalName }
  const fail = (m: string, status = 500) => NextResponse.json({ error: m }, { status })

  const current = async (): Promise<ReviewRow | null> => {
    const r = await review(db, side, season.id)
    return r.summary?.rows.find(x => x.key === body.key) ?? null
  }
  // links a team to a school: aliases, then (if chosen) Track's district / region, then the row
  const confirm = async (row: ReviewRow, schoolId: number, opts: { district?: boolean; region?: boolean; status?: StoredTeam['status'] }) => {
    const our = await loadOurData(db, side, season.id)
    const again = reviewTeam(row.team, { season_id: season.id, season_name: row.team.seasonName, global_name: row.team.globalName, state: row.team.state, abbr: row.team.abbr, gov_body: row.team.govBody, leagues: row.team.leagues, school_id: schoolId, status: 'pending', note: null, reviewed_at: null, reviewed_by: null, first_seen: now }, our)
    for (const alias of again.newAliases) {
      const { error } = await db.from('school_aliases').insert({ school_id: schoolId, alias, alias_type: alias === row.team.abbr ? 'abbreviation' : 'track_name', notes: `Track Teams page ${season.label}`, confirmed_at: now })
      if (error && !/duplicate|unique/i.test(error.message)) return error.message
    }
    if (opts.district && row.team.districts.length === 1) {
      const { error } = await db.from(`${side}_school_districts`).upsert({ school_id: schoolId, season_id: season.id, district_id: row.team.districts[0] }, { onConflict: 'school_id,season_id' })
      if (error) return error.message
    }
    if (opts.region && row.team.regions.length === 1) {
      const { error } = await db.from(`${side}_school_regions`).upsert({ school_id: schoolId, season_id: season.id, region_id: row.team.regions[0] }, { onConflict: 'school_id,season_id' })
      if (error) return error.message
    }
    const note = [opts.district ? `district → Track's ${row.team.districts[0]}` : '', opts.region ? `region → Track's ${row.team.regions[0]}` : ''].filter(Boolean).join('; ') || null
    const { error } = await db.from(table).update({ school_id: schoolId, status: opts.status ?? 'confirmed', note, reviewed_at: now, reviewed_by: who, updated_at: now }).match(keyMatch)
    if (error) return error.message
    await db.from('admin_activity_log').insert({ admin_email: who, action: `track_teams_confirm_${side}`, details: { key: row.key, schoolId, aliases: again.newAliases, ...opts } })
    return null
  }

  switch (body.action) {
    case 'load': {
      const teams = (body.teams ?? []) as TrackTeam[]
      if (!teams.length) return fail('No teams in the file', 400)
      const { data: have, error } = await fetchAllRows<{ season_name: string; global_name: string }>((f, t) => db.from(table).select('season_name, global_name').eq('season_id', season.id).order('season_name').order('global_name').range(f, t))
      if (error) return fail(error.message)
      const old = new Set(have.map(h => `${h.season_name}|${h.global_name}`))
      const fresh = teams.filter(t => !old.has(`${t.seasonName}|${t.globalName}`))
      const seen = teams.filter(t => old.has(`${t.seasonName}|${t.globalName}`))
      for (let i = 0; i < fresh.length; i += 200) {
        const { error: e } = await db.from(table).insert(fresh.slice(i, i + 200).map(t => ({ season_id: season.id, season_name: t.seasonName, global_name: t.globalName, state: t.state, abbr: t.abbr || null, gov_body: t.govBody || null, leagues: t.leagues })))
        if (e) return fail(e.message)
      }
      // a team read again: its abbreviation / leagues as Track has them now (the review status stays)
      for (const t of seen) {
        const { error: e } = await db.from(table).update({ abbr: t.abbr || null, gov_body: t.govBody || null, leagues: t.leagues, state: t.state, updated_at: now }).match({ season_id: season.id, season_name: t.seasonName, global_name: t.globalName })
        if (e) return fail(e.message)
      }
      await db.from('admin_activity_log').insert({ admin_email: who, action: `track_teams_load_${side}`, details: { total: body.total ?? null, read: teams.length, added: fresh.length } })
      return NextResponse.json({ added: fresh.length, again: seen.length, ...(await review(db, side, season.id)) })
    }
    case 'confirm': {
      const row = await current()
      if (!row) return fail('No such team', 404)
      const schoolId = Number(body.schoolId ?? row.schoolId)
      if (!schoolId) return fail('Pick the school', 400)
      const err = await confirm(row, schoolId, { district: body.district === 'track', region: body.region === 'track' })
      return err ? fail(err) : NextResponse.json(await review(db, side, season.id))
    }
    case 'confirm-clean': {
      const r = await review(db, side, season.id)
      const clean = (r.summary?.rows ?? []).filter(x => x.status === 'pending' && x.how === 'name' && x.schoolId && !x.noProgram && !x.skipHint && x.diffs.every(d => d.stale) && !x.aliasClash.length)
      for (const row of clean) { const err = await confirm(row, row.schoolId!, {}); if (err) return fail(`${row.team.seasonName}: ${err}`) }
      return NextResponse.json({ confirmed: clean.length, ...(await review(db, side, season.id)) })
    }
    case 'add-program': {
      const row = await current()
      if (!row) return fail('No such team', 404)
      const schoolId = Number(body.schoolId ?? row.schoolId)
      const our = await loadOurData(db, side, season.id)
      const name = our.schools.get(schoolId)?.name
      if (!name) return fail('No such school', 400)
      const { error } = await db.from(`${side}_schools`).insert({ school_id: schoolId, display_name: name, is_combined: false })
      if (error && !/duplicate|unique/i.test(error.message)) return fail(`${side}_schools: ${error.message}`)
      const err = await confirm(row, schoolId, { district: body.district === 'track', region: body.region === 'track', status: 'added' })
      return err ? fail(err) : NextResponse.json(await review(db, side, season.id))
    }
    case 'new-school': {
      const row = await current()
      if (!row) return fail('No such team', 404)
      const name = String(body.name ?? '').trim()
      if (!name) return fail('Name the school', 400)
      const our = await loadOurData(db, side, season.id)
      if ([...our.namesBySchool.values()].some(ns => ns.has(name.toLowerCase()))) return fail(`We already have a school called “${name}”: link to it instead`, 400)
      const { data: made, error } = await db.from('schools').insert({ display_name: name, is_nj: true, is_combined: false, is_active: true }).select('id').single()
      if (error) return fail(error.message)
      const { error: pe } = await db.from(`${side}_schools`).insert({ school_id: made.id, display_name: name, is_combined: false })
      if (pe) return fail(`${side}_schools: ${pe.message}`)
      const err = await confirm(row, made.id, { district: body.district === 'track', region: body.region === 'track', status: 'added' })
      return err ? fail(err) : NextResponse.json({ schoolId: made.id, ...(await review(db, side, season.id)) })
    }
    case 'skip':
    case 'reopen': {
      const patch = body.action === 'skip'
        ? { status: 'skipped', note: String(body.note ?? '') || null, reviewed_at: now, reviewed_by: who, updated_at: now }
        : { status: 'pending', note: null, school_id: null, reviewed_at: null, reviewed_by: null, updated_at: now }
      const { error } = await db.from(table).update(patch).match(keyMatch)
      return error ? fail(error.message) : NextResponse.json(await review(db, side, season.id))
    }
  }
  return fail('Unknown action', 400)
}

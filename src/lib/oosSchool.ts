// Out-of-state schools are created with a state (Kyle 2026-11-10: the import's out-of-state review must settle the
// state; the tag makes non-NJSIAA programs easy to spot). Every import path that creates one goes through here.
//   name:  "Saucon Valley (PA)"; a name that already ends in a note becomes "Perry (Massillon, OH)"
//   alias: the name as the import printed it, so the next import matches exactly
// Non-NJSIAA New Jersey schools (Blair, Peddie, ...) are out-of-state records too and take NJ.

import { stName } from '@/lib/saintNames'
import { isNjLookalike } from '@/lib/matchSchools'
import { US_STATES } from '@/lib/usStates'

export { US_STATES }

export function isState(st: unknown): st is string {
  return typeof st === 'string' && (US_STATES as readonly string[]).includes(st.toUpperCase())
}

// "Dover, DE" → "Dover"; "Saucon Valley (PA)" → "Saucon Valley"
function baseName(name: string): string {
  return name.trim().replace(/\s*,\s*[A-Za-z]{2}$/, '').replace(/\s*\(\s*[A-Z]{2}\s*\)$/, '').trim()
}

export function withStateTag(name: string, state: string): string {
  const st = state.toUpperCase()
  const base = baseName(name)
  if (/\)$/.test(base)) return base.replace(/\)$/, `, ${st})`)
  return `${base} (${st})`
}

/** Import overrides that would create a new out-of-state school (no school_id) without a state. */
export function overridesMissingState(overrides: Record<string, { type: string; school_id?: number | null; display_name?: string; state?: string } | undefined>): string[] {
  return Object.entries(overrides).filter(([, o]) => o?.type === 'oos' && o.school_id == null && !isState(o.state)).map(([raw, o]) => o?.display_name ?? raw)
}

/** Error text for out-of-state schools that can't be created yet. */
export function needsStateMessage(names: string[]): string {
  return `Choose a state for each new out-of-state school before saving: ${names.join(', ')}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any

/**
 * The out-of-state school for this printed name and state: the existing one with the tagged name, else a new one.
 * Saves the printed name as an out-of-state alias (skipped when that alias already belongs to a school).
 */
export async function createOosSchool(db: Db, printedName: string, state: string): Promise<{ id: number; display_name: string }> {
  if (!isState(state)) throw new Error(`"${state}" is not a state (out-of-state school "${printedName}")`)
  // ALL CAPS ("COWETA") is stored in title case, as the imports always did
  const shown = printedName === printedName.toUpperCase() && /[A-Z]{2}/.test(printedName)
    ? printedName.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
    : printedName
  const display_name = withStateTag(stName(shown), state)   // saint schools are "St. …" (Kyle 2026-11-14)
  const existing = await db.from('schools').select('id, display_name').eq('display_name', display_name).eq('is_nj', false).maybeSingle()
  let school = existing.data as { id: number; display_name: string } | null
  if (!school) {
    const ins = await db.from('schools').insert({ display_name, is_nj: false }).select('id, display_name').single()
    if (ins.error) throw new Error(`Out-of-state school insert failed for "${display_name}": ${ins.error.message}`)
    school = ins.data
  }
  await addOosAlias(db, printedName, school!.id, display_name)
  return school!
}

/**
 * Saves a printed name as an out-of-state alias of the school, unless it is the school's own name, already an alias,
 * or could be mistaken for an NJ school ("Dover, DE" vs Dover: those are reviewed at every import, as in rtf/import).
 */
export async function addOosAlias(db: Db, printedName: string, schoolId: number, displayName?: string): Promise<void> {
  const alias = printedName.trim()
  if (!alias || alias === displayName || await isNjLookalike(alias)) return
  const have = await db.from('school_aliases').select('id').eq('alias', alias).limit(1)
  if (have.data?.length) return
  await db.from('school_aliases').insert({ school_id: schoolId, alias, alias_type: 'oos', notes: String(schoolId), confirmed_at: new Date().toISOString() })
}

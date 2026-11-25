// Daily Challenge game (Kyle 2026-11-12). One contest across boys and girls trivia.
// - A question belongs to its date and shows 12:00 AM – 11:59 PM Eastern.
// - Signed-in fans only. "Today's Challenge" starts the clock on the server; one attempt; the answer must
//   arrive within the question's limit (30 s by default, plus a little grace for the connection) or it
//   counts as wrong. The correct answer shows once they've answered.
// - Weeks run Monday–Sunday Eastern. Standings: most correct, then least total time on correct answers,
//   then whoever finished first. Two winners: the top player and one random player who answered at least
//   once that week (not the top player). Picked the first time the game is used after the week ends.
// - sandbox: the admin test page's own questions, plays and winners, kept apart and never emailed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Db = { from: (t: string) => any; auth: { admin: { getUserById: (id: string) => Promise<any> } } }

export const GRACE_MS = 1500
export const TZ = 'America/New_York'

/** Today's date in Eastern time (YYYY-MM-DD). */
export const easternDate = (d = new Date()) => d.toLocaleDateString('en-CA', { timeZone: TZ })
export function addDays(iso: string, n: number) { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
/** The Monday of the week a date falls in. */
export function weekStart(iso: string) { const day = new Date(`${iso}T12:00:00Z`).getUTCDay(); return addDays(iso, -((day + 6) % 7)) }

export type Kind = 'choice' | 'rank'
export function isCorrect(kind: Kind, correct: number[], answer: number[]): boolean {
  if (kind === 'choice') return answer.length === 1 && answer[0] === correct[0]
  return answer.length === correct.length && answer.every((a, i) => a === correct[i])
}
export function validAnswer(kind: Kind, answer: unknown): answer is number[] {
  if (!Array.isArray(answer) || !answer.every(a => Number.isInteger(a) && a >= 0 && a <= 3)) return false
  return kind === 'choice' ? answer.length === 1 : answer.length === 4 && new Set(answer).size === 4
}

export type Standing = { player: string; name: string; correct: number; ms: number; answered: number; finishedAt: string | null }

/** A week's standings (Monday weekStart through Sunday), best first. */
export async function standings(db: Db, sandbox: boolean, week: string): Promise<Standing[]> {
  const { data: qs, error } = await db.from('daily_challenges').select('id').eq('sandbox', sandbox).gte('challenge_date', week).lte('challenge_date', addDays(week, 6))
  if (error) throw new Error(error.message)
  const ids = (qs ?? []).map((q: { id: number }) => q.id)
  if (!ids.length) return []
  const { data: plays, error: pErr } = await db.from('daily_challenge_plays').select('player, user_id, answered_at, is_correct, elapsed_ms').in('challenge_id', ids).not('answered_at', 'is', null)
  if (pErr) throw new Error(pErr.message)
  const m = new Map<string, Standing & { userId: string | null }>()
  for (const p of plays ?? []) {
    const s = m.get(p.player) ?? m.set(p.player, { player: p.player, name: p.player, correct: 0, ms: 0, answered: 0, finishedAt: null, userId: p.user_id }).get(p.player)!
    s.answered++
    if (p.is_correct) { s.correct++; s.ms += p.elapsed_ms ?? 0; if (!s.finishedAt || p.answered_at > s.finishedAt) s.finishedAt = p.answered_at }
  }
  const names = await playerNames(db, [...m.values()].map(s => s.userId).filter(Boolean) as string[])
  for (const s of m.values()) s.name = s.player.startsWith('sandbox:') ? s.player.slice(8) : names.get(s.userId ?? '') ?? 'Player'
  return [...m.values()].map(s => ({ player: s.player, name: s.name, correct: s.correct, ms: s.ms, answered: s.answered, finishedAt: s.finishedAt }))
    .sort((a, b) => b.correct - a.correct || a.ms - b.ms || (a.finishedAt ?? '9').localeCompare(b.finishedAt ?? '9'))
}

/** Leaderboard names: the profile's display name, else "Player" and the last 4 of the account id. */
export async function playerNames(db: Db, userIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  for (let i = 0; i < userIds.length; i += 200) {
    const { data } = await db.from('app_users').select('id, display_name').in('id', userIds.slice(i, i + 200))
    for (const u of data ?? []) out.set(u.id, u.display_name?.trim() || `Player ${String(u.id).slice(-4).toUpperCase()}`)
  }
  for (const id of userIds) if (!out.has(id)) out.set(id, `Player ${id.slice(-4).toUpperCase()}`)
  return out
}

/**
 * Pick the winners of every week that has ended (as of `today`) and isn't decided yet. Safe to call
 * often and from several requests at once: a week is decided once (its row's primary key).
 * notify: called for each new winner (real game only).
 */
export async function finalizeWeeks(db: Db, sandbox: boolean, today: string, notify?: (claim: { id: number; user_id: string | null; kind: 'top' | 'random'; week_start: string }) => Promise<void>): Promise<string[]> {
  const thisWeek = weekStart(today)
  const { data: qs } = await db.from('daily_challenges').select('challenge_date').eq('sandbox', sandbox).lt('challenge_date', thisWeek)
  const weeks = [...new Set(((qs ?? []) as { challenge_date: string }[]).map(q => weekStart(q.challenge_date)))]
  if (!weeks.length) return []
  const { data: done } = await db.from('daily_challenge_weeks').select('week_start').eq('sandbox', sandbox).in('week_start', weeks)
  const decided = new Set(((done ?? []) as { week_start: string }[]).map(w => w.week_start))
  const finalized: string[] = []
  for (const week of weeks.filter(w => !decided.has(w)).sort()) {
    const s = await standings(db, sandbox, week)
    const top = s.find(x => x.correct > 0) ?? null
    const pool = s.filter(x => x.answered > 0 && x.player !== top?.player)
    const random = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null
    const { error } = await db.from('daily_challenge_weeks').insert({
      sandbox, week_start: week, top_player: top?.player ?? null, top_correct: top?.correct ?? null, top_ms: top?.ms ?? null,
      random_player: random?.player ?? null, entrants: s.length,
    })
    if (error) continue   // another request decided it first
    finalized.push(week)
    for (const [kind, w] of [['top', top], ['random', random]] as const) {
      if (!w) continue
      const user_id = w.player.startsWith('sandbox:') ? null : w.player
      const { data: claim } = await db.from('daily_challenge_claims').insert({ sandbox, week_start: week, kind, player: w.player, user_id }).select('id, user_id, kind, week_start').single()
      if (claim && notify && !sandbox) await notify(claim)
    }
  }
  return finalized
}

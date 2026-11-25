// Server side of the Daily Challenge game and polls: who's playing, and winner emails.
// Real game: the signed-in user (any account; fans have accounts). Sandbox (admin test page): an admin
// playing as a named test player on a chosen date, against the sandbox questions — never emailed.
import { Resend } from 'resend'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { isAdminUser } from '@/lib/auth/isAdminUser'
import { easternDate, type Db } from '@/lib/challenge'

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://matwhizzer.com'

export type Ctx = { db: Db; sandbox: boolean; today: string; player: string; userId: string | null }

/** null = not signed in (or, for the sandbox, not an admin). */
export async function challengeContext(opts: { sandbox?: unknown; asOf?: unknown; player?: unknown }): Promise<Ctx | null> {
  const sb = await createSupabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null
  const db = createSupabaseAdmin() as unknown as Db
  if (opts.sandbox === true || opts.sandbox === '1') {
    if (!(await isAdminUser(user.id))) return null
    const asOf = typeof opts.asOf === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(opts.asOf) ? opts.asOf : easternDate()
    const name = (typeof opts.player === 'string' && opts.player.trim()) || 'Tester'
    return { db, sandbox: true, today: asOf, player: `sandbox:${name.slice(0, 40)}`, userId: null }
  }
  return { db, sandbox: false, today: easternDate(), player: user.id, userId: user.id }
}

/** Email a new winner (real game). Records when it went out, or why it didn't. */
export async function notifyWinner(db: Db, claim: { id: number; user_id: string | null; kind: 'top' | 'random'; week_start: string }) {
  let error: string | null = null
  try {
    if (!claim.user_id) throw new Error('no account')
    const { data } = await db.auth.admin.getUserById(claim.user_id)
    const email = data?.user?.email
    if (!email) throw new Error('no email on the account')
    const how = claim.kind === 'top' ? 'had the most correct answers in the least time' : 'was drawn as this week\'s random winner'
    const r = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: 'Mat Whizzer <noreply@matwhizzer.com>', to: email,
      subject: 'You won the Mat Whizzer Daily Challenge!',
      html: `<p>Congratulations! You ${how} in the Daily Challenge for the week of ${claim.week_start}.</p>
<p>To get your prize, tell us your shirt size and where to mail it: <a href="${SITE}/challenge/claim">${SITE}/challenge/claim</a></p>
<p>— Mat Whizzer</p>`,
    })
    if (r.error) throw new Error(r.error.message)
  } catch (e) { error = (e as Error).message }
  await db.from('daily_challenge_claims').update(error ? { notify_error: error } : { notified_at: new Date().toISOString(), notify_error: null }).eq('id', claim.id)
}

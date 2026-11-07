// Account emails (2026-11-07): sign-up confirmation, admin invite and password reset all go out through
// Resend (noreply@matwhizzer.com), not Supabase's built-in mailer, and their links come straight back to
// the site: /auth/confirm?token_hash=…&type=… checks the token on the server, signs the person in and
// opens the right page (reset and invite: /auth/reset-password to set a password; sign-up:
// /email-confirmed). Before, Supabase's links ended in #access_token=…, which the site's sign-in code
// doesn't read, so reset links landed on the sign-in page or failed to save the new password.
import { Resend } from 'resend'
import { createSupabaseAdmin } from '@/lib/supabase/service'

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://matwhizzer.com'
const FROM = 'Mat Whizzer <noreply@matwhizzer.com>'

type Kind =
  | { type: 'recovery'; email: string }
  | { type: 'invite'; email: string; data?: Record<string, unknown> }
  | { type: 'signup'; email: string; password: string; data?: Record<string, unknown> }

const COPY: Record<Kind['type'], { subject: string; intro: string; button: string; foot: string }> = {
  recovery: {
    subject: 'Reset your Mat Whizzer password',
    intro: 'You asked to reset the password for your Mat Whizzer account.',
    button: 'Reset Password',
    foot: "If you didn't ask for this, you can ignore this email. The link works once and expires in 1 hour.",
  },
  invite: {
    subject: "You're invited to Mat Whizzer",
    intro: "You've been set up with a Mat Whizzer admin account. Set your password to get started.",
    button: 'Set Your Password',
    foot: 'The link works once and expires in 24 hours. Ask Kyle for a new one if it runs out.',
  },
  signup: {
    subject: 'Confirm your Mat Whizzer account',
    intro: 'Thanks for signing up for Mat Whizzer. Confirm your email to activate your account.',
    button: 'Confirm Email',
    foot: "If you didn't sign up, you can ignore this email.",
  },
}

/** Creates the link (and, for sign-up, the account) and emails it. Returns the new user's id. */
export async function sendAuthEmail(k: Kind): Promise<{ userId: string | null; error: string | null }> {
  const db = createSupabaseAdmin()
  const { data, error } = k.type === 'signup'
    ? await db.auth.admin.generateLink({ type: 'signup', email: k.email, password: k.password, options: { data: k.data } })
    : k.type === 'invite'
      ? await db.auth.admin.generateLink({ type: 'invite', email: k.email, options: { data: k.data } })
      : await db.auth.admin.generateLink({ type: 'recovery', email: k.email })
  if (error) return { userId: null, error: error.message }
  const hash = data.properties?.hashed_token
  if (!hash) return { userId: null, error: 'No link was returned' }

  const url = `${SITE}/auth/confirm?token_hash=${encodeURIComponent(hash)}&type=${k.type}`
  const c = COPY[k.type]
  const { error: sendErr } = await new Resend(process.env.RESEND_API_KEY).emails.send({
    from: FROM,
    to: k.email,
    subject: c.subject,
    html: `
      <p>${c.intro}</p>
      <p><a href="${url}" style="background:#1e293b;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;display:inline-block;">${c.button}</a></p>
      <p style="color:#64748b;font-size:13px;">${c.foot}</p>
    `,
  })
  if (sendErr) {
    console.error('[auth email] Resend error:', sendErr)
    return { userId: data.user?.id ?? null, error: 'The email could not be sent. Please try again.' }
  }
  return { userId: data.user?.id ?? null, error: null }
}

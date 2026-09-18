import { createClient } from '@supabase/supabase-js'

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const email = 'kyle.stoy09@gmail.com'

const { error } = await db.auth.resetPasswordForEmail(email, {
  redirectTo: 'https://matwhizzer.com/auth/reset-password',
})

if (error) {
  console.error('Error:', error.message)
} else {
  console.log(`Password reset email sent to ${email}`)
}

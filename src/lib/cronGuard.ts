// The nightly ratings and leaderboard crons skip themselves before competition starts (Kyle 2026-11-17: turning on
// CRON_SECRET for the publisher also wakes these; before the first bouts there is nothing new for them, and a
// preseason ratings run should only happen when someone starts it). Manual runs by an admin are never skipped.
import type { NextRequest } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { easternDate } from '@/lib/challenge'

/** For a cron call before the newest season's start date (seasons.start_date), the reason to skip; else null */
export async function cronSkipBeforeSeason(req: NextRequest): Promise<string | null> {
  const secret = process.env.CRON_SECRET
  const isCron = !!secret && (req.headers.get('authorization') === `Bearer ${secret}` || req.headers.get('x-cron-secret') === secret)
  if (!isCron) return null
  const { data } = await createSupabaseAdmin().from('seasons').select('year_label, start_date').not('start_date', 'is', null)
    .order('start_date', { ascending: false }).limit(1).maybeSingle()
  const today = easternDate()
  return data?.start_date && today < data.start_date ? `${data.year_label} competition starts ${data.start_date}; nightly run skipped` : null
}

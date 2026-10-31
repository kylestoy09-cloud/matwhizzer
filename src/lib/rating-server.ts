import { createSupabaseAdmin } from '@/lib/supabase/service'
import { RATING_BLURB } from '@/lib/rating'

/** The rating's bio as edited on the admin rating page; the built-in text if none is saved. */
export async function getRatingBlurb(): Promise<string> {
  const { data, error } = await createSupabaseAdmin()
    .from('rating_settings').select('value').eq('key', 'blurb').maybeSingle()
  return !error && data?.value?.trim() ? data.value.trim() : RATING_BLURB
}

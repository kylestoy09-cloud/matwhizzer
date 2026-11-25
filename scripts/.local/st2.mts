import { createClient } from '@supabase/supabase-js'
import { schoolIlikeOr } from '../../src/lib/saintNames'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
for (const q of ['st', 'st.', 'saint', 'saint jo', 'st joseph', 'st. joseph', 'Stanhope', 'west']) {
  const { data, error } = await db.from('schools').select('display_name').or(schoolIlikeOr(q)).eq('is_nj', true).limit(40)
  console.log(JSON.stringify(q), error?.message ?? data!.map(d => d.display_name).join(' | ').slice(0, 300))
}

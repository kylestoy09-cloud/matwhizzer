import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

// Single client instance — safe for server components and client components alike
// Falls back to empty strings during build if env vars aren't set (won't crash the build)
export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder', {
  global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) },
})

// ── Display helpers ────────────────────────────────────────────────────────────

export const TOURNAMENT_TYPE_LABEL: Record<string, string> = {
  districts:    'Districts',
  regions:      'Regions',
  boys_state:   'State',
  girls_regions:'Regions',
  girls_state:  'State',
}

export const ROUND_ORDER: Record<string, number> = {
  PL: -1,
  R1: 0, R2: 1, R3: 2, R4: 3, R5: 4,
  QF: 5, SF: 6, F: 7,
  C1: 10, C2: 11, C3: 12, C4: 13, C5: 14, C6: 15, C7: 16,
  CQF: 17, CSF: 18, CF: 19,
  '3rd_Place': 20, '5th_Place': 21, '7th_Place': 22,
  V: 23, UNK: 99,
}

export const ROUND_LABEL: Record<string, string> = {
  PL: 'Prelim',
  R1: 'Round 1', R2: 'Round 2', R3: 'Round 3', R4: 'Round 4', R5: 'Round 5',
  QF: 'Quarterfinal', SF: 'Semifinal', F: 'Final',
  C1: 'Cons. R1', C2: 'Cons. R2', C3: 'Cons. R3', C4: 'Cons. R4',
  C5: 'Cons. R5', C6: 'Cons. R6', C7: 'Cons. R7',
  CQF: 'Cons. Quarters', CSF: 'Cons. Semis', CF: 'Cons. Final',
  '3rd_Place': '3rd Place', '5th_Place': '5th Place', '7th_Place': '7th Place',
  V: 'Varsity', UNK: 'Unknown',
}

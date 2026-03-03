import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Single client instance — safe for server components and client components alike
export const supabase = createClient(supabaseUrl, supabaseKey)

// ── Display helpers ────────────────────────────────────────────────────────────

export const TOURNAMENT_TYPE_LABEL: Record<string, string> = {
  districts:    'Districts',
  regions:      'Regions',
  boys_state:   'State',
  girls_regions:'Regions',
  girls_state:  'State',
}

export const ROUND_ORDER: Record<string, number> = {
  R1: 0, R2: 1, QF: 2, SF: 3, F: 4,
  C1: 5, C2: 6, C3: 7, C4: 8, C5: 9, C6: 10,
  '3rd_Place': 11, '5th_Place': 12,
}

export const ROUND_LABEL: Record<string, string> = {
  R1: 'Round 1', R2: 'Round 2', QF: 'Quarterfinal', SF: 'Semifinal', F: 'Final',
  C1: 'Cons. R1', C2: 'Cons. R2', C3: 'Cons. R3',
  C4: 'Cons. R4', C5: 'Cons. R5', C6: 'Cons. R6',
  '3rd_Place': '3rd Place', '5th_Place': '5th Place',
}

import { createSupabaseServer } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export const BLOCKED_TABLES = ['admin_activity_log']
export const PAGE_SIZE = 50

export async function requireAdmin() {
  const userSupabase = await createSupabaseServer()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) return { user: null, email: null }
  const { data: appUser } = await userSupabase
    .from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') return { user: null, email: null }
  return { user, email: user.email ?? '' }
}

export function serviceClient() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL  ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

// Display name config per FK target table
export const FK_DISPLAY: Record<string, { cols: string; label: (r: Record<string, unknown>) => string }> = {
  schools:               { cols: 'id,display_name',        label: r => String(r.display_name ?? r.id) },
  wrestlers:             { cols: 'id,first_name,last_name', label: r => `${r.first_name} ${r.last_name}` },
  tournaments:           { cols: 'id,name',                label: r => String(r.name ?? r.id) },
  in_season_tournaments: { cols: 'id,name',                label: r => String(r.name ?? r.id) },
  dual_meets:            { cols: 'id,meet_date',           label: r => String(r.meet_date ?? r.id) },
  dual_meet_matches:     { cols: 'id,weight_class',        label: r => String(r.weight_class ?? r.id) },
  weight_classes:        { cols: 'id,name',                label: r => String(r.name ?? r.id) },
  conferences:           { cols: 'id,name',                label: r => String(r.name ?? r.id) },
  districts:             { cols: 'id,name',                label: r => String(r.name ?? r.id) },
  regions:               { cols: 'id,name',                label: r => String(r.name ?? r.id) },
  seasons:               { cols: 'id,year_label',           label: r => String(r.year_label ?? r.id) },
  app_users:             { cols: 'id,display_name',        label: r => String(r.display_name ?? r.id) },
  tournament_entries:    { cols: 'id,weight_class',        label: r => String(r.weight_class ?? r.id) },
}

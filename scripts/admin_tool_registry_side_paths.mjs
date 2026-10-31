// Writes docs/migrations/20261030_admin_tool_registry_side_paths.sql and its backup
// from the live admin_tool_registry. Run: node --env-file=.env.local scripts/admin_tool_registry_side_paths.mjs
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// Tools that were boys-only and now have a girls version on the girls side
const NOW_BOTH = ['alignment_import', 'district_preseed', 'districts_mgr', 'dual_hub', 'playoff_seeds', 'pp_audit',
  'region_seeds', 'school_review', 'states_hub', 'team_playoffs', 'tournament_strength']
// Tools with one registry row per gender: each points at its side's address
const SIDE_PATHS = {
  import_boys:               '/admin/boys/import',
  import_girls:              '/admin/girls/import',
  import_jamboree:           '/admin/girls/import-jamboree',
  past_seasons:              '/admin/boys/past-seasons',
  past_seasons_girls:        '/admin/girls/past-seasons',
  rankings_hub:              '/admin/boys/rankings-hub',
  rankings_hub_girls:        '/admin/girls/rankings-hub',
  resolve_unknowns:          '/admin/boys/resolve-unknowns',
  resolve_unknowns_girls:    '/admin/girls/resolve-unknowns',
  roster_grade_import_boys:  '/admin/boys/roster-grade-import',
  roster_grade_import_girls: '/admin/girls/roster-grade-import',
  snapshot:                  '/admin/boys/snapshot',
  snapshot_girls:            '/admin/girls/snapshot',
}

const { data, error } = await db.from('admin_tool_registry').select('key, label, path, gender').order('key')
if (error) throw error
const q = s => `'${String(s).replace(/'/g, "''")}'`

const backup = ['-- admin_tool_registry before 20261030_admin_tool_registry_side_paths.sql (2026-10-30)',
  ...data.map(r => `UPDATE public.admin_tool_registry SET label = ${q(r.label)}, path = ${q(r.path)}, gender = ${q(r.gender)} WHERE key = ${q(r.key)};`)].join('\n') + '\n'

const sets = []
for (const r of data) {
  const next = { label: r.label, path: r.path, gender: r.gender }
  if (NOW_BOTH.includes(r.key)) next.gender = 'both'
  if (SIDE_PATHS[r.key]) next.path = SIDE_PATHS[r.key]
  if (r.key === 'tournament_checklist') { next.gender = 'boys'; next.path = '/admin/boys/tournament-checklist' }
  if (r.key === 'hammer_scores') next.label = 'Whizzer Resume Rating'
  const changes = Object.entries(next).filter(([k, v]) => v !== r[k])
  if (changes.length) sets.push({ key: r.key, changes })
}

const mig = `-- Admin boys and girls sides (2026-10-30). Gender tools live at /admin/boys/... and
-- /admin/girls/...; a side-less /admin/<tool> path opens on the side the click came from.
--   * Tools now built for girls as well become gender 'both'.
--   * Tools with one row per gender point at their side's address.
--   * Tournament Checklist is boys-only (no girls reference list yet).
--   * The rating's tool label is the Whizzer Resume Rating.
-- Backup: backups/20261030_admin_tool_registry_paths_before.sql
DO $$
BEGIN
${sets.map(s => `  UPDATE public.admin_tool_registry SET ${s.changes.map(([k, v]) => `${k} = ${q(v)}`).join(', ')}, updated_at = now() WHERE key = ${q(s.key)};`).join('\n')}
END $$;
`
fs.writeFileSync('docs/migrations/backups/20261030_admin_tool_registry_paths_before.sql', backup)
fs.writeFileSync('docs/migrations/20261030_admin_tool_registry_side_paths.sql', mig)
console.log(`${sets.length} rows change`)

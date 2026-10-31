-- Admin boys and girls sides (2026-10-30). Gender tools live at /admin/boys/... and
-- /admin/girls/...; a side-less /admin/<tool> path opens on the side the click came from.
--   * Tools now built for girls as well become gender 'both'.
--   * Tools with one row per gender point at their side's address.
--   * Tournament Checklist is boys-only (no girls reference list yet).
--   * The rating's tool label is the Whizzer Resume Rating.
-- Backup: backups/20261030_admin_tool_registry_paths_before.sql
DO $$
BEGIN
  UPDATE public.admin_tool_registry SET gender = 'both', updated_at = now() WHERE key = 'alignment_import';
  UPDATE public.admin_tool_registry SET gender = 'both', updated_at = now() WHERE key = 'district_preseed';
  UPDATE public.admin_tool_registry SET gender = 'both', updated_at = now() WHERE key = 'districts_mgr';
  UPDATE public.admin_tool_registry SET gender = 'both', updated_at = now() WHERE key = 'dual_hub';
  UPDATE public.admin_tool_registry SET label = 'Whizzer Resume Rating', updated_at = now() WHERE key = 'hammer_scores';
  UPDATE public.admin_tool_registry SET path = '/admin/boys/import', updated_at = now() WHERE key = 'import_boys';
  UPDATE public.admin_tool_registry SET path = '/admin/girls/import', updated_at = now() WHERE key = 'import_girls';
  UPDATE public.admin_tool_registry SET path = '/admin/girls/import-jamboree', updated_at = now() WHERE key = 'import_jamboree';
  UPDATE public.admin_tool_registry SET path = '/admin/boys/past-seasons', updated_at = now() WHERE key = 'past_seasons';
  UPDATE public.admin_tool_registry SET path = '/admin/girls/past-seasons', updated_at = now() WHERE key = 'past_seasons_girls';
  UPDATE public.admin_tool_registry SET gender = 'both', updated_at = now() WHERE key = 'playoff_seeds';
  UPDATE public.admin_tool_registry SET gender = 'both', updated_at = now() WHERE key = 'pp_audit';
  UPDATE public.admin_tool_registry SET path = '/admin/boys/rankings-hub', updated_at = now() WHERE key = 'rankings_hub';
  UPDATE public.admin_tool_registry SET path = '/admin/girls/rankings-hub', updated_at = now() WHERE key = 'rankings_hub_girls';
  UPDATE public.admin_tool_registry SET gender = 'both', updated_at = now() WHERE key = 'region_seeds';
  UPDATE public.admin_tool_registry SET path = '/admin/boys/resolve-unknowns', updated_at = now() WHERE key = 'resolve_unknowns';
  UPDATE public.admin_tool_registry SET path = '/admin/girls/resolve-unknowns', updated_at = now() WHERE key = 'resolve_unknowns_girls';
  UPDATE public.admin_tool_registry SET path = '/admin/boys/roster-grade-import', updated_at = now() WHERE key = 'roster_grade_import_boys';
  UPDATE public.admin_tool_registry SET path = '/admin/girls/roster-grade-import', updated_at = now() WHERE key = 'roster_grade_import_girls';
  UPDATE public.admin_tool_registry SET gender = 'both', updated_at = now() WHERE key = 'school_review';
  UPDATE public.admin_tool_registry SET path = '/admin/boys/snapshot', updated_at = now() WHERE key = 'snapshot';
  UPDATE public.admin_tool_registry SET path = '/admin/girls/snapshot', updated_at = now() WHERE key = 'snapshot_girls';
  UPDATE public.admin_tool_registry SET gender = 'both', updated_at = now() WHERE key = 'states_hub';
  UPDATE public.admin_tool_registry SET gender = 'both', updated_at = now() WHERE key = 'team_playoffs';
  UPDATE public.admin_tool_registry SET path = '/admin/boys/tournament-checklist', gender = 'boys', updated_at = now() WHERE key = 'tournament_checklist';
  UPDATE public.admin_tool_registry SET gender = 'both', updated_at = now() WHERE key = 'tournament_strength';
END $$;

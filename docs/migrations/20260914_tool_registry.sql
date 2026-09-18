-- admin_tool_registry: master list of all admin tools and their dashboard phase assignments
-- Drives the tool dropdown in task creation and the Tool Audit settings page.

CREATE TABLE IF NOT EXISTS admin_tool_registry (
  key             text    PRIMARY KEY,
  label           text    NOT NULL,
  path            text    NOT NULL,       -- admin URL path, e.g. /admin/dual-hub
  description     text,
  gender          text    NOT NULL DEFAULT 'both' CHECK (gender IN ('boys','girls','both')),
  show_offseason  boolean NOT NULL DEFAULT false,
  show_preseason  boolean NOT NULL DEFAULT false,
  show_season     boolean NOT NULL DEFAULT false,
  show_postseason boolean NOT NULL DEFAULT false,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_tool_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_tool_registry_auth" ON admin_tool_registry FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON admin_tool_registry TO service_role, authenticated;

-- Seed all tools
INSERT INTO admin_tool_registry (key, label, path, description, gender, show_offseason, show_preseason, show_season, show_postseason) VALUES
-- Offseason-primary tools
('school_review',       'School Review',            '/admin/school-review',          'Review all schools; deactivate, merge, unmerge programs',        'boys',  true,  true,  false, false),
('alignment_import',    'Alignment Import',          '/admin/alignment-import',        'Upload district & region CSV to set school assignments',         'boys',  true,  true,  false, false),
('groups',              'School Groups',             '/admin/groups',                  'Manage district, region, and conference group assignments',       'both',  true,  true,  false, false),
('seasons',             'Seasons & Roster',          '/admin/seasons',                 'Advance wrestler grades; manage season records',                 'both',  true,  true,  false, false),
('schools',             'School Profiles',           '/admin/schools',                 'Edit school names, logos, colors, and metadata',                 'both',  true,  true,  true,  false),
('districts_mgr',       'Districts',                 '/admin/districts',               'District seed calculator and management',                        'boys',  true,  true,  false, false),
('oos_schools',         'OOS Schools',               '/admin/oos-schools',             'Out-of-state school records',                                    'both',  true,  false, true,  false),
('oos_wrestlers',       'OOS Wrestlers',             '/admin/oos-wrestlers',           'Out-of-state wrestler records',                                  'both',  true,  false, true,  false),
('past_seasons',        'Past Seasons (Boys)',        '/admin/past-seasons',            'Historical season data, results, and archives',                  'boys',  true,  false, false, true),
('past_seasons_girls',  'Past Seasons (Girls)',       '/admin/past-seasons-girls',      'Historical season data, results, and archives (girls)',          'girls', true,  false, false, true),

-- Preseason-primary tools
('bulk_schedule',       'Bulk Schedule Import',      '/admin/schedule/bulk-import',    'Import full dual meet schedules for all schools at once',        'both',  false, true,  false, false),
('rankings_hub',        'Rankings Hub (Boys)',        '/admin/rankings-hub',            'Configure and publish individual rankings',                      'boys',  false, true,  true,  true),
('rankings_hub_girls',  'Rankings Hub (Girls)',       '/admin/rankings-hub-girls',      'Configure and publish individual rankings (girls)',              'girls', false, true,  true,  true),
('tournament_registry', 'Tournament Registry',        '/admin/tournament-registry',     'Register tournaments; manage tournament schedule',               'both',  false, true,  true,  false),
('hammer_scores',       'Hammer Scores',             '/admin/hammer-scores',           'Configure hammer score weights and thresholds',                  'both',  false, true,  true,  false),

-- In-season tools
('dual_hub',            'Dual Meet Hub',             '/admin/dual-hub',                'Manage dual meet records; review and correct match data',        'boys',  false, false, true,  false),
('import_hub',          'Import Hub',                '/admin/import-hub',              'Central jump-off for all import workflows',                      'both',  false, false, true,  false),
('import_boys',         'Boys Dual Meet Import',     '/admin/import-boys',             'Import boys dual meet results from CSV',                         'boys',  false, true,  true,  false),
('import_girls',        'Girls Dual Meet Import',    '/admin/import-girls',            'Import girls dual meet results from CSV',                        'girls', false, true,  true,  false),
('import_rtf',          'RTF Tournament Import',     '/admin/import-rtf',              'Import tournament bouts from RTF file (FloArena)',               'both',  false, false, true,  true),
('import_csv',          'CSV Tournament Import',     '/admin/import-csv',              'Import tournament bouts from CSV (TournamentWrestling)',         'both',  false, false, true,  true),
('import_jamboree',     'Girls Jamboree Import',     '/admin/import-jamboree-girls',   'Import girls round-robin / jamboree results',                    'girls', false, false, true,  false),
('tournament_hub',      'Tournament Hub',            '/admin/tournament-hub',          'Review and manage individual tournaments',                       'both',  false, false, true,  true),
('tournament_checklist','Tournament Checklist',      '/admin/tournament-checklist',    'Per-tournament import checklist and status tracking',            'both',  false, false, true,  true),
('resolve_unknowns',    'Resolve Unknowns (Boys)',   '/admin/resolve-unknowns',        'Match unresolved school/wrestler names from imports',            'boys',  false, false, true,  false),
('resolve_unknowns_girls','Resolve Unknowns (Girls)','/admin/resolve-unknowns-girls',  'Match unresolved names from imports (girls)',                    'girls', false, false, true,  false),
('rankings',            'Rankings',                  '/admin/rankings',                'View and manage published rankings',                             'both',  false, false, true,  true),
('dual_audit',          'Dual Audit',                '/admin/dual-audit',              'Audit dual meet data for missing or inconsistent records',       'both',  false, false, true,  false),
('bout_audit',          'Bout Audit',                '/admin/bout-audit',              'Audit individual bout records for errors or gaps',               'both',  false, false, true,  true),
('null_wrestler_bouts', 'Unlinked Wrestler Review',  '/admin/null-wrestler-bouts',     'Review bouts with no matched wrestler profile',                  'both',  false, false, true,  false),
('snapshot',            'Snapshot (Boys)',            '/admin/snapshot',                'Point-in-time data snapshot for boys season',                   'boys',  false, false, true,  true),
('snapshot_girls',      'Snapshot (Girls)',           '/admin/snapshot-girls',          'Point-in-time data snapshot for girls season',                  'girls', false, false, true,  true),
('match_card',          'Match Card',                '/admin/match-card',              'Generate printable match card for a bout',                       'both',  false, false, true,  false),
('team_scores',         'Import Team Scores',        '/admin/team-scores',             'Import dual meet team scores from file',                         'both',  false, false, true,  false),
('pp_audit',            'PP Audit',                  '/admin/pp-audit',                'Audit power points data for anomalies',                          'boys',  false, false, true,  false),
('states_hub',          'States Hub',                '/admin/states-hub',              'Boys divisions and state tournament management',                 'boys',  false, false, true,  true),
('calendar',            'Calendar',                  '/admin/calendar',                'Season calendar view; schedule overview',                        'both',  false, true,  true,  true),

-- Postseason-primary tools
('playoff_seeds',       'Playoff Seeds',             '/admin/playoff-seeds',           'Generate and manage district/region playoff seeds',              'boys',  false, false, false, true),
('district_preseed',    'District Pre-Seed Calc',    '/admin/district-preseed',        'Calculate pre-seeding for district tournaments',                 'boys',  false, false, false, true),
('region_seeds',        'Region Seeds',              '/admin/region-seeds',            'Generate region tournament seeds',                               'boys',  false, false, false, true),
('team_playoffs',       'Team Playoffs',             '/admin/team-playoffs',           'Team playoff bracket management',                                'boys',  false, false, false, true),
('bracket',             'Bracket Builder',           '/admin/bracket',                 'Build and publish tournament brackets',                          'both',  false, false, false, true),
('tournament_strength', 'Tournament Strength',       '/admin/tournament-strength',     'Tournament strength report for seeding decisions',               'boys',  false, false, false, true)
ON CONFLICT (key) DO NOTHING;

-- Global season calendar: one table drives all date-dependent logic across the site.
-- event_type is the system hook (null = display-only); event_category is for display grouping.

CREATE TABLE IF NOT EXISTS season_calendar (
  id              serial PRIMARY KEY,
  season_id       int    NOT NULL,          -- matches existing season_id convention (2 = 2025-26)
  season_label    text   NOT NULL,          -- e.g. '2025-26'
  event_date      date   NOT NULL,
  event_date_end  date,                     -- for multi-day events; null = single day
  event_time      text,                     -- e.g. '12:00 PM' for PP close
  event_category  text   NOT NULL,          -- display grouping (see values below)
  event_type      text,                     -- system hook: 'pp_cutoff', 'team_playoff_r12_public', etc.
  gender          text,                     -- 'M', 'F', 'both', or NULL for gender-neutral
  label           text   NOT NULL,
  notes           text,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_season_calendar_season ON season_calendar(season_id);
CREATE INDEX IF NOT EXISTS idx_season_calendar_event_type ON season_calendar(event_type) WHERE event_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_season_calendar_date ON season_calendar(event_date);

-- ── 2025-26 Season Data ────────────────────────────────────────────────────────

INSERT INTO season_calendar
  (season_id, season_label, event_date, event_date_end, event_time, event_category, event_type, gender, label, notes)
VALUES

-- Pre-Season & Season Start
(2,'2025-26','2025-09-17',NULL,NULL,'preseason',NULL,NULL,'33-Match Limit Approved (one-season increase from 30 to 33)','NJSIAA Executive Committee approval'),
(2,'2025-26','2025-11-03',NULL,NULL,'preseason',NULL,NULL,'Weight Certification Begins',NULL),
(2,'2025-26','2025-11-24','2025-11-26',NULL,'preseason',NULL,NULL,'Tryout Period',NULL),
(2,'2025-26','2025-12-01',NULL,NULL,'preseason',NULL,NULL,'First Practice',NULL),
(2,'2025-26','2025-12-08',NULL,NULL,'preseason',NULL,NULL,'Competition May Begin','Once 6-days-practice / 1-day-rest requirement is satisfied'),
(2,'2025-26','2025-12-08',NULL,NULL,'preseason',NULL,NULL,'Post-Season Transfer By Date',NULL),

-- Weight Allowances
(2,'2025-26','2025-12-26',NULL,NULL,'weight',NULL,NULL,'One-Pound Weight Allowance',NULL),
(2,'2025-26','2026-01-01',NULL,NULL,'weight',NULL,NULL,'Two-Pound Growth Allowance',NULL),
(2,'2025-26','2026-01-02',NULL,NULL,'weight',NULL,NULL,'One-Pound Weight Allowance','A standing 1-lb allowance also applies every Monday during the regular season and Monday of the team tournament (max 2 lbs combined with any weather allowance)'),

-- Team Tournament Entry & Rankings
(2,'2025-26','2026-01-11',NULL,NULL,'team_entry',NULL,'M','First Power Points Calculation (approx.)','4 Sundays before cutoff'),
(2,'2025-26','2026-01-20','2026-01-30',NULL,'team_entry',NULL,NULL,'Tournament Entry Period (Team)',NULL),
(2,'2025-26','2026-02-07',NULL,NULL,'team_entry',NULL,NULL,'Team Tournament Cutoff',NULL),
(2,'2025-26','2026-02-08',NULL,'12:00 PM','team_entry','pp_cutoff',NULL,'Power Points Close','5th Power Points recalculation runs this Sunday. PP only counts matches on or before this date/time.'),
(2,'2025-26','2026-02-10',NULL,NULL,'team_entry',NULL,NULL,'Team Tournament Seeding (Boys/Girls)','Brackets posted to nj.com. Final (6th) PP recalculation runs just before seeding.'),
(2,'2025-26','2026-02-14',NULL,NULL,'team_entry',NULL,NULL,'33-Match Limit Cutoff (Boys/Girls)',NULL),
(2,'2025-26','2026-02-22',NULL,NULL,'team_entry',NULL,NULL,'Regular Season Competition Ends (Boys/Girls)',NULL),

-- Boys Public Team Tournament
(2,'2025-26','2026-02-16',NULL,NULL,'team_public_boys','team_playoff_r12_public','M','Rounds 1 & 2','Seeds #1 & #2 host'),
(2,'2025-26','2026-02-18',NULL,NULL,'team_public_boys','team_playoff_sectional_final_public','M','Sectional Finals','Higher seed hosts'),
(2,'2025-26','2026-02-20',NULL,NULL,'team_public_boys','team_playoff_state_sf_public','M','State Semifinals','Higher seed hosts'),
(2,'2025-26','2026-02-22',NULL,NULL,'team_public_boys','team_playoff_state_final_public','M','State Finals','Location TBD'),

-- Boys Non-Public Team Tournament
(2,'2025-26','2026-02-17',NULL,NULL,'team_np_boys','team_playoff_r12_np','M','Rounds 1 & 2','Higher seed hosts; includes NP-B prelim (8v9) earlier in the day'),
(2,'2025-26','2026-02-19',NULL,NULL,'team_np_boys','team_playoff_state_sf_np','M','State Semifinals','Higher seed hosts'),
(2,'2025-26','2026-02-22',NULL,NULL,'team_np_boys','team_playoff_state_final_np','M','State Finals','Location TBD; same day as public State Finals'),

-- Girls Team Tournament
(2,'2025-26','2026-02-17',NULL,NULL,'team_girls','team_playoff_r12_girls','F','Rounds 1 & 2','Higher seed hosts'),
(2,'2025-26','2026-02-19',NULL,NULL,'team_girls','team_playoff_sectional_final_girls','F','Sectional Finals','Higher seed hosts'),
(2,'2025-26','2026-02-22',NULL,NULL,'team_girls','team_playoff_state_final_girls','F','State Finals','Location TBD'),

-- Individual Tournament Path — Boys
(2,'2025-26','2026-02-26',NULL,NULL,'individual_boys',NULL,'M','District Seeding (Boys)',NULL),
(2,'2025-26','2026-02-28',NULL,NULL,'individual_boys','individual_district_boys','M','Districts (Boys)','32 sites statewide'),
(2,'2025-26','2026-03-03','2026-03-04',NULL,'individual_boys',NULL,'M','Region Seeding (Boys)',NULL),
(2,'2025-26','2026-03-06','2026-03-07',NULL,'individual_boys','individual_region_boys','M','Regions (Boys)','8 sites statewide; two-day / 3-round format'),
(2,'2025-26','2026-03-10',NULL,NULL,'individual_boys',NULL,'M','Individual State Seeding (Boys/Girls)',NULL),
(2,'2025-26','2026-03-12','2026-03-14',NULL,'individual_boys','individual_state_boys','M','Individual Championships — Boys','Boardwalk Hall, Atlantic City'),

-- Individual Tournament Path — Girls
(2,'2025-26','2026-02-25',NULL,NULL,'individual_girls',NULL,'F','District Seeding (Girls)',NULL),
(2,'2025-26','2026-03-01',NULL,NULL,'individual_girls','individual_district_girls','F','Districts (Girls)',NULL),
(2,'2025-26','2026-03-02','2026-03-03',NULL,'individual_girls',NULL,'F','Region Seeding (Girls)',NULL),
(2,'2025-26','2026-03-08',NULL,NULL,'individual_girls','individual_region_girls','F','Regions (Girls)',NULL),
(2,'2025-26','2026-03-12','2026-03-14',NULL,'individual_girls','individual_state_girls','F','Individual Championships — Girls','Boardwalk Hall, Atlantic City'),

-- State Individual Championships — Boardwalk Hall Detail (full schedule)
-- Thursday, March 12
(2,'2025-26','2026-03-12',NULL,'8:00 am', 'state_individual_detail',NULL,'F','Weight Check — Girls',NULL),
(2,'2025-26','2026-03-12',NULL,'8:30 am', 'state_individual_detail',NULL,'F','Weigh-Ins — Girls',NULL),
(2,'2025-26','2026-03-12',NULL,'9:00 am', 'state_individual_detail',NULL,'M','Weight Check — Boys',NULL),
(2,'2025-26','2026-03-12',NULL,'9:30 am', 'state_individual_detail',NULL,'M','Weigh-Ins — Boys',NULL),
(2,'2025-26','2026-03-12',NULL,'10:00 am','state_individual_detail',NULL,'F','Wrestling — Girls: Pre-Quarters, Quarters, WB 1',NULL),
(2,'2025-26','2026-03-12',NULL,'11:25 am','state_individual_detail',NULL,'M','Wrestling — Boys: Preliminaries, Pre-Quarters, WB 1',NULL),
-- Friday, March 13
(2,'2025-26','2026-03-13',NULL,'7:00 am', 'state_individual_detail',NULL,'M','Weight Check — Boys',NULL),
(2,'2025-26','2026-03-13',NULL,'7:30 am', 'state_individual_detail',NULL,'M','Weigh-Ins — Boys',NULL),
(2,'2025-26','2026-03-13',NULL,'8:30 am', 'state_individual_detail',NULL,'F','Weight Check — Girls',NULL),
(2,'2025-26','2026-03-13',NULL,'9:00 am', 'state_individual_detail',NULL,'F','Weigh-Ins — Girls',NULL),
(2,'2025-26','2026-03-13',NULL,'9:00 am', 'state_individual_detail',NULL,'M','Wrestling — Boys: WB 2, Quarters, WB 3',NULL),
(2,'2025-26','2026-03-13',NULL,'10:45 am','state_individual_detail',NULL,'F','Wrestling — Girls: WB 2',NULL),
(2,'2025-26','2026-03-13',NULL,'2:30 pm', 'state_individual_detail',NULL,NULL,'Break',NULL),
(2,'2025-26','2026-03-13',NULL,'3:45 pm', 'state_individual_detail',NULL,'F','Wrestling — Girls: Semis, WB 3',NULL),
(2,'2025-26','2026-03-13',NULL,'5:40 pm', 'state_individual_detail',NULL,NULL,'Awards',NULL),
(2,'2025-26','2026-03-13',NULL,'6:00 pm', 'state_individual_detail',NULL,'M','Wrestling — Boys: Semifinals, WB 4',NULL),
(2,'2025-26','2026-03-13',NULL,'8:00 pm', 'state_individual_detail',NULL,'F','Wrestling — Girls: Consolation Semifinals',NULL),
(2,'2025-26','2026-03-13',NULL,'8:40 pm', 'state_individual_detail',NULL,'M','Wrestling — Boys: WB 5',NULL),
-- Saturday, March 14
(2,'2025-26','2026-03-14',NULL,'7:00 am', 'state_individual_detail',NULL,'M','Weight Check — Boys',NULL),
(2,'2025-26','2026-03-14',NULL,'7:30 am', 'state_individual_detail',NULL,'M','Weigh-Ins — Boys',NULL),
(2,'2025-26','2026-03-14',NULL,'7:30 am', 'state_individual_detail',NULL,'F','Weight Check — Girls',NULL),
(2,'2025-26','2026-03-14',NULL,'8:00 am', 'state_individual_detail',NULL,'F','Weigh-Ins — Girls',NULL),
(2,'2025-26','2026-03-14',NULL,'9:00 am', 'state_individual_detail',NULL,'M','Wrestling — Boys: WB 6',NULL),
(2,'2025-26','2026-03-14',NULL,'9:45 am', 'state_individual_detail',NULL,NULL,'Wrestling — Boys & Girls: 3rd–5th–7th Place',NULL),
(2,'2025-26','2026-03-14',NULL,'~12:45 pm','state_individual_detail',NULL,'F','Girls Parade',NULL),
(2,'2025-26','2026-03-14',NULL,'1:00 pm', 'state_individual_detail',NULL,'F','Girls Finals','Not before 1:00 pm'),
(2,'2025-26','2026-03-14',NULL,'~3:20 pm','state_individual_detail',NULL,'M','Boys Parade',NULL),
(2,'2025-26','2026-03-14',NULL,'3:30 pm', 'state_individual_detail',NULL,'M','Boys Finals','Not before 3:30 pm'),

-- State Team Championships
(2,'2025-26','2026-02-22',NULL,'12:00 PM','state_team',NULL,NULL,'State Team Championships — Session 1','Public Groups 1–5'),
(2,'2025-26','2026-02-22',NULL,'2:30 PM','state_team',NULL,NULL,'State Team Championships — Session 2','Non-Public A & B; 10-min warm-up per team before each session'),

-- Administrative / Policy
(2,'2025-26','2025-09-17',NULL,NULL,'administrative',NULL,NULL,'NJSIAA approved $200 fine / 2-week suspension for incorrect Trackwrestling weight entry',NULL),
(2,'2025-26','2025-11-25',NULL,NULL,'administrative',NULL,NULL,'NJSIAA regulation documents published','Regular Season Rules, Team Tournament Regs, Individual Tournament Regs');

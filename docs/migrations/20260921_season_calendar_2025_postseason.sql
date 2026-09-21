-- docs/migrations/20260921_season_calendar_2025_postseason.sql
--
-- Adds 2024-25 (season 2025) individual postseason dates to season_calendar.
-- Wrestler profiles read postseason event dates from these rows.
-- Dates provided by Kyle (human-verified). Girls had no district tournament in 2024-25.

INSERT INTO season_calendar (season_id, season_label, event_date, event_date_end, event_category, event_type, gender, label)
VALUES
  (2025, '2024-25', '2025-02-22', NULL,         'individual_boys',  'individual_district_boys', 'M', 'Districts (Boys)'),
  (2025, '2024-25', '2025-02-28', '2025-03-01', 'individual_boys',  'individual_region_boys',   'M', 'Regions (Boys)'),
  (2025, '2024-25', '2025-03-06', '2025-03-08', 'individual_boys',  'individual_state_boys',    'M', 'Individual Championships — Boys'),
  (2025, '2024-25', '2025-02-23', NULL,         'individual_girls', 'individual_region_girls',  'F', 'Regions (Girls)'),
  (2025, '2024-25', '2025-03-06', '2025-03-08', 'individual_girls', 'individual_state_girls',   'F', 'Individual Championships — Girls');

-- Reverse:
-- DELETE FROM season_calendar WHERE season_id = 2025 AND event_type LIKE 'individual_%';

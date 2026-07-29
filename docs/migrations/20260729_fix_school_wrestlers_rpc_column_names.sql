-- Fix school_wrestlers RPC: use renamed column names wrestler1_id/wrestler2_id.
--
-- Migration 20260728_tournament_type_and_oos_wrestlers.sql renamed:
--   nj_wrestler1_id → wrestler1_id
--   nj_wrestler2_id → wrestler2_id
-- in tournament_bouts, but the school_wrestlers function was not updated.
-- This caused NJ school roster pages to show 0 wrestlers from RTF bouts.
--
-- Also adds AND wr.is_oos = false to the final inseason SELECT so that OOS
-- wrestlers who happened to share a wrestler1_school_id with an NJ school
-- (import edge case) are never returned on an NJ school's roster.

CREATE OR REPLACE FUNCTION public.school_wrestlers(
  p_school_id integer,
  p_gender    gender_type DEFAULT 'M',
  p_season    smallint    DEFAULT 2
)
RETURNS TABLE(
  wrestler_id         uuid,
  wrestler_name       text,
  primary_weight      smallint,
  districts_placement text,
  districts_short     text,
  regions_placement   text,
  regions_short       text,
  state_placement     text
)
LANGUAGE sql STABLE SECURITY DEFINER AS $f$

WITH

-- ── 1. Postseason (unchanged) ─────────────────────────────────────────────
school_entries AS (
  SELECT
    te.id AS entry_id,
    te.wrestler_id,
    wc.weight,
    t.tournament_type::text AS tt,
    CASE t.tournament_type::text
      WHEN 'districts'  THEN 'D' || regexp_replace(t.name, '^Boy_s Districts District ', '')
      WHEN 'regions'    THEN 'R' || regexp_replace(t.name, '^Boy_s Regions r', '')
      WHEN 'boys_state' THEN 'State'
      ELSE t.name
    END AS short_name
  FROM tournament_entries te
  JOIN wrestlers wr  ON wr.id = te.wrestler_id AND wr.first_name <> ''
  JOIN tournaments t ON t.id  = te.tournament_id
                    AND t.gender    = p_gender
                    AND t.season_id = p_season
  JOIN weight_classes wc ON wc.id = te.weight_class_id
  WHERE te.school_id = p_school_id
),
entry_depth AS (
  SELECT
    se.entry_id,
    se.wrestler_id,
    se.weight,
    se.tt,
    se.short_name,
    COALESCE(bool_or(m.round::text = 'F'         AND m.winner_entry_id = se.entry_id), false) AS won_final,
    COALESCE(bool_or(m.round::text = 'F'         AND m.loser_entry_id  = se.entry_id), false) AS lost_final,
    COALESCE(bool_or(m.round::text = '3rd_Place' AND m.winner_entry_id = se.entry_id), false) AS won_3rd,
    COALESCE(bool_or(m.round::text = '3rd_Place' AND m.loser_entry_id  = se.entry_id), false) AS lost_3rd,
    COALESCE(bool_or(m.round::text = '5th_Place' AND m.winner_entry_id = se.entry_id), false) AS won_5th,
    COALESCE(bool_or(m.round::text = '5th_Place' AND m.loser_entry_id  = se.entry_id), false) AS lost_5th,
    COALESCE(MAX(
      CASE m.round::text
        WHEN 'SF' THEN 70  WHEN 'C6' THEN 65 WHEN 'C5' THEN 60
        WHEN 'QF' THEN 55  WHEN 'C4' THEN 50 WHEN 'C3' THEN 45
        WHEN 'R2' THEN 40  WHEN 'C2' THEN 35 WHEN 'R1' THEN 30
        WHEN 'C1' THEN 25  ELSE 0
      END
    ), 0) AS max_depth
  FROM school_entries se
  LEFT JOIN matches m ON (m.winner_entry_id = se.entry_id OR m.loser_entry_id = se.entry_id)
                     AND m.validated = true
  GROUP BY se.entry_id, se.wrestler_id, se.weight, se.tt, se.short_name
),
entry_placement AS (
  SELECT *,
    CASE
      WHEN won_final  THEN '1st'
      WHEN lost_final THEN '2nd'
      WHEN won_3rd    THEN '3rd'
      WHEN lost_3rd   THEN '4th'
      WHEN won_5th    THEN '5th'
      WHEN lost_5th   THEN '6th'
      WHEN max_depth >= 70 THEN 'SF'
      WHEN max_depth >= 60 THEN 'C5+'
      WHEN max_depth >= 55 THEN 'QF'
      WHEN max_depth >= 45 THEN 'C3+'
      WHEN max_depth >= 40 THEN 'R2'
      WHEN max_depth >= 30 THEN 'R1'
      WHEN max_depth >= 25 THEN 'C1'
      ELSE NULL
    END AS placement
  FROM entry_depth
),
pivoted AS (
  SELECT
    ep.wrestler_id,
    MIN(CASE WHEN ep.tt = 'districts'  THEN ep.weight END) AS d_weight,
    MIN(CASE WHEN ep.tt = 'regions'    THEN ep.weight END) AS r_weight,
    MIN(CASE WHEN ep.tt = 'boys_state' THEN ep.weight END) AS s_weight,
    MAX(CASE WHEN ep.tt = 'districts'  THEN ep.placement  END) AS districts_placement,
    MAX(CASE WHEN ep.tt = 'districts'  THEN ep.short_name END) AS districts_short,
    MAX(CASE WHEN ep.tt = 'regions'    THEN ep.placement  END) AS regions_placement,
    MAX(CASE WHEN ep.tt = 'regions'    THEN ep.short_name END) AS regions_short,
    MAX(CASE WHEN ep.tt = 'boys_state' THEN ep.placement  END) AS state_placement
  FROM entry_placement ep
  GROUP BY ep.wrestler_id
),
postseason AS (
  SELECT
    p.wrestler_id,
    wr.first_name || ' ' || wr.last_name                      AS wrestler_name,
    COALESCE(p.d_weight, p.r_weight, p.s_weight)::smallint    AS primary_weight,
    p.districts_placement,
    p.districts_short,
    p.regions_placement,
    p.regions_short,
    p.state_placement
  FROM pivoted p
  JOIN wrestlers wr ON wr.id = p.wrestler_id
),

-- ── 2. RTF in-season tournament bouts ────────────────────────────────────
-- Season label: season_id 1 → '2024-25', 2 → '2025-26', etc.
season_label(val) AS (
  SELECT (2023 + p_season)::text
      || '-'
      || lpad(((2023 + p_season + 1) % 100)::text, 2, '0')
),
rtf_wrestlers AS (
  SELECT DISTINCT
    CASE WHEN tb.wrestler1_school_id = p_school_id
         THEN tb.wrestler1_id
         ELSE tb.wrestler2_id
    END                   AS wrestler_id,
    tb.weight_class       AS weight_class
  FROM tournament_bouts tb
  JOIN in_season_tournaments ist ON ist.id = tb.in_season_tournament_id
  CROSS JOIN season_label sl
  WHERE ist.season = sl.val
    AND (
      (tb.wrestler1_school_id = p_school_id AND tb.wrestler1_id IS NOT NULL)
      OR
      (tb.wrestler2_school_id = p_school_id AND tb.wrestler2_id IS NOT NULL)
    )
),

-- ── 3. Dual meet matches ──────────────────────────────────────────────────
dual_wrestlers AS (
  SELECT DISTINCT
    CASE WHEN dmm.school_a_id = p_school_id
         THEN dmm.wrestler_a_id
         ELSE dmm.wrestler_b_id
    END                   AS wrestler_id,
    dmm.weight_class      AS weight_class
  FROM dual_meet_matches dmm
  JOIN dual_meets dm ON dm.id = dmm.dual_meet_id
  WHERE dm.season_id = p_season
    AND dm.gender    = p_gender::text
    AND (
      (dmm.school_a_id = p_school_id AND dmm.wrestler_a_id IS NOT NULL)
      OR
      (dmm.school_b_id = p_school_id AND dmm.wrestler_b_id IS NOT NULL)
    )
    AND dmm.is_double_forfeit = false
),

-- ── 4. In-season only (not already in postseason) ─────────────────────────
inseason_only AS (
  SELECT
    wrestler_id,
    MIN(weight_class)::smallint AS primary_weight
  FROM (
    SELECT wrestler_id, weight_class FROM rtf_wrestlers WHERE wrestler_id IS NOT NULL
    UNION
    SELECT wrestler_id, weight_class FROM dual_wrestlers WHERE wrestler_id IS NOT NULL
  ) combined
  WHERE wrestler_id NOT IN (SELECT wrestler_id FROM postseason)
  GROUP BY wrestler_id
)

-- ── Final UNION ────────────────────────────────────────────────────────────
SELECT * FROM postseason

UNION ALL

SELECT
  wr.id                              AS wrestler_id,
  wr.first_name || ' ' || wr.last_name AS wrestler_name,
  ins.primary_weight,
  NULL::text                         AS districts_placement,
  NULL::text                         AS districts_short,
  NULL::text                         AS regions_placement,
  NULL::text                         AS regions_short,
  NULL::text                         AS state_placement
FROM inseason_only ins
JOIN wrestlers wr ON wr.id = ins.wrestler_id
WHERE wr.gender = p_gender
  AND wr.is_oos = false

ORDER BY primary_weight, wrestler_name

$f$;

-- ── Rollback ───────────────────────────────────────────────────────────────
-- Re-run docs/migrations/20260727_school_wrestlers_include_inseason.sql
-- to restore the previous version with the stale column names.

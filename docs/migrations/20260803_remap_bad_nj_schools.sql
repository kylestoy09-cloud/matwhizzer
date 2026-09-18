-- docs/migrations/20260803_remap_bad_nj_schools.sql
--
-- Remaps 28 NJSIAA school records that were incorrectly auto-created by the
-- RTF import tool and the team scores migration. Each bad school is redirected
-- to the correct existing school across all referencing tables, then the bad
-- school record is deleted.
--
-- Mapping:
--   799 BCIT Westampton           -> 256 Westampton Tech
--   803 Becton/Wood-Ridge         -> 321 Becton
--   804 Brearley/Dayton           -> 130 Brearley
--   805 Bridgewater-Raritan (dup) -> 131 Bridgewater-Raritan
--   813 Delbarton                 -> 82  Delbarton School
--   816 East Side                 -> 122 Newark East Side
--   817 Eastside (Paterson)       -> 72  Paterson Eastside
--   819 Emerson/Park Ridge        -> 3   Emerson Boro
--   825 Hamilton East-Steinert    -> 208 Steinert
--   826 Hamilton North-Nottingham -> 209 Nottingham
--   829 Highland Regional/Triton  -> 369 Highland
--   833 JFK Iselin                -> 150 Iselin Kennedy
--   838 Lenape Valley/Hopatcong   -> 62  Lenape Valley
--   839 Leonia/Palisades Park     -> 44  Leonia
--   844 Lyndhurst/North Arlington -> 83  Lyndhurst
--   855 Northern Valley Demarest  -> 314 Demarest
--   856 Northern Valley OldTappan -> 6   Old Tappan
--   858 Overbrook Regional        -> 299 Overbrook
--   860 Passaic Co Tech-Voc       -> 391 Passaic Tech
--   861 Pennsville (dup)          -> 293 Pennsville
--   862 Pingry School             -> 144 Pingry
--   868 Sayreville                -> 185 Sayreville War Memorial
--   882 Summit/Chatham            -> 397 Summit
--   885 Trenton Central           -> 216 Trenton
--   890 Waldwick/Midland Park     -> 9   Waldwick
--   891 Warren Hills (dup)        -> 67  Warren Hills
--   895 West Morris Mendham       -> 89  Mendham
--   896 West Morris Central       -> 108 West Morris

DO $$
BEGIN

  -- ── tournament_entries ──────────────────────────────────────────────────────
  UPDATE public.tournament_entries SET school_id = m.g FROM (VALUES
    (799,256),(803,321),(804,130),(805,131),(813,82),(816,122),(817,72),(819,3),
    (825,208),(826,209),(829,369),(833,150),(838,62),(839,44),(844,83),(855,314),
    (856,6),(858,299),(860,391),(861,293),(862,144),(868,185),(882,397),(885,216),
    (890,9),(891,67),(895,89),(896,108)
  ) AS m(b,g) WHERE school_id = m.b;

  -- ── tournament_bouts ────────────────────────────────────────────────────────
  UPDATE public.tournament_bouts SET wrestler1_school_id = m.g FROM (VALUES
    (799,256),(803,321),(804,130),(805,131),(813,82),(816,122),(817,72),(819,3),
    (825,208),(826,209),(829,369),(833,150),(838,62),(839,44),(844,83),(855,314),
    (856,6),(858,299),(860,391),(861,293),(862,144),(868,185),(882,397),(885,216),
    (890,9),(891,67),(895,89),(896,108)
  ) AS m(b,g) WHERE wrestler1_school_id = m.b;

  UPDATE public.tournament_bouts SET wrestler2_school_id = m.g FROM (VALUES
    (799,256),(803,321),(804,130),(805,131),(813,82),(816,122),(817,72),(819,3),
    (825,208),(826,209),(829,369),(833,150),(838,62),(839,44),(844,83),(855,314),
    (856,6),(858,299),(860,391),(861,293),(862,144),(868,185),(882,397),(885,216),
    (890,9),(891,67),(895,89),(896,108)
  ) AS m(b,g) WHERE wrestler2_school_id = m.b;

  -- ── wrestler_name_aliases ───────────────────────────────────────────────────
  UPDATE public.wrestler_name_aliases SET school_id = m.g FROM (VALUES
    (799,256),(803,321),(804,130),(805,131),(813,82),(816,122),(817,72),(819,3),
    (825,208),(826,209),(829,369),(833,150),(838,62),(839,44),(844,83),(855,314),
    (856,6),(858,299),(860,391),(861,293),(862,144),(868,185),(882,397),(885,216),
    (890,9),(891,67),(895,89),(896,108)
  ) AS m(b,g) WHERE school_id = m.b;

  -- ── in_season_tournament_team_scores ────────────────────────────────────────
  UPDATE public.in_season_tournament_team_scores SET school_id = m.g FROM (VALUES
    (799,256),(803,321),(804,130),(805,131),(813,82),(816,122),(817,72),(819,3),
    (825,208),(826,209),(829,369),(833,150),(838,62),(839,44),(844,83),(855,314),
    (856,6),(858,299),(860,391),(861,293),(862,144),(868,185),(882,397),(885,216),
    (890,9),(891,67),(895,89),(896,108)
  ) AS m(b,g) WHERE school_id = m.b;

  -- ── tournament_placements ───────────────────────────────────────────────────
  UPDATE public.tournament_placements SET school_id = m.g FROM (VALUES
    (799,256),(803,321),(804,130),(805,131),(813,82),(816,122),(817,72),(819,3),
    (825,208),(826,209),(829,369),(833,150),(838,62),(839,44),(844,83),(855,314),
    (856,6),(858,299),(860,391),(861,293),(862,144),(868,185),(882,397),(885,216),
    (890,9),(891,67),(895,89),(896,108)
  ) AS m(b,g) WHERE school_id = m.b;

  -- ── precomputed_team_scores ─────────────────────────────────────────────────
  UPDATE public.precomputed_team_scores SET school_id = m.g FROM (VALUES
    (799,256),(803,321),(804,130),(805,131),(813,82),(816,122),(817,72),(819,3),
    (825,208),(826,209),(829,369),(833,150),(838,62),(839,44),(844,83),(855,314),
    (856,6),(858,299),(860,391),(861,293),(862,144),(868,185),(882,397),(885,216),
    (890,9),(891,67),(895,89),(896,108)
  ) AS m(b,g) WHERE school_id = m.b;

  -- ── conference_standings ────────────────────────────────────────────────────
  UPDATE public.conference_standings SET school_id = m.g FROM (VALUES
    (799,256),(803,321),(804,130),(805,131),(813,82),(816,122),(817,72),(819,3),
    (825,208),(826,209),(829,369),(833,150),(838,62),(839,44),(844,83),(855,314),
    (856,6),(858,299),(860,391),(861,293),(862,144),(868,185),(882,397),(885,216),
    (890,9),(891,67),(895,89),(896,108)
  ) AS m(b,g) WHERE school_id = m.b;

  -- ── dual_meets ──────────────────────────────────────────────────────────────
  UPDATE public.dual_meets SET team1_school_id = m.g FROM (VALUES
    (799,256),(803,321),(804,130),(805,131),(813,82),(816,122),(817,72),(819,3),
    (825,208),(826,209),(829,369),(833,150),(838,62),(839,44),(844,83),(855,314),
    (856,6),(858,299),(860,391),(861,293),(862,144),(868,185),(882,397),(885,216),
    (890,9),(891,67),(895,89),(896,108)
  ) AS m(b,g) WHERE team1_school_id = m.b;

  UPDATE public.dual_meets SET team2_school_id = m.g FROM (VALUES
    (799,256),(803,321),(804,130),(805,131),(813,82),(816,122),(817,72),(819,3),
    (825,208),(826,209),(829,369),(833,150),(838,62),(839,44),(844,83),(855,314),
    (856,6),(858,299),(860,391),(861,293),(862,144),(868,185),(882,397),(885,216),
    (890,9),(891,67),(895,89),(896,108)
  ) AS m(b,g) WHERE team2_school_id = m.b;

  UPDATE public.dual_meets SET school_a_id = m.g FROM (VALUES
    (799,256),(803,321),(804,130),(805,131),(813,82),(816,122),(817,72),(819,3),
    (825,208),(826,209),(829,369),(833,150),(838,62),(839,44),(844,83),(855,314),
    (856,6),(858,299),(860,391),(861,293),(862,144),(868,185),(882,397),(885,216),
    (890,9),(891,67),(895,89),(896,108)
  ) AS m(b,g) WHERE school_a_id = m.b;

  UPDATE public.dual_meets SET school_b_id = m.g FROM (VALUES
    (799,256),(803,321),(804,130),(805,131),(813,82),(816,122),(817,72),(819,3),
    (825,208),(826,209),(829,369),(833,150),(838,62),(839,44),(844,83),(855,314),
    (856,6),(858,299),(860,391),(861,293),(862,144),(868,185),(882,397),(885,216),
    (890,9),(891,67),(895,89),(896,108)
  ) AS m(b,g) WHERE school_b_id = m.b;

  -- ── Delete bad school records ────────────────────────────────────────────────
  -- school_aliases CASCADE deletes automatically; wrestler_name_aliases updated above
  DELETE FROM public.schools
  WHERE id IN (
    799,803,804,805,813,816,817,819,
    825,826,829,833,838,839,844,855,
    856,858,860,861,862,868,882,885,
    890,891,895,896
  );

END $$;

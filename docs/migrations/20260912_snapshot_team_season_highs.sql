-- Per-school season-best single-match performance for snapshot team stat panels.
-- stat_key: 'pins' | 'techs' | 'combined' | 'bonus_pct'
-- best_value: pin/tech/combined count, or bonus fraction (0–1) for bonus_pct
-- avg_time_sec: average stoppage time for tiebreaker (lower is better); null for bonus_pct
-- bonus_wins/total_bouts/pins/techs: display context for bonus_pct and combined rows

CREATE TABLE IF NOT EXISTS public.snapshot_team_season_highs (
  season        text        NOT NULL,
  school_id     integer     NOT NULL,
  school_name   text        NOT NULL,
  stat_key      text        NOT NULL,
  best_value    numeric     NOT NULL,
  avg_time_sec  integer,
  bonus_wins    integer,
  total_bouts   integer,
  pins          integer,
  techs         integer,
  best_on       date        NOT NULL,
  PRIMARY KEY (season, school_id, stat_key)
);

CREATE TABLE IF NOT EXISTS public.snapshot_team_season_highs_girls (
  season        text        NOT NULL,
  school_id     integer     NOT NULL,
  school_name   text        NOT NULL,
  stat_key      text        NOT NULL,
  best_value    numeric     NOT NULL,
  avg_time_sec  integer,
  bonus_wins    integer,
  total_bouts   integer,
  pins          integer,
  techs         integer,
  best_on       date        NOT NULL,
  PRIMARY KEY (season, school_id, stat_key)
);

-- Beast of the East NJ school_id fix.
-- Clears all matches from the imprecise wildcard import, then re-applies
-- only confirmed NJ NJSIAA schools using a whitelist + targeted patterns.

-- Step 1: Reset all Beast school_ids
UPDATE public.in_season_tournament_team_scores
SET school_id = NULL
WHERE tournament_id = (
  SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1
);

-- Step 2: Apply only confirmed NJ NJSIAA schools
WITH beast AS (
  SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1
),
corrections(score_name, pattern) AS (VALUES
  ('Bergen Catholic',                       'Bergen Catholic%'),
  ('Camden Catholic',                       'Camden Catholic%'),
  ('Seton Hall Prep',                       'Seton Hall Prep%'),
  ('Don Bosco Prep',                        'Don Bosco Prep%'),
  ('Paramus Catholic',                      'Paramus Catholic%'),
  ('Christian Brothers Academy',            'Christian Brothers'),
  ('Howell',                                'Howell%'),
  ('St Joseph Metuchen',                    '%Joseph%Metuchen%'),
  ('Hanover Park',                          'Hanover Park%'),
  ('Immaculata',                            'Immaculata%'),
  ('Rumson-Fair Haven Regional',            '%Rumson%Fair Haven%'),
  ('Washington Township',                   'Washington Township%'),
  ('Toms River East',                       'Toms River East%'),
  ('Pope John XXIII',                       'Pope John%'),
  ('Holmdel',                               'Holmdel%'),
  ('Watchung Hills',                        'Watchung Hills%'),
  ('Woodstown',                             'Woodstown%'),
  ('Stafford',                              'Stafford%'),
  ('St John Vianney',                       '%Vianney%'),
  ('St Peter Preparatory',                  '%Peter%Prep%'),
  ('St Augustine',                          '%Augustine%Prep%'),
  ('Lacey',                                 'Lacey%'),
  ('Dumont',                                'Dumont%'),
  ('Westfield',                             'Westfield%'),
  ('Summit',                                'Summit%'),
  ('Kingsway',                              'Kingsway%'),
  ('Cranford',                              'Cranford%'),
  ('North Burlington',                      '%North Burlington%'),
  ('Haddonfield',                           'Haddonfield%'),
  ('Salem',                                 'Salem%'),
  ('Caldwell',                              'Caldwell%'),
  ('Colts Neck',                            'Colts Neck%'),
  ('Kinnelon',                              'Kinnelon%'),
  ('Parsippany Hills',                      'Parsippany Hills%'),
  ('Sussex Tech',                           '%Sussex%Tech%'),
  ('Hunterdon Central Regional',            'Hunterdon Central%'),
  ('Jackson Township',                      'Jackson Township%'),
  ('Paulsboro',                             'Paulsboro%'),
  ('DePaul Catholic',                       'DePaul%'),
  ('North Brunswick',                       'North Brunswick%'),
  ('Warren Hills',                          'Warren Hills%'),
  ('West Morris',                           'West Morris%'),
  ('Roselle Park',                          'Roselle Park%'),
  ('Lakeland Regional',                     'Lakeland Regional%'),
  ('Paramus',                               'Paramus'),
  ('Williamstown',                          'Williamstown%'),
  ('Newark Charter',                        'Newark Charter%'),
  ('Clearview',                             'Clearview%'),
  ('Schalick',                              'Schalick%'),
  ('Ridgefield',                            'Ridgefield%'),
  ('River Dell Regional',                   'River Dell%'),
  ('Northern Valley Demarest',              '%Demarest%'),
  ('Pingry School',                         '%Pingry%'),
  ('The Peddie School',                     '%Peddie%'),
  ('Passaic County Tech',                   '%Passaic%Tech%'),
  ('Pompton Lakes',                         'Pompton Lakes%'),
  ('Sussex Central',                        'Sussex Central%'),
  ('Paul VI',                               'Paul VI%'),
  ('Bergenfield',                           'Bergenfield%'),
  ('Northern Valley Regional - Old Tappan', '%Old Tappan%'),
  ('Morris Hills',                          'Morris Hills%'),
  ('Shawnee',                               'Shawnee%'),
  ('Delran',                                'Delran%'),
  ('Hackettstown',                          'Hackettstown%'),
  ('Union',                                 'Union')
)
UPDATE public.in_season_tournament_team_scores s
SET school_id = (
  SELECT sch.id
  FROM public.schools sch
  WHERE sch.is_nj = true
    AND sch.display_name ILIKE c.pattern
  ORDER BY length(sch.display_name) ASC
  LIMIT 1
)
FROM corrections c, beast
WHERE s.school_name = c.score_name
  AND s.tournament_id = beast.id;

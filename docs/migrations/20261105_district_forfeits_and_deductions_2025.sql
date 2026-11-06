-- docs/migrations/20261105_district_forfeits_and_deductions_2025.sql
--
-- Boys 2024-25 district forfeits and team deductions (scripts/fix_district_forfeits_20261105.mts
-- --season 2025). The 2025-26 run (20261105_district_forfeits_and_deductions.sql) added the
-- forfeit_opponent column and the team_point_deductions table; this marks the 2024-25 bouts.
-- From TrackWrestling's text (Match Data/2025 District Data.py): 124 district forfeits with no loser,
-- none with a real loser to put back; 95 over a filler entry, 29 over an empty slot. 2 placement
-- rows were added by the service role.
-- 9 deductions (-1 each): the schools exactly 1 over their official total under the scoring rules.
-- Run in the Supabase SQL editor. All or nothing.

BEGIN;

ALTER TABLE matches ADD COLUMN IF NOT EXISTS forfeit_opponent text
  CHECK (forfeit_opponent IN ('filler', 'empty'));



UPDATE matches SET forfeit_opponent = 'filler' WHERE loser_entry_id IS NULL AND id IN (
  'ddbfa189-a78a-4b6d-a817-61627528b51e',
  '54d3c9e1-e99e-44f1-b4b4-376359036ad4',
  '73044c1b-9ed7-4fe7-b9a0-8d2769f78568',
  '25f7dcf9-ad76-4ec4-afea-d81e547b6887',
  'dde96430-3685-4415-8178-05501023a1fd',
  'fbdbb44c-1edb-45be-8305-245fd03a4b0a',
  'd76894de-dcb1-48e2-8c54-e3ed1c4a6deb',
  '8ae1efa5-badf-406a-88fa-e8ffa3446f61',
  'b5f209e8-e422-42ea-89dd-bf2b5436837c',
  '379e738f-1123-4de5-b558-371e85e25f57',
  '0d1eefeb-5dfa-44d7-88f6-3c8831c014cf',
  '4ad10033-e168-4e26-a7d3-7916e61c61d0',
  'c60f59a2-a177-48d8-9cae-28adc4ef3270',
  'c148c84c-0088-4170-abed-588d711bf47a',
  '3da90b81-f0a1-4c72-93cf-e6a0cc99791f',
  '3cbfacb3-f275-4b6c-958c-7df34c45cc3b',
  '1431e455-d82f-4e5c-9fdb-aa665d4e69c4',
  '609bb442-9d8f-474a-91b4-b722527ad7d4',
  'adba42d3-02f7-4950-976d-5ab449048a18',
  '8eb94761-6c94-4394-b308-febbc545d96b',
  'd53b4069-d0dc-4cbb-a25c-f4f1ea536c3e',
  'e176bd45-d21a-4a69-bc7e-a9a12693215a',
  'f7e8c4b2-cad9-4f55-bb48-d14862198108',
  'd78e32aa-b3cd-478f-b6a0-ad6d415ad1d5',
  '87013828-bf77-40c0-ba9f-bebfff5f5f52',
  '938ceb25-ae92-46db-a7a9-0da01b92deca',
  'e12a627c-c4f7-46f5-8f56-08f03b434953',
  '471bf971-a770-42cd-960b-fe92b086035e',
  '323f00d9-27b2-4826-9202-65c69bc75ae5',
  '692a22c3-1c51-4181-9ffb-c60a04931c00',
  'a3c305a8-6adc-4321-9c84-caa4b9427228',
  '4ad0ee16-e762-4203-ad87-62bb2185d313',
  '5b613681-8919-45d2-ac23-a2d7de8d4c51',
  'd19fb3d5-ca44-44a9-8d3d-f2e340f3db90',
  'd9e186d4-8735-4c44-bbcd-558f050fff7d',
  '1947a47c-c487-4eab-9d95-6786395a8cff',
  'a1bfab02-603c-461c-84ff-f36ae698995d',
  '105bfa83-055e-4cd2-8a64-6721fcb0d41d',
  '4b5ec98e-4701-4809-865e-3f59f194a666',
  '651eca6e-8352-41c6-9b2d-268f862ecd81',
  '9e2dc757-2b59-41ee-b633-05fefe440353',
  'eb48078a-91b6-41e3-b1c8-d6f4bd90accb',
  'f418986e-3d65-4011-b304-c2dc07dbb412',
  'e93709b3-6ff2-487d-8584-681c088df732',
  '2e7ad1a0-495b-471a-9f04-cf97316f4eb8',
  'aa1c5f0d-e171-4686-8e50-e001dfdd9cfc',
  'c4cbe61e-cd02-437f-9231-1a41ea13aa81',
  '6dad9726-4ebc-4438-b2d7-7ad7464e7264',
  '9882234f-c038-464d-8a44-989f8259b367',
  'b56d2cc6-3792-4655-a2d5-78f3c7530dc9',
  'ed424861-2e96-4cec-96c4-115a4815593e',
  'e8da9033-8054-448a-8843-61077f0c5e72',
  '20183f59-8e3d-409a-b877-a636a010e4d0',
  '3344a0ff-768a-44e1-899a-72afd75cbbd5',
  'a7901700-d785-41bc-8dc7-1026646cadf4',
  '787649cb-5f54-4d4f-a4ba-3c6c023bd8b9',
  '9e63cd02-ec5d-4958-9c45-db62680a6656',
  '51a0ae45-3149-46c9-bbac-56f06e9b07f8',
  '3f52831f-17a9-4cfe-a1e3-e523ffa399e9',
  '1183dbd7-a3a6-4a75-9d20-42a1171da47f',
  'd43ef757-fac3-4ce5-b9de-6975665f0e5c',
  '56cb668b-e222-4218-a695-c2c12c143fa3',
  '6131492a-fbe5-4071-a086-cfdbabfb341c',
  '66343d97-db26-43f3-8dc9-582e932692a4',
  'bc90909f-7e9d-42cd-833f-e7a1fc3d953f',
  'bc6e09e2-4100-4170-83b9-093827ed9082',
  '0c445ffd-bece-4cb7-aff3-3def3f7c9b42',
  'babd8ada-4d3b-48b9-bb9d-e9f70e152740',
  'e872e01c-30a9-478a-9437-3e7d624ef92a',
  'cf7a1bf1-1a0f-42a3-89dd-3dda07a4f481',
  '98bcd042-7def-4aca-938f-3bf54e294538',
  '417773fc-0f67-47fc-9d9e-126d87664a10',
  '4c82416f-951f-4aaa-85ee-2285fb817b0e',
  'e67b5706-17e8-40e6-8e30-744dcb6b2488',
  '9b5286b9-0dec-4b5e-8226-62b4dc78bc62',
  '41b7b55b-75fb-4f88-9525-70c0421cd459',
  'c4507be8-edf2-4ef8-974e-633d706a13cd',
  'b6b60474-5911-4355-95e2-9f33bf04a67e',
  '4491bc59-543b-4be9-b138-38e0b0ce1d39',
  'd84f391b-b1a9-4b2b-baf5-c5315bb4efc9',
  '93486d0f-2168-4975-b35d-050bd0673fc1',
  '3ef0b6dc-5e8d-4de0-93a3-612fd7ddde8d',
  '02eb1587-725c-4a22-9f53-36d398d18445',
  'db2c43e0-3b68-4f8e-be00-257f6298beea',
  'b0cdffe0-43d0-4ac4-bc8c-fbe36d0825db',
  '3b9850bc-faec-4e8e-bd27-0a0ff6d0d2a2',
  '25a064e6-e726-4a9e-aa0a-bf134f45d2a6',
  'da04e2a6-9bc5-4778-9ea6-e2f4b21e5075',
  '0798c9be-1aa9-4d7e-9389-42c134e9679f',
  '6f30695d-d35d-4ed5-9598-c0c99b96ea6d',
  '18feec11-8991-4f02-a1ca-c8335688a3e2',
  '868abac9-289c-43b7-9277-1cb8cd2db1b5',
  '3937501a-54a6-4856-a078-d9ee52288e1d',
  'c5afd670-36fb-41fd-8cb3-2d8f1e828a96',
  'f9d2f58c-bb2a-4b3f-b9f8-f995ae8977f9');
UPDATE matches SET forfeit_opponent = 'empty' WHERE loser_entry_id IS NULL AND id IN (
  '85641592-902c-40ac-9679-d78a4e02db35',
  'a91061a9-51d6-4040-8f10-070d9a19e99c',
  '9aaabbcf-2d17-4d18-ad4f-fad3944abcb6',
  '2a1c2664-8c9b-483a-934d-c061fa15505f',
  'a6423137-d806-4c8e-b91b-b8a942e4375b',
  '7c8a9d14-4d9a-4c52-8fea-197d14d72f87',
  '8ad5510c-5d51-473d-af6d-9be4a00a16a8',
  '4cb4d0b9-d381-4140-a6da-73f3ed6734ae',
  'd8563bd1-29b3-4f32-9d36-5a72194718c8',
  'fcdd683a-fac6-4b1f-86c7-71aa1aa3e249',
  '90ebaa71-10a6-4a20-ac35-c9e79f1ecd84',
  '02b9a7fa-c3aa-4e27-b2b3-ed0f9a738d39',
  '84775b03-4765-4135-9e50-e68cf732e42f',
  '28bdf570-b8b2-40f2-88d8-b267dd484546',
  '289b53e4-6777-4cc5-9174-7065fcda26d7',
  '11934ca7-e402-4220-bc88-196a4bf9279a',
  '3fc302be-72bd-4df9-bab1-033a76c29685',
  '63f66d16-9304-4e27-add3-877be86c18b5',
  '4db39980-c3da-4e33-bd95-7b756b55a9a2',
  '44c1cdc4-c01f-40ed-bbc9-03aa28c33069',
  '0f7872ec-e7de-40a6-9b35-cacf20e4d4ed',
  '09fc7196-7229-4eac-bebe-2450878b99ce',
  '0d2df1a3-a7d1-42bc-a208-64ff5d3b4563',
  'f2b82f52-4a24-4111-a625-2d33d13653ad',
  '9955a90f-cb29-47b7-bb8f-7972a1fdf87a',
  '9357b0e6-0a22-4064-a684-54d95ac1164e',
  'd420c84c-8684-4a50-8401-5f5c8b5428b3',
  'f189ae8a-d2ab-4173-a2e7-7571fbf01f05',
  '72ebb91a-b033-4515-9320-6f1bd01383e4');

CREATE TABLE IF NOT EXISTS team_point_deductions (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tournament_id integer NOT NULL REFERENCES tournaments(id),
  school_id     integer NOT NULL REFERENCES schools(id),
  points        numeric NOT NULL CHECK (points < 0),
  source        text    NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, school_id)
);
ALTER TABLE team_point_deductions ENABLE ROW LEVEL SECURITY;
GRANT ALL ON team_point_deductions TO service_role;

INSERT INTO team_point_deductions (tournament_id, school_id, points, source) VALUES
  (94, 12, -1, 'official minus scoring rules, 2026-11-05'),
  (95, 315, -1, 'official minus scoring rules, 2026-11-05'),
  (99, 62, -1, 'official minus scoring rules, 2026-11-05'),
  (103, 109, -1, 'official minus scoring rules, 2026-11-05'),
  (106, 138, -1, 'official minus scoring rules, 2026-11-05'),
  (108, 153, -1, 'official minus scoring rules, 2026-11-05'),
  (116, 227, -1, 'official minus scoring rules, 2026-11-05'),
  (117, 245, -1, 'official minus scoring rules, 2026-11-05'),
  (119, 258, -1, 'official minus scoring rules, 2026-11-05')
ON CONFLICT (tournament_id, school_id) DO NOTHING;

COMMIT;

-- Verify: expect filler 95, empty 29, unmarked_no_loser 1 (a bout with no winner either, left as is); 9 deductions, -9
SELECT count(*) FILTER (WHERE forfeit_opponent = 'filler') AS filler, count(*) FILTER (WHERE forfeit_opponent = 'empty') AS empty,
       count(*) FILTER (WHERE loser_entry_id IS NULL AND forfeit_opponent IS NULL) AS unmarked_no_loser
FROM matches WHERE tournament_id IN (93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124);
SELECT count(*) AS deductions, sum(points) AS total FROM team_point_deductions WHERE tournament_id BETWEEN 93 AND 124;

-- ROLLBACK (2024-25 only):
-- UPDATE matches SET forfeit_opponent = NULL WHERE tournament_id BETWEEN 93 AND 124;
-- DELETE FROM team_point_deductions WHERE tournament_id BETWEEN 93 AND 124;
-- then delete the 2 service-role placement rows listed in the backup file.

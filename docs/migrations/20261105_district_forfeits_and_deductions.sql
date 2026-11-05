-- docs/migrations/20261105_district_forfeits_and_deductions.sql
--
-- Boys 2025-26 district forfeits and team deductions (scripts/fix_district_forfeits_20261105.mts).
-- The 2026-03-20 load wrote every forfeit's loser as "FORFEIT", so 202 district forfeit bouts had
-- no loser. From TrackWrestling's text: 23 real losers put back (3 got a new bracket entry:
-- service role, ids in backups/20261105_district_forfeits_inserted.json), 150 forfeits over a filler entry,
-- 29 over an empty slot. 27 placement rows were added by the service role.
--
-- 1. matches.forfeit_opponent: what a forfeit with no loser was over. 'filler' (an entry such as
--    "Forfeit") counts as a contested match for bye points; 'empty' (no one in the slot) does not.
-- 2. team_point_deductions: team points taken off a school at a tournament (unsportsmanlike, -1
--    each). Official totals include them; the scoring rules subtract them.
-- Run in the Supabase SQL editor. All or nothing.

BEGIN;

ALTER TABLE matches ADD COLUMN IF NOT EXISTS forfeit_opponent text
  CHECK (forfeit_opponent IN ('filler', 'empty'));

UPDATE matches SET loser_entry_id = '5282cd43-81d3-41af-adbc-eb2f35a3f9d4' WHERE id = '8965dae6-5fad-41f2-89e0-24dcd2c2c843' AND loser_entry_id IS NULL;  -- District 1 132 SF: Max Graeber (Northern Valley Regional (Demarest)
UPDATE matches SET loser_entry_id = '5282cd43-81d3-41af-adbc-eb2f35a3f9d4' WHERE id = 'ddacee60-1897-40e9-a308-8d30f529010e' AND loser_entry_id IS NULL;  -- District 1 132 3rd_Place: Max Graeber (Northern Valley Regional (Demarest)
UPDATE matches SET loser_entry_id = '8e32d4ae-5840-4738-8baf-09d79e8a4b5f' WHERE id = 'e11e8f2e-9d77-4bdf-9cd1-d818855780f0' AND loser_entry_id IS NULL;  -- District 3 106 3rd_Place: Brandon Rogalla (Pequannock Township)
UPDATE matches SET loser_entry_id = 'f4db5483-2d4d-4202-8ce5-ad90a44cd2a3' WHERE id = 'd0008f56-4d0e-4adc-ae3e-3a9d50243bba' AND loser_entry_id IS NULL;  -- District 3 215 3rd_Place: Issa Manasra (Wayne Hills)
UPDATE matches SET loser_entry_id = 'b1188d8c-3014-4918-9ed6-f11150c3f1dc' WHERE id = 'b77e679b-0baa-48b7-a23f-8992a4b51083' AND loser_entry_id IS NULL;  -- District 4 132 F: Cole Boruta (Mahwah)
UPDATE matches SET loser_entry_id = 'e5ef4b5c-2ef7-4348-bb32-e6ac1dc702a1' WHERE id = '3489e187-5d2c-4170-bb8f-3aacf619c95e' AND loser_entry_id IS NULL;  -- District 4 190 F: Jack Kithcart (High Point Regional)
UPDATE matches SET loser_entry_id = '78057f9a-6bc9-4dd7-ae9a-7323ad3422b9' WHERE id = '6cff99ba-9f4c-449b-89e7-7c184f8724e0' AND loser_entry_id IS NULL;  -- District 4 215 3rd_Place: Kaleb DeFalco (High Point Regional)
UPDATE matches SET loser_entry_id = '8d6938ff-9c2c-46de-a093-10e25d8d5e1f' WHERE id = 'fbc84d21-34b6-4db6-8e83-ebc2f34157c1' AND loser_entry_id IS NULL;  -- District 4 285 3rd_Place: Isaac Hsiao (Pascack Hills)
UPDATE matches SET loser_entry_id = '9ab298ee-b08b-4b2f-aa53-2121c55dc4d6' WHERE id = 'a829c934-34dc-4f8c-977f-438107db7069' AND loser_entry_id IS NULL;  -- District 5 215 SF: Jake Saraiva (Cedar Grove)
UPDATE matches SET loser_entry_id = '348b7bb3-e734-4636-b0dc-5c5205909d67' WHERE id = '2fcb59fb-486f-4cb1-9b3f-2f140593882d' AND loser_entry_id IS NULL;  -- District 5 285 SF: Dustin Gabriel (Mountain Lakes)
UPDATE matches SET loser_entry_id = 'ecb25f0a-1188-448d-961c-3ce56fe6ceef' WHERE id = 'ef60b421-8fb8-4b26-a9b4-f44b3d9eeb26' AND loser_entry_id IS NULL;  -- District 7 150 SF: Cameron Laterra (Elmwood Park)
UPDATE matches SET loser_entry_id = 'f26385c7-beed-471d-8741-b33f356e4cae' WHERE id = '02d130c7-93ff-4f31-921b-0b2d34f4797f' AND loser_entry_id IS NULL;  -- District 9 150 QF: Nicholas Roche (Hoboken High School) [new entry]
UPDATE matches SET loser_entry_id = '3d80345f-6de0-4d31-aafc-6d89c2604556' WHERE id = 'e5477860-b5a3-48d9-beb5-9027e01b36d6' AND loser_entry_id IS NULL;  -- District 9 157 SF: Alexio Gonzalez (Secaucus)
UPDATE matches SET loser_entry_id = 'ddabe8ae-be7f-44f5-abc5-8be3f914d033' WHERE id = 'd08b35f1-18a8-41f7-9014-94fc3a675b49' AND loser_entry_id IS NULL;  -- District 9 285 QF: Gustavo Nocelotl (Kearny) [new entry]
UPDATE matches SET loser_entry_id = '4e6f10d9-377e-4eaf-9678-3f26fb3fa3d2' WHERE id = 'd377ccfd-1cf5-4aba-b119-587d80a35136' AND loser_entry_id IS NULL;  -- District 17 132 3rd_Place: Anthony Rodriguez (Keansburg/Henry Hudson)
UPDATE matches SET loser_entry_id = 'fc757ef9-3eef-4131-9300-5e74c0ca8b9b' WHERE id = 'b43b67c3-0855-4d4b-a7b8-1f2efdb700d8' AND loser_entry_id IS NULL;  -- District 23 215 SF: Jose Siguenza (Ocean Township)
UPDATE matches SET loser_entry_id = 'fc757ef9-3eef-4131-9300-5e74c0ca8b9b' WHERE id = '1221f3c8-15f3-43e8-bc69-dc087b4c324d' AND loser_entry_id IS NULL;  -- District 23 215 3rd_Place: Jose Siguenza (Ocean Township)
UPDATE matches SET loser_entry_id = 'f86f8872-d3a1-4d48-baca-814715b8499d' WHERE id = 'b83dc37e-df3a-4c4a-b472-b201c19b6217' AND loser_entry_id IS NULL;  -- District 25 126 SF: Alex Kinney (Rancocas Valley Regional)
UPDATE matches SET loser_entry_id = 'f3156b62-adef-4eac-8c25-44b160ee6a71' WHERE id = '2a598ee4-5a25-4fc0-a3a4-c414e22dbab1' AND loser_entry_id IS NULL;  -- District 25 150 3rd_Place: Thomas Andrews (Haddon Twp Hgh School)
UPDATE matches SET loser_entry_id = '00879743-dbfc-49c7-a485-cbab3a6b9f3a' WHERE id = 'd7ff8778-6185-4e3c-a075-217ab1ef940d' AND loser_entry_id IS NULL;  -- District 26 215 3rd_Place: Charles Black (Barnegat)
UPDATE matches SET loser_entry_id = 'efb50c7e-1433-4606-96bc-91ae6073ccb1' WHERE id = '2081a8c9-ddd1-4f0c-84f8-62b56defcb49' AND loser_entry_id IS NULL;  -- District 26 285 QF: Ben Cloos (Toms River North) [new entry]
UPDATE matches SET loser_entry_id = '0310da37-79f0-402f-a092-f3b7a2964400' WHERE id = '734bc9f4-a23d-4ccc-9cb8-c46b546795a9' AND loser_entry_id IS NULL;  -- District 31 132 3rd_Place: Chase Bordley (Vineland)
UPDATE matches SET loser_entry_id = 'b6636c13-e718-406f-88b2-1e1757ad8710' WHERE id = 'ef056481-9f6c-427c-8537-44ba6f8143a1' AND loser_entry_id IS NULL;  -- District 32 157 3rd_Place: Odess Myers (Deptford)

UPDATE matches SET forfeit_opponent = 'filler' WHERE loser_entry_id IS NULL AND id IN (
  '574b9ce5-84c2-4b61-9959-a1960a5034e5',
  'ec360be9-dda1-4e6c-aa6f-54b7ff2cf4e0',
  '2d78997f-4f59-4df1-82ac-849d1b2786be',
  '983dedeb-f36e-4849-8d4f-4ab6be6d5791',
  '9536aa14-35f0-44ba-9978-7f7e37bb124e',
  'bf041c35-8569-4006-bb62-2d7a517c93d0',
  '7fbe9199-7f2b-48ed-9f8b-55a105d60a3e',
  'b9dac670-77cf-49aa-92b1-e1345353b280',
  '59a6f225-84e6-4531-aadf-2e0688522da5',
  '8cefc974-3b74-4ba1-a9f0-506a1962ef91',
  '7eedd148-b3dc-49b9-97e5-b1522c54e762',
  '2a372086-959d-47ad-ac31-da8bf02269a3',
  '4cf6a74e-7f4d-46e5-9cdd-c2ea37e0aa64',
  'fcc62052-cdbc-448e-9497-4915179ea8b6',
  'f53616e6-5c6f-433c-8bdb-fade6d15b59d',
  'ca9c6341-dbf9-4260-a790-3503b66f928b',
  'a376319f-b6ae-4db6-8af2-42aca6e70357',
  'b638f87f-6ce1-4a51-aa7e-a17651122e0d',
  '8147a4a3-b7fc-4306-b5ce-3892ae02fbf3',
  '27a8fdba-794b-4cf7-9636-14b17e539308',
  'e41e773f-09f9-4e82-80da-069e6c1e1a6f',
  'b09f19c2-59af-4b38-b0c8-7c47198b7a5e',
  '148716c6-e7eb-4e80-8bd6-69247f1dc4b5',
  '789a3507-e253-4696-bc71-76e4617598c2',
  'b29aa9e5-38a4-4665-a6c9-a1b6220b3303',
  '701de298-996b-4792-bbef-4cc2b40b33d6',
  '18e4eada-cc9c-45e4-9879-8af0d7f00efb',
  'f68566c8-2007-40ca-a141-2ec771db41bc',
  '8e84a1dd-6e70-4a3a-bfc8-05ac466a641e',
  'd0d7c48f-b8c0-492c-b1b4-c5ea76cea0aa',
  'b41b88b1-4a39-4a72-8254-49ec4384e557',
  'fafea2e2-5aba-4e64-bb58-2470bf5070b7',
  '90114808-d3e8-4e80-bc54-36d22f0c47f9',
  '05a9ef85-e995-4df8-a38a-c1e72ebb4f9e',
  'ff71e9d7-7b4f-4885-8aa0-746a896477db',
  '99005de1-f2aa-4d48-b037-b8deeef36cc3',
  'c36798af-103b-4dbf-a332-bba0a98e461c',
  '4f9530c9-872b-4034-a1ae-9da4d84f5009',
  '63f8a638-52c6-46bb-b00a-ba26757cb8a4',
  '1f9061f0-3f19-4cd9-897e-557e57bb8ada',
  '73268751-66bb-4927-90f3-b8843f44809f',
  '154a56bd-100d-4129-b34f-e659e9c874f8',
  'd6c44e73-79f1-4c5f-bd30-e464738003f7',
  'c27264d8-d27b-45c1-a847-f92b8d30770e',
  '7bb97f7c-bb39-4c73-b538-41697e71f122',
  '0493295c-c407-40da-bde7-49946c07766f',
  '2ca1852d-0d6e-4d10-ada1-97f6fe4396ee',
  '3c3ca41f-e91e-4e6b-a715-3574ebedfbb2',
  '58783b00-644f-45ed-a01e-5065f43d9be3',
  '3d4a6835-e3ac-4815-92d6-0c5721bbccd2',
  '672a044f-c70b-4ea1-8d14-9e32087dbba9',
  '09f6824a-030c-454f-bc3c-fc7cf623c1a6',
  '7a691901-51e4-4cec-9904-b0ca97ec1d55',
  'c3774465-6e15-48e8-a356-66c6b476f09b',
  'd57ac2f2-eed7-4d97-92ca-e5095f0b71b9',
  '56967b1d-2a6e-4d52-bc0e-ca301a32433b',
  'b1e029c3-7408-4042-9e28-4026029f44ab',
  '49b3f436-bcce-4c05-af50-161ab2059c3b',
  'e6c77d70-0f35-435b-86e0-f8a4f137484d',
  'cd11663d-3916-49a8-97cd-aa63a75da306',
  'a6838d3e-e75b-4e71-adad-6d85a66870b5',
  '48e87069-bdcd-438d-8e51-a6769d32e57c',
  '61f94498-d39a-408b-bccc-bf52ca783824',
  '2693b7bb-6b22-4724-9450-66ca94cbcf2e',
  'ab9b93ba-ae8d-471f-9612-d096e67eeabc',
  '5d4d3add-c6b7-4900-8bb0-82de2db0584b',
  '61dc7ed5-540f-4e7d-9912-de011dfe1f77',
  '4d822fff-dfcd-458f-b847-de5997c05a23',
  '0e2b7391-51e3-48e6-b8e7-32dd38d10c40',
  '10fbdb8f-f509-42f7-a731-d273d61df408',
  '723b19b1-2dce-4cea-b923-008c6843cc62',
  '5c1b7cd2-0061-4b09-a18a-94e1908b9104',
  '3f7f3f75-ea8f-424c-949c-ef4cefec20e9',
  '774611ce-8a62-4259-a2c6-fc6514d22a1a',
  '110839dc-c0dc-44c9-b20f-6ca6abe34553',
  'd16307a4-84cd-4310-9ef3-f4eb9a0c423d',
  'a96a7ac6-8875-45a3-a350-900f33bb8b6c',
  '45e6b169-f7ce-44d0-9ff4-7956990cdd42',
  'cade80c3-51fa-4c71-ac43-8b39c40bd8bc',
  'd0c08278-6d7e-41c2-9f7a-3cdbb23b909c',
  '9a3a51cc-bf18-4d52-bb59-59064d28fc64',
  '851732bf-4219-4528-8ade-77a02800cbe5',
  '5786c05d-03c6-439c-8ae7-10b46b59495a',
  'e1b72238-bae7-4349-9428-f892af1892e6',
  '10372c32-a5c8-4097-a8e0-c255a287a69f',
  '0ae4840c-a5ce-4120-a0c5-40de6e92f8fa',
  'f959d048-0ebd-43ae-908d-c91a1c59da8a',
  '3692b627-cf09-49de-9640-849b48ba5284',
  '70ce7749-80b3-475d-9d88-90fba8cbf02c',
  'b3b50ef5-2cf8-458a-a3eb-7e4194186708',
  '6183a8aa-7875-48af-b8ba-5af15e5d01e4',
  '6973338f-270a-4137-92f5-f05b9cd5f180',
  'e7b7a0b4-e0f7-420a-b9bf-94f23ad7a0b3',
  'bb083854-63c3-4dac-9a0c-b8e7af283f34',
  'edacaa98-79f7-4621-ad36-22ec83725a9e',
  '3888af2f-f3b5-4cd3-b4ec-e561ba9120d2',
  'fb194ba6-f2d9-4776-b1f8-ce6567c2af1e',
  'bb1b5bd8-f7e8-4b79-9b96-6b26d70abd03',
  '211908dc-b843-4492-8590-abdf9aa2f64a',
  'c7cc1ca7-6e5f-46d9-840b-b04aeafc1024',
  '584a41c7-0532-48a9-9d8b-a2493894e44a',
  'e4e02361-1e89-421e-9676-c0ea62d60d78',
  '9fc5c072-a894-49dd-8d0c-16ceabaaec87',
  'bcce5769-03b3-472b-965e-01e19eabd75d',
  'b396130c-73fd-4f3c-96f6-6fa3c08ca567',
  'a240c6e9-b8e2-45d4-a371-f107fece9d45',
  'bac5e557-2d17-4ea0-a299-4298510b6948',
  '491f8815-3f2a-4546-9c2e-b604f6563435',
  '32b31585-c7fe-4647-9cb6-9f9764c652af',
  '4e06db48-7bf5-4f9a-a5c4-06c764f081ce',
  '404a170b-e9f1-4708-9fa6-e0cc3aac06c8',
  '0399d563-9c97-4bd1-9a3c-980b2549a109',
  'c4faf68d-092b-4962-adf4-05c26b910579',
  '6303ee58-de22-4e7a-8847-8873ea2115e3',
  'e3cc7398-c42d-403c-a60c-08bd163f8fa8',
  '27d13ae9-1eec-4447-8a77-ac7418a901e4',
  '25ac9ca6-1f69-4647-8f88-c0f34fe24cd8',
  'e520efab-8ad1-4786-bd39-2bf1e497e162',
  '40560347-7c5c-48ad-b302-227c6d856abc',
  '092b6849-3f0b-4daf-a17a-e571c84c1745',
  '4e7f34fb-dc31-4c68-a537-cc7e0e7a9b5b',
  'eebbaf9b-5cc6-4528-acc4-3d754cbcbb60',
  '8d5f137e-9a59-4a42-b294-d7fadee70100',
  '05037fd6-f216-4da5-a98c-74730cacd84d',
  'cbf73d9c-d2a0-4d19-b126-bd680ce8ea33',
  '76ddc38a-3877-44bb-a92b-ecde01869deb',
  '42d64de6-2de4-427c-964a-f2e57c0224d8',
  '736842a5-c235-4016-8447-9738fed8c038',
  'bb984d24-bf24-445e-b549-b18ba7dd1f12',
  '0ff8db57-aaa5-4195-8e93-4d32c6a0240e',
  '9465c4bc-9f0b-4a82-8a9d-5e2f89652dec',
  '4a1536c8-14b0-4221-af25-3c8ff451b314',
  '32acffa7-a4da-4c38-8e94-c70a1a62372c',
  '0d714fe0-e252-4044-a014-a3424a4a0d97',
  '5469856e-9d18-4a32-861f-e7442e44e9c5',
  '7e755460-b3ad-4b79-b14d-3d74d99bf70b',
  '90e52d6c-3d1f-4437-a02a-f2964e11881c',
  '7fb014df-740b-4247-8d85-fd262c838831',
  '06bbe577-c469-4a4a-975a-81c9d4e77abb',
  '2f951e38-cdcf-49f9-9603-e6a8b8ab1175',
  '33567cb7-19d4-4add-806d-c03c666e9837',
  '095ec6ad-f673-4b51-ae79-b1265cc9f9f8',
  'd0fa7c74-b1fb-4e29-aec7-48118a3247fb',
  '92bcd616-548d-4b5c-b681-767edba8c1cf',
  '770edcf5-a696-473c-8539-4b61c2b3e72f',
  'eb4342e1-c0a9-49b9-b8d5-60fdc2b32b14',
  'fce27aee-b96c-43fd-b1d2-fb4d8b4fa4d5',
  'cea73af5-dff4-4885-9b51-0878e34a37df',
  '4ece9631-261e-46ce-845d-b5e7a6781895',
  'fba4a0f0-0d3f-4763-877d-cb348daa32e4');
UPDATE matches SET forfeit_opponent = 'empty' WHERE loser_entry_id IS NULL AND id IN (
  '739b9bc1-acaf-477b-97ff-52096d3f11ba',
  '3cb49624-2ac2-4115-9e30-f5ef24ba1f6a',
  '6b09e761-0872-46f5-9a67-0c0c0a57aa52',
  '91a86cfc-56b6-4b5d-8fa7-5d989b4daf63',
  '1c3fc7db-ad21-4605-bfb9-933fbff0d689',
  '2a5ff62e-1fa4-4e91-a223-51e6998c4aa2',
  '458532e2-5aa8-43e0-ada4-e82bd3fb2d8e',
  '10735c55-83a7-4bf9-a7ec-3f86b7bcbb04',
  '03859e0e-75fd-4827-90f6-daebb503db57',
  '61750465-d010-4eb3-b5ce-89ffb2de522b',
  '032a5b16-bd3a-4f75-b94a-0cfec4b8f049',
  'bd855b3f-6b37-4048-8882-ce39873873c3',
  'eb7eb3a6-1e8a-4c21-84c6-8731af4bff3d',
  '0530fade-0510-4acf-8fd5-7a9d33754958',
  '0aecfd0a-f3f1-4a32-a9bb-3fd8b65ed78d',
  '29398012-73b5-4acc-a775-2c054963a081',
  'c5c6072a-9d72-431f-81a7-fbe0bab4b24b',
  'b3af0ff8-15aa-42ae-b355-9c79ceda8beb',
  '96875ecc-77c4-4f8b-8931-0dd48d758bc1',
  '731b2d49-9772-45d3-b636-44a6817cac1b',
  '11a193a9-3002-49e4-b56c-90d4af14918f',
  '4cf9cea0-9c00-4f81-9a1b-a13099ebaf24',
  'ad043b37-63ac-4520-97c8-a3252f22c1f3',
  '7823b863-b22e-4e27-8a0d-ad0e9595af8e',
  '709212c9-1091-4af6-b468-dca43b613436',
  '7b80934a-133f-4534-828f-3353ed2a2064',
  'f469e845-d38f-46b6-8b8d-8511bad159cf',
  '2ea30f88-6a39-4336-b0e4-628eb11954ed',
  '13592951-2389-4409-b733-56bff567dc50');

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
  (150, 22, -1, 'official minus scoring rules, 2026-11-05'),
  (151, 87, -1, 'official minus scoring rules, 2026-11-05'),
  (151, 119, -1, 'official minus scoring rules, 2026-11-05'),
  (153, 383, -1, 'official minus scoring rules, 2026-11-05'),
  (157, 180, -1, 'official minus scoring rules, 2026-11-05'),
  (162, 229, -1, 'official minus scoring rules, 2026-11-05'),
  (163, 211, -2, 'official minus scoring rules, 2026-11-05'),
  (163, 205, -1, 'official minus scoring rules, 2026-11-05'),
  (168, 291, -1, 'official minus scoring rules, 2026-11-05'),
  (168, 313, -1, 'official minus scoring rules, 2026-11-05'),
  (168, 303, -1, 'official minus scoring rules, 2026-11-05'),
  (169, 282, -1, 'official minus scoring rules, 2026-11-05'),
  (169, 283, -1, 'official minus scoring rules, 2026-11-05'),
  (169, 251, -1, 'official minus scoring rules, 2026-11-05'),
  (140, 2, -1, 'official minus scoring rules, 2026-11-05'),
  (143, 14, -2, 'official minus scoring rules, 2026-11-05'),
  (146, 54, -2, 'official minus scoring rules, 2026-11-05'),
  (148, 94, -1, 'official minus scoring rules, 2026-11-05'),
  (148, 98, -1, 'official minus scoring rules, 2026-11-05')
ON CONFLICT (tournament_id, school_id) DO NOTHING;

COMMIT;

-- Verify: expect 23 losers back, the forfeit marks, 19 deductions
SELECT count(*) FILTER (WHERE forfeit_opponent = 'filler') AS filler, count(*) FILTER (WHERE forfeit_opponent = 'empty') AS empty,
       count(*) FILTER (WHERE loser_entry_id IS NULL AND forfeit_opponent IS NULL) AS unmarked_no_loser
FROM matches WHERE tournament_id IN (149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,140,141,142,143,144,145,146,147,148);
SELECT count(*) AS deductions, sum(points) AS total FROM team_point_deductions;

-- ROLLBACK: DROP TABLE team_point_deductions; ALTER TABLE matches DROP COLUMN forfeit_opponent;
-- UPDATE matches SET loser_entry_id = NULL WHERE id IN (the 23 ids above); then delete the
-- service-role rows by the ids in the backup files.

-- Part 2: Merge 21 review-group duplicates confirmed as same person.
-- Run AFTER the bulk migration (Part 1) has been applied.
-- The 7 names below were confirmed as DIFFERENT people at different schools
-- and are intentionally excluded:
--   Jacob Munoz (school 98 vs 181)
--   Jayden Williams (school 244 vs 164 - verify before merging)
--   Anthony Caponegro (school 172 vs 78)
--   Jden Mcpherson (school 265 vs 308)
--   Sean Brown (school 26 vs 24)
--   Anthony Russo (school 264 vs 128)
--   Matthew Miller (school 81 vs 188)

BEGIN;

CREATE TEMP TABLE review_merge_map (
  dupe_id uuid,
  keep_id uuid
);

INSERT INTO review_merge_map (dupe_id, keep_id) VALUES
  ('51b6dda9-d1d5-466e-9dde-092cc8b7c18c', 'c98b8942-4b36-4dfe-8741-e7b40b38eaf0'),
  ('51238cc9-1c46-4595-9637-a2027a4684c8', '22c11752-3ff6-4330-becc-2f7474cf8a2b'),
  ('69da545d-10af-4602-a931-49fca2bc974a', '22c11752-3ff6-4330-becc-2f7474cf8a2b'),
  ('d5c51d81-3fb1-4bb2-8bb0-ef1ea346c1f6', 'c7582516-d287-411f-a4d3-628240329a3e'),
  ('0f1b0e44-089d-4ee0-b19e-5bdcc2ad2366', '5114299e-0e0c-434e-b1cc-04bb52b09b92'),
  ('0867af88-675e-4bf7-8961-b445218b24c7', '4fab8464-6cdb-492b-b896-638649a40c75'),
  ('0a7eca78-cfcb-4f71-959f-5692e7327720', '0e62bde1-ac74-4da8-a41d-87130ecc96fc'),
  ('5b5e100a-f7f4-48e3-b587-9c18be730c6b', 'bc2c6a27-419a-4667-97a5-dfd29e652b38'),
  ('723a0c2d-e431-4eab-bfbe-5c88025abd8e', '77d4fde3-0640-409e-9021-e3b3eb41ad47'),
  ('46000b24-e9fa-4068-b418-c80bcfe4e4ea', 'e6235560-0707-4776-8426-4c9acba73410'),
  ('e64eab37-bc15-41f8-8294-8bbf3dd36167', '4975137d-1290-447e-8e59-5e1ace5d0a32'),
  ('7d55166d-97f5-4f0c-a549-998baacea129', '234246be-d03a-4914-bd57-4b3008392891'),
  ('2996a052-5684-45c7-9bd7-e23c51a6e6a8', '3c2ed55c-47e2-4457-91fa-ac36417b897d'),
  ('02635271-d1e0-4dc1-8545-52a3f2696ec3', '3c2ed55c-47e2-4457-91fa-ac36417b897d'),
  ('af3d3c04-1314-47c8-a34b-58fde35bccd6', 'd7de8506-6ec7-4c6f-a757-c8094814944a'),
  ('8c53ab96-e1bb-4c8b-b5ed-52915bc1856c', 'b0046216-fdbc-40dc-a96a-b80812470d10'),
  ('549d59df-41fb-4096-ac78-fa955d7f78fa', 'b0046216-fdbc-40dc-a96a-b80812470d10'),
  ('dd717cd7-35f1-461b-a095-ee06582e9e08', 'b0046216-fdbc-40dc-a96a-b80812470d10'),
  ('cc7a8cfd-e72f-495a-8ee7-ca4f886d05f0', 'ef7eeda4-deea-4b1b-82e6-5bf37aefce28'),
  ('b2823f26-6f4b-4884-9fac-b13a22faa30d', '9d99e85b-abf5-48d2-aab1-fa35c17629c2'),
  ('2a987547-4192-415c-b403-1c1755578f7a', 'a029982b-7cb9-40dc-9ac9-67bc62f52f15'),
  ('0e36a796-c7bd-4042-ae6b-2810e219bc17', 'd5aa105b-3d09-4536-a43b-72b34b7fdd2b'),
  ('1a3d915a-baad-4054-b221-232c9b77b3af', '8331ab49-5b61-4924-a67b-8d0ebabe7b46'),
  ('b40288c2-3ce1-48b7-aa9e-837b8930b774', 'b2cd53bd-6dd0-410a-88c3-22a668337707'),
  ('213dc7d2-131b-4373-b80b-70fc54557d17', '18afa774-9432-4f09-989f-fedb07f74282'),
  ('4f569be3-febf-4146-918a-6d34c00609bb', '18afa774-9432-4f09-989f-fedb07f74282');

UPDATE public.tournament_entries SET wrestler_id = m.keep_id
FROM review_merge_map m WHERE wrestler_id = m.dupe_id;

UPDATE public.dual_meet_matches SET wrestler_a_id = m.keep_id
FROM review_merge_map m WHERE wrestler_a_id = m.dupe_id;

UPDATE public.dual_meet_matches SET wrestler_b_id = m.keep_id
FROM review_merge_map m WHERE wrestler_b_id = m.dupe_id;

UPDATE public.dual_meet_matches SET winner_id = m.keep_id
FROM review_merge_map m WHERE winner_id = m.dupe_id;

UPDATE public.tournament_bouts SET wrestler1_id = m.keep_id
FROM review_merge_map m WHERE wrestler1_id = m.dupe_id;

UPDATE public.tournament_bouts SET wrestler2_id = m.keep_id
FROM review_merge_map m WHERE wrestler2_id = m.dupe_id;

UPDATE public.tournament_placements
SET wrestler_id = m.keep_id
FROM review_merge_map m
WHERE wrestler_id = m.dupe_id;

DELETE FROM public.wrestlers
WHERE id IN (SELECT dupe_id FROM review_merge_map);

COMMIT;

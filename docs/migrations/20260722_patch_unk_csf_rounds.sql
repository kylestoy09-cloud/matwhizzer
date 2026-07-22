-- Patch: correct 40 tournament_bouts rows where round was silently set to 'UNK'
-- due to a parser bug in import_pipe_csv.py: when the pipe CSV "round" field was
-- empty and the round was embedded as a prefix in the winner name
-- (e.g. "Cons. Semis - William Shallop"), the prefix was stripped and discarded
-- instead of being used to populate the round column.
-- All 40 affected bouts are consolation semifinals (CSF). (1 of 41 CSV rows was a
-- duplicate pair that was deduplicated at import time and never produced a DB row.)
-- Matched precisely by (in_season_tournament_id, weight_class, wrestler1_name_raw,
-- wrestler2_name_raw) against the original CSV source data.
-- 6 bouts remain UNK (Linn Crawn: 5, Elmwood Park: 1) because their round is
-- genuinely not present in the CSV source — not a parser failure.
-- ALREADY APPLIED 2026-07-22 via service_role API. This file documents what ran.

UPDATE public.tournament_bouts
SET round = 'CSF'
WHERE id IN (
  '7c67c883-c6aa-4e3f-8385-85f7998c4b6d', 'c77aac15-2724-4417-9f30-b3392b101f41', 'd089548c-1eb9-4025-bd33-a3c4dba996f4', '3e723f1b-4ca1-429d-8583-13d1890cf565', '7aeec70e-805b-45d8-91d9-fa41b95c27a3', 'bc6382fe-fdd7-4cfb-a945-8a94722b74dd', '57ad665b-384a-41cf-ac40-ef495ea527a7', '1f2385a2-3376-4ee7-bbaa-6dca5ab1a049', '57ad665b-384a-41cf-ac40-ef495ea527a7', '35387582-6a42-4113-bf63-f6afad57fc4c', 'e53063e7-f97d-4443-a722-8b4d3667b6a8', 'd5d271b4-291f-4e9c-bb37-fb8163277709', 'dd3c5ef4-94e5-41e5-8b5e-541b30f099ef', 'c95201ab-ab51-4036-a61d-cf976b5545ad', '7ba055e3-0442-41a6-985b-4b7861321b3c', 'd10f3032-80b7-4a03-92b1-206aeb00de2c', '6e9fee14-bc96-4515-80f1-e369ac5bebc2', '7232ad4d-0891-43a2-b752-a912b87395ce', 'bc82ff00-7854-42fe-bc77-ea602e488219', 'f7f0f41c-c20e-4555-9dba-a552843db90e', '80ee9dba-98e2-4a33-9356-3f9c66ebcfcb', '909bfd34-69b1-4b1b-b8a6-306f2a24f555', '1f16e233-bbce-47c5-a549-32a02f0a0bc3', 'ebb0c52a-c388-4ffc-80a8-67df91104ff4', '6b844802-6189-40c3-bcd1-097cdceaa113', 'ed0f7a0b-1c7b-4300-8a9c-56e707d0e596', '91eb5c6d-b256-4027-aa2e-925c5d08156a', '847c1cc0-b113-4196-9195-432a4d323f3e', 'aa30e8b9-cca6-4eb1-9a13-45b4b7532420', '3cac969c-cf7e-46ad-b4be-6018d9621e7d', 'd3dc6a2f-d3b7-45c8-ab1f-02cc4657a20a', '8bc10ff5-b8c8-4954-97f5-24ebeb11a7ae', 'bc60bcd9-223c-45d8-861b-dd85c37f63c7', 'deda1751-2722-44c5-a49f-f137bb3ec2e7', '8dae2dc2-92b8-4699-9a19-27b1cdc2e2bd', '8ce3e06a-4da9-4ece-a073-ee3541f7b0f5', '531815d9-8fc5-4bb1-a0f9-9dd86a600a59', 'aca19498-ac3f-4ab7-9f6d-be137c0b9d6e', '15c9ef95-c474-4556-89c0-2d24eca2a1e8', '917104b2-9dc0-47bf-830b-096b34197521', 'e4dad3fb-95e8-4f5a-8aa3-10d8c2dd58cc'
);

-- Verify: should update exactly 41 rows.

-- Delete 120 contaminated bouts from the Bethlehem Holiday Wrestling Classic.
--
-- Root cause: the pipe_format_tournaments_dec2025.csv was generated from the RTF
-- without filtering by the TW Event Yes/No flag. The RTF has two sections under
-- the Bethlehem header — verified PA regional schools (Yes/Yes) and unverified
-- national/NJ schools from a different tournament (No/No). Both sections were
-- included in the CSV, so schools like CBA, St. Joseph Montvale, and others
-- that were never at Bethlehem were imported as Bethlehem participants.
--
-- Fix: delete all bouts where either school is not in the 35-school verified
-- Bethlehem team list confirmed against the original RTF source document.

DELETE FROM public.tournament_bouts
WHERE in_season_tournament_id = '0adf0e3e-0c8f-4462-a355-f23cfb32250b'
AND (
  wrestler1_school_raw NOT IN ('Blue Mountain Hs','Boyertown Area Hs','Council Rock South Hs','Delaware Valley Hs','East Stroudsburg Area North Hs','Emmaus Hs','Fauquier','Freedom Hs','Garnet Valley Hs','Hazleton Area Hs','Hempfield Hs','Honesdale Hs','Kennett Hs','LIBERTY HS-Bethlehem','Nazareth Area Hs','North Allegheny Hs','NORTH PENN HS (Lansdale)','Northampton Area Hs','Northern Lebanon Hs','Northwestern Lehigh Hs','Parkland Hs','Phillipsburg','Quakertown Hs','Saucon Valley Hs','Southern Lehigh Hs','Spring Ford Hs','Stroudsburg Hs','Warwick Hs','West Scranton Hs','Whitehall Hs','Wilkes-Barre Area','Williamsport Area Hs','Wilson Area Hs','Wilson West Lawn','Wyoming Valley West Hs')
  OR wrestler2_school_raw NOT IN ('Blue Mountain Hs','Boyertown Area Hs','Council Rock South Hs','Delaware Valley Hs','East Stroudsburg Area North Hs','Emmaus Hs','Fauquier','Freedom Hs','Garnet Valley Hs','Hazleton Area Hs','Hempfield Hs','Honesdale Hs','Kennett Hs','LIBERTY HS-Bethlehem','Nazareth Area Hs','North Allegheny Hs','NORTH PENN HS (Lansdale)','Northampton Area Hs','Northern Lebanon Hs','Northwestern Lehigh Hs','Parkland Hs','Phillipsburg','Quakertown Hs','Saucon Valley Hs','Southern Lehigh Hs','Spring Ford Hs','Stroudsburg Hs','Warwick Hs','West Scranton Hs','Whitehall Hs','Wilkes-Barre Area','Williamsport Area Hs','Wilson Area Hs','Wilson West Lawn','Wyoming Valley West Hs')
);

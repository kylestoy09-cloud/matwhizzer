-- School 358's girls program is named "Roselle", the same as its boys program —
-- never "Abraham Clark" (20261029_girls_programs_2025_26_cleanup.sql added it
-- with that name).
UPDATE girls_schools SET display_name = 'Roselle' WHERE school_id = 358;

SELECT school_id, display_name FROM girls_schools WHERE school_id = 358;

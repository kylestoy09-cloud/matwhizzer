-- Fix Clifton classification: was Group 4, should be Group 5 (North I)
UPDATE schools SET classification = '5' WHERE id = 50;

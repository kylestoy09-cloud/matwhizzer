-- Fix West Morris classification: was Group 3, should be Group 2 (North II)
UPDATE schools SET classification = '2' WHERE id = 108;

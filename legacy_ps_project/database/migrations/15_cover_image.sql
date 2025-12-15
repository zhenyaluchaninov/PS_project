-- 2020-05-29 (EA): Adds 'image_id' column to adventure table
ALTER TABLE adventure ADD COLUMN image_id INT (11) DEFAULT NULL AFTER category_id;

-- 2020-03-12 (EA): Adds 'image_id' and 'image_layout_type' column to adventure_node table
ALTER TABLE adventure_node ADD COLUMN image_id INT (11) DEFAULT NULL AFTER image_url;
ALTER TABLE adventure_node ADD COLUMN image_layout_type VARCHAR(30) DEFAULT NULL AFTER image_id;

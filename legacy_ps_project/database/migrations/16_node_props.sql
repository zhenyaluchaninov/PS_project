-- 2020-10-29 (JM): Adds 'props' column to node table
ALTER TABLE adventure_node ADD COLUMN props VARCHAR (4096) DEFAULT '' AFTER position_y;

-- 2020-01-31 (EA): Adds 'locked' column to adventure table
ALTER TABLE adventure
ADD COLUMN locked BOOLEAN
DEFAULT false
AFTER view_slug;

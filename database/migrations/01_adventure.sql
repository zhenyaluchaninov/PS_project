DROP TABLE IF EXISTS adventure;
CREATE TABLE adventure (
  id int(11) NOT NULL AUTO_INCREMENT,
  category_id int(11) DEFAULT NULL,
  slug varchar(30) NOT NULL,
  view_slug varchar(30) NOT NULL,
  version varchar(128) NOT NULL DEFAULT '',
  title varchar(100) NOT NULL DEFAULT 'Nytt äventyr',
  description varchar(1000) NOT NULL DEFAULT '',
  created_at timestamp NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Remove trigger, if exists
DROP TRIGGER IF EXISTS adventure_before_update;

-- Add trigger
CREATE TRIGGER adventure_before_update BEFORE UPDATE ON adventure
FOR EACH ROW SET NEW.updated_at = CURRENT_TIMESTAMP;

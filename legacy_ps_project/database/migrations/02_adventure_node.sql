DROP TABLE IF EXISTS adventure_node;
CREATE TABLE adventure_node (
  id int(11) NOT NULL AUTO_INCREMENT,
  node_id int(11) NOT NULL,
  adventure_id int(11) DEFAULT NULL,
  title varchar(100) NOT NULL,
  content varchar(5000) DEFAULT NULL,
  image_url varchar(100) DEFAULT NULL,
  node_type varchar(15) DEFAULT NULL,
  created_at timestamp NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  position_x int(11) DEFAULT NULL,
  position_y int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY adventure_id (adventure_id),
  CONSTRAINT adventure_node_ibfk_1 FOREIGN KEY (adventure_id) REFERENCES adventure (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Remove trigger, if exists
DROP TRIGGER IF EXISTS adventure_node_before_update;

-- Add trigger
CREATE TRIGGER adventure_node_before_update BEFORE UPDATE ON adventure_node
FOR EACH ROW SET NEW.updated_at = CURRENT_TIMESTAMP;

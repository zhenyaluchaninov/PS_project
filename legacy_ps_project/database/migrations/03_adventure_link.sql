DROP TABLE IF EXISTS `adventure_link`;
CREATE TABLE `adventure_link` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `link_id` int(11) NOT NULL,
  `adventure_id` int(11) NOT NULL,
  `source_node_id` int(11) NOT NULL,
  `target_node_id` int(11) NOT NULL,
  `source_link_title` varchar(80) DEFAULT NULL,
  `target_link_title` varchar(80) DEFAULT NULL,
  `link_type` varchar(15) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  PRIMARY KEY (`id`),
  KEY `adventure_id` (`adventure_id`),
  CONSTRAINT `adventure_link_ibfk_1` FOREIGN KEY (`adventure_id`) REFERENCES `adventure` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

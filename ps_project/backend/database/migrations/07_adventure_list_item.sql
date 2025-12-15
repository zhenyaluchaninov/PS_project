DROP TABLE IF EXISTS `adventure_list_item`;
CREATE TABLE `adventure_list_item` (
  `list_id` int(11) NOT NULL DEFAULT 0,
  `adventure_id` int(11) NOT NULL DEFAULT 0,
  `published_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`list_id`,`adventure_id`),
  KEY `adventure_id` (`adventure_id`),
  CONSTRAINT `adventure_list_item_ibfk_1` FOREIGN KEY (`list_id`) REFERENCES `adventure_list` (`id`),
  CONSTRAINT `adventure_list_item_ibfk_2` FOREIGN KEY (`adventure_id`) REFERENCES `adventure` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

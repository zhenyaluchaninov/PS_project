DROP TABLE IF EXISTS `adventure_log`;

CREATE TABLE `adventure_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `type` int(11) NOT NULL,
  `data` varchar(256) NULL,
  `adventure_id` int(11) NULL,
  PRIMARY KEY (`id`),
  KEY `adventure_id` (`adventure_id`),
  CONSTRAINT `adventure_log_ibfk_1` FOREIGN KEY (`adventure_id`) REFERENCES `adventure` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

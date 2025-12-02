DROP TABLE IF EXISTS `adventure_category`;
CREATE TABLE `adventure_category` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `sort_order` int(11) DEFAULT NULL,
  `title` varchar(150) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `icon` varchar(80) DEFAULT NULL,
  `image` varchar(150) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

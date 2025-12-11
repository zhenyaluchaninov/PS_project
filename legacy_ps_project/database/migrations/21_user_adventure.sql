DROP TABLE IF EXISTS `user_adventure`;

CREATE TABLE `user_adventure` (
  `user_id` int(11) NOT NULL,
  `adventure_id` int(11) NOT NULL,
  PRIMARY KEY (`user_id`,`adventure_id`),
  CONSTRAINT `user_adventure_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `user_adventure_ibfk_2` FOREIGN KEY (`adventure_id`) REFERENCES `adventure` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

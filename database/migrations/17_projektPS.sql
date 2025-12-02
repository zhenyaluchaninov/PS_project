ALTER TABLE `adventure_node` DROP FOREIGN KEY `adventure_node_ibfk_1`;
ALTER TABLE `adventure_node` ADD CONSTRAINT `adventure_node_ibfk_1` FOREIGN KEY (`adventure_id`) REFERENCES `adventure`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `adventure_link` DROP FOREIGN KEY `adventure_link_ibfk_1`;
ALTER TABLE `adventure_link` ADD CONSTRAINT `adventure_link_ibfk_1` FOREIGN KEY (`adventure_id`) REFERENCES `adventure`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

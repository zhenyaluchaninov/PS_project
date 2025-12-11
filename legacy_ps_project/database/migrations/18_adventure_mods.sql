ALTER TABLE `adventure` DROP `image_id`;
ALTER TABLE `adventure` CHANGE `version` `cover_url` VARCHAR(256) DEFAULT NULL;
ALTER TABLE `adventure` ADD `edit_version` INT(11) NOT NULL DEFAULT '0';
ALTER TABLE `adventure` ADD `view_count` INT(11) NULL DEFAULT '0';

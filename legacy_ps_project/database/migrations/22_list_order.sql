ALTER TABLE `adventure_list_item` DROP `published_at`;
ALTER TABLE `adventure_list_item` ADD `ordinal` INT(11) NULL DEFAULT '0';

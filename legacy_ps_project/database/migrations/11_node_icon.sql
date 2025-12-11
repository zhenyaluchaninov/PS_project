-- 2020-03-11 (EA): Added column for adding node icons
ALTER TABLE adventure_node
  ADD icon varchar(40) DEFAULT NULL
    AFTER title;

ALTER TABLE adventure_node CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

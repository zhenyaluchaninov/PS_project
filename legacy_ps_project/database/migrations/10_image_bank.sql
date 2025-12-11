-- 2020-03-09 (EA): Adds two new tables to hold references to curated unsplash-images

DROP TABLE IF EXISTS image_category;
CREATE TABLE image_category (
  id int(11) NOT NULL AUTO_INCREMENT,
  active boolean DEFAULT true,
  title varchar(30) NOT NULL,
  unsplash_id int(11) NOT NULL,
  created_at timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (id)
);

DROP TABLE IF EXISTS image_item;
CREATE TABLE image_item (
  id int(11) NOT NULL AUTO_INCREMENT,
  active boolean DEFAULT true,
  image_category_id int(11) DEFAULT NULL,
  title varchar(100) NOT NULL,
  unsplash_id varchar(100) NOT NULL,
  author_name varchar(100) NOT NULL,
  author_url varchar(255) NOT NULL,
  full_url varchar(255) NOT NULL,
  download_url varchar(255) NOT NULL,
  thumb_url varchar(255) NOT NULL,
  created_at timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (id),
  FOREIGN KEY (image_category_id) REFERENCES image_category(id)
);

-- 2020-03-11 (EA): Fix table character set and collation to support emoji
ALTER TABLE image_item CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
ALTER TABLE image_category CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

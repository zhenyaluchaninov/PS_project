-- 2020-05-27 (EA): Add table for storing reports

DROP TABLE IF EXISTS adventure_report;

CREATE TABLE adventure_report (
  id int(11) NOT NULL AUTO_INCREMENT,
  adventure_id int(11) DEFAULT NULL,
  report_reason varchar(50) DEFAULT NULL,
  comment varchar(255) DEFAULT NULL,
  is_handled BOOLEAN DEFAULT FALSE,
  created_at timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (id),
  KEY (adventure_id),
  CONSTRAINT `adventure_report_advid` FOREIGN KEY (adventure_id) REFERENCES adventure (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
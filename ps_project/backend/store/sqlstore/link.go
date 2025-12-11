package sqlstore

import (
	"database/sql"
	"fmt"

	"projektps/models"
)

func (s *SQLStore) CreateNewLink(link *models.Link) (*models.Link, error) {
	res, err := s.db.Exec("INSERT INTO adventure_link(adventure_id, link_id, source_node_id, target_node_id, source_link_title, target_link_title, link_type, props) VALUES(?, ?, ?, ?, ?, ?, ?, ?)",
		link.AdventureID,
		link.LinkID,
		link.SourceNodeID,
		link.TargetNodeID,
		link.SourceLinkTitle,
		link.TargetLinkTitle,
		link.LinkType,
		link.Props,
	)

	if err != nil {
		return nil, err
	}

	link.ID, err = res.LastInsertId()
	if err != nil {
		return nil, err
	}

	return link, nil
}

func (s *SQLStore) UpdateLink(link *models.Link) error {
	_, err := s.db.Exec("UPDATE adventure_link SET source_node_id = ?, source_link_title = ?, target_node_id = ?, target_link_title = ?, link_type = ?, props = ?, updated_at = now() WHERE id = ? AND adventure_id = ?",
		link.SourceNodeID,
		link.SourceLinkTitle,
		link.TargetNodeID,
		link.TargetLinkTitle,
		link.LinkType,
		link.Props,
		link.ID,
		link.AdventureID,
	)

	if err != nil {
		return err
	}

	fmt.Println(link)
	return nil
}

func (s *SQLStore) DeleteLink(link *models.Link) error {
	_, err := s.db.Exec("DELETE FROM adventure_link WHERE adventure_id = ? AND id = ? AND link_id = ?",
		link.AdventureID,
		link.ID,
		link.LinkID)
	if err != nil {
		return err
	}
	return nil
}

func (s *SQLStore) GetLink(linkID int64) (*models.Link, error) {
	return nil, nil
}

func (s *SQLStore) GetLinksByAdventureID(adventureID int64) ([]models.Link, error) {
	rows, err := s.db.Query("SELECT id, link_id, source_node_id, source_link_title, target_node_id, target_link_title, link_type, props FROM adventure_link WHERE adventure_id = ?", adventureID)
	if err != nil {
		return nil, err
	}

	defer rows.Close()

	links := []models.Link{}

	for rows.Next() {
		l := models.Link{}
		var sourceLinkTitle sql.NullString
		var targetLinkTitle sql.NullString
		var linkType sql.NullString
		var props sql.NullString

		if err := rows.Scan(&l.ID, &l.LinkID, &l.SourceNodeID, &sourceLinkTitle, &l.TargetNodeID, &targetLinkTitle, &linkType, &props); err != nil {
			return nil, err
		}

		if sourceLinkTitle.Valid {
			l.SourceLinkTitle = sourceLinkTitle.String
		}

		if targetLinkTitle.Valid {
			l.TargetLinkTitle = targetLinkTitle.String
		}

		if linkType.Valid {
			l.LinkType = linkType.String
		}

		if props.Valid {
			l.Props = props.String
		}

		links = append(links, l)
	}

	return links, nil
}

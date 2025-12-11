package sqlstore

import (
	"database/sql"

	"projektps/models"
)

// CreateNewNode creates a new node
func (s *SQLStore) CreateNewNode(node *models.Node) (*models.Node, error) {
	res, err := s.db.Exec("INSERT INTO adventure_node (adventure_id, node_id, title, icon, content, image_url, image_id, image_layout_type, node_type, position_x, position_y, props) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
		node.AdventureID,
		node.NodeID,
		node.Title,
		node.Icon,
		node.Content,
		node.ImageURL,
		node.ImageID,
		node.ImageLayoutType,
		node.NodeType,
		node.X,
		node.Y,
		node.Props)

	if err != nil {
		return nil, err
	}

	node.ID, err = res.LastInsertId()
	if err != nil {
		return nil, err
	}

	return node, nil
}

// UpdateNode updates an existing node
func (s *SQLStore) UpdateNode(node *models.Node) error {
	_, err := s.db.Exec("UPDATE adventure_node SET title = ?, icon = ?, content = ?, image_url = ?, image_id = ?, image_layout_type = ?, position_x = ?, position_y = ?, props = ? WHERE id = ? AND adventure_id = ?",
		node.Title,
		node.Icon,
		node.Content,
		node.ImageURL,
		node.ImageID,
		node.ImageLayoutType,
		node.X,
		node.Y,
		node.Props,
		node.ID,
		node.AdventureID)

	if err != nil {
		return err
	}

	return nil
}

// DeleteNode removes a node
func (s *SQLStore) DeleteNode(node *models.Node) error {
	_, err := s.db.Exec("DELETE FROM adventure_node WHERE adventure_id = ? AND id = ? AND node_id = ?",
		node.AdventureID,
		node.ID,
		node.NodeID)

	if err != nil {
		return err
	}

	return nil
}

// GetNode retrieves a single node
func (s *SQLStore) GetNode(nodeID int64) error {
	return nil
}

// GetNodesByAdventureID retrieves all nodes in a specific adventure
func (s *SQLStore) GetNodesByAdventureID(adventureID int64) ([]models.Node, error) {
	query := `SELECT
									an.id,
									an.node_id,
									an.title,
									an.icon,
									an.content,
									an.image_url,
									an.image_id,
									an.image_layout_type,
									an.node_type,
									an.position_x,
									an.position_y,
									an.props
						FROM adventure_node an
						WHERE an.adventure_id = ?`

	// Old query: "SELECT id, node_id, title, icon, content, image_url, image_id, image_layout_type, node_type, position_x, position_y FROM adventure_node WHERE adventure_id = ?
	rows, err := s.db.Query(query, adventureID)
	if err != nil {
		return nil, err
	}

	defer rows.Close()

	nodes := []models.Node{}

	for rows.Next() {
		n := models.Node{}
		var nodeIcon sql.NullString
		var nodeType sql.NullString
		var imageURL sql.NullString
		var imageID sql.NullInt64
		var imageLayoutType sql.NullString
		var nodeContent sql.NullString
		var xPosition sql.NullInt64
		var yPosition sql.NullInt64
		var props sql.NullString

		if err := rows.Scan(&n.ID, &n.NodeID, &n.Title, &nodeIcon, &nodeContent, &imageURL, &imageID, &imageLayoutType, &nodeType, &xPosition, &yPosition, &props); err != nil {
			return nil, err
		}

		if imageURL.Valid {
			n.ImageURL = imageURL.String
		}

		if imageID.Valid {
			n.ImageID = imageID.Int64
		}

		if imageLayoutType.Valid {
			n.ImageLayoutType = imageLayoutType.String
		}

		if nodeType.Valid {
			n.NodeType = nodeType.String
		}

		if nodeIcon.Valid {
			n.Icon = nodeIcon.String
		}

		if nodeContent.Valid {
			n.Content = nodeContent.String
		}

		if xPosition.Valid {
			n.X = xPosition.Int64
		}

		if yPosition.Valid {
			n.Y = yPosition.Int64
		}

		if props.Valid {
			n.Props = props.String
		}

		nodes = append(nodes, n)
	}

	return nodes, nil
}

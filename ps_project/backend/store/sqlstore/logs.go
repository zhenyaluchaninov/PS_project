package sqlstore

import (
	"projektps/models"
)

const (
	nodeCount = iota
	whateverType0 = iota
	whateverType1 = iota
)

func (s *SQLStore) LogVisitedNode(nodeId string, adventureId int64) error {
	res, err := s.db.Exec("INSERT INTO adventure_log (adventure_id, type, data) VALUES (?, 0, ?)", adventureId, nodeId)
	if err != nil {
		return err
	}

	_, err = res.LastInsertId()
	if err != nil {
		return err
	}

	return nil
}

func (s *SQLStore) GetStatisticsByAdventureID(adventureId int64, startTime string, stopTime string) ([]models.NodeStat, error) {
	query := `
		SELECT data, an.title, COUNT(*) FROM adventure_log al, adventure_node an
		WHERE al.data = an.node_id AND al.adventure_id = an.adventure_id AND al.adventure_id = ? AND type = 0
			AND al.created_at BETWEEN ? AND ?
		GROUP BY data
		`

	rows, err := s.db.Query(query, adventureId, startTime, stopTime)
		
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	nodeStats := []models.NodeStat{}

	for rows.Next() {
		ns := models.NodeStat{}

		if err := rows.Scan(&ns.NodeId, &ns.Title, &ns.VisitCount); err != nil {
			return nil, err
		}

		nodeStats = append(nodeStats, ns) 
	}

	return nodeStats, nil
}


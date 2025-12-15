package sqlstore

import (
	"database/sql"

	"projektps/models"
)

// ReportAdventure reports an adventure
func (s *SQLStore) ReportAdventure(report *models.Report) (*models.Report, error) {
	res, err := s.db.Exec("INSERT INTO adventure_report (adventure_id, report_reason, comment) VALUES(?, ?, ?)",
		report.AdventureID,
		report.ReportReason,
		report.Comment)

	if err != nil {
		return nil, err
	}

	report.ID, err = res.LastInsertId()
	if err != nil {
		return nil, err
	}

	return report, nil
}

// GetReports returns all handled/unhandled reports
func (s *SQLStore) GetReports(isHandled bool) ([]models.Report, error) {

	query := "SELECT ar.id, ar.report_reason, ar.comment, ar.is_handled, ar.created_at FROM adventure_report ar WHERE ar.is_handled = ? ORDER BY ar.created_at DESC"
	rows, err := s.db.Query(query, isHandled)
	if err != nil {
		return nil, err
	}

	defer rows.Close()

	reports := []models.Report{}

	for rows.Next() {
		r := models.Report{}
		var reason sql.NullString
		var comment sql.NullString

		if err := rows.Scan(&r.ID, &reason, &comment, &r.IsHandled, &r.CreatedAt); err != nil {
			return nil, err
		}

		if reason.Valid {
			r.ReportReason = reason.String
		}

		if comment.Valid {
			r.Comment = comment.String
		}

		reports = append(reports, r)
	}

	return reports, nil
}

// UpdateReport updates a reportinstance
func (s *SQLStore) UpdateReport(report *models.Report) error {
	_, err := s.db.Exec("UPDATE adventure_report SET is_handled = ? WHERE id = ?",
		report.ID,
		report.IsHandled)

	if err != nil {
		return err
	}

	return nil
}

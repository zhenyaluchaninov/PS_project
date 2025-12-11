package models

import "time"

// Report contains a adventure report
type Report struct {
	ID           int64     `json:"id"`
	AdventureID  int64     `json:"adventure_id"`
	ReportReason string    `json:"report_reason"`
	Comment      string    `json:"comment"`
	IsHandled    int64     `json:"is_handled"`
	CreatedAt    time.Time `json:"created_at"`
}

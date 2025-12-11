package models

import "time"

// List is a struct containing lists of adventures
type List struct {
	ID          int64       `json:"id"`
	Title       string      `json:"title"`
	Description string      `json:"description"`
	ParentID    int64       `json:"parent_id"`
	Adventures  []Adventure `json:"adventures"`
	CreatedAt   time.Time   `json:"created_at"`
}

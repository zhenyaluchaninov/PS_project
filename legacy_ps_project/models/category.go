package models

import (
	"time"
)

// Category represents a adventure category
type Category struct {
	ID          int64     `json:"id"`
	SortOrder   int64     `json:"sort_order,omitempty"`
	Title       string    `json:"title"`
	Description string    `json:"description,omitempty"`
	Icon        string    `json:"icon"`
	Image       string    `json:"image,omitempty"`
	CreatedAt   time.Time `json:"-"`
	UpdatedAt   time.Time `json:"-"`
}

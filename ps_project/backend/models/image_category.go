package models

import "time"

// ImageCategory groups collections of images
type ImageCategory struct {
	ID         int64     `json:"id"`
	Active     bool      `json:"-"`
	Title      string    `json:"title"`
	UnsplashID int64     `json:"-"`
	Images     []Image   `json:"images,omitempty"`
	CreatedAt  time.Time `json:"-"`
	UpdatedAt  time.Time `json:"-"`
}

package models

import "time"

// Image encapsulates an Unsplash image in a category/collection
type Image struct {
	ID          int64     `json:"id"`
	CategoryID  int64     `json:"-"`
	UnsplashID  string    `json:"-"`
	Active      bool      `json:"-"`
	Title       string    `json:"title"`
	AuthorName  string    `json:"author"`
	AuthorURL   string    `json:"author_url"`
	FullURL     string    `json:"full_url"`
	DownloadURL string    `json:"download_url"`
	ThumbURL    string    `json:"thumb_url"`
	CreatedAt   time.Time `json:"-"`
	UpdatedAt   time.Time `json:"-"`
}

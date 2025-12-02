// Package models contains the data structures needed for the Application
package models

import (
	"time"

	"projektps/helpers/timeago"
)


type NodeStat struct {
	NodeId int64 `json:"node_id"`
	Title string `json:"title"`
	VisitCount int64 `json:"visit_count"`
}

// Adventure represents an adventure
type Adventure struct {
	ID          int64      `json:"id"`
	Title       string     `json:"title"`
	Description string     `json:"description"`
	Slug        string     `json:"slug,omitempty"`
	ViewSlug    string     `json:"view_slug"`
	Locked      bool       `json:"locked,omitempty"`
	CreatedAt   time.Time  `json:"created_at,omitempty"`
	UpdatedAt   time.Time  `json:"updated_at,omitempty"`
	Category    Category   `json:"category,omitempty"`
	Nodes       []Node     `json:"nodes,omitempty"`
	Links       []Link     `json:"links"`
	Permission  Permission `json:"-"`
	CoverUrl	string	   `json:"cover_url,omitempty"`
	EditVersion	int64	   `json:"edit_version"`
	ViewCount	int64	   `json:"view_count"`
	Props		string     `json:"props,omitempty"`
	Users		[]User     `json:"users"`
}

type AdventureProps struct {
	FontList []string `json:"font_list"`
}


// Permission denotes mutability permission
type Permission int

const (
	// ReadOnly fetches only read slugs
	ReadOnly Permission = 1 << iota
	// ReadWrite fetches only read/write slugs
	ReadWrite
	// Ignore discards slug type
	Ignore
)

// UpdatedTimeAgo returns a string with the time since last update
func (a *Adventure) UpdatedTimeAgo() string {
	result, err := timeago.FromNowWithTime(a.UpdatedAt)
	if err != nil {
		return ""
	}
	return result
}

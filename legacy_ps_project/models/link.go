package models

// Link represents a connection between two nodes
type Link struct {
	ID              int64  `json:"id"`
	LinkID          int64  `json:"link_id"`
	AdventureID     int64  `json:"-"`
	SourceNodeID    int64  `json:"source"`
	SourceLinkTitle string `json:"source_title"`
	TargetNodeID    int64  `json:"target"`
	TargetLinkTitle string `json:"target_title"`
	LinkType        string `json:"type"`
	Changed         bool   `json:"changed,omitempty"`
	Props			string `json:"props,omitempty"`
}

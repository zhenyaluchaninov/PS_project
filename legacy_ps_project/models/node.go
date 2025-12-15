package models

// Node contains a adventure node
type Node struct {
	ID              int64  `json:"id"`
	NodeID          int64  `json:"node_id"`
	AdventureID     int64  `json:"-"`
	Title           string `json:"title"`
	Icon            string `json:"icon,omitempty"`
	Content         string `json:"text"`
	X               int64  `json:"x,omitempty"`
	Y               int64  `json:"y,omitempty"`
	ImageURL        string `json:"image_url,omitempty"`
	ImageID         int64  `json:"image_id,omitempty"`
	ImageLayoutType string `json:"image_layout_type,omitempty"`
//	Image           Image  `json:"image,omitempty"`
	NodeType        string `json:"type,omitempty"`
	Changed         bool   `json:"changed,omitempty"` // Changed is used to identify which nodes should be updated
	Props			string `json:"props,omitempty"` // Various node properties (mostly visual selectors) stored in a json field
}

type Props struct {
	AudioUrl string `json:"audio_url,omitempty"`
	AudioUrlAlt string `json:"audio_url_alt,omitempty"`
	SubtitlesUrl string `json:"subtitles_url,omitempty"`
}
package unsplash

// Reverse engineered structs for handling the resulting payload from the Unsplash API

type Collection struct {
	ID            string          `json:"id"`
	Title         string          `json:"title"`
	Description   interface{}     `json:"description"`
	PublishedAt   string          `json:"published_at"`
	UpdatedAt     string          `json:"updated_at"`
	Curated       bool            `json:"curated"`
	Featured      bool            `json:"featured"`
	TotalPhotos   int             `json:"total_photos"`
	Private       bool            `json:"private"`
	ShareKey      string          `json:"share_key"`
	Tags          []Tags          `json:"tags"`
	Links         Links           `json:"links"`
	User          User            `json:"user"`
	CoverPhoto    CoverPhoto      `json:"cover_photo"`
	PreviewPhotos []PreviewPhotos `json:"preview_photos"`
	Photos        []Photo         `json:"-"`
}

type Type struct {
	Slug       string `json:"slug"`
	PrettySlug string `json:"pretty_slug"`
}

type Category struct {
	Slug       string `json:"slug"`
	PrettySlug string `json:"pretty_slug"`
}

type Subcategory struct {
	Slug       string `json:"slug"`
	PrettySlug string `json:"pretty_slug"`
}

type Ancestry struct {
	Type        Type        `json:"type"`
	Category    Category    `json:"category"`
	Subcategory Subcategory `json:"subcategory"`
}

type Urls struct {
	Raw     string `json:"raw"`
	Full    string `json:"full"`
	Regular string `json:"regular"`
	Small   string `json:"small"`
	Thumb   string `json:"thumb"`
}

type Links struct {
	Self             string `json:"self"`
	HTML             string `json:"html"`
	Photos           string `json:"photos"`
	Related          string `json:"related"`
	Likes            string `json:"likes"`
	Portfolio        string `json:"portfolio"`
	Following        string `json:"following"`
	Followers        string `json:"followers"`
	Download         string `json:"download"`
	DownloadLocation string `json:"download_location"`
}

type ProfileImage struct {
	Small  string `json:"small"`
	Medium string `json:"medium"`
	Large  string `json:"large"`
}

type User struct {
	ID                string       `json:"id"`
	UpdatedAt         string       `json:"updated_at"`
	Username          string       `json:"username"`
	Name              string       `json:"name"`
	FirstName         string       `json:"first_name"`
	LastName          string       `json:"last_name"`
	TwitterUsername   string       `json:"twitter_username"`
	PortfolioURL      string       `json:"portfolio_url"`
	Bio               string       `json:"bio"`
	Location          string       `json:"location"`
	Links             Links        `json:"links"`
	ProfileImage      ProfileImage `json:"profile_image"`
	InstagramUsername string       `json:"instagram_username"`
	TotalCollections  int          `json:"total_collections"`
	TotalLikes        int          `json:"total_likes"`
	TotalPhotos       int          `json:"total_photos"`
	AcceptedTos       bool         `json:"accepted_tos"`
}

type CoverPhoto struct {
	ID                     string        `json:"id"`
	CreatedAt              string        `json:"created_at"`
	UpdatedAt              string        `json:"updated_at"`
	PromotedAt             string        `json:"promoted_at"`
	Width                  int           `json:"width"`
	Height                 int           `json:"height"`
	Color                  string        `json:"color"`
	Description            interface{}   `json:"description"`
	AltDescription         string        `json:"alt_description"`
	Urls                   Urls          `json:"urls"`
	Links                  Links         `json:"links"`
	Categories             []interface{} `json:"categories"`
	Likes                  int           `json:"likes"`
	LikedByUser            bool          `json:"liked_by_user"`
	CurrentUserCollections []interface{} `json:"current_user_collections"`
	User                   User          `json:"user"`
}

type Source struct {
	Ancestry        Ancestry   `json:"ancestry"`
	Title           string     `json:"title"`
	Subtitle        string     `json:"subtitle"`
	Description     string     `json:"description"`
	MetaTitle       string     `json:"meta_title"`
	MetaDescription string     `json:"meta_description"`
	CoverPhoto      CoverPhoto `json:"cover_photo"`
}

type Tags struct {
	Type   string `json:"type"`
	Title  string `json:"title"`
	Source Source `json:"source,omitempty"`
}

type PreviewPhotos struct {
	ID        string `json:"id"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
	Urls      Urls   `json:"urls"`
}

type Photo struct {
	ID                     string                   `json:"id"`
	CreatedAt              string                   `json:"created_at"`
	UpdatedAt              string                   `json:"updated_at"`
	PromotedAt             interface{}              `json:"promoted_at"`
	Width                  int                      `json:"width"`
	Height                 int                      `json:"height"`
	Color                  string                   `json:"color"`
	Description            interface{}              `json:"description"`
	AltDescription         string                   `json:"alt_description"`
	Urls                   Urls                     `json:"urls"`
	Links                  Links                    `json:"links"`
	Categories             []interface{}            `json:"categories"`
	Likes                  int                      `json:"likes"`
	LikedByUser            bool                     `json:"liked_by_user"`
	CurrentUserCollections []CurrentUserCollections `json:"current_user_collections"`
	User                   User                     `json:"user"`
}

type CurrentUserCollections struct {
	ID          int    `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	PublishedAt string `json:"published_at"`
	UpdatedAt   string `json:"updated_at"`
	Curated     bool   `json:"curated"`
	Featured    bool   `json:"featured"`
	TotalPhotos int    `json:"total_photos"`
	Private     bool   `json:"private"`
	ShareKey    string `json:"share_key"`
	Tags        []Tags `json:"tags"`
	Links       Links  `json:"links"`
}

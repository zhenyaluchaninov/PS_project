package store

import (
	"projektps/models"
)

// AdventureStore describes a storage facility for adventures
type AdventureStore interface {
	CreateNewAdventure() (*models.Adventure, error)
	CreateDefaultAdventure() (*models.Adventure, error)
	UpdateAdventure(adventure *models.Adventure) error
	UpdateAdventureContent(adventure *models.Adventure) error
	DeleteAdventureByID(adventureID int64) error
	CountViewAdventure(adventureID int64) error
	UpdateAdventureEditVersion(slug string) error
	GetAdventure(slug string, permission models.Permission) (*models.Adventure, error)
	GetAdventures(list string) ([]models.Adventure, error)
	GetAdventuresByCategory(categoryID, pageSize, pageIndex int64) ([]models.Adventure, int64, error)
	GetAdventuresBySearchString(searchString string, pageSize, pageIndex int64) ([]models.Adventure, int64, error)
	GetAdventureByID(adventureID int64) (*models.Adventure, error)
	GetAdventuresByReportReason(reportReason string, pageSize, pageIndex int64) ([]models.Adventure, int64, error)
}

// Store defines what capabilities a store is expected to have
type Store interface {
	AdventureStore
	
	Authenticate(username string, password string) (*models.User, error)
	CreateUser(user *models.User) (*models.User, error)
	GetUsers() ([]models.User, error)
	GetUser(userId int64) (*models.User, error)
	GetUsersByAdventureID(adventureID int64) ([]models.User, error)
	UpdateUser(user *models.User) error
	DeleteUser(userId int64) error
	DeleteUserFromAdventure(user *models.User, adventure *models.Adventure) error
	AddUserToAdventure(user *models.User, adventure *models.Adventure) error
	
	GetReports(isHandled bool) ([]models.Report, error)
	ReportAdventure(report *models.Report) (*models.Report, error)
	UpdateReport(report *models.Report) error

	GetCategories() ([]models.Category, error)
	GetCategory(categoryID int64) (*models.Category, error)
	CreateNewCategory(category *models.Category) (*models.Category, error)
	UpdateCategory(category *models.Category) error
	DeleteCategory(category *models.Category) error

	GetList(listSlug string) (*models.List, error)
	GetListByID(listID int64) (*models.List, error)
	GetLists() ([]models.List, error)
	GetListsByParent(listSlug string) ([]models.List, error)
	CreateNewList(list *models.List) (*models.List, error)
	UpdateList(list *models.List) error
	DeleteListByID(listID int64) error

	CreateNewNode(node *models.Node) (*models.Node, error)
	UpdateNode(node *models.Node) error
	DeleteNode(node *models.Node) error
	GetNode(nodeID int64) error
	GetNodesByAdventureID(adventureID int64) ([]models.Node, error)

	CreateNewLink(link *models.Link) (*models.Link, error)
	UpdateLink(link *models.Link) error
	DeleteLink(link *models.Link) error
	GetLink(linkID int64) (*models.Link, error)
	GetLinksByAdventureID(adventureID int64) ([]models.Link, error)

	CreateNewImageCategory(category *models.ImageCategory) (*models.ImageCategory, error)
	UpdateImageCategory(category *models.ImageCategory) error
	DeleteImageCategory(category models.ImageCategory) error
	GetImageCategory(categoryID string) (*models.ImageCategory, error)
	GetImageCategoryByUnsplashID(unsplashID string) (*models.ImageCategory, error)
	GetImageCategories(fetchAll bool) ([]models.ImageCategory, error)

	CreateNewImage(image *models.Image) (*models.Image, error)
	UpdateImage(image *models.Image) error
	DeleteImage(image models.Image) error
	GetImage(imageID int64) (*models.Image, error)
	GetImageByUnsplashID(unsplashID string) (*models.Image, error)
	GetImagesByCategory(categoryID int64) ([]models.Image, error)

	LogVisitedNode(nodeId string, adventureId int64) error
	GetStatisticsByAdventureID(adventureId int64, startTime string, stopTime string) ([]models.NodeStat, error)
}

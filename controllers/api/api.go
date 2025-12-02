package api

import (
	"os"
	"path/filepath"

	"projektps/store"
)

// API contains the neccessary references for the API struct/object
type API struct {
	store      store.Store
	version    string
	uploadDir  string
	systemPath string
}

// NewAPIController creates a new API controller struct
func NewAPIController(store *store.Store, version string, uploadDir string) *API {
	app_path, _ := os.Getwd()
	app_path = filepath.ToSlash(app_path)
	return &API{
		store:      *store,
		version:    version,
		uploadDir:  uploadDir,
		systemPath: app_path,
	}
}

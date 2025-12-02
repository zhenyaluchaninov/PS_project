package web

import (
	"fmt"
	"net/http"

	"github.com/gorilla/mux"
	"projektps/models"
)

// ArchiveHandler is the archive
func (web *Web) ArchiveHandler(w http.ResponseWriter, r *http.Request) {

	// viewData contains data that is passed to the template
	viewData := ViewData{}
	viewData.Version = web.version
	viewData.IsRoot = true

	// Archive lists adventures within an archivelist (table in db)
	var list *models.List

	// Check if there is a path/slug (/arkiv/[:id])
	vars := mux.Vars(r)
	slug := vars["id"]

	if len(slug) != 0 {
		// Slug was found, attempt to get list
		list, _ = web.store.GetList(slug)

		// Incorrect slug, return 404
		if list == nil {
			web.NotFoundHandler(w, r)
			return
		}

		viewData.IsRoot = false
	}

	// If list was not fetched via slug, default to "archive"
	if list == nil {
		archiveList, err := web.store.GetList("archive")
		if err != nil {
			fmt.Println("Error while fetching archive list", err.Error())
		}
		list = archiveList
	}
	viewData.Title = list.Description

	// Check if there are any child lists (ex. Partille stories > [Åk 3-5, Åk 6-9])
	childLists, err := web.store.GetListsByParent(list.Title)
	if err != nil {
		fmt.Println("Error while fetching child lists", err.Error())
	}
	viewData.Lists = childLists

	// Get adventures in current list
	// TODO: Perform this in "GetList"
	adventures, err := web.store.GetAdventures(list.Title)
	if err != nil {
		fmt.Println("Error while fetching front adventures", err.Error())
	}
	viewData.Adventures = adventures

	if len(adventures) == 0 {
		viewData.IsRoot = true
	}

	web.Process("arkiv.html", w, viewData);
}

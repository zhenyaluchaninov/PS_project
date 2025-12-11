package web

import (
	"fmt"
	"net/http"

	"github.com/gorilla/mux"
	"projektps/models"
)

// CreateNewHandler creates a new adventure
func (web *Web) CreateNewHandler(w http.ResponseWriter, r *http.Request) {
	// Create a blueprint start adventure
	adventure, err := web.store.CreateDefaultAdventure()
	if err != nil {
		panic(err)
	}

	host := GetHost(r)
	newURL := fmt.Sprintf("%v/redigera/%v", host, adventure.Slug)
	http.Redirect(w, r, newURL, http.StatusTemporaryRedirect)
}

// EditorHandler encapsulates the editor
func (web *Web) EditorHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	slug := vars["id"]
	if len(slug) < 6 {
		// respondWithError(w, http.StatusBadRequest, "Invalid adventure ID")
		web.NotFoundHandler(w, r)
		return
	}

	adv, err := web.store.GetAdventure(slug, models.ReadWrite)
	if err != nil {
		web.NotFoundHandler(w, r)
		return
	}

	if adv.Locked {
		web.NotFoundHandler(w, r)
		return
	}

	viewData := ViewData{}
	viewData.IsEditable = true
	viewData.Adventure = *adv
	viewData.Version = web.version

	// Redirect to new adventure
	host := GetHost(r)
	viewData.Host = host

	web.Process("editor.html", w, viewData);
}

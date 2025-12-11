package web

import (
	"database/sql"
	"fmt"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
	"github.com/skip2/go-qrcode"
	"projektps/models"
)

func (web *Web) PlayerHandlerPreview(w http.ResponseWriter, r *http.Request) {
	web.PlayerHandlerCommon(w, r, true)
}

func (web *Web) PlayerHandler(w http.ResponseWriter, r *http.Request) {
	web.PlayerHandlerCommon(w, r, false)
}

// PlayerHandler encapsulates the player
func (web *Web) PlayerHandlerCommon(w http.ResponseWriter, r *http.Request, preview bool) {

	// Get slug
	vars := mux.Vars(r)
	slug := vars["id"]
	if len(slug) < 6 {
		// respondWithError(w, http.StatusBadRequest, "Invalid adventure ID")
		web.NotFoundHandler(w, r)
		return
	}

	viewData := ViewData{}
	viewData.IsEditable = false

	// Get host from request
	host := GetHost(r)
	viewData.Host = host
	viewData.Version = web.version

	adv, err := web.store.GetAdventure(slug, models.Ignore)
	if err != nil {
		web.NotFoundHandler(w, r)
		return
	}

	viewData.Adventure = *adv

	web.Process("ps_player.html", w, viewData);

	if (!preview) {
		web.store.CountViewAdventure(adv.ID)
	}
}

// PlayerQRHandler generates a QR code containing a link for the adventure
func (web *Web) PlayerQRHandler(w http.ResponseWriter, r *http.Request) {
	// Get slug
	vars := mux.Vars(r)
	slug := vars["id"]
	if len(slug) < 6 {
		// respondWithError(w, http.StatusBadRequest, "Invalid adventure ID")
		web.NotFoundHandler(w, r)
		return
	}

	// If user came here with ViewSlug, then disable edit-button
	_, err := web.store.GetAdventure(slug, models.ReadOnly)
	if err == sql.ErrNoRows {
		// respondWithError(w, http.StatusBadRequest, "Invalid adventure ID")
		web.NotFoundHandler(w, r)
		return
	}

	var png []byte
	url := fmt.Sprintf("https://www.textaventyr.se/spela/%v", slug)
	png, err = qrcode.Encode(url, qrcode.Medium, 150)
	if err != nil {
		fmt.Println("[error] Error while generating PNG (", slug, ")")
		return
	}

	w.Header().Set("Content-Type", "image/png")
	w.Header().Set("Content-Length", strconv.Itoa(len(png)))
	if _, err := w.Write(png); err != nil {
		fmt.Println("[error] Unable to write image PNG (", slug, ")")
	}
}

package api

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/gorilla/mux"
	"projektps/models"
)

// CreateAdventure creates a new adventure
func (a *API) CreateAdventure(w http.ResponseWriter, r *http.Request) {

	adventure, err := a.store.CreateDefaultAdventure()
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondWithJSON(w, http.StatusCreated, adventure)
}


// GetAdventuresByList retrieves all adventures in a list
func (a *API) GetAdventuresByList(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	adventures, err := a.store.GetAdventures(id)
	if err != nil {
		if err == sql.ErrNoRows {
			respondWithError(w, http.StatusNotFound, err.Error())
			return
		}
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondWithJSON(w, http.StatusOK, adventures)
}

func (a *API) GetAdventure(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	// Ignore which slug was passed (read or read/write)
	adv, err := a.store.GetAdventure(id, models.Ignore)

	if err != nil {
		fmt.Println("Error while loading adventure", err.Error())
		respondWithError(w, http.StatusNotFound, err.Error())
		return
	}

	respondWithJSON(w, http.StatusOK, adv)
}

// GetAdventure returns a specific adventure
func (a *API) GetAdventureForEdit(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]

	a.store.UpdateAdventureEditVersion(id)

	adv, err := a.store.GetAdventure(id, models.Ignore)
	if err != nil {
		respondWithError(w, http.StatusNotFound, err.Error())
		return
	}

	if !a.devAuthBypass {
		user, err := a.store.GetUser(r.Context().Value("userid").(int64))
		if err != nil {
			fmt.Println("Error while checking user", err.Error())
			respondWithError(w, http.StatusNotFound, err.Error())
			return;
		}

		if user.Role > 1 {
			found := false
			for _, user0 := range adv.Users {
				if user0.ID == user.ID {
					found = true
					break;
				}
			}
			if (!found) {
				respondWithError(w, http.StatusBadRequest, "User doesent have access to adventure")
				return;	
			}
		}
	}
	
	respondWithJSON(w, http.StatusOK, adv)
}


// GetAdventureByID returns a specific adventure
func (a *API) GetAdventureByID(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	adventureID, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		respondWithError(w, http.StatusNotFound, err.Error())
	}

	adv, err := a.store.GetAdventureByID(adventureID)

	if err != nil {
		fmt.Println("Error while loading adventure", err.Error())
		respondWithError(w, http.StatusNotFound, err.Error())
		return
	}

	respondWithJSON(w, http.StatusOK, adv)
}

// Creates a new adventure from an existing adventure
func (a *API) CopyAdventureById(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	slug := vars["id"]

	fmt.Println("* Copying adventure with Slug:", slug)

	// Get existing adventure by editing-slug
	existingAdventure, err := a.store.GetAdventure(slug, models.ReadWrite)
	if err != nil {
		if err == sql.ErrNoRows {
			respondWithError(w, http.StatusNotFound, "Adventure not found")
			return
		}
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}
	
	newAdventure, err := a.store.CreateNewAdventure()
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	nodes := existingAdventure.Nodes
	for i := range nodes {
		nodes[i].ID = 0;
		nodes[i].ImageURL = strings.Replace(nodes[i].ImageURL, slug, newAdventure.Slug, 1);
		nodes[i].Props = strings.Replace(nodes[i].Props, slug, newAdventure.Slug, -1)
	}
	for i := range existingAdventure.Links {
		existingAdventure.Links[i].ID = 0;
	}

	existingAdventure.CoverUrl = strings.Replace(existingAdventure.CoverUrl, slug, newAdventure.Slug, 1);
	existingAdventure.Title = "Copy of " + existingAdventure.Title
	existingAdventure.Slug = newAdventure.Slug
	existingAdventure.ViewSlug = newAdventure.ViewSlug

	err = a.store.UpdateAdventureContent(existingAdventure)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	err = a.CopyAdventureMedia(slug, newAdventure.Slug)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	copiedAdventure, err := a.store.GetAdventureByID(newAdventure.ID)
	if err != nil {
		respondWithError(w, http.StatusNotFound, "error.adventure.adventurenotcopied")
		return
	}

	respondWithJSON(w, http.StatusOK, copiedAdventure)
}


// UpdateAdventureByID updates a specific adventure, but not its content
func (a *API) UpdateAdventureByID(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	adventureID, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		respondWithError(w, http.StatusNotFound, "error.adventure.parametererror")
		return
	}

	existingAdventure, err := a.store.GetAdventureByID(adventureID)
	if err != nil {
		respondWithError(w, http.StatusNotFound, "error.adventure.adventurenotfound")
		return
	}

	// Decode payload
	var payload models.Adventure
	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&payload); err != nil {
		respondWithError(w, http.StatusBadRequest, "error.adventure.payloaderror")
		return
	}
	defer r.Body.Close()

	existingAdventure.Category.ID = payload.Category.ID
	existingAdventure.Title = payload.Title
	existingAdventure.Description = payload.Description
	existingAdventure.Locked = payload.Locked
	existingAdventure.CoverUrl = payload.CoverUrl
	existingAdventure.Users = payload.Users
	existingAdventure.ViewSlug = payload.ViewSlug

	err = a.store.UpdateAdventure(existingAdventure)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "error.adventure.updateerror")
		return
	}

	updatedAdventure, err := a.store.GetAdventureByID(adventureID)
	if err != nil {
		respondWithError(w, http.StatusNotFound, "error.adventure.adventurenotfound")
		return
	}

	respondWithJSON(w, http.StatusOK, updatedAdventure)
}

// UpdateAdventureContent updates a specific adventure and its content (nodes/links)
func (a *API) UpdateAdventureContent(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	slug := vars["id"]

	// Get existing adventure by editing-slug
	existingAdventure, err := a.store.GetAdventure(slug, models.ReadWrite)
	if err != nil {
		if err == sql.ErrNoRows {
			respondWithError(w, http.StatusNotFound, "Adventure not found")
			return
		}
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if existingAdventure.Locked {
		respondWithError(w, http.StatusNotFound, "Adventure is read-only")
		return
	}

	// Decode payload
	var adv models.Adventure
	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&adv); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}
	defer r.Body.Close()

	if existingAdventure.EditVersion > adv.EditVersion {
		respondWithError(w, http.StatusLocked, "Adventure is used by other instance.")
		return
	}

	// Pass slug to decoded payload
	adv.Slug = existingAdventure.Slug
	adv.ID = existingAdventure.ID

	// Perform update with decoded payload
	err = a.store.UpdateAdventureContent(&adv)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Refetch adventure and return it
	updatedAdventure, err := a.store.GetAdventure(slug, models.ReadWrite)
	if err != nil {
		if err == sql.ErrNoRows {
			respondWithError(w, http.StatusNotFound, "Adventure not found")
			return
		}
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondWithJSON(w, http.StatusOK, updatedAdventure)
}

// DeleteAdventureByID deletes a specific adventure
func (a *API) DeleteAdventureByID(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	adventureID, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		respondWithError(w, http.StatusNotFound, "error.adventure.parametererror")
		return
	}

	adventureToDelete, err := a.store.GetAdventureByID(adventureID)
	if err != nil {
		if err == sql.ErrNoRows {
			respondWithError(w, http.StatusNotFound, "error.adventure.adventurenotfound")
			return
		}
		respondWithError(w, http.StatusInternalServerError, "error.adventure.fetcherror")
		return
	}

	err = a.store.DeleteAdventureByID(adventureToDelete.ID)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "error.adventure.deleteerror")
		return
	}

	a.DeleteMediaFolder(adventureToDelete.Slug);

	respondWithJSON(w, http.StatusOK, map[string]string{"result": "success"})
}

type reportPayload struct {
	ReasonCode string `json:"code"`
	Comment    string `json:"comment,omitempty"`
}

// ReportAdventure creates a new adventure
func (a *API) ReportAdventure(w http.ResponseWriter, r *http.Request) {
	fmt.Println("* Reporting adventure")
	var payload reportPayload
	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&payload); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}
	defer r.Body.Close()

	vars := mux.Vars(r)
	id := vars["id"]

	// Ignore which slug was passed (read or read/write)
	adv, err := a.store.GetAdventure(id, models.Ignore)

	if err != nil {
		fmt.Println("Error while loading adventure", err.Error())
		respondWithError(w, http.StatusNotFound, err.Error())
		return
	}

	report := &models.Report{
		AdventureID:  adv.ID,
		ReportReason: payload.ReasonCode,
		Comment:      payload.Comment,
	}

	_, err = a.store.ReportAdventure(report)
	if err != nil {
		fmt.Println("Error while reporting adventure", err.Error())
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	fmt.Println("* User reported adventure with ID", id)

	respondWithJSON(w, http.StatusCreated, adv)
}

type filterPayload struct {
	Filter     filter     `json:"filter"`
	Pagination pagination `json:"pagination"`
}

type filter struct {
	Type         string `json:"type"`
	CategoryID   int64  `json:"category_id,omitempty"`
	SearchString string `json:"search_string,omitempty"`
}

type pagination struct {
	Page int64 `json:"page"`
	Size int64 `json:"size"`
}

// GetAdventuresByFilter retrieves adventures using different filters
func (a *API) GetAdventuresByFilter(w http.ResponseWriter, r *http.Request) {
	// {pagination: {page: 1, count: 200, size: 10}, filter: {type: "CATEGORY", category_id: 4}}
	var payload filterPayload
	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&payload); err != nil {
		respondWithError(w, http.StatusBadRequest, "error.adventures.invalidpayload")
		return
	}
	defer r.Body.Close()

	if payload.Filter.Type == "CATEGORY" {
		adventures, count, err := a.store.GetAdventuresByCategory(payload.Filter.CategoryID, payload.Pagination.Size, payload.Pagination.Page)
		if err != nil {
			respondWithError(w, http.StatusBadRequest, "error.adventures.categoryfiltererror")
			return
		}
		respondWithJSON(w, http.StatusOK, map[string]interface{}{"adventures": adventures, "count": count})
		return
	}

	if payload.Filter.Type == "SEARCH" {
		if len(payload.Filter.SearchString) < 3 {
			respondWithError(w, http.StatusBadRequest, "error.adventures.searchqueryerror")
			return
		}

		adventures, count, err := a.store.GetAdventuresBySearchString(payload.Filter.SearchString, payload.Pagination.Size, payload.Pagination.Page)
		if err != nil {
			respondWithError(w, http.StatusBadRequest, "error.adventures.searchfiltererror")
			return
		}
		respondWithJSON(w, http.StatusOK, map[string]interface{}{"adventures": adventures, "count": count})
		return
	}

	if payload.Filter.Type == "REPORT" {
		adventures, count, err := a.store.GetAdventuresByReportReason(payload.Filter.SearchString, payload.Pagination.Size, payload.Pagination.Page)
		if err != nil {
			respondWithError(w, http.StatusBadRequest, "error.adventures.reportfiltererror")
			return
		}
		respondWithJSON(w, http.StatusOK, map[string]interface{}{"adventures": adventures, "count": count})
		return
	}

	respondWithJSON(w, http.StatusBadRequest, "error.adventures.invalidfilter")
}

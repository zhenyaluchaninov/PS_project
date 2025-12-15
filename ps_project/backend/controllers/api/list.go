package api

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
	"projektps/models"
)

// GetLists retrieves all available lists
func (a *API) GetLists(w http.ResponseWriter, r *http.Request) {
	lists, err := a.store.GetLists()
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondWithJSON(w, http.StatusOK, lists)
}

// GetList retrieves a single list
func (a *API) GetList(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	// Convert slug (string) to int64
	listID, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "error.list.invalidid")
		return
	}

	// Fetch existing category
	existingList, err := a.store.GetListByID(listID)
	if err != nil {
		if err == sql.ErrNoRows {
			respondWithError(w, http.StatusNotFound, "error.list.notfound")
			return
		}
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondWithJSON(w, http.StatusOK, existingList)
}

type listPayload struct {
	Title       string             `json:"title"`
	Description string             `json:"description"`
	ParentID    int64              `json:"parent_id"`
	Adventures  []models.Adventure `json:"adventures"`
}

// UpdateList takes a payload and updates an existing list
func (a *API) UpdateList(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	slug := vars["id"]

	// Convert slug (string) to int64
	listID, err := strconv.ParseInt(slug, 10, 64)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "error.list.invalidid")
		return
	}

	// Fetch existing category
	existingList, err := a.store.GetListByID(listID)
	if err != nil {
		if err == sql.ErrNoRows {
			respondWithError(w, http.StatusNotFound, "error.list.notfound")
			return
		}
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	var payload listPayload
	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&payload); err != nil {
		respondWithError(w, http.StatusBadRequest, "error.list.invalidpayload")
		return
	}
	defer r.Body.Close()

	existingList.Title = payload.Title
	existingList.Description = payload.Description
	existingList.ParentID = payload.ParentID
	existingList.Adventures = payload.Adventures

	err = a.store.UpdateList(existingList)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "error.list.updateerror")
		return
	}

	respondWithJSON(w, http.StatusOK, existingList)
}

// CreateList creates a new list
func (a *API) CreateList(w http.ResponseWriter, r *http.Request) {
	var payload listPayload
	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&payload); err != nil {
		respondWithError(w, http.StatusBadRequest, "error.list.invalidpayload")
		return
	}
	defer r.Body.Close()

	list := &models.List{
		Title:       payload.Title,
		Description: payload.Description,
		ParentID:    payload.ParentID,
	}

	newList, err := a.store.CreateNewList(list)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "error.list.inserterror")
		return
	}

	respondWithJSON(w, http.StatusOK, newList)
}

// DeleteList deletes an existing category
func (a *API) DeleteList(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	slug := vars["id"]

	// Convert slug (string) to int64
	listID, err := strconv.ParseInt(slug, 10, 64)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "error.list.invalidid")
		return
	}

	// Fetch existing category
	existingList, err := a.store.GetListByID(listID)
	if err != nil {
		if err == sql.ErrNoRows {
			respondWithError(w, http.StatusNotFound, "error.list.notfound")
			return
		}
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	err = a.store.DeleteListByID(existingList.ID)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "error.list.deleteerror")
		return
	}

	respondWithJSON(w, http.StatusOK, "successful")
}

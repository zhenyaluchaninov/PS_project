package api

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
	"projektps/models"
)

// GetCategories retrieves all available categories
func (a *API) GetCategories(w http.ResponseWriter, r *http.Request) {
	categories, err := a.store.GetCategories()
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondWithJSON(w, http.StatusOK, categories)
}

// GetCategory retrieves a single category
func (a *API) GetCategory(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	slug := vars["id"]

	// Convert slug (string) to int64
	categoryID, err := strconv.ParseInt(slug, 10, 64)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "error.category.invalidid")
		return
	}

	// Fetch existing category
	existingCategory, err := a.store.GetCategory(categoryID)
	if err != nil {
		if err == sql.ErrNoRows {
			respondWithError(w, http.StatusNotFound, "error.category.notfound")
			return
		}
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondWithJSON(w, http.StatusOK, existingCategory)
}

// GetImageCategories retrieves all active image categories
func (a *API) GetImageCategories(w http.ResponseWriter, r *http.Request) {
	imageCategories, err := a.store.GetImageCategories(false)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondWithJSON(w, http.StatusOK, imageCategories)
}

type categoryPayload struct {
	Title     string `json:"title"`
	Icon      string `json:"icon"`
	SortOrder int64  `json:"sort_order"`
}

// CreateCategory creates a new category
func (a *API) CreateCategory(w http.ResponseWriter, r *http.Request) {
	var payload categoryPayload
	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&payload); err != nil {
		respondWithError(w, http.StatusBadRequest, "error.category.invalidpayload")
		return
	}
	defer r.Body.Close()

	category := &models.Category{
		Title:     payload.Title,
		Icon:      payload.Icon,
		SortOrder: payload.SortOrder,
	}

	newCategory, err := a.store.CreateNewCategory(category)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "error.category.inserterror")
		return
	}

	respondWithJSON(w, http.StatusOK, newCategory)
}

// UpdateCategory takes a payload and updates an existing category
func (a *API) UpdateCategory(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	slug := vars["id"]

	// Convert slug (string) to int64
	categoryID, err := strconv.ParseInt(slug, 10, 64)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "error.category.invalidid")
		return
	}

	// Fetch existing category
	existingCategory, err := a.store.GetCategory(categoryID)
	if err != nil {
		if err == sql.ErrNoRows {
			respondWithError(w, http.StatusNotFound, "error.category.notfound")
			return
		}
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	var payload categoryPayload
	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&payload); err != nil {
		respondWithError(w, http.StatusBadRequest, "error.category.invalidpayload")
		return
	}
	defer r.Body.Close()

	existingCategory.Title = payload.Title
	existingCategory.Icon = payload.Icon
	existingCategory.SortOrder = payload.SortOrder

	err = a.store.UpdateCategory(existingCategory)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "error.category.updateerror")
		return
	}

	respondWithJSON(w, http.StatusOK, existingCategory)
}

// DeleteCategory deletes an existing category
func (a *API) DeleteCategory(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	slug := vars["id"]

	// Convert slug (string) to int64
	categoryID, err := strconv.ParseInt(slug, 10, 64)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "error.category.invalidid")
		return
	}

	// Fetch existing category
	existingCategory, err := a.store.GetCategory(categoryID)
	if err != nil {
		if err == sql.ErrNoRows {
			respondWithError(w, http.StatusNotFound, "error.category.notfound")
			return
		}
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	err = a.store.DeleteCategory(existingCategory)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "error.category.deleteerror")
		return
	}

	respondWithJSON(w, http.StatusOK, "successful")
}

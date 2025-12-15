package api

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"fmt"

	"github.com/gorilla/mux"
	"projektps/models"
)

func (a *API) GetUsers(w http.ResponseWriter, r *http.Request) {
	users, err := a.store.GetUsers()
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondWithJSON(w, http.StatusOK, users)
}

func (a *API) GetUser(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	slug := vars["id"]

	userID, err := strconv.ParseInt(slug, 10, 64)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "error.user.invalid_id")
		return
	}

	existingUser, err := a.store.GetUser(userID)
	if err != nil {
		if err == sql.ErrNoRows {
			respondWithError(w, http.StatusNotFound, "error.user.notfound")
			return
		}
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondWithJSON(w, http.StatusOK, existingUser)
}


type userPayload struct {
	ID int64 `json:"id"`
	Name string `json:"name"`
	Username string `json:"username"`
	Password string `json:"password"`
	Role int64 `json:"role"`
}

// CreateUser creates a new user
func (a *API) CreateUser(w http.ResponseWriter, r *http.Request) {
	var payload userPayload
	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&payload); err != nil {
		respondWithError(w, http.StatusBadRequest, "error.user.invalidpayload")
		return
	}
	defer r.Body.Close()

	user := &models.User{
		Name: payload.Name,
		Username: payload.Username,
		Role: payload.Role,
	}

	user.HashPassword(payload.Password)

	newUser, err := a.store.CreateUser(user)
	if err != nil {
		fmt.Println(err)
		respondWithError(w, http.StatusInternalServerError, "error.user.inserterror")
		return
	}

	respondWithJSON(w, http.StatusOK, newUser)
}

func (a *API) UpdateUser(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	slug := vars["id"]

	// Convert slug (string) to int64
	userID, err := strconv.ParseInt(slug, 10, 64)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "error.user.invalidid")
		return
	}

	// Fetch existing user
	existingUser, err := a.store.GetUser(userID)
	if err != nil {
		if err == sql.ErrNoRows {
			respondWithError(w, http.StatusNotFound, "error.user.notfound")
			return
		}
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	var payload userPayload
	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&payload); err != nil {
		respondWithError(w, http.StatusBadRequest, "error.user.invalidpayload")
		return
	}
	defer r.Body.Close()

	existingUser.ID = payload.ID
	existingUser.Username = payload.Username
	existingUser.Role = payload.Role
	existingUser.Name = payload.Name
	existingUser.Password = ""

	if payload.Password != "" {
		existingUser.HashPassword(payload.Password);
	}
	
	err = a.store.UpdateUser(existingUser)
	if err != nil {
		fmt.Println(err)
		respondWithError(w, http.StatusInternalServerError, "error.user.updateerror")
		return
	}

	respondWithJSON(w, http.StatusOK, existingUser)
}

func (a *API) DeleteUser(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	slug := vars["id"]

	// Convert slug (string) to int64
	userID, err := strconv.ParseInt(slug, 10, 64)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "error.user.invalidid")
		return
	}

	// Fetch existing user
	_, err = a.store.GetUser(userID)
	if err != nil {
		if err == sql.ErrNoRows {
			respondWithError(w, http.StatusNotFound, "error.user.notfound")
			return
		}
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	err = a.store.DeleteUser(userID)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "error.user.deleteerror")
		return
	}

	respondWithJSON(w, http.StatusOK, "successful")
}

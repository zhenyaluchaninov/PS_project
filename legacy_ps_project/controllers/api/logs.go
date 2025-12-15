package api

import (
	"net/http"
	"strconv"
	"database/sql"
	"encoding/json"
	"strings"

	"github.com/gorilla/mux"
	"projektps/models"
)


// GetImagesByCategory retrieves all images in a category
func (a *API) CountNodeStatistics(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	nodeId := vars["nodeId"]

	_, err := strconv.Atoi(nodeId)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Get existing adventure by editing-slug
	existingAdventure, err := a.store.GetAdventure(id, models.ReadWrite)
	if err != nil {
		if err == sql.ErrNoRows {
			respondWithError(w, http.StatusNotFound, "Adventure not found")
			return
		}
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}
	
	err = a.store.LogVisitedNode(nodeId, existingAdventure.ID)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondWithJSON(w, http.StatusOK, "success")
}

type statsParams struct {
	AdventureID int64 `json:"adventureId"`
	StartTime string `json:"startTime"`
	StopTime string `json:"stopTime"`
}

func (a *API) GetNodeStatisticsById(w http.ResponseWriter, r *http.Request) {
	var payload statsParams
	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&payload); err != nil {
		respondWithError(w, http.StatusBadRequest, err.Error())
		return
	}
	defer r.Body.Close()

	startTime := strings.Replace(payload.StartTime, ",", "", 1)
	stopTime := strings.Replace(payload.StopTime, ",", "", 1)

	nodeStats, err := a.store.GetStatisticsByAdventureID(payload.AdventureID, startTime, stopTime)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondWithJSON(w, http.StatusOK, nodeStats)
}

package api

import (
	"encoding/json"
	"errors"
	"net/http"

	"projektps/helpers/jwt"
)

// AuthCredentials contains the payload to the auth endpoint
type AuthCredentials struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// TokenPayload is used to deliver the token to the requester
type TokenPayload struct {
	Token string `json:"token"`
	Id int64 `json:"id"`
	Role int64 `json:"role"`
}

// ErrCredentialsPayload is returned when the auth payload is invalid
var ErrCredentialsPayload = errors.New("errors.auth.invalidpayload")

// ErrTokenIssuer is returned when the JWT issuer fails
var ErrTokenIssuer = errors.New("errors.auth.tokenissuer")

// Authenticate authenticates a user
func (a *API) Authenticate(w http.ResponseWriter, r *http.Request) {

	// Get auth payload
	var credentials AuthCredentials
	decoder := json.NewDecoder(r.Body)
	defer r.Body.Close()
	if err := decoder.Decode(&credentials); err != nil {
		respondWithError(w, http.StatusBadRequest, ErrCredentialsPayload.Error())
		return
	}

	// Fetch user from DB
	user, err := a.store.Authenticate(credentials.Username, credentials.Password)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Issue JWT-token
	token, err := jwt.IssueTokenForUserID(user.ID)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, ErrTokenIssuer.Error())
		return
	}

	user0, err := a.store.GetUser(user.ID)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "errors.auth.getuserfromdb")
		return
	}

	// Create payload to be returned to client
	tokenPayload := &TokenPayload{Token: token}
	tokenPayload.Id = user.ID
	tokenPayload.Role = user0.Role

	// Return payload to caller
	respondWithJSON(w, http.StatusOK, tokenPayload)
}

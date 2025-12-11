package jwt

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"
	//"fmt"

	"github.com/gbrlsnchs/jwt/v3"
)


// JWT secret
const secret = "MnBCvw4wvKphsRCGwnwyuLt3gDa2rkm8mvtjkbz4GLVBS56YsfbR4DsPs6eUVcA9zNw6KAhWR9BYwVeDJn3SySz63kQJcrGgtPMCwkxeCRRjDfawD2UDVFuFYMxx57rV"
const jwtid = "projektps"
const issuer = "goteborgsregionen"
const subject = "projektps"
const expirationDays = 7

type payload struct {
	jwt.Payload
	UserID int64 `json:"user_id,omitempty"`
}

var hs = jwt.NewHS256([]byte(secret))

// ErrInvalidToken is returned when the JWT token is invalid
var ErrInvalidToken = errors.New("errors.auth.invalidtoken")

// IssueTokenForUserID issues a new token
func IssueTokenForUserID(userID int64) (string, error) {
	now := time.Now()
	payload := payload{
		Payload: jwt.Payload{
			Issuer:         issuer,
			Subject:        subject,
			Audience:       jwt.Audience{"https://ps-test.goteborgsregionen.se", "https://ps.goteborgsregionen.se"},
			ExpirationTime: jwt.NumericDate(now.Add(expirationDays * (24 * 60))),
			NotBefore:      jwt.NumericDate(now.Add(30 * time.Minute)),
			IssuedAt:       jwt.NumericDate(now),
			JWTID:          jwtid,
		},
		UserID: userID,
	}

	token, err := jwt.Sign(payload, hs)
	if err != nil {
		return "", err
	}

	return string(token), nil
}

// GetUserIDFromToken decodes a JWT token
func GetUserIDFromToken(token string) (int64, error) {
	var payload payload

	byteToken := []byte(token)

	_, err := jwt.Verify(byteToken, hs, &payload)
	if err != nil {
		return 0, ErrInvalidToken
	}

	return payload.UserID, nil
}

// ControlMiddleware authenticates a request
func ControlMiddleware(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		// Get token
		token := r.Header.Get("Authorization")

		// Check if its provided
		if len(token) == 0 {
			payload := map[string]string{"error": ErrInvalidToken.Error()}
			response, _ := json.Marshal(payload)

			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			w.Write(response)
			return
		}

		// Remove "Bearer " prefix
		token = strings.ReplaceAll(token, "Bearer ", "")

		// Verify token
		userID, err := GetUserIDFromToken(token)
		if err != nil {
			payload := map[string]string{"error": ErrInvalidToken.Error()}
			response, _ := json.Marshal(payload)

			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			w.Write(response)
			return
		}

		// Inject user ID into a context
		ctx := context.WithValue(r.Context(), "userid", userID)

		// Pass request along with context
		h.ServeHTTP(w, r.WithContext(ctx))
	})
}

// DevBypassMiddleware is an opt-in middleware to skip JWT verification in local/dev mode.
// It simply injects a fixed user id into the request context.
func DevBypassMiddleware(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := context.WithValue(r.Context(), "userid", int64(1))
		h.ServeHTTP(w, r.WithContext(ctx))
	})
}

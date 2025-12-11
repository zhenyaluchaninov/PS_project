package web

import (
	"fmt"
	"net/http"
)

// GetHost returns the scheme and host for the passed request
func GetHost(r *http.Request) string {
	// Redirect to new adventure
	var host = r.Host
	var scheme = "http:"

	if r.TLS != nil {
		scheme = "https:"
	}

	return fmt.Sprintf("%v//%v", scheme, host)
}

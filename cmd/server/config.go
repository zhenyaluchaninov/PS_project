package main

import (
	"errors"
	"fmt"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

// Build-time variables
var (
	buildnumber  string
	buildtrigger string
	buildgreeter string
	serverrunner string
)

// Config contains application configuration variables
type Config struct {
	dbusername  string
	dbpassword  string
	dbhost      string
	dbport      string
	dbname      string
	imgurbearer string
	servermode  string
	serverport  string
	socketpath  string
	version     string
	environment	string
	devAuthBypass bool
}

// NewConfiguration retrieves config from OS / file
func NewConfiguration() (*Config, error) {

	// If serverrunner is set
	if len(serverrunner) > 0 {

		// ..to "Go", then run locally (without docker)
		if strings.EqualFold(serverrunner, "Go") {
			if err := godotenv.Load(".env.local"); err != nil {
				return nil, errors.New("No .env.local file found")
			}
		}

		// ..to "GoDocker", then run with .env file configured for Docker
		if strings.EqualFold(serverrunner, "GoDocker") {
			if err := godotenv.Load(".env"); err != nil {
				return nil, errors.New("No .env file found")
			}
		}
	}

	config := &Config{
		dbusername:  os.Getenv("DB_USERNAME"),
		dbpassword:  os.Getenv("DB_PASSWORD"),
		dbhost:      os.Getenv("DB_HOST"),
		dbport:      os.Getenv("DB_PORT"),
		dbname:      os.Getenv("DB_NAME"),
		imgurbearer: os.Getenv("IMGUR_BEARER"),
		servermode:  os.Getenv("SERVER_MODE"),
		serverport:  os.Getenv("SERVER_PORT"),
		socketpath:  os.Getenv("SERVER_SOCKET_PATH"),
		version:     buildnumber,
		environment: serverrunner,
		devAuthBypass: isTruthy(os.Getenv("DEV_AUTH_BYPASS")),
	}

	if len(serverrunner) > 0 {
		fmt.Println("Server runner:", serverrunner)
	}
	fmt.Printf("Build: %s, Trigger: %s, Greeter: %s\n", buildnumber, buildtrigger, buildgreeter)

	return config, nil
}

func isTruthy(val string) bool {
	switch strings.ToLower(strings.TrimSpace(val)) {
	case "1", "true", "yes", "y", "on":
		return true
	default:
		return false
	}
}

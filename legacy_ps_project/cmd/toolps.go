package main

import (
	"fmt"
	"net/http"
	"os"

	"projektps/controllers/api"
	"projektps/store"
	"projektps/store/sqlstore"

	"github.com/joho/godotenv"
)

func main() {
	args := os.Args

	if len(args) <= 1 {
		fmt.Printf("Usage: %s import/export <file>/<slug>\n", args[0])
		return
	}

	if err := godotenv.Load(".env.local"); err != nil {
		fmt.Println("Using other")
		if err := godotenv.Load(".env"); err != nil {
			fmt.Println("No .env file found", err)
			return
		}
	}

	dbuser := os.Getenv("DB_USERNAME")
	dbpass := os.Getenv("DB_PASSWORD")
	dbhost := os.Getenv("DB_HOST")
	dbport := os.Getenv("DB_PORT")
	dbname := os.Getenv("DB_NAME")

	fmt.Println(dbuser, dbpass, dbhost, dbport, dbname)

	// Create storage
	dbstore, err := sqlstore.NewStore(dbuser, dbpass, dbhost, dbport, dbname)
	if err != nil {
		fmt.Println("Error while connecting to database: ", err)
		return
	}

	var store = storeConvert(dbstore)

	api := api.NewAPIController(&store, "1.0", "/upload/")

	var request http.Request
	if args[1] == "import" {
		file, err := os.Open(args[2])
		if err != nil {
			fmt.Println("File not found: " + args[2], err)
			return
		}

		fmt.Println("Using file: " + args[2])

		request.Body = file
		api.ImportAdventure(nil, &request)
	} else if args[1] == "export" {
		path, err := api.CreateExportZip(args[2])
		if err !=nil {
			fmt.Println(err.Error())
		}
		fmt.Println("File saved: " + path)
	}
}

func storeConvert(store store.Store) store.Store {
	return store
}

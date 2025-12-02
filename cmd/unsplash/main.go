package main

import (
	"log"

	"projektps/services/imagebank"
	"projektps/store/sqlstore"
)

func main() {

	// This is a stub to compile a CLI-tool for manually performing sync with Unsplash

	// Create storage
	store, err := sqlstore.NewStore("root", "password", "localhost", "3306", "textaventyr")
	if err != nil {
		log.Fatal("Error while connecting to database: ", err)
	}

	err = imagebank.PerformSync(store)
	if err != nil {
		log.Fatal(err)
	}

}

package main

import (
	"fmt"
	"log"
	"net"
	"net/http"
	"os"

	"projektps/router"
	"projektps/services/imagebank"
	"projektps/store/sqlstore"
)

func main() {
	fmt.Println(" -- Projekt PS -- ")
	fmt.Printf("Version 1 (Build %s)\n", buildnumber)

	// Get configuration
	config, err := NewConfiguration()
	if err != nil {
		log.Fatal("Error while retrieving configuration:", err)
	}

	// Create storage
	store, err := sqlstore.NewStore(config.dbusername, config.dbpassword, config.dbhost, config.dbport, config.dbname)
	if err != nil {
		log.Fatal("Error while connecting to database:", err)
	}

	// Start Imagebank synchronization job (runs every hour)
	if false && config.environment == "" {
		imagebank.Initialize(store)
	}
	// Create router
	router := router.NewRouter(store, config.version, config.imgurbearer, config.environment, config.devAuthBypass)

	// Start server
	if config.servermode == "socket" {
		RunWithSocket(router, config.socketpath)
	} else {
		Run(router, config.serverport)
	}
}

// Run starts a web server at the specified addr/port
func Run(router *router.Router, addr string) {
	fmt.Println("[server] Started at port:", addr)

	log.Fatal(http.ListenAndServe(":"+addr, router.Handler))
}

// RunWithSocket starts the application by pipeing in/output through linux sockets
func RunWithSocket(router *router.Router, socketpath string) {
	fmt.Println("[server] Started with socket path: ", socketpath)

	// Start Server
	os.Remove(socketpath)
	unixListener, err := net.Listen("unix", socketpath)
	os.Chmod(socketpath, 0777)
	if err != nil {
		log.Fatal("[server] Error while creating unix socket listener: ", err)
	}
	defer unixListener.Close()

	http.Serve(unixListener, router.Handler)
}

package socket

import (
	"fmt"

	"github.com/sasha-s/go-deadlock"
	"projektps/store"
)

type Server struct {
	store     *store.Store
	users     []User
	mutex     deadlock.RWMutex
	broadcast chan Message
	version   string
}

func NewSocketServer(store *store.Store, version string) *Server {
	fmt.Println("* Starting Websocket server")
	s := &Server{
		store:     store,
		users:     []User{},
		broadcast: make(chan Message),
		version:   version,
	}
	go s.processMessages()
	return s
}

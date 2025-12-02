package socket

import (
	"fmt"
	"net/http"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func (s *Server) WebsocketHandler(w http.ResponseWriter, r *http.Request) {
	userConnection, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		fmt.Println("[websocket] Failed connecting user", err.Error())
		return
	}

	// Add a new client (user, device & connection to websocket)
	user := s.AddUser(userConnection)

	// When connection is broken, automatically remove user
	defer s.DisconnectUser(user)

	for {
		// Get message from socket
		var msg Message
		err := user.connection.ReadJSON(&msg)

		// If message retrieval failed, disconnect client
		if err != nil {
			break
		}

		// Pass current users info with message
		msg.UserID = user.userID

		// Process the received message
		s.Broadcast(msg)
	}

}

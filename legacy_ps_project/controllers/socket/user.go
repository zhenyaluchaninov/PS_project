package socket

import (
	"fmt"

	"github.com/gorilla/websocket"
	"projektps/helpers/uniuri"
)

// User is a construct that contains the socket-connection for a single user
// along with some metadata. userID is a guid and topic is the currently active
// topic that the user is interested in
type User struct {
	userID     string
	connection *websocket.Conn
	topic      string
}

// AddUser is a method to encapsulate a connection into a user
func (s *Server) AddUser(connection *websocket.Conn) User {
	// Acquire lock on shared variable
	s.mutex.Lock()

	// Create new user
	user := User{
		userID:     uniuri.New(),
		connection: connection,
	}
	s.users = append(s.users, user)
	s.mutex.Unlock()
	fmt.Println("[websocket] User connected")

	return user
}

// GetUsersByTopic retrieves all users that are subscribing to a specific topic
func (s *Server) GetUsersByTopic(topic string) []User {
	s.mutex.RLock()
	var users []User
	for _, user := range s.users {
		if user.topic == topic {
			users = append(users, user)
		}
	}
	s.mutex.RUnlock()
	return users
}

func (s *Server) DisconnectUser(user User) {
	user.connection.Close()

	s.mutex.Lock()
	tmp := s.users[:0]
	for _, u := range s.users {
		if u.userID != user.userID {
			tmp = append(tmp, u)
		}
	}
	s.users = tmp
	s.mutex.Unlock()

	fmt.Println("[websocket] User disconnected")
}

package socket

import "fmt"

type Message struct {
	UserID  string `json:"-"`
	Command string `json:"cmd,omitempty"`
	Topic   string `json:"topic,omitempty"`
	Message string `json:"message,omitempty"`
}

// Broadcast sends a message to the message processor
func (s *Server) Broadcast(message Message) {
	s.broadcast <- message
}

func (s *Server) processMessages() {
	fmt.Println("* Websocket queue processor initialized")

	for {
		// Grab the next message from the broadcast channel
		message := <-s.broadcast

		switch message.Command {
		case "sub":
			{
				// Subscribe to topic
				// Remove users previous subscription
				// Add user to subscription list for the message.Topic
			}
		default:
			{
				// Nothing
			}
		}

		count := s.SendMessage(message)
		if count > 0 {
			fmt.Println("[websocket] sent message to", count, "subscribers")
		}
	}
}

// SendMessage sends a message to all clients interested in the message's topic
func (s *Server) SendMessage(message Message) int {

	// Get users who are subscribing to the message's topic
	targetUsers := s.GetUsersByTopic(message.Topic)

	// None available? Bail out
	if len(targetUsers) == 0 {
		return 0
	}

	var err error
	var sendCount int

	sendCount = 0

	for _, user := range targetUsers {
		err = user.connection.WriteJSON(message)
		if err == nil {
			sendCount++
		} else {
			fmt.Println("[websocket] Failed sending message to user", user.userID)
		}
	}

	return sendCount
}

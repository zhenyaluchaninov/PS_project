package main

import (
	"bufio"
	"fmt"
	"log"
	"os"
	"strings"

	"projektps/helpers/jwt"
	"projektps/store/sqlstore"
)

func main() {
	fmt.Println("Testing JWT-token issuer")

	// Create storage
	store, err := sqlstore.NewStore("docker", "docker", "db", "3306", "textaventyr")
	if err != nil {
		log.Fatal("Error while connecting to database: ", err)
	}

	// Read input from console
	reader := bufio.NewReader(os.Stdin)

	// Get username
	fmt.Print("Username: ")
	username, _ := reader.ReadString('\n')
	username = strings.Replace(username, "\n", "", -1)

	// Get password
	fmt.Print("Password: ")
	password, _ := reader.ReadString('\n')
	password = strings.Replace(password, "\n", "", -1)

	// Perform auth
	user, err := store.Authenticate(username, password)
	if err != nil {
		fmt.Print("User or password incorrect. Create new? (y/n): ")
		answer, _ := reader.ReadString('\n')
		
		if answer == "y\n" {
			user, err := store.CreateUser(username, password)
			if err != nil {
				log.Fatal("User creation failed: ", err)
			}

			fmt.Println("Hashcode: ", user.Password)
		} else {
			log.Fatal("Authentication error: ", err)
		}

		return
	}

	// User authenticated
	fmt.Println("Authenticated user ", user.ID)

	// Create JWT and show token
	token, err := jwt.IssueTokenForUserID(user.ID)
	if err != nil {
		fmt.Println(err)
	} else {
		fmt.Println("Token: ", token)
	}

	// token := "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJnb3RlYm9yZ3NyZWdpb25lbiIsInN1YiI6InRleHRhdmVudHlyIiwiYXVkIjpbImh0dHBzOi8vdGVzdC50ZXh0YXZlbnR5ci5zZSIsImh0dHBzOi8vd3d3LnRleHRhdmVudHlyLnNlIl0sImV4cCI6MTU4NjM1MTYyMywibmJmIjoxNTg2MzUzNDIzLCJpYXQiOjE1ODYzNTE2MjMsImp0aSI6InRleHRhdmVudHlyIiwidXNlcl9pZCI6MX0.tugRRjbNJG7xnxLUjj9huLzvloK5Jiw2-ix8MqfINFY"
	// token := "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJnb3RlYm9yZ3NyZWdpb25lbiIsInN1YiI6InRleHRhdmVudHlyIiwiYXVkIjpbImh0dHBzOi8vdGVzdC50ZXh0YXZlbnR5ci5zZSIsImh0dHBzOi8vd3d3LnRleHRhdmVudHlyLnNlIl0sImV4cCI6MTU4NjM1MTY4NSwibmJmIjoxNTg2MzUzNDg1LCJpYXQiOjE1ODYzNTE2ODUsImp0aSI6InRleHRhdmVudHlyIiwidXNlcl9pZCI6Mn0.hpCFQFUc0-8psXu_8u-ViHtqJr_RDFUwCtZSKm_l9Ag"

	fmt.Println("Verifying token")
	userID, err := jwt.GetUserIDFromToken(token)
	if err != nil {
		fmt.Println("Not verified ", err.Error())
	} else {
		fmt.Println("Verified, user ID: ", userID)
	}
}

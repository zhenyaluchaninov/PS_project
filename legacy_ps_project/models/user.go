package models

import (
	"time"

	"golang.org/x/crypto/bcrypt"
)

// User encapsulates a user in the database
type User struct {
	ID int64 `json:"id"`
	Username string `json:"username"`
	Password string `json:"-"`
	Name string `json:"name"`
	Role int64 `json:"role"`
	CreatedAt time.Time `json:"created_at,omitempty"`
	UpdatedAt time.Time `json:"updated_at,omitempty"`
	Adventures []Adventure `json:"adventures"`
}

type UserAdventure struct {
	UserID int64 `json:"user_id"`
	AdventureID int64 `json:"adventure_id"`
}

// HashPassword hashes the input and stores it in the user struct
func (u *User) HashPassword(password string) error {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.MinCost)
	u.Password = string(bytes)
	return err
}

// CheckPasswordHash checks if the password parameter matches the stored
// password, which is presumed to be an already hashed password
func (u *User) CheckPasswordHash(password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(password))
	return err == nil
}

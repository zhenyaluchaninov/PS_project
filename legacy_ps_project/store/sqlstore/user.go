package sqlstore

import (
	"database/sql"
	"errors"
	"strconv"
//	"fmt"

	"projektps/models"
)

// ErrInvalidUser is returned when user is not found in storage
var ErrInvalidUser = errors.New("errors.auth.invaliduser")

// ErrInvalidPassword is returned when password is incorrect
var ErrInvalidPassword = errors.New("errors.auth.invalidpassword")

// Authenticate performs an authentication request to the database
func (s *SQLStore) Authenticate(username string, password string) (*models.User, error) {

	row := s.db.QueryRow("SELECT id, password, created_at FROM users WHERE username = ?", username)

	var userID sql.NullInt64
	var dbPassword sql.NullString
	var createdAt sql.NullTime

	user := &models.User{}

	err := row.Scan(&userID, &dbPassword, &createdAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrInvalidUser
		}
		return nil, err
	}

	if userID.Valid {
		user.ID = userID.Int64
	}

	if dbPassword.Valid {
		user.Password = dbPassword.String
	}

	if createdAt.Valid {
		user.CreatedAt = createdAt.Time
	}

	if !user.CheckPasswordHash(password) {
		return nil, ErrInvalidPassword
	}

	return user, nil
}


// Create user with hashed password
func (s *SQLStore) CreateUser(user *models.User) (*models.User, error) {
	
	res, err := s.db.Exec("INSERT INTO users (username, password, name, role) VALUES(?, ?, ?, ?)", 
		user.Username, user.Password, user.Name, user.Role)

	if err != nil {
		return nil, err
	}

	_, err = res.LastInsertId()
	if err != nil {
		return nil, err
	}

	return user, err
}


func (s *SQLStore) UpdateUser(user *models.User) error {
	var err error
	if user.Password == "" {
		_, err = s.db.Exec("UPDATE users SET username = ?, name = ?, role = ?, updated_at = current_timestamp() WHERE id = ?", 
			user.Username, user.Name, user.Role, user.ID)
	} else {
		_, err = s.db.Exec("UPDATE users SET username = ?, password = ?, name = ?, role = ?, updated_at = current_timestamp() WHERE id = ?", 
		user.Username, user.Password, user.Name, user.Role, user.ID)
	}
	return err
}

func (s *SQLStore) DeleteUserFromAdventure(user *models.User, adventure *models.Adventure) error {	
	_, err := s.db.Exec("DELETE FROM user_adventure WHERE user_id = ? and adventure_id = ?", user.ID, adventure.ID)

	return err
}

func (s *SQLStore) AddUserToAdventure(user *models.User, adventure *models.Adventure) error {	
	_, err := s.db.Exec("INSERT INTO user_adventure (user_id, adventure_id) VALUES (?, ?)", user.ID, adventure.ID)
	
	return err
}


func (s *SQLStore) GetUser(userId int64) (*models.User, error) {
	users, err := GetUsersInternal(s, " WHERE id = " + strconv.FormatInt(userId, 10))
	if err != nil {
		return nil, err
	}
	user := users[0]

	user.Adventures, err = s.GetAdventuresByUserID(userId)
	if err != nil {
		return nil, err
	}

	return &user, nil
}


func (s *SQLStore) GetUsers() ([]models.User, error) {	
	users, err := GetUsersInternal(s, "")
	if err != nil {
		return nil, err
	}
	return users, nil
}


func (s *SQLStore) GetUsersByAdventureID(adventureID int64) ([]models.User, error) {	
	users, err := GetUsersInternal(s, "INNER JOIN user_adventure on user_id = u.id and adventure_id = " + strconv.FormatInt(adventureID, 10))
	if err != nil {
		return nil, err
	}
	return users, nil
}


func GetUsersInternal(s *SQLStore, sqlCondition string) ([]models.User, error) {
	query := `
		SELECT id, username, name, role, created_at, updated_at
		FROM users u
		`

	rows, err := s.db.Query(query + sqlCondition)
		
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := []models.User{}

	for rows.Next() {
		c := models.User{}

		var username sql.NullString
		var name sql.NullString
		var role sql.NullInt64
		var created_at sql.NullTime
		var updated_at sql.NullTime

		if err := rows.Scan(&c.ID, &username, &name, &role, &created_at, &updated_at); err != nil {
			return nil, err
		}

		if username.Valid {
			c.Username = username.String
		}
		if name.Valid {
			c.Name = name.String
		}
		if role.Valid {
			c.Role = role.Int64
		}
		if created_at.Valid {
			c.CreatedAt = created_at.Time
		}
		if updated_at.Valid {
			c.UpdatedAt = updated_at.Time
		}

		users = append(users, c) 
	}

	return users, nil
}



func (s *SQLStore) DeleteUser(userId int64) error {

	// Remove category
	_, err := s.db.Exec("DELETE FROM users WHERE id = ?", userId)

	if err != nil {
		return err
	}

	return nil
}

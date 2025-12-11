package sqlstore

import (
	"database/sql"
	"fmt"
)

// SQLStore contains the database connection aswell as fulfill the Store interface
type SQLStore struct {
	db *sql.DB
}

// NewStore creates a new SQL store
func NewStore(username, password, dbhost, dbport, dbname string) (*SQLStore, error) {
	connectionString := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true&charset=utf8mb4,utf8", username, password, dbhost, dbport, dbname)

	var err error
	db, err := sql.Open("mysql", connectionString)

	if err != nil {
		return nil, err
	}

	err = db.Ping()
	if err != nil {
		return nil, err
	}

	fmt.Println("[sqlstore] Connected to ", connectionString)

	return &SQLStore{
		db: db,
	}, nil
}

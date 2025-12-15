package sqlstore

import (
	"database/sql"

	"projektps/models"
)

func (s *SQLStore) CreateNewImageCategory(category *models.ImageCategory) (*models.ImageCategory, error) {
	res, err := s.db.Exec("INSERT INTO image_category (active, title, unsplash_id) VALUES (?, ?, ?)",
		category.Active,
		category.Title,
		category.UnsplashID)

	if err != nil {
		return nil, err
	}

	category.ID, err = res.LastInsertId()
	if err != nil {
		return nil, err
	}

	return category, nil
}

func (s *SQLStore) UpdateImageCategory(category *models.ImageCategory) error {
	_, err := s.db.Exec("UPDATE image_category SET active = ?, title = ?, unsplash_id = ? WHERE id = ?",
		category.Active,
		category.Title,
		category.UnsplashID,
		category.ID)

	if err != nil {
		return err
	}

	return nil
}

func (s *SQLStore) DeleteImageCategory(category models.ImageCategory) error {

	err := s.deleteImagesByCategoryID(category.ID)
	if err != nil {
		return err
	}

	_, err = s.db.Exec("DELETE FROM image_category WHERE id = ?",
		category.ID)

	if err != nil {
		return err
	}

	return nil
}

func (s *SQLStore) GetImageCategory(categoryID string) (*models.ImageCategory, error) {
	row := s.db.QueryRow("SELECT id, active, title, unsplash_id, created_at FROM image_category WHERE id = ?", categoryID)

	var title sql.NullString
	var unsplashID sql.NullInt64
	var active sql.NullBool
	var createdAt sql.NullTime

	category := &models.ImageCategory{}

	err := row.Scan(&category.ID, &active, &title, &unsplashID, &createdAt)
	if err != nil {
		return nil, err
	}

	if active.Valid {
		category.Active = active.Bool
	}

	if title.Valid {
		category.Title = title.String
	}

	if unsplashID.Valid {
		category.UnsplashID = unsplashID.Int64
	}

	if createdAt.Valid {
		category.CreatedAt = createdAt.Time
	}

	return category, nil
}

// GetImageCategoryByUnsplashID retrieves an image category via Unsplash ID
func (s *SQLStore) GetImageCategoryByUnsplashID(unsplashID string) (*models.ImageCategory, error) {
	row := s.db.QueryRow("SELECT id, active, title, unsplash_id, created_at FROM image_category WHERE unsplash_id = ?", unsplashID)

	var title sql.NullString
	var _unsplashID sql.NullInt64
	var active sql.NullBool
	var createdAt sql.NullTime

	category := &models.ImageCategory{}

	err := row.Scan(&category.ID, &active, &title, &_unsplashID, &createdAt)
	if err != nil {
		return nil, err
	}

	if active.Valid {
		category.Active = active.Bool
	}

	if title.Valid {
		category.Title = title.String
	}

	if _unsplashID.Valid {
		category.UnsplashID = _unsplashID.Int64
	}

	if createdAt.Valid {
		category.CreatedAt = createdAt.Time
	}

	return category, nil
}

// GetImageCategories returns all active image categories
func (s *SQLStore) GetImageCategories(fetchAll bool) ([]models.ImageCategory, error) {

	query := "SELECT id, active, title, unsplash_id, created_at FROM image_category WHERE active = true ORDER BY title"
	if fetchAll {
		query = "SELECT id, active, title, unsplash_id, created_at FROM image_category ORDER BY title"
	}

	rows, err := s.db.Query(query)
	if err != nil {
		return nil, err
	}

	defer rows.Close()

	categories := []models.ImageCategory{}

	for rows.Next() {
		category := models.ImageCategory{}

		var title sql.NullString
		var unsplashID sql.NullInt64
		var active sql.NullBool
		var createdAt sql.NullTime

		err := rows.Scan(&category.ID, &active, &title, &unsplashID, &createdAt)
		if err != nil {
			return nil, err
		}

		if active.Valid {
			category.Active = active.Bool
		}

		if title.Valid {
			category.Title = title.String
		}

		if unsplashID.Valid {
			category.UnsplashID = unsplashID.Int64
		}

		if createdAt.Valid {
			category.CreatedAt = createdAt.Time
		}

		categories = append(categories, category)
	}

	return categories, nil
}

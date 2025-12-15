package sqlstore

import (
	"database/sql"

	"projektps/models"
)

// GetCategories retrieves all categories
func (s *SQLStore) GetCategories() ([]models.Category, error) {
	rows, err := s.db.Query("SELECT id, sort_order, title, description, icon, image FROM adventure_category ORDER BY sort_order ASC")
	if err != nil {
		return nil, err
	}

	defer rows.Close()

	categories := []models.Category{}

	for rows.Next() {
		c := models.Category{}
		var title sql.NullString
		var sortOrder sql.NullInt64
		var description sql.NullString
		var icon sql.NullString
		var image sql.NullString
		if err := rows.Scan(&c.ID, &sortOrder, &title, &description, &icon, &image); err != nil {
			return nil, err
		}

		if sortOrder.Valid {
			c.SortOrder = sortOrder.Int64
		}

		if title.Valid {
			c.Title = title.String
		}

		if description.Valid {
			c.Description = description.String
		}

		if icon.Valid {
			c.Icon = icon.String
		}

		if image.Valid {
			c.Image = image.String
		}

		categories = append(categories, c)
	}

	return categories, nil
}

// GetCategory retrieves a single category
func (s *SQLStore) GetCategory(categoryID int64) (*models.Category, error) {
	row := s.db.QueryRow("SELECT id, sort_order, title, description, icon, image FROM adventure_category WHERE id = ?", categoryID)

	var title sql.NullString
	var sortOrder sql.NullInt64
	var description sql.NullString
	var icon sql.NullString
	var image sql.NullString

	category := &models.Category{}

	err := row.Scan(&category.ID, &sortOrder, &title, &description, &icon, &image)
	if err != nil {
		return nil, err
	}

	if sortOrder.Valid {
		category.SortOrder = sortOrder.Int64
	}

	if title.Valid {
		category.Title = title.String
	}

	if description.Valid {
		category.Description = description.String
	}

	if icon.Valid {
		category.Icon = icon.String
	}

	if image.Valid {
		category.Image = image.String
	}

	return category, nil
}

// CreateNewCategory creates a new category
func (s *SQLStore) CreateNewCategory(category *models.Category) (*models.Category, error) {
	res, err := s.db.Exec("INSERT INTO adventure_category (title, icon, sort_order) VALUES(?, ?, ?)",
		category.Title,
		category.Icon,
		category.SortOrder)

	if err != nil {
		return nil, err
	}

	category.ID, err = res.LastInsertId()
	if err != nil {
		return nil, err
	}

	return category, nil
}

// UpdateCategory updates an existing category
func (s *SQLStore) UpdateCategory(category *models.Category) error {
	_, err := s.db.Exec("UPDATE adventure_category SET title = ?, icon = ?, sort_order = ? WHERE id = ?",
		category.Title,
		category.Icon,
		category.SortOrder,
		category.ID)

	if err != nil {
		return err
	}

	return nil
}

// DeleteCategory removes a category
func (s *SQLStore) DeleteCategory(category *models.Category) error {

	// Remove references to this category (by making them null)
	err := s.removeReferencesToCategoryID(category.ID)
	if err != nil {
		return err
	}

	// Remove category
	_, err = s.db.Exec("DELETE FROM adventure_category WHERE id = ?", category.ID)

	if err != nil {
		return err
	}

	return nil
}

func (s *SQLStore) removeReferencesToCategoryID(categoryID int64) error {

	_, err := s.db.Exec("UPDATE adventure SET category_id = null WHERE category_id = ?", categoryID)
	if err != nil {
		return err
	}

	return nil
}

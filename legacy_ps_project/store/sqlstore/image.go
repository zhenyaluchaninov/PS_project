package sqlstore

import (
	"database/sql"

	"projektps/models"
)

func (s *SQLStore) CreateNewImage(image *models.Image) (*models.Image, error) {
	res, err := s.db.Exec("INSERT INTO image_item (active, image_category_id, title, unsplash_id, author_name, author_url, full_url, download_url, thumb_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
		image.Active,
		image.CategoryID,
		image.Title,
		image.UnsplashID,
		image.AuthorName,
		image.AuthorURL,
		image.FullURL,
		image.DownloadURL,
		image.ThumbURL)

	if err != nil {
		return nil, err
	}

	image.ID, err = res.LastInsertId()
	if err != nil {
		return nil, err
	}

	return image, nil
}

func (s *SQLStore) UpdateImage(image *models.Image) error {
	_, err := s.db.Exec("UPDATE image_item SET active = ?, image_category_id = ?, title = ?, unsplash_id = ?, author_name = ?, author_url = ?, full_url = ?, download_url = ?, thumb_url = ? WHERE id = ?",
		image.Active,
		image.CategoryID,
		image.Title,
		image.UnsplashID,
		image.AuthorName,
		image.AuthorURL,
		image.FullURL,
		image.DownloadURL,
		image.ThumbURL,
		image.ID)

	if err != nil {
		return err
	}

	return nil
}

func (s *SQLStore) DeleteImage(image models.Image) error {

	// Remove all references to this image
	err := s.removeReferencesToImageID(image.ID)
	if err != nil {
		return err
	}

	// Remove image
	_, err = s.db.Exec("DELETE FROM image_item WHERE id = ?", image.ID)

	if err != nil {
		return err
	}

	return nil
}

func (s *SQLStore) removeReferencesToImageID(imageID int64) error {

	_, err := s.db.Exec("UPDATE adventure_node SET image_id = 0 WHERE image_id = ?", imageID)

	if err != nil {
		return err
	}

	return nil
}

func (s *SQLStore) deleteImagesByCategoryID(categoryID int64) error {

	// Remove all references to the images in the category
	// TODO: Make db-constraint instead of manual enforcement
	_, err := s.db.Exec("UPDATE adventure_node SET image_id = null, image_layout_type = null WHERE id IN (SELECT id FROM image_item where image_category_id = ?)", categoryID)
	if err != nil {
		return err
	}

	// Remove all images in category
	_, err = s.db.Exec("DELETE FROM image_item WHERE image_category_id = ?", categoryID)
	if err != nil {
		return err
	}

	return nil
}

func (s *SQLStore) GetImage(imageID int64) (*models.Image, error) {
	row := s.db.QueryRow("SELECT id, active, image_category_id, title, unsplash_id, author_name, author_url, full_url, download_url, thumb_url, created_at FROM image_item WHERE id = ?", imageID)

	var active sql.NullBool
	var categoryID sql.NullInt64
	var title sql.NullString
	var unsplashID sql.NullString
	var authorName sql.NullString
	var authorURL sql.NullString
	var fullURL sql.NullString
	var downloadURL sql.NullString
	var thumbURL sql.NullString
	var createdAt sql.NullTime

	image := &models.Image{}

	err := row.Scan(&image.ID, &active, &categoryID, &title, &unsplashID, &authorName, &authorURL, &fullURL, &downloadURL, &thumbURL, &createdAt)
	if err != nil {
		return nil, err
	}

	if active.Valid {
		image.Active = active.Bool
	}

	if categoryID.Valid {
		image.CategoryID = categoryID.Int64
	}

	if title.Valid {
		image.Title = title.String
	}

	if unsplashID.Valid {
		image.UnsplashID = unsplashID.String
	}

	if authorName.Valid {
		image.AuthorName = authorName.String
	}

	if authorURL.Valid {
		image.AuthorURL = authorURL.String
	}

	if fullURL.Valid {
		image.FullURL = fullURL.String
	}

	if downloadURL.Valid {
		image.DownloadURL = downloadURL.String
	}

	if thumbURL.Valid {
		image.ThumbURL = thumbURL.String
	}

	if createdAt.Valid {
		image.CreatedAt = createdAt.Time
	}

	return image, nil
}

func (s *SQLStore) GetImageByUnsplashID(unsplashID string) (*models.Image, error) {
	row := s.db.QueryRow("SELECT id, active, image_category_id, title, unsplash_id, author_name, author_url, full_url, download_url, thumb_url, created_at FROM image_item WHERE unsplash_id = ?", unsplashID)

	var active sql.NullBool
	var categoryID sql.NullInt64
	var title sql.NullString
	var _unsplashID sql.NullString
	var authorName sql.NullString
	var authorURL sql.NullString
	var fullURL sql.NullString
	var downloadURL sql.NullString
	var thumbURL sql.NullString
	var createdAt sql.NullTime

	image := &models.Image{}

	err := row.Scan(&image.ID, &active, &categoryID, &title, &_unsplashID, &authorName, &authorURL, &fullURL, &downloadURL, &thumbURL, &createdAt)
	if err != nil {
		return nil, err
	}

	if active.Valid {
		image.Active = active.Bool
	}

	if categoryID.Valid {
		image.CategoryID = categoryID.Int64
	}

	if title.Valid {
		image.Title = title.String
	}

	if _unsplashID.Valid {
		image.UnsplashID = _unsplashID.String
	}

	if authorName.Valid {
		image.AuthorName = authorName.String
	}

	if authorURL.Valid {
		image.AuthorURL = authorURL.String
	}

	if fullURL.Valid {
		image.FullURL = fullURL.String
	}

	if thumbURL.Valid {
		image.ThumbURL = thumbURL.String
	}

	if downloadURL.Valid {
		image.DownloadURL = downloadURL.String
	}

	if createdAt.Valid {
		image.CreatedAt = createdAt.Time
	}

	return image, nil
}

// GetImagesByCategory retrieves images by category
func (s *SQLStore) GetImagesByCategory(categoryID int64) ([]models.Image, error) {
	rows, err := s.db.Query("SELECT id, active, image_category_id, title, unsplash_id, author_name, author_url, full_url, download_url, thumb_url, created_at FROM image_item WHERE image_category_id = ? AND active = true ORDER BY id, title",
		categoryID)
	if err != nil {
		return nil, err
	}

	defer rows.Close()

	images := []models.Image{}

	for rows.Next() {

		image := models.Image{}

		var active sql.NullBool
		var categoryID sql.NullInt64
		var title sql.NullString
		var unsplashID sql.NullString
		var authorName sql.NullString
		var authorURL sql.NullString
		var fullURL sql.NullString
		var downloadURL sql.NullString
		var thumbURL sql.NullString
		var createdAt sql.NullTime

		err := rows.Scan(&image.ID, &active, &categoryID, &title, &unsplashID, &authorName, &authorURL, &fullURL, &downloadURL, &thumbURL, &createdAt)
		if err != nil {
			return nil, err
		}

		if active.Valid {
			image.Active = active.Bool
		}

		if categoryID.Valid {
			image.CategoryID = categoryID.Int64
		}

		if title.Valid {
			image.Title = title.String
		}

		if unsplashID.Valid {
			image.UnsplashID = unsplashID.String
		}

		if authorName.Valid {
			image.AuthorName = authorName.String
		}

		if authorURL.Valid {
			image.AuthorURL = authorURL.String
		}

		if fullURL.Valid {
			image.FullURL = fullURL.String
		}

		if downloadURL.Valid {
			image.DownloadURL = downloadURL.String
		}

		if thumbURL.Valid {
			image.ThumbURL = thumbURL.String
		}

		if createdAt.Valid {
			image.CreatedAt = createdAt.Time
		}

		images = append(images, image)
	}

	return images, nil
}

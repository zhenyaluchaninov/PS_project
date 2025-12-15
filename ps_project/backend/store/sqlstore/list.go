package sqlstore

import (
	"database/sql"
	"fmt"
	"strings"

	"github.com/go-sql-driver/mysql"
	"projektps/models"
)

// GetList retrieves a list by its slug
func (s *SQLStore) GetList(listSlug string) (*models.List, error) {
	row := s.db.QueryRow("SELECT id, title, description, parent_id FROM adventure_list WHERE title = ?", listSlug)

	var title sql.NullString
	var description sql.NullString
	var parentID sql.NullInt64

	list := &models.List{}

	err := row.Scan(&list.ID, &title, &description, &parentID)
	if err != nil {
		return nil, err
	}

	if title.Valid {
		list.Title = title.String
	}

	if description.Valid {
		list.Description = description.String
	}

	if parentID.Valid {
		list.ParentID = parentID.Int64
	}

	return list, nil
}

// GetListByID retrieves a list by its ID
func (s *SQLStore) GetListByID(listID int64) (*models.List, error) {
	row := s.db.QueryRow("SELECT al.id, al.title, al.description, al.parent_id, al.created_at FROM adventure_list al WHERE al.id = ?", listID)

	var title sql.NullString
	var description sql.NullString
	var parentID sql.NullInt64
	var createdAt sql.NullTime

	list := &models.List{}

	err := row.Scan(&list.ID, &title, &description, &parentID, &createdAt)
	if err != nil {
		return nil, err
	}

	if title.Valid {
		list.Title = title.String
	}

	if description.Valid {
		list.Description = description.String
	}

	if parentID.Valid {
		list.ParentID = parentID.Int64
	}

	if createdAt.Valid {
		list.CreatedAt = createdAt.Time
	}

	list.Adventures, err = s.GetAdventuresByListID(listID)
	if err != nil {
		return nil, err
	}

	return list, nil
}

// GetListsByParent retrieves all lists by their parents slug
func (s *SQLStore) GetListsByParent(listSlug string) ([]models.List, error) {

	parentList, err := s.GetList(listSlug)
	if err != nil {
		return nil, err
	}

	rows, err := s.db.Query(
		`SELECT advlist.id, advlist.title, advlist.description, advlist.created_at, advlist.parent_id
     FROM adventure_list advlist
     WHERE advlist.parent_id = ?
     ORDER BY advlist.title ASC`,
		parentList.ID)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	lists := []models.List{}

	for rows.Next() {
		l := models.List{}
		var description sql.NullString
		var createdAt mysql.NullTime
		var parentID sql.NullInt64
		if err := rows.Scan(&l.ID, &l.Title, &description, &createdAt, &parentID); err != nil {
			return nil, err
		}
		if description.Valid {
			l.Description = description.String
		}
		if parentID.Valid {
			l.ParentID = parentID.Int64
		}
		lists = append(lists, l)
	}

	return lists, nil
}

// GetLists retrieves all lists
func (s *SQLStore) GetLists() ([]models.List, error) {

	query := `SELECT 
					al.id, 
					al.title, 
					al.description, 
					al.created_at, 
					al.parent_id
				FROM adventure_list al
				ORDER BY al.id ASC`

	rows, err := s.db.Query(query)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	lists := []models.List{}

	for rows.Next() {
		l := models.List{}
		var description sql.NullString
		var createdAt mysql.NullTime
		var parentID sql.NullInt64
		if err := rows.Scan(&l.ID, &l.Title, &description, &createdAt, &parentID); err != nil {
			return nil, err
		}
		if description.Valid {
			l.Description = description.String
		}
		if createdAt.Valid {
			l.CreatedAt = createdAt.Time
		}
		if parentID.Valid {
			l.ParentID = parentID.Int64
		}
		lists = append(lists, l)
	}

	return lists, nil
}

// CreateNewList creates a new list
func (s *SQLStore) CreateNewList(list *models.List) (*models.List, error) {

	res, err := s.db.Exec("INSERT INTO adventure_list (title, description, parent_id) VALUES(?, ?, ?)",
		list.Title,
		list.Description,
		list.ParentID)

	if err != nil {
		return nil, err
	}

	list.ID, err = res.LastInsertId()
	if err != nil {
		return nil, err
	}

	// TODO: Insert items using batch query
	return list, nil
}

// UpdateList updates a list and its items
func (s *SQLStore) UpdateList(list *models.List) error {

	_, err := s.db.Exec("UPDATE adventure_list SET title = ?, description = ?, parent_id = ? WHERE id = ?",
		list.Title,
		list.Description,
		list.ParentID,
		list.ID)

	if err != nil {
		return err
	}

	// Remove lists items
	_, err = s.db.Exec("DELETE FROM adventure_list_item WHERE list_id = ?", list.ID)
	if err != nil {
		return err
	}

	if list.Adventures == nil || len(list.Adventures) == 0 {
		return nil
	}

	// Batch insert
	valueStrings := make([]string, 0, len(list.Adventures))
	valueArgs := make([]interface{}, 0, len(list.Adventures)*3)
	for i, post := range list.Adventures {
		valueStrings = append(valueStrings, "(?, ?, ?)")
		valueArgs = append(valueArgs, list.ID)
		valueArgs = append(valueArgs, post.ID)
		valueArgs = append(valueArgs, i)
	}
	stmt := fmt.Sprintf("INSERT INTO adventure_list_item (list_id, adventure_id, ordinal) VALUES %s", strings.Join(valueStrings, ","))
	_, err = s.db.Exec(stmt, valueArgs...)
	if err != nil {
		fmt.Println(err)
		fmt.Println(stmt)
		fmt.Println(valueArgs)
		return err
	}

	return nil
}

// DeleteListByID removes a list and its items
func (s *SQLStore) DeleteListByID(listID int64) error {

	// Remove lists items
	_, err := s.db.Exec("DELETE FROM adventure_list_item WHERE list_id = ?", listID)
	if err != nil {
		return err
	}

	// Remove list itself
	_, err = s.db.Exec("DELETE FROM adventure_list WHERE id = ?", listID)
	if err != nil {
		return err
	}
	return nil
}

func (s *SQLStore) addListItemsToList(listID int64, listItems []int64) error {
	return nil
}

func (s *SQLStore) removeListItemsFromList(listID int64, listItems []int64) error {
	return nil
}

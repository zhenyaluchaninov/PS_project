package sqlstore

import (
	"database/sql"
	"fmt"

	"github.com/go-sql-driver/mysql"
	"projektps/helpers/uniuri"
	"projektps/models"
)

// CreateNewAdventure creates a new adventure
func (s *SQLStore) CreateNewAdventure() (*models.Adventure, error) {

	newAdventure := &models.Adventure{
		ViewSlug: uniuri.New(),
		Slug:     uniuri.NewLen(8),
	}

	// TODO: Make sure Slug & ViewSlug are unique by checking db for pre-existant entries

	res, err := s.db.Exec("INSERT INTO adventure (title, slug, view_slug, category_id, created_at) VALUES(?, ?, ?, ?, sysdate())",
		"Nytt äventyr",
		newAdventure.Slug,
		newAdventure.ViewSlug,
		1)

	if err != nil {
		return nil, err
	}

	newAdventure.ID, err = res.LastInsertId()
	if err != nil {
		return nil, err
	}

	return newAdventure, nil
}

// Updates only specific fields on an adventure 
func (s *SQLStore) UpdateAdventure(adventure *models.Adventure) error {

	existingAdventure, err := s.GetAdventure(adventure.Slug, models.ReadWrite)
	if err != nil {
		return err
	}

	query := `
		UPDATE 
			adventure 
		SET 
			title = ?, 
			description = ?, 
			category_id = ?, 
			locked = ?,
			updated_at = sysdate(),
			view_slug = ?
		WHERE 
			id = ?
		`

	_, err = s.db.Exec(query,
		adventure.Title,
		adventure.Description,
		adventure.Category.ID,
		adventure.Locked,
		adventure.ViewSlug,
		adventure.ID,
	)
	if err != nil {
		return err
	}

	for _, user := range existingAdventure.Users {
		removeUser := true
		for _, existingUser := range adventure.Users {
			if existingUser.ID == user.ID {
				removeUser = false
				break
			}
		}

		if removeUser {
			err = s.DeleteUserFromAdventure(&user, existingAdventure)
			if err != nil {
				fmt.Println("Error while removing User from Adventure", err.Error())
				return err	
			}
		}
	}

	for _, user := range adventure.Users {
		addUser := true
		for _, newUser := range existingAdventure.Users {
			if newUser.ID == user.ID {
				addUser = false
				break
			}
		}

		if addUser {
			err = s.AddUserToAdventure(&user, existingAdventure)
			if err != nil {
				fmt.Println("Error while adding User to Adventure", err.Error())
				return err	
			}
		}
	}

	return nil
}

// UpdateAdventureContent updates an existing adventure using the read/write slug
func (s *SQLStore) UpdateAdventureContent(newAdventure *models.Adventure) error {

	a, err := s.GetAdventure(newAdventure.Slug, models.ReadWrite)
	if err != nil {
		return err
	}

	_, err = s.db.Exec("UPDATE adventure SET title = ?, description = ?, category_id = ?, locked = ?, cover_url = ?, props = ? WHERE id = ? AND slug = ?",
		newAdventure.Title,
		newAdventure.Description,
		newAdventure.Category.ID,
		newAdventure.Locked,
		newAdventure.CoverUrl,
		newAdventure.Props,
		a.ID,
		a.Slug)
	if err != nil {
		fmt.Println("Error while updating adventure")
		return err
	}


	// Delete nodes that have been removed
	for _, node := range a.Nodes {
		nodeExists := false
		for _, existingNode := range newAdventure.Nodes {
			if existingNode.ID == node.ID {
				nodeExists = true
			}
		}

		if !nodeExists {
			node.AdventureID = a.ID
			err = s.DeleteNode(&node)
			if err != nil {
				fmt.Println("Error while removing node", err.Error())
				return err
			}
		}
	}

	// Iterate over new adventure's nodes
	for _, node := range newAdventure.Nodes {
		node.AdventureID = a.ID
		if node.ID == 0 {
			_, err := s.CreateNewNode(&node)
			if err != nil {
				fmt.Println("Error while inserting node on update", err.Error())
				return err
			}
		} else {
			if node.Changed {
				err = s.UpdateNode(&node)
				if err != nil {
					fmt.Println("Error while updating node on update", err.Error())
					return err
				}
			}
		}
	}

	// Delete links that have been removed
	for _, link := range a.Links {
		linkExists := false
		for _, existingLink := range newAdventure.Links {
			if existingLink.ID == link.ID {
				linkExists = true
			}
		}

		if !linkExists {
			link.AdventureID = a.ID
			err = s.DeleteLink(&link)
			if err != nil {
				fmt.Println("Error while removing link", err.Error())
				return err
			}
		}
	}

	for _, link := range newAdventure.Links {
		link.AdventureID = a.ID
		if link.ID == 0 {
			_, err := s.CreateNewLink(&link)
			if err != nil {
				fmt.Println("Error while inserting link on update", err.Error())
				return err
			}
		} else {
			if link.Changed {
				err = s.UpdateLink(&link)
				if err != nil {
					fmt.Println("Error while updating link on update", err.Error())
					return err
				}
			}
		}
	}

	return nil
}

// DeleteAdventureByID removes an adventure from the database
func (s *SQLStore) DeleteAdventureByID(adventureID int64) error {
	_, err := s.db.Exec("DELETE FROM adventure WHERE id = ?", adventureID)
	if err != nil {
		return err
	}
	return nil
}

func (s *SQLStore) CountViewAdventure(adventureID int64) error {
	_, err := s.db.Exec("UPDATE adventure SET view_count = view_count + 1 WHERE id = ?", adventureID)
	if err != nil {
		return err
	}
	return nil
}

func (s *SQLStore) UpdateAdventureEditVersion(slug string) error {
	_, err := s.db.Exec("UPDATE adventure SET edit_version = edit_version + 1 WHERE slug = ?", slug)
	if err != nil {
		return err
	}
	return nil
}


// GetAdventure retrieves an adventure along with its content from the database
func (s *SQLStore) GetAdventure(slug string, permission models.Permission) (*models.Adventure, error) {

	var query string
	var row *sql.Row

	var baseQuery = "SELECT id, title, description, slug, view_slug, locked, category_id, cover_url, edit_version, view_count, created_at, updated_at, props FROM adventure";

	switch permission {
	case models.ReadOnly:
		{
			query = baseQuery + " WHERE view_slug = ?"
			row = s.db.QueryRow(query, slug)
		}
	case models.ReadWrite:
		{
			query = baseQuery + " WHERE slug = ?"
			row = s.db.QueryRow(query, slug)
		}
	case models.Ignore:
		{
			query = baseQuery + " WHERE slug = ? OR view_slug = ?"
			row = s.db.QueryRow(query, slug, slug)
		}
	}

	var title, description, coverUrl, props sql.NullString
	var categoryID sql.NullInt64

	a := &models.Adventure{}
	err := row.Scan(&a.ID, &title, &description, &a.Slug, &a.ViewSlug, &a.Locked, &categoryID, &coverUrl, &a.EditVersion, &a.ViewCount, &a.CreatedAt, &a.UpdatedAt, &props)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, err
		}
		return nil, err
	}

	if title.Valid {
		a.Title = title.String
	}

	if description.Valid {
		a.Description = description.String
	}

	if description.Valid {
		a.CoverUrl = coverUrl.String
	}

	if props.Valid {
		a.Props = props.String
	}


	// Fetch category
	if categoryID.Valid {
		cat, err := s.GetCategory(categoryID.Int64)
		if err != nil {
			if err != sql.ErrNoRows {
				return nil, err
			}
		} else {
			a.Category = *cat
		}
	}

	a.Nodes, a.Links, a.Users, err = s.getAdventureContent(a.ID)
	if err != nil {
		return nil, err
	}

	if slug == a.ViewSlug {
		a.Permission = models.ReadOnly
	} else {
		a.Permission = models.ReadWrite
	}

	return a, nil
}

// GetAdventures retrieves a list of adventures
func (s *SQLStore) GetAdventures(list string) ([]models.Adventure, error) {
	rows, err := s.db.Query(
		`SELECT adv.id, adv.title, adv.description, adv.view_slug, adv.updated_at, cat.title, cat.icon, cat.image, cover_url
			FROM adventure adv
			INNER JOIN adventure_category cat ON adv.category_id = cat.id
			INNER JOIN adventure_list_item advitem ON adv.id = advitem.adventure_id
			INNER JOIN adventure_list advlist ON advlist.id = advitem.list_id
			WHERE advlist.title = ?
			ORDER BY advitem.ordinal ASC`,
		list)

	if err != nil {
		return nil, err
	}

	defer rows.Close()

	adventures := []models.Adventure{}

	for rows.Next() {
		a := models.Adventure{}
		var description sql.NullString
		var updatedAt mysql.NullTime
		var categoryImage sql.NullString
		var coverUrl sql.NullString

		if err := rows.Scan(
			&a.ID,
			&a.Title,
			&description,
			&a.ViewSlug,
			&updatedAt,
			&a.Category.Title,
			&a.Category.Icon,
			&categoryImage,
			&coverUrl); err != nil {
			return nil, err
		}
		if description.Valid {
			a.Description = description.String
		}
		if updatedAt.Valid {
			a.UpdatedAt = updatedAt.Time
		}
		if categoryImage.Valid {
			a.Category.Image = categoryImage.String
		}
		if coverUrl.Valid {
			a.CoverUrl = coverUrl.String
		}

		adventures = append(adventures, a)
	}

	return adventures, nil
}


// getAdventureContent retrieves all related entities to adventure
func (s *SQLStore) getAdventureContent(adventureID int64) ([]models.Node, []models.Link, []models.User, error) {

	nodes, err := s.GetNodesByAdventureID(adventureID)
	if err != nil && err != sql.ErrNoRows {
		fmt.Println("Could not get nodes by adventure ID", adventureID)
		return nil, nil, nil, err
	}

	links, err := s.GetLinksByAdventureID(adventureID)
	if err != nil && err != sql.ErrNoRows {
		fmt.Println("Could not get links by adventure ID", adventureID)
		return nil, nil, nil, err
	}

	users, err := s.GetUsersByAdventureID(adventureID)
	if err != nil && err != sql.ErrNoRows {
		fmt.Println("Could not get users by adventure ID", adventureID, err)
		return nil, nil, nil, err
	}

	return nodes, links, users, nil
}

func (s *SQLStore) CreateDefaultAdventure() (*models.Adventure, error) {
	adventure, err := s.CreateNewAdventure()
	if err != nil {
		return nil, err
	}
	
	newRootNode := &models.Node{
		AdventureID: adventure.ID,
		NodeID:      0,
		NodeType:    "root",
		Title:       "Start",
		Icon:        "🏠",
		Content:     "<p>Detta är starten på ditt nya PS.</p>",
		X:           345,
		Y:           100,
	}
	_, err = s.CreateNewNode(newRootNode)
	if err != nil {
		return nil, err
	}

	newLeftNode := &models.Node{
		AdventureID: adventure.ID,
		NodeID:      1,
		NodeType:    "default",
		Title:       "Vänster",
		Content:     "<p>Du har gått till vänster.</p>",
		X:           144,
		Y:           383,
	}

	_, err = s.CreateNewNode(newLeftNode)
	if err != nil {
		return nil, err
	}

	newRightNode := &models.Node{
		AdventureID: adventure.ID,
		NodeID:      2,
		NodeType:    "default",
		Title:       "Höger",
		Content:     "<p>Du har gått till höger.</p>",
		X:           546,
		Y:           383,
	}

	_, err = s.CreateNewNode(newRightNode)
	if err != nil {
		return nil, err
	}

	newLinkRootToLeft := &models.Link{
		AdventureID:  adventure.ID,
		LinkID:       0,
		SourceNodeID: 0,
		TargetNodeID: 1,
		LinkType:     "bidirectional",
	}

	_, err = s.CreateNewLink(newLinkRootToLeft)
	if err != nil {
		return nil, err
	}

	newLinkRootToRight := &models.Link{
		AdventureID:  adventure.ID,
		LinkID:       1,
		SourceNodeID: 0,
		TargetNodeID: 2,
		LinkType:     "bidirectional",
	}

	_, err = s.CreateNewLink(newLinkRootToRight)
	if err != nil {
		return nil, err
	}

	adventure.Nodes, adventure.Links, adventure.Users, err = s.getAdventureContent(adventure.ID)
	if err != nil {
		return nil, err
	}

	return adventure, nil
}

// GetAdventuresByCategory retrieves adventures by category
func (s *SQLStore) GetAdventuresByCategory(categoryID, pageSize, pageIndex int64) ([]models.Adventure, int64, error) {

	adventures := []models.Adventure{}

	adventureCount := s.countAdventuresInCategory(categoryID)
	if adventureCount == 0 {
		return adventures, 0, nil
	}

	query := `
		SELECT id, title, description, slug, view_slug, locked,	category_id, created_at, updated_at, edit_version, view_count, cover_url
		FROM adventure 
		WHERE category_id = ?
		LIMIT ?
		OFFSET ?
		`
	rows, err := s.db.Query(query, categoryID, pageSize, (pageIndex-1)*pageSize)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	adventures, err = s.scanAdventureRows(rows)
	if err != nil {
		fmt.Println("Feil ", err)
		return nil, 0, err;
	}

	return adventures, adventureCount, nil
}

func (s *SQLStore) countAdventuresInCategory(categoryID int64) int64 {
	var row *sql.Row
	if categoryID == 0 {
		query := `SELECT count(*) as adventures FROM adventure WHERE category_id IS NULL`
		row = s.db.QueryRow(query)
	} else {
		query := `SELECT count(*) as adventures FROM adventure WHERE category_id = ?`
		row = s.db.QueryRow(query, categoryID)
	}
	var adventureCount int64
	err := row.Scan(&adventureCount)
	if err != nil {
		return 0
	}
	return adventureCount
}

func (s *SQLStore) countReportedAdventures(reportReason string) int64 {
	query := `SELECT count(*) as adventures FROM adventure_report WHERE report_reason = ?`
	row := s.db.QueryRow(query, reportReason)
	var adventureCount int64
	err := row.Scan(&adventureCount)
	if err != nil {
		return 0
	}
	return adventureCount
}

// GetAdventuresBySearchString retrieves adventures by category
func (s *SQLStore) GetAdventuresBySearchString(searchString string, pageSize, pageIndex int64) ([]models.Adventure, int64, error) {

	search := fmt.Sprintf("%%%s%%", searchString)
	adventures := []models.Adventure{}

	// Get total number of adventures that match the criteria
	adventureCount := s.countAdventuresWithSearchString(search)
	if adventureCount == 0 {
		// No need to perform query...
		return adventures, 0, nil
	}

	query := `
		SELECT id, title, description, slug, view_slug, locked,	category_id, created_at, updated_at, edit_version, view_count, cover_url
		FROM adventure adv
		WHERE (adv.title LIKE ? OR adv.description LIKE ?)
		OR adv.id IN (SELECT adn.adventure_id FROM adventure_node adn WHERE adn.content LIKE ? OR adn.title LIKE ?)
		OR adv.id IN (SELECT adl.adventure_id FROM adventure_link adl WHERE adl.source_link_title LIKE ? OR adl.target_link_title LIKE ?)
		LIMIT ?
		OFFSET ?
		`
	rows, err := s.db.Query(query, search, search, search, search, search, search, pageSize, (pageIndex-1)*pageSize)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	adventures, err = s.scanAdventureRows(rows)
	if err != nil {
		return nil, 0, err;
	}

	return adventures, adventureCount, nil
}


func (s *SQLStore) countAdventuresWithSearchString(searchString string) int64 {
	if len(searchString) == 0 {
		return 0
	}

	var row *sql.Row
	query := `
			SELECT count(*) as adventures
			FROM adventure adv
			WHERE (adv.title LIKE ? OR adv.description LIKE ?)
			OR adv.id IN (SELECT adn.adventure_id FROM adventure_node adn WHERE adn.content LIKE ? OR adn.title LIKE ?)
			OR adv.id IN (SELECT adl.adventure_id FROM adventure_link adl WHERE adl.source_link_title LIKE ? OR adl.target_link_title LIKE ?)
			`

	row = s.db.QueryRow(query, searchString, searchString, searchString, searchString, searchString, searchString)
	var adventureCount int64
	err := row.Scan(&adventureCount)
	if err != nil {
		return 0
	}
	return adventureCount
}

// GetAdventureByID retrieves an adventure along with its content from the database
func (s *SQLStore) GetAdventureByID(adventureID int64) (*models.Adventure, error) {

	var query string
	var row *sql.Row

	query = "SELECT id, title, description, slug, view_slug, locked, category_id, view_count, cover_url FROM adventure WHERE id = ?"
	row = s.db.QueryRow(query, adventureID)

	var title, description sql.NullString
	var categoryID sql.NullInt64

	a := &models.Adventure{}
	err := row.Scan(&a.ID, &title, &description, &a.Slug, &a.ViewSlug, &a.Locked, &categoryID, &a.ViewCount, &a.CoverUrl)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, err
		}
		return nil, err
	}

	if title.Valid {
		a.Title = title.String
	}

	if description.Valid {
		a.Description = description.String
	}

	// Fetch category
	if categoryID.Valid {
		cat, err := s.GetCategory(categoryID.Int64)
		if err != nil {
			if err != sql.ErrNoRows {
				return nil, err
			}
		} else {
			a.Category = *cat
		}
	}

	a.Nodes, a.Links, a.Users, err = s.getAdventureContent(a.ID)
	if err != nil {
		return nil, err
	}

	return a, nil
}


func (s *SQLStore) GetAdventuresByUserID(userID int64) ([]models.Adventure, error) {	
	query := `
		SELECT id, title, description, slug, view_slug, locked,	category_id, created_at, updated_at, edit_version, view_count, cover_url
		FROM 
			adventure 
		WHERE 
			id IN (SELECT adventure_id FROM user_adventure WHERE user_id = ?)
		ORDER BY 
			id
		`
	
	rows, err := s.db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	adventures, err := s.scanAdventureRows(rows)
	if err != nil {
		return nil, err;
	}

	return adventures, nil
}

// GetAdventuresByListID retrieves adventures by category
func (s *SQLStore) GetAdventuresByListID(listID int64) ([]models.Adventure, error) {
	query := `
		SELECT id, title, description, slug, view_slug, locked,	category_id, created_at, updated_at, edit_version, view_count, cover_url
		FROM adventure a, adventure_list_item ali 
		WHERE a.id = ali.adventure_id and ali.list_id = ?
		ORDER BY ali.ordinal
		`

	rows, err := s.db.Query(query, listID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	adventures, err := s.scanAdventureRows(rows)
	if err != nil {
		return nil, err;
	}

	return adventures, nil
}

// GetAdventuresByReportReason retrieves reported adventures
func (s *SQLStore) GetAdventuresByReportReason(reportReason string, pageSize, pageIndex int64) ([]models.Adventure, int64, error) {

	adventures := []models.Adventure{}

	// Get total number of adventures
	adventureCount := s.countReportedAdventures(reportReason)
	if adventureCount == 0 {
		// No need to perform query...
		return adventures, 0, nil
	}

	query := `
		SELECT id, title, description, slug, view_slug, locked,	category_id, created_at, updated_at, edit_version, view_count, cover_url
		FROM 
			adventure 
		WHERE 
			id IN (SELECT DISTINCT adventure_id FROM adventure_report WHERE report_reason = ? ORDER BY created_at DESC)
		LIMIT ?
		OFFSET ?
		`

	rows, err := s.db.Query(query, reportReason, pageSize, (pageIndex-1)*pageSize)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	adventures, err = s.scanAdventureRows(rows)
	if err != nil {
		return nil, 0, err;
	}

	return adventures, adventureCount, nil
}


func (s *SQLStore) scanAdventureRows(rows *sql.Rows) ([]models.Adventure, error) {
	adventures := []models.Adventure{}

	for rows.Next() {
		a := models.Adventure{}

		var title, description, coverUrl sql.NullString
		var categoryID sql.NullInt64
		var createdAt, updatedAt mysql.NullTime

		if err := rows.Scan(&a.ID, &title, &description, &a.Slug, &a.ViewSlug, &a.Locked, &categoryID, &createdAt, &updatedAt, &a.EditVersion, &a.ViewCount, &coverUrl); err != nil {
			return nil, err
		}

		if title.Valid {
			a.Title = title.String
		}

		if description.Valid {
			a.Description = description.String
		}

		if createdAt.Valid {
			a.CreatedAt = createdAt.Time
		}

		if updatedAt.Valid {
			a.UpdatedAt = updatedAt.Time
		}

		if categoryID.Valid {
			a.Category.ID = categoryID.Int64
		}

		if coverUrl.Valid {
			a.CoverUrl = coverUrl.String;
		}

		adventures = append(adventures, a)
	}

	return adventures, nil
}


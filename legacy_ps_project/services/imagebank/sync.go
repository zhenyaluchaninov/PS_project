// Legacy Unsplash sync helper used by cmd/unsplash and (optionally) the server scheduler.
// Not invoked at runtime unless explicitly wired in; keep for manual/ops-driven syncs.
package imagebank

import (
	"database/sql"
	"fmt"
	"strconv"

	"github.com/jasonlvhit/gocron"

	"projektps/helpers/unsplash"
	"projektps/models"
	"projektps/store"
)

// Initialize starts the scheduler and performs sync every hour
func Initialize(store store.Store) {
	// Start asynchronous process in separate thread
	go runSynchronization(store)
}

func runSynchronization(store store.Store) {
	// Perform initial synchronization
	err := PerformSync(store)
	if err != nil {
		fmt.Println("Failed performing initial sync", err)
	}

	// Schedule task
	gocron.Every(24).Hours().Do(synchronizeTask, store)

	// Start scheduler
	<-gocron.Start()
}

func synchronizeTask(store store.Store) {
	err := PerformSync(store)
	if err != nil {
		fmt.Println("Synchronization failed:", err)
	}
}

// PerformSync conducts a one-way synchronization of images and collections from Unsplash
func PerformSync(store store.Store) error {
	// Get all collections and photos from Unsplash
	collections, err := unsplash.GetCollections()
	if err != nil {
		return fmt.Errorf("Error while retrieving collections from Unsplash: %w", err)
	}

	fmt.Printf("Synchronizing %d collections\n", len(collections))	

	// Remove obsolete categories
	err = removeObsoleteCategories(store, collections)
	if err != nil {
		return fmt.Errorf("Error while removing obsolete categories: %w", err)
	}

	// For each collection on Unsplash
	for _, collection := range collections {

		// Sync Collections & Categories
		err = syncCollectionsWithCategories(store, collection)
		if err != nil {
			return fmt.Errorf("Error while synchronizing collections with categories: %w", err)
		}

		// Remove obsolete images from local database
		err = removeObsoleteImages(store, collection)
		if err != nil {
			return fmt.Errorf("Error while removing obsolete images: %w", err)
		}

		// Sync Photos & Images in collection
		err = syncPhotosWithImages(store, collection)
		if err != nil {
			return fmt.Errorf("Error while synchronizing photos with images: %w", err)
		}
	}

	return nil
}

func syncCollectionsWithCategories(store store.Store, collection unsplash.Collection) error {
	// Check if category exists
	imgCat, err := store.GetImageCategoryByUnsplashID(collection.ID)
	if err != nil {
		if err == sql.ErrNoRows {
			// If not, create it
			id, _ := strconv.ParseInt(collection.ID, 10, 64) 

			newCat := &models.ImageCategory{
				UnsplashID: id,
				Title:      collection.Title,
				Active:     len(collection.Photos) > 0,
			}

			newCat, err = store.CreateNewImageCategory(newCat)
			if err != nil {
				return fmt.Errorf("Error while creating category: %w", err)
			}
		}

	} else {
		// If it does, update it
		imgCat.Title = collection.Title
		imgCat.Active = len(collection.Photos) > 0

		err = store.UpdateImageCategory(imgCat)
		if err != nil {
			return fmt.Errorf("Error while updating category: %w", err)
		}
	}

	return nil
}

func removeObsoleteCategories(store store.Store, collections []unsplash.Collection) error {
	// For each category in local collection
	categories, err := store.GetImageCategories(true)
	if err != nil {
		return fmt.Errorf("Error while fetching image categories: %w", err)
	}

	for _, category := range categories {
		// Check if category exists in source collection (from Unsplash)
		doesExist := false
		for _, collection := range collections {
			id, _ := strconv.ParseInt(collection.ID, 10, 64)
			if id == category.UnsplashID {
				doesExist = true
				break
			}
		}

		if !doesExist {
			// If it does not, delete it
			fmt.Println("Removing obsolete category", category.Title)
			err = store.DeleteImageCategory(category)
			if err != nil {
				return fmt.Errorf("Error while removing category: %w", err)
			}
		}
	}

	return nil
}

func syncPhotosWithImages(store store.Store, collection unsplash.Collection) error {

	// Check if category exists
	category, err := store.GetImageCategoryByUnsplashID(collection.ID)
	if err != nil {
		return fmt.Errorf("Error while retrieving category: %w", err)
	}

	for _, photo := range collection.Photos {
		// Check if photo exists
		img, err := store.GetImageByUnsplashID(photo.ID)
		if err != nil {
			if err == sql.ErrNoRows {
				fmt.Println("+ Adding new image")
				// If it does not, create image
				newImg := &models.Image{
					UnsplashID:  photo.ID,
					Active:      true,
					CategoryID:  category.ID,
					AuthorName:  fmt.Sprintf("%v %v", photo.User.FirstName, photo.User.LastName),
					AuthorURL:   photo.User.Links.HTML,
					FullURL:     photo.Urls.Regular,
					DownloadURL: photo.Links.DownloadLocation,
					ThumbURL:    photo.Urls.Thumb,
				}

				img, err = store.CreateNewImage(newImg)
				if err != nil {
					return fmt.Errorf("Error while creating image: %w", err)
				}
			} else {
				return fmt.Errorf("Error while retrieving image: %w", err)
			}
		} else {
			// If it does, update it
			img.CategoryID = category.ID
			img.AuthorName = fmt.Sprintf("%v %v", photo.User.FirstName, photo.User.LastName)
			img.AuthorURL = photo.User.Links.HTML
			img.FullURL = photo.Urls.Regular
			img.DownloadURL = photo.Links.DownloadLocation
			img.ThumbURL = photo.Urls.Thumb
			err = store.UpdateImage(img)
			if err != nil {
				return fmt.Errorf("Error while updating image: %w", err)
			}
		}
	}

	return nil
}

func removeObsoleteImages(store store.Store, collection unsplash.Collection) error {

	// Get local category
	category, err := store.GetImageCategoryByUnsplashID(collection.ID)
	if err != nil {
		return fmt.Errorf("Error while retrieving category: %w", err)
	}

	// Get images in category
	images, err := store.GetImagesByCategory(category.ID)
	if err != nil {
		return fmt.Errorf("Error while fetching image categories: %w", err)
	}

	for _, image := range images {
		// Check if category exists in source collection (from Unsplash)
		doesExist := false
		for _, photo := range collection.Photos {
			if photo.ID == image.UnsplashID {
				doesExist = true
			}
		}

		if !doesExist {
			// If it does not, delete it
			fmt.Println("Removing obsolete image", image.UnsplashID)
			err = store.DeleteImage(image)
			if err != nil {
				return fmt.Errorf("Error while removing image: %w", err)
			}
		}
	}

	return nil
}

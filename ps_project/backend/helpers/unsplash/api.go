package unsplash

import (
	"encoding/json"
	"errors"
	"fmt"
	"io/ioutil"
	"net/http"
)

const CollectionsEndpoint string = "https://api.unsplash.com/users/textaventyr/collections"
const PhotosEndpoint string = "https://api.unsplash.com/collections/%d/photos?per_page=%d"

const AccessKey string = "GEg-7srAN83qGdA_ocDjdmGyM7PswrqaIzFRvWF-utQ"
const SecretKey string = "FX5CMxjQJHRrpruVu90IeO2HlCF-PbWLnTsuS3swV0s"
const AccessCode string = "-RHlXlezUNwXqWaTcw9zuDQQWxrF0qP79TwJXS2FXoQ"
const AccessToken string = "btrarq5KBcTj1a_7D2D8QpahUgWU2vNPGfhtU4tFGYE"
const ImagesPerPage int = 50

const RateLimitExceeded = "Rate Limit Exceeded"

var ErrRateLimitExceeded = errors.New(RateLimitExceeded)

func DownloadImage(downloadURL string) error {
	// Create and perform request
	bearer := fmt.Sprintf("Bearer %v", AccessToken)
	req, err := http.NewRequest("GET", downloadURL, nil)
	req.Header.Add("Authorization", bearer)
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	// Read result from request
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return err
	}

	bodyString := string(body)
	fmt.Println(bodyString)

	return nil
}

// GetCollectionsFromUnsplash retrieves all collections and photos from Unsplash
// and deserializes them into a ImageCategory-collection
func GetCollections() ([]Collection, error) {

	// Create and perform request
	bearer := fmt.Sprintf("Bearer %v", AccessToken)
	req, err := http.NewRequest("GET", CollectionsEndpoint, nil)
	req.Header.Add("Authorization", bearer)
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	// Read result from request
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}


	// Deserialize payload
	var payloadCollection []Collection
	err = json.Unmarshal([]byte(body), &payloadCollection)
	if err != nil { 
		// Handle exceeded request-limit gracefully
		bodyString := string(body)
		if bodyString == RateLimitExceeded {
			return nil, ErrRateLimitExceeded
		}

		// Pass other errors
		return nil, fmt.Errorf("Error while deserializing collections payload: %w", err)
	}

	// Resulting output container
	result := []Collection{}

	// Iterate over deserialized payload
	for _, col := range payloadCollection {

		// Create copy of struct
		collection := col
		photos, err := getPhotosInCollection(collection.ID)
		if err != nil {
			return nil, err
		}

		// Decorate with photos in collection
		collection.Photos = photos

		// Aggregate
		result = append(result, collection)

		// TODO: Remove this, its a temporary restriction in order to not exceed api-limits
		// if idx == 1 {
		// 	break
		// }
	}

	return result, nil
}

// getPhotosInCollection retrieves all Photos in a Unsplash collection and
// deserializes them into an array of 'Image'-objects
func getPhotosInCollection(collectionID string) ([]Photo, error) {
	// Create and perform request
	url := fmt.Sprint(PhotosEndpoint, collectionID, ImagesPerPage)
	bearer := fmt.Sprintf("Bearer %v", AccessToken)
	req, err := http.NewRequest("GET", url, nil)
	req.Header.Add("Authorization", bearer)
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("Error while performing photos request: %w", err)
	}
	defer resp.Body.Close()

	// Read payload
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	// Deserialize payload
	var photos []Photo
	err = json.Unmarshal([]byte(body), &photos)
	if err != nil {
		// Handle exceeded request-limit gracefully
		bodyString := string(body)
		if bodyString == RateLimitExceeded {
			return nil, ErrRateLimitExceeded
		}

		// Pass other errors
		return nil, fmt.Errorf("Error while deserializing photos payload: %w", err)
	}

	return photos, nil
}

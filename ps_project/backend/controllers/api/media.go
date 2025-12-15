package api

import (
	"fmt"
	"net/http"
	"strconv"
    "io/ioutil"
	"strings"
	"database/sql"
	"os"
    "path/filepath"

	"github.com/gorilla/mux"
	"projektps/helpers/unsplash"
	"projektps/models"
)

type Image struct {
    Url       string    `json:"url"`
}


func (a *API) DeleteMediaFolder(slug string) {
	os.RemoveAll(a.systemPath + a.uploadDir + slug);
}

func (a *API) CopyAdventureMedia(srcSlug string, destSlug string) error {
	path := a.systemPath + a.uploadDir

	source := path + srcSlug
	destination := path + destSlug

	os.Mkdir(destination, 0755)

    var err error = filepath.Walk(source, func(path string, info os.FileInfo, err error) error {
        var relPath string = strings.Replace(filepath.ToSlash(path), source, "", 1)
        if relPath == "" {
            return nil
        }
        if info.IsDir() {
            return os.Mkdir(filepath.Join(destination, relPath), 0755)
        } else {
            var data, err1 = ioutil.ReadFile(filepath.Join(source, relPath))
            if err1 != nil {
                return err1
            }
            return ioutil.WriteFile(filepath.Join(destination, relPath), data, 0777)
        }
    })
    return err
}

// GetImagesByCategory retrieves all images in a category
func (a *API) GetImagesByCategory(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	categoryID, err := strconv.Atoi(id)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, err.Error())
		return
	}

	images, err := a.store.GetImagesByCategory(int64(categoryID))
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondWithJSON(w, http.StatusOK, images)
}

// GetImage retrieves a specific image
func (a *API) GetImage(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	imageID, err := strconv.Atoi(id)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, err.Error())
		return
	}

	image, err := a.store.GetImage(int64(imageID))
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// This is performed to meet Unsplash's tracking requirements
	go func(imageURL string) {
		err = unsplash.DownloadImage(imageURL)
		if err != nil {
			fmt.Println("Error while retrieving image", err)
		}
	}(image.DownloadURL)

	respondWithJSON(w, http.StatusOK, image)
}


func (a *API) DeleteMedia(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["adventure"]
	hash := vars["hash"]

	// Get existing adventure by editing-slug
	existingAdventure, err := a.store.GetAdventure(id, models.ReadWrite)
	if err != nil {
		if err == sql.ErrNoRows {
			respondWithError(w, http.StatusNotFound, "Adventure not found")
			return
		}
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Do not delete files that have other references
	fileCount := 0
	for _, node := range existingAdventure.Nodes {
		if strings.Contains(node.ImageURL, hash) || strings.Contains(node.Props, hash) {
			fileCount += 1
			if fileCount > 1 {
				break;
			}
		}
	}
	
	deletePath := a.systemPath + a.uploadDir + id + "/" + hash

	fmt.Println("Delete media: ", deletePath)

	// No big deal if we cant delete, probably just already deleted
	if (fileCount == 1) {
		os.Remove(deletePath)
	}

	respondWithJSON(w, http.StatusOK, map[string]string{"result": "success"})
}


// https://github.com/gustavocd/file-upload-ajax/blob/master/controllers/file.go
func (a *API) UploadMedia(w http.ResponseWriter, r *http.Request) {
	adventureId := r.FormValue("adventureId")
	file, header, err := r.FormFile("media")
	if err != nil {
		respondWithError(w, http.StatusBadRequest, err.Error())
		return
	}
	defer file.Close()

	data, err := ioutil.ReadAll(file)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "image error: "+err.Error())
		return
	}

	filename := header.Filename;

	adventureDir := a.uploadDir + adventureId + "/"
	filepath := a.systemPath + adventureDir
	returnUrl := adventureDir + filename

	fmt.Printf("Add image: %s, %s, %s\n", adventureDir, filepath, returnUrl)

	if os.MkdirAll(filepath, os.ModePerm) != nil {
		respondWithError(w, http.StatusBadRequest, "Create path failed: "+err.Error())
		return
	}

	outfile, err := os.Create(filepath+filename)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Open file failed: "+err.Error())
		return
	}

	_, err = outfile.Write(data)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Save to file failed: "+err.Error())
		return
	}

	var i Image
	i.Url = returnUrl;
	respondWithJSON(w, http.StatusOK, i)
}

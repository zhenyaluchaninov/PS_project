package api

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"io/ioutil"
	"net/http"
	"html/template"
	"os"
	"path"
	"strings"

	"github.com/gorilla/mux"
	"projektps/models"
	"projektps/controllers/web"
)

func (a *API) ImportAdventure(w http.ResponseWriter, r *http.Request) {
	fmt.Println("* Importing adventure")

	buff := bytes.NewBuffer([]byte{})
	size, err := io.Copy(buff, r.Body)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, err.Error())
		return
	}

	reader := bytes.NewReader(buff.Bytes())
	zipReader, err := zip.NewReader(reader, size)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	newAdventure, err := a.store.CreateNewAdventure()
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	var adventureFile io.ReadCloser = nil
	for _, file := range zipReader.File {
		if strings.HasSuffix(file.Name, ".json") {
			adventureFile, err = file.Open()
			break
		}
	}

	if adventureFile == nil {
		respondWithError(w, http.StatusInternalServerError, "Adventure file missing in archive.")
		return
	}

	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	var payload models.Adventure
	decoder := json.NewDecoder(adventureFile)
	if err := decoder.Decode(&payload); err != nil {
		respondWithError(w, http.StatusBadRequest, "error.adventure.payloaderror")
		return
	}

	destinationPath := a.systemPath + a.uploadDir

	err = nil
	for _, file := range zipReader.File {
		if !strings.HasPrefix(file.Name, "upload") {
			continue
		}

		if file.Mode().IsDir() {
			continue
		}

		open, err := file.Open()
		if err != nil {
			break
		}

		fileName := strings.Replace(file.Name, "upload/" + payload.Slug, newAdventure.Slug, 1)
		fileName = path.Join(destinationPath, fileName)

		os.MkdirAll(path.Dir(fileName), os.ModeDir|os.ModePerm)
		create, err := os.Create(fileName)
		if err != nil {
			break
		}
		create.ReadFrom(open)
		create.Close()
	}

	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	var nodes = payload.Nodes
	for i := range nodes {
		nodes[i].ID = 0
		nodes[i].ImageURL = strings.Replace(nodes[i].ImageURL, payload.Slug, newAdventure.Slug, 1)
		nodes[i].Props = strings.Replace(nodes[i].Props, payload.Slug, newAdventure.Slug, -1)
	}
	for i := range payload.Links {
		payload.Links[i].ID = 0
	}

	payload.CoverUrl = strings.Replace(payload.CoverUrl, payload.Slug, newAdventure.Slug, 1)
	payload.Slug = newAdventure.Slug
	payload.ID = newAdventure.ID

	err = a.store.UpdateAdventureContent(&payload)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if w != nil {
		respondWithJSON(w, http.StatusOK, payload)
	}
}


func (a *API) ExportAdventure(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	slug := vars["id"]

	zipFilePath, err := a.CreateExportZip(slug)
	if err != nil {
		fmt.Println("Zip create error: ", err.Error())
		respondWithError(w, http.StatusInternalServerError, err.Error())
	}

	w.Header().Set("Content-Type", "application/zip")
	w.WriteHeader(http.StatusOK)

	data, err := ioutil.ReadFile(zipFilePath)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
	}
	if len(data) > 100*1000*1024 {
		respondWithError(w, http.StatusInternalServerError, "Could not export. Too large filesize.")
	}

	w.Write(data)
}


func (a *API) CreateExportZip(slug string) (string, error) {
	fmt.Println("* Exporting adventure:", slug)

	// Ignore which slug was passed (read or read/write)
	adventureModel, err := a.store.GetAdventure(slug, models.Ignore)
	if err != nil {
		return "", err;
	}

	adventureJson, _ := json.Marshal(adventureModel)

	adventureFileName := "PSadventure_" + slug
	saveFilePath := a.systemPath + a.uploadDir + adventureFileName + ".zip"

	archive, err := os.Create(saveFilePath)
	if err != nil {
		return "", err;
	}
	defer archive.Close()

	zipWriter := zip.NewWriter(archive)

	writer, _ := zipWriter.Create(adventureFileName + ".json")
	writer.Write(adventureJson)

	var props models.Props
	nodes := adventureModel.Nodes
	fileMap := make(map[string]int)

	fileMap[adventureModel.CoverUrl] = 1
	for _, node := range nodes {
		fileMap[node.ImageURL] = 1
		json.Unmarshal([]byte(node.Props), &props)
		fileMap[props.AudioUrl] = 1
		fileMap[props.AudioUrlAlt] = 1
		fileMap[props.SubtitlesUrl] = 1
	}
	delete(fileMap, "")

	var adventureProps models.AdventureProps
	json.Unmarshal([]byte(adventureModel.Props), &adventureProps)
	for _, fontUrl := range adventureProps.FontList {
		fileMap[fontUrl] = 1
	}

	viewData := web.ViewData{}
	viewData.IsEditable = true
	viewData.Adventure = *adventureModel

	tmpl, err := template.New("ps_player.html").ParseFiles("web/ps_player.html", "web/fonts.html")
	if err != nil {
		return "", err;
	}

	var templateBuffer bytes.Buffer
	err = tmpl.Execute(&templateBuffer, viewData)
	if err != nil {
		return "", err;
	}
	writer, _ = zipWriter.Create("index.html")
	writer.Write(templateBuffer.Bytes())

	filesToInclude := [...]string{
		"css/ps_fonts.css", 
		"css/ps.css", 
		"favicon.ico",
		"js/aventyr.model.js",
		"js/aventyr.viewer.js",
		"js/markdown-it.min.js",
		"js/markdownhelper.js",
		"js/aventyr.player.js",
		"js/aventyr.props.js",
		"js/aventyr.scrollytell.js",
	}

	for _, fileName := range filesToInclude {
		fileMap["/web/" + fileName] = 1
	}

	for key := range fileMap {
		file, err := os.Open(a.systemPath + key)
		if err != nil {
			fmt.Println("Missing: " + key)
			continue
		}

		name := strings.Replace(key, "/upload/", "upload/", 1)
		name = strings.Replace(name, "/web/css/", "static/css/", 1)
		name = strings.Replace(name, "/web/js/", "static/js/", 1)
		name = strings.Replace(name, "/web/", "static/", 1)

		fmt.Println("  Added: " + name)
		
		zipEntry, err := zipWriter.Create(name)
		if err != nil {
			return "", err;
		}
		io.Copy(zipEntry, file)
	}

	zipWriter.Close()

	return saveFilePath, nil
}



package web

import (
	"fmt"
	"html/template"
	"net/http"

	"projektps/models"
	"projektps/store"
)

type Web struct {
	store     store.Store
	templates *template.Template
	version   string
	environment string
	templateDirectory string
}

// ViewData is used to pass data to templates
type ViewData struct {
	Title      string
	Adventures []models.Adventure
	Adventure  models.Adventure
	Lists      []models.List
	IsEditable bool
	IsRoot     bool
	Host       string
	Version    string
}

func NewWebController(store *store.Store, version string, path string, environment string) *Web {
	return &Web{
		store:     *store,
		templates: getTemplatesFromDirectory(path),
		version:   version,
		environment: environment,
		templateDirectory: path,
	}
}

// NotFoundHandler is the 404 page
func (web *Web) NotFoundHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Println("[404]: ", r.URL)
	viewData := ViewData{}
	viewData.Version = web.version

	// Render local 404 page instead of redirecting to removed admin UI
	w.WriteHeader(http.StatusNotFound)
	web.Process("404.html", w, viewData)
}

// HomeHandler is the home page
func (web *Web) HomeHandler(w http.ResponseWriter, r *http.Request) {

	adventures, err := web.store.GetAdventures("front")
	if err != nil {
		fmt.Println("Error while fetching front adventures", err.Error())
	}

	viewData := ViewData{}
	viewData.IsEditable = true
	viewData.Adventures = adventures
	viewData.Version = web.version

	// Get host from request
	host := GetHost(r)
	viewData.Host = host

	web.Process("index.html", w, viewData);
}

// EducatorHandler is the "pedagog"-page
func (web *Web) EducatorHandler(w http.ResponseWriter, r *http.Request) {
	viewData := ViewData{}
	viewData.Version = web.version

	web.Process("pedagog.html", w, viewData);
}

// EducatorPlanHandler is the "läroplan"-page
func (web *Web) EducatorPlanHandler(w http.ResponseWriter, r *http.Request) {
	viewData := ViewData{}
	viewData.Version = web.version

	web.Process("laroplan.html", w, viewData);
}

// EducatorContactHandler is the "kontakt"-page
func (web *Web) EducatorContactHandler(w http.ResponseWriter, r *http.Request) {
	viewData := ViewData{}
	viewData.Version = web.version

	web.Process("kontakt.html", w, viewData);
}

// HowToContactHandler is the "så funkar det"-page
func (web *Web) HowToContactHandler(w http.ResponseWriter, r *http.Request) {
	viewData := ViewData{}
	viewData.Version = web.version

	web.Process("safunkardet.html", w, viewData);
}

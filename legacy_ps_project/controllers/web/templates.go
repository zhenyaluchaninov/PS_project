package web

import (
	"fmt"
	"html/template"
	"net/http"
)

func (web *Web) Process(templateName string, w http.ResponseWriter, viewData ViewData) {
	if web.environment != "" {
		web.templates = getTemplatesFromDirectory(web.templateDirectory)
		fmt.Println("Reloading templates.")
	}
	tmpl := web.templates.Lookup(templateName)
	tmpl.Execute(w, viewData)
}

func getTemplatesFromDirectory(templateDirectory string) *template.Template {
	templates := template.Must(template.ParseGlob(templateDirectory + "*.html"))
	return templates
}

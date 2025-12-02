package router

import (
	"fmt"
	"net/http"

	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	"projektps/controllers/api"
	// "projektps/controllers/socket"
	"projektps/controllers/web"
	"projektps/helpers/jwt"
	"projektps/store"
)

// Router encapsulates an instance of the gorilla mux router in the Handler instance
type Router struct {
	Handler http.Handler
}

// NewRouter creates and returns a router with all handlers hooked up and ready to serve
func NewRouter(store store.Store, version string, imgurbearer string, environment string) *Router {

	// Create controllers with reference to storage
	// Controllers contain handlers for web, api & sockets
	web := web.NewWebController(&store, version, "./web/", environment)
	api := api.NewAPIController(&store, version, "/upload/")
	// socket := socket.NewSocketServer(&store, version)

	// Create the router
	router := mux.NewRouter()
	router.Use(CacheControlMiddleware)

	router.NotFoundHandler = http.HandlerFunc(web.NotFoundHandler)

	// Hook up web routes
	router.HandleFunc("/spela/{id:[A-Z,a-z,0-9]+}/qr", web.PlayerQRHandler).Methods("GET")
	router.HandleFunc("/engagera/{id:[A-Z,a-z,0-9]+}", web.PlayerHandler).Methods("GET")
	router.HandleFunc("/testa/{id:[A-Z,a-z,0-9]+}", web.PlayerHandlerPreview).Methods("GET")
	router.HandleFunc("/redigera/{id:[A-Z,a-z,0-9]+}", web.EditorHandler).Methods("GET")

	// Hook up websocket upgrade route
	// router.HandleFunc("/ws", socket.WebsocketHandler).Methods("GET")

	// Create API subrouter
	apirouter := router.PathPrefix("/api").Subrouter()
	apirouter.Use(CacheControlMiddleware)
	apirouter.HandleFunc("/adventure/{id:[A-Z,a-z,0-9,_,-]+}", api.GetAdventure).Methods("GET")
	apirouter.HandleFunc("/auth", api.Authenticate).Methods("POST")
	apirouter.HandleFunc("/statistics/{id:[A-Z,a-z,0-9,_,-]+}/{nodeId:[0-9]+}", api.CountNodeStatistics).Methods("GET")

	// Create secure (jwt token) API subrouter
	secureApiRouter := router.PathPrefix("/api").Subrouter()
	secureApiRouter.Use(CacheControlMiddleware)
	secureApiRouter.Use(jwt.ControlMiddleware)
	secureApiRouter.HandleFunc("/adventure/{id:[a-z,0-9]+}/edit", api.GetAdventureForEdit).Methods("GET")
	secureApiRouter.HandleFunc("/adventure", api.CreateAdventure).Methods("POST")
	secureApiRouter.HandleFunc("/adventure/{id:[a-z,0-9]+}", api.UpdateAdventureContent).Methods("PUT")
	secureApiRouter.HandleFunc("/adventure/{id:[a-z,0-9]+}/report", api.ReportAdventure).Methods("POST")
	secureApiRouter.HandleFunc("/adventures/{id:[a-z,0-9]+}", api.GetAdventuresByList).Methods("GET")
	secureApiRouter.HandleFunc("/categories", api.GetCategories).Methods("GET")
	secureApiRouter.HandleFunc("/newAdventure", api.CreateAdventure).Methods("GET")

	// Admin API routes, protected by requiring valid JWT token in header
	adminapirouter := apirouter.PathPrefix("/admin").Subrouter()
	adminapirouter.Use(jwt.ControlMiddleware)
	adminapirouter.HandleFunc("/categories", api.GetCategories).Methods("GET")
	adminapirouter.HandleFunc("/categories", api.CreateCategory).Methods("POST")
	adminapirouter.HandleFunc("/category/{id:[0-9]+}", api.GetCategory).Methods("GET")
	adminapirouter.HandleFunc("/category/{id:[0-9]+}", api.UpdateCategory).Methods("PUT")
	adminapirouter.HandleFunc("/category/{id:[0-9]+}", api.DeleteCategory).Methods("DELETE")
	adminapirouter.HandleFunc("/adventures", api.GetAdventuresByFilter).Methods("POST")
	adminapirouter.HandleFunc("/adventure/{id:[0-9]+}", api.GetAdventureByID).Methods("GET")
	adminapirouter.HandleFunc("/adventure/{id:[0-9]+}", api.UpdateAdventureByID).Methods("PUT")
	adminapirouter.HandleFunc("/adventure/{id:[0-9]+}", api.DeleteAdventureByID).Methods("DELETE")
	adminapirouter.HandleFunc("/lists", api.GetLists).Methods("GET")
	adminapirouter.HandleFunc("/lists", api.CreateList).Methods("POST")
	adminapirouter.HandleFunc("/list/{id:[0-9]+}", api.GetList).Methods("GET")
	adminapirouter.HandleFunc("/list/{id:[0-9]+}", api.UpdateList).Methods("PUT")
	adminapirouter.HandleFunc("/users", api.GetUsers).Methods("GET")
	adminapirouter.HandleFunc("/users", api.CreateUser).Methods("POST")
	adminapirouter.HandleFunc("/user/{id:[0-9]+}", api.GetUser).Methods("GET")
	adminapirouter.HandleFunc("/user/{id:[0-9]+}", api.UpdateUser).Methods("PUT")
	adminapirouter.HandleFunc("/user/{id:[0-9]+}", api.DeleteUser).Methods("DELETE")
	adminapirouter.HandleFunc("/copy/{id:[a-z,0-9]+}", api.CopyAdventureById).Methods("PUT")
	adminapirouter.HandleFunc("/importAdventure/", api.ImportAdventure).Methods("PUT")
	adminapirouter.HandleFunc("/exportAdventure/{id:[a-z,0-9]+}", api.ExportAdventure).Methods("GET")
	adminapirouter.HandleFunc("/statistics/", api.GetNodeStatisticsById).Methods("PUT")

	imageapirouter := apirouter.PathPrefix("/images").Subrouter()
	imageapirouter.Use(CacheControlMiddleware)
	imageapirouter.HandleFunc("/{id:[0-9]+}", api.GetImage).Methods("GET")
	imageapirouter.HandleFunc("/categories", api.GetImageCategories).Methods("GET")
	imageapirouter.HandleFunc("/category/{id:[0-9]+}", api.GetImagesByCategory).Methods("GET")

	// Projekt PS image things
	apirouter.HandleFunc("/media", api.UploadMedia).Methods("POST")
	apirouter.HandleFunc("/media/{adventure:[a-z,0-9]+}/{hash:[^/]+}", api.DeleteMedia).Methods("DELETE")

	// Hook up static file server routes
	router.PathPrefix("/static/").Handler(http.StripPrefix("/static/", http.FileServer(http.Dir("./web"))))
	router.PathPrefix("/upload/").Handler(http.StripPrefix("/upload/", http.FileServer(http.Dir("./upload"))))

	// Special. Nothing to do with projektps.
	router.PathPrefix("/basta_valet/").Handler(http.StripPrefix("/basta_valet/", http.FileServer(http.Dir("./web/kortspel"))))
	router.PathPrefix("/dilemman/").Handler(http.StripPrefix("/dilemman/", http.FileServer(http.Dir("./web/kortspelDilemman"))))
	
	// Catches most of all. Has to be last of the router lines.
	router.HandleFunc("/{id:[A-Z,a-z,0-9,_,-]+}", web.PlayerHandler).Methods("GET")

	// ORIGIN_ALLOWED should be `scheme://dns[:port]`, or `*` (insecure)
	headersOk := handlers.AllowedHeaders([]string{"X-Requested-With", "Content-Type", "Accept", "Authorization"})
	originsOk := handlers.AllowedOrigins([]string{"http://localhost:3000", "http://ps-test.goteborgsregionen.se", "https://ps.goteborgsregionen.se"})
	methodsOk := handlers.AllowedMethods([]string{"GET", "HEAD", "POST", "PUT", "OPTIONS", "DELETE"})

	return &Router{Handler: handlers.CORS(originsOk, headersOk, methodsOk)(router)}
}

// CacheControlMiddleware prevents API from caching requests
func CacheControlMiddleware(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store, no-cache, must-revalidate, post-check=0, pre-check=0")
		h.ServeHTTP(w, r)
	})
}

// CORSControlMiddleware handles CORS
func CORSControlMiddleware(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fmt.Println("Origin - ", r.Header.Get("Origin"))
		h.ServeHTTP(w, r)
	})
}

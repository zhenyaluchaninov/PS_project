
**Projekt PS – Architecture Baseline**

**Contents:**  
1. [High-Level Overview](#1-high-level-overview)  
2. [Project Structure: Repository Map](#2-project-structure-repository-map)  
2.1 [Top-level Directories](#21-top-level-directories)  
2.2 [Directory-by-directory Breakdown](#22-directory-by-directory-breakdown)  
3. [Runtime & Request Architecture](#3-runtime-request-architecture)  
4. [Data Model & Database Structure](#4-data-model-database-structure)  
5. [Key Data Flows & Behaviors](#5-key-data-flows-behaviors)  
6. [Legacy Issues & Risks (Current State Only)](#6-legacy-issues-risks-current-state-only)  
7. [“Migration Reference Checklist” (What Must Be Preserved)](#7-migration-reference-checklist-what-must-be-preserved)

---

### 1. High-Level Overview

**Domain & Purpose**

Projekt PS (“Textäventyr”) is a web platform for creating and playing interactive text adventures (branching “choose‑your‑own‑adventure” stories). It is used mainly by educators and students.

- **Editors** (authors) create and maintain adventures.  
- **Players** play published adventures via a public web interface.  
- **Admins** manage users, adventures, categories, and curated lists.

Authors build stories using a browser‑based **graph editor**: nodes represent scenes, links represent choices. Players see a linear experience where each node’s text and choices are presented in sequence. The platform and content are primarily in Swedish.

**Main Functional Areas**

- **Editor module (story creation)**  
  - Graph UI to add, move, and delete nodes and links.  
  - Autosave and local browser backup to avoid data loss.  
  - Node content with text, media (images, audio), and rich text.  
  - Adventure‑level metadata (title, description, category, lists, fonts, menu options).  
  - Preview of an adventure before sharing.

- **Player module (story playback)**  
  - Loads an adventure by public view slug and renders a node‑by‑node story.  
  - Shows node content, image, and available choices (links).  
  - Tracks basic statistics (total views and node visits).  
  - Public adventures are accessible without login via URL/QR code.

- **Admin / management**  
  - Manage users and roles.  
  - Manage adventure categories.  
  - Manage curated lists (front page and archive groupings).  
  - Manage reported adventures.  
  - Historically there was an admin UI; currently most functionality is exposed via APIs.

**Technology Stack**

- **Backend**
  - Language: Go 1.x.  
  - HTTP: Go standard `net/http` with Gorilla Mux for routing.  
  - HTML rendering: Go `html/template`, templates under `web/`.  
  - Persistence: MySQL/MariaDB (see Section 4).  
  - Configuration: environment variables and config file (includes DB DSN, JWT secret, Unsplash token, Imgur token, upload paths, etc.).  
  - Docker support for local and production deployments.

- **Frontend**
  - Classic HTML/JS/CSS, no modern framework.  
  - Uses vanilla JS, jQuery and Bootstrap 4 for layout and components.  
  - Custom JS modules (e.g. `aventyr.model.js`, `aventyr.storage.js`, `aventyr.editor.js`, `aventyr.app.js`, `aventyr.graph.js`) implement the editor, graph, and player logic.  
  - Rich text is handled with a Markdown editor and/or TinyMCE (`web/tinymce/`).

- **Media / Integrations**
  - Uploaded media stored under `/upload/{slug}/…` on the server.  
  - Unsplash integration for curated image collections (synced to local DB tables `image_category` and `image`).  
  - Imgur token present in config for legacy image upload support (usage is minimal/legacy).

**Database & State**

- Main tables: `adventure`, `adventure_node`, `adventure_link`, `users`, `user_adventure`, `adventure_category`, `adventure_list`, `adventure_list_item`, `image_category`, `image`, `adventure_report`, `adventure_log`.  
- Most application state lives in the database; the server reads from DB on each request and writes on each save. No application‑level cache for adventures.  
- The editor keeps temporary state in the browser:
  - Local copy of adventure JSON in `localStorage` per adventure slug.  
  - Autosave buffers unsynced changes before sending PUT to the API.

**Deployment & Runtime**

- Dockerfile and `docker-compose` are provided for running the app (web + DB).  
- The Go server serves:
  - HTML/JS/CSS from `./web`.  
  - Uploaded media from `./upload`.  
  - JSON APIs under `/api` and `/api/admin`.  
- Configuration is loaded at startup (DB connection, JWT secret, Unsplash token, upload directory, etc.).  
- Unsplash synchronization is triggered from backend helper code to keep `image_category` and `image` in sync with remote collections.

---

### 2. Project Structure: Repository Map

This section summarizes important directories and files. Descriptions are limited to responsibilities; detailed flows are in Sections 3 and 5.

#### 2.1 Top-level Directories

- `/cmd/` – Binary entrypoints (main server, CLI tools).  
- `/controllers/` – HTTP handlers for HTML pages and APIs.  
- `/models/` – Go structs mapping to DB tables and JSON payloads.  
- `/store/` – Data access layer (SQL queries and persistence logic).  
- `/helpers/` – Shared utilities (JWT, routing, Unsplash, logging, etc.).  
- `/web/` – Front‑end assets: templates, JS, CSS, images, TinyMCE.  
- `/migrations/` – SQL or Go migrations for schema changes.  
- `/config/` or config files in root – Application configuration.  
- `/upload/` – Uploaded media files (runtime data, not versioned).  
- Build/ops files (root): `Dockerfile`, `docker-compose.yml`, `Makefile`, README, etc.

#### 2.2 Directory-by-directory Breakdown

**/cmd/**

- `/cmd/textaventyr/main.go`  
  - Main application entrypoint.  
  - Loads configuration, opens DB connection, constructs the application `App` struct, wires routes and middlewares, and starts the HTTP server.  
  - Registers static asset handlers and template environment.

- Possible small CLIs (e.g. JWT helper)  
  - Helpers to create users or generate JWT tokens from the command line.

**/controllers/**

- `/controllers/home.go` (and similar)  
  - HTML page handlers (home page, archive, editor, player, login).  
  - Renders Go templates with data from `store`.

- `/controllers/api/adventure.go`  
  - JSON API for adventures:  
    - `GET /api/adventure/{viewSlug}` – load adventure for player.  
    - `GET /api/adventure/{slug}/edit` – load adventure for editor (nodes, links, metadata).  
    - `PUT /api/adventure/{slug}` – save adventure updates (nodes/links/content).  
    - `GET /api/newAdventure` – create default adventure skeleton.  
    - `POST /api/adventure/{slug}/report` – submit a report on an adventure.  
  - Implements concurrency checks via `edit_version` and permission checks (ReadOnly vs ReadWrite) with `models.Adventure.Permission`.

- `/controllers/api/auth.go`  
  - `POST /api/login` – authenticate user, verify password, issue JWT.  
  - Reads `users` table and signs JWT with configured secret.

- `/controllers/api/media.go`  
  - `POST /api/media` – upload media (image/audio) linked to an adventure by slug.  
  - `DELETE /api/media/{slug}/{filename}` – delete uploaded file for a given adventure.  
  - Stores files under configured upload path.

- `/controllers/api/images.go`  
  - `GET /api/images/categories` – list image categories (from `image_category`).  
  - `GET /api/images/category/{id}` – list images in a category (from `image`).  
  - `GET /api/images/{id}` – fetch image metadata and trigger Unsplash download count.

- `/controllers/api/categories.go`  
  - `GET /api/categories` – list adventure categories.  
  - Admin endpoints to create/update/delete categories.

- `/controllers/api/lists.go`  
  - `GET /api/admin/lists` – list all adventure lists (front page, archive, etc.).  
  - `GET /api/admin/list/{id}` – retrieve a specific list with adventures.  
  - `POST /api/admin/lists` – create list.  
  - `PUT /api/admin/list/{id}` – update list and its adventure membership.  
  - `DELETE /api/admin/list/{id}` – delete list.

- `/controllers/api/statistics.go`  
  - `GET /api/statistics/{viewSlug}/{nodeId}` – increment node visit count in `adventure_log` and `adventure.view_count`.

- `/controllers/admin/*.go`  
  - Admin‑oriented HTML or JSON endpoints for managing adventures, reports, and possibly users.

**/models/**

Each model mirrors DB tables and JSON structures:

- `Adventure`  
  - Fields: `ID`, `Slug`, `ViewSlug`, `Title`, `Description`, `Locked`, `Category`, `CoverUrl`, `Nodes []Node`, `Links []Link`, `Users []User`, `Props` (JSON string), `EditVersion`, `ViewCount`, timestamps, and internal `Permission`.  

- `Node`  
  - Fields: `ID`, `AdventureID`, `NodeID` (per‑adventure node identifier), `Title`, `Content`, `X`, `Y`, `Icon`, `ImageURL`, `ImageLayoutType`, `ImageID` (legacy), `NodeType`, `Props` (JSON, audio/subtitles), timestamps.  

- `Link`  
  - Fields: `ID`, `AdventureID`, `LinkID`, `SourceNodeID`, `TargetNodeID`, `SourceLinkTitle`, `TargetLinkTitle`, `LinkType`, `Props` (JSON), `UpdatedAt`.  

- `User`  
  - Fields: `ID`, `Username`, `Password` (hashed), `Name`, `Role`, timestamps, `Adventures []Adventure`.  
  - `UserAdventure` join struct for `user_adventure` table.

- `Category`  
  - Maps to `adventure_category` table (`ID`, `Title`, `Description`, `Icon`, `Image`, `SortOrder`, timestamps).

- `List`  
  - Maps to `adventure_list` (`ID`, `Title`, `Description`, `ParentID`, `Adventures []Adventure`, timestamps).

- `ImageCategory` / `Image`  
  - `ImageCategory`: `ID`, `Title`, `Active`, `UnsplashID`, `Images []Image`.  
  - `Image`: `ID`, `CategoryID`, `UnsplashID`, `Active`, `Title`, `AuthorName`, `AuthorURL`, `FullURL`, `DownloadURL`, `ThumbURL`.

- `AdventureReport`, `AdventureLog`  
  - `AdventureReport`: user reports tied to `adventure_id`.  
  - `AdventureLog`: per‑node visit logs (adventure_id + node_id + timestamp).

**/store/**

- Implements the data access layer for all models.  
- Typical responsibilities:
  - Open DB connection and manage transactions.  
  - CRUD helpers for adventures, nodes, links, users, categories, lists, images, reports, logs.  
  - Composite operations (e.g., load an adventure with its nodes, links, authors, lists).  
  - Implementation of `GetAdventure`, `GetAdventureByViewSlug`, `GetAdventureForEdit`, `UpdateAdventureContent`, `IncrementViewCount`, `InsertNode`, `InsertLink`, `DeleteNodesAndLinks`, etc.  
- SQL is written directly inside store functions; multiple helpers share query fragments.

**/helpers/**

- `helpers/router` or similar  
  - Wraps Gorilla Mux initialization and route grouping (public, API, secure API, admin).  
  - Registers middlewares (logging, CORS, JWT).

- `helpers/jwt/*.go`  
  - JWT creation and verification.  
  - CLI utility for issuing tokens for testing.  

- `helpers/unsplash/*.go`  
  - Unsplash API integration:  
    - Fetch collections from a configured Unsplash user.  
    - Sync collections into `image_category`.  
    - Sync photos into `image`.  
    - Mark obsolete images inactive or delete them.  
  - Uses an access token configured in the app.

- Other helpers  
  - Small shared utilities (error handling, logging wrappers, HTTP helpers).

**/web/**

- `/web/templates/*.html`  
  - `index.html` / home page.  
  - Player view (play adventure).  
  - Editor view (graph editor, node editor, media gallery).  
  - Login, error pages, and admin pages.

- `/web/js/`  
  - `aventyr.app.js` – ties together Model, Editor, Graph and storage; controller‑style glue.  
  - `aventyr.model.js` – in‑browser representation of adventure (nodes and links) and change tracking.  
  - `aventyr.storage.js` – localStorage caching and REST API calls.  
  - `aventyr.editor.js` – right‑hand editor panel logic (title, description, node content, media, categories).  
  - `aventyr.graph.js` – graph visualization and node/link interactions.  
  - `viewer.js` (or similar) – runs the player view.  
  - Auth JS and small helpers.

- `/web/css/`  
  - Bootstrap 4 theme and custom styles for editor and player.

- `/web/tinymce/`  
  - TinyMCE assets for rich text editing.

**/migrations/**

- Database migrations for creating and updating tables and indexes.  
- Notable changes include addition of `edit_version`, `view_count`, adjustments to media/image columns, and Unsplash‑related tables.

**/upload/**

- Runtime directory for uploaded media files per adventure slug.  
- Served as static files by the Go server.

---

### 3. Runtime & Request Architecture

This section focuses on entrypoints, routing, and how controller/store layers work together. Detailed behavior flows are in Section 5.

**Application Entry & Setup**

- `main.go` (under `/cmd/`) performs:
  - Read config (DB DSN, ports, secrets, Unsplash token, upload path, etc.).  
  - Open DB connection and initialize `store`.  
  - Initialize `App` struct (logger, templates, router, static file handlers, Unsplash client).  
  - Register routes and middlewares.  
  - Start HTTP server on configured port.

**Routing Structure**

- Uses Gorilla Mux with grouped routers:

  - **Public HTML routes**
    - `/` – home page showing lists of adventures.  
    - `/spela/{viewSlug}` – player page for a published adventure.  
    - `/redigera/{slug}` – editor page for an adventure (HTML only; data via API).  
    - `/logga-in` and `/logga-ut` – login/logout views.  
    - Archive and other navigation pages.

  - **Public API (no JWT required)**
    - `GET /api/adventure/{viewSlug}` – load adventure (nodes, links, metadata) for playing.  
    - `GET /api/statistics/{viewSlug}/{nodeId}` – record node visit statistics.  
    - `GET /api/images/categories`, `GET /api/images/category/{id}`, `GET /api/images/{id}` – Unsplash‑backed image browsing.  
    - Reporting endpoint for adventures is authenticated or semi‑public depending on implementation.

  - **Authenticated API (JWT required)**
    - `POST /api/login` – obtain JWT.  
    - `GET /api/adventure/{slug}/edit` – get full adventure JSON for editing.  
    - `PUT /api/adventure/{slug}` – save adventure data (includes nodes and links).  
    - `GET /api/newAdventure` – create a new default adventure.  
    - `GET /api/categories` – list categories for authoring.  
    - `POST /api/adventure/{slug}/report` – report management (if secured).  
    - Media operations (`/api/media…`) – see Section 5.3 for behavior.

  - **Admin API (JWT + role checks)**
    - `/api/admin/adventure/{id}` – admin operations on adventures by ID.  
    - `/api/admin/lists`, `/api/admin/list/{id}` – manage curated lists.  
    - `/api/admin/categories` – manage categories.  
    - Other admin endpoints for reports and user management.

- JWT middleware verifies token presence and signature for protected subrouters. Role checks are performed in controller code for some endpoints.

**Controller–Store Interaction**

- Controllers parse incoming HTTP requests, validate parameters, and call `store` functions.  
- The `store` layer:
  - Loads DB rows into model structs (`Adventure`, `Node`, `Link`, etc.).  
  - Persists updates (including node and link changes and deletions).  
  - Encapsulates SQL for reads/writes, including transactions for multi‑step updates.

- Typical pattern (adventure edit):
  - Controller reads slug and JWT, resolves adventure with `store.GetAdventureForEdit`.  
  - `store` returns `Adventure` with `Nodes` and `Links`.  
  - After user edits, controller receives JSON and calls `store.UpdateAdventureContent` or equivalent, which:
    - Applies `edit_version` concurrency check.  
    - Updates base adventure fields.  
    - Inserts/updates/deletes nodes and links based on “changed” flags in JSON.  
    - Removes orphaned links after node deletions.

**Editor vs Player Flows (Summary)**

- Editor:
  - HTML at `/redigera/{slug}` loads JS.  
  - JS fetches `/api/adventure/{slug}/edit` and stores data in `aventyr.model`.  
  - Autosave issues PUT `/api/adventure/{slug}` with the full adventure JSON.  
  - See Section 5.1 for details.

- Player:
  - HTML at `/spela/{viewSlug}` loads a minimal template.  
  - JS calls `/api/adventure/{viewSlug}` to load content and navigate between nodes client‑side.  
  - Node visits invoke `/api/statistics/{viewSlug}/{nodeId}`.  
  - See Section 5.2 for details.

For details of specific request flows (editor, player, media, auth), see Section 5.

---

### 4. Data Model & Database Structure

This section summarizes key tables, columns, and relationships. Column lists are not exhaustive but cover fields used in behavior or migration.

**4.1 Adventure & Content Tables**

- **`adventure`**
  - Core story record.  
  - Key columns:
    - `id` – primary key.  
    - `slug` – edit identifier (8‑character code).  
    - `view_slug` – public identifier used for playing.  
    - `title`, `description`.  
    - `category_id` – FK to `adventure_category`.  
    - `locked` – read‑only flag.  
    - `cover_url` – cover image URL.  
    - `props` – JSON with adventure‑level settings (e.g. fonts, menu settings).  
    - `edit_version` – integer used to detect conflicting edits.  
    - `view_count` – total non‑preview plays.  
    - `created_at`, `updated_at` – timestamps (updated via trigger or explicit updates).  
  - Relationships:
    - One‑to‑many with `adventure_node` and `adventure_link`.  
    - Many‑to‑many with `users` via `user_adventure`.  
    - Many‑to‑many with `adventure_list` via `adventure_list_item`.  
    - One‑to‑many with `adventure_report` and `adventure_log`.

- **`adventure_node`**
  - Stores story nodes for each adventure.  
  - Key columns:
    - `id` – PK.  
    - `adventure_id` – FK to `adventure`.  
    - `node_id` – node identifier within the adventure (start node usually `0`).  
    - `title` – node title.  
    - `content` – HTML or text content.  
    - `x`, `y` – graph editor coordinates.  
    - `icon` – emoji/icon for the node.  
    - `image_url` – image URL used for the node.  
    - `image_id` – legacy reference to `image`.  
    - `image_layout_type` – layout metadata (e.g. cover/full).  
    - `node_type` – e.g. `"root"` or `"default"`.  
    - `props` – JSON with node‑level extras (audio URLs, subtitles, etc.).  
    - `created_at`, `updated_at`.  
  - Links to adventure by `adventure_id`; logical relationships to links are via `node_id` (not FK).

- **`adventure_link`**
  - Stores connections between nodes within an adventure.  
  - Key columns:
    - `id` – PK.  
    - `adventure_id` – FK to `adventure`.  
    - `link_id` – link identifier within the adventure.  
    - `source_node_id` – node_id of source node (logical, not FK).  
    - `target_node_id` – node_id of target node (logical, not FK).  
    - `source_link_title` – text shown for the choice on the source node.  
    - `target_link_title` – optional title from the target perspective.  
    - `link_type` – e.g. `"default"`, `"bidirectional"`.  
    - `props` – JSON for link properties (currently minimal).  
    - `updated_at`.  
  - Relationships:
    - Belongs to an `adventure`.  
    - References nodes via `source_node_id`/`target_node_id` (no DB FK).

**4.2 Users & Permissions**

- **`users`**
  - Key columns:
    - `id` – PK.  
    - `username`.  
    - `password` – bcrypt hash.  
    - `name`.  
    - `role` – integer role (e.g. admin vs normal user).  
    - `created_at`, `updated_at`.  
  - Associated with adventures via `user_adventure`.

- **`user_adventure`**
  - Join table between `users` and `adventure`.  
  - Columns: `user_id`, `adventure_id`.  
  - Indicates which users may edit which adventures.

**4.3 Categories & Lists**

- **`adventure_category`**
  - Represents categories/genres used for adventures.  
  - Key columns:
    - `id`.  
    - `title`, `description`.  
    - `icon`, `image`.  
    - `sort_order`.  
    - `created_at`, `updated_at`.  
  - Adventures reference `category_id`.

- **`adventure_list`**
  - Represents named collections of adventures (front page, archive, etc.).  
  - Key columns:
    - `id`.  
    - `title`, `description`.  
    - `parent_id` – hierarchy of lists.  
    - `created_at` (and possibly `updated_at`).  

- **`adventure_list_item`**
  - Join table assigning adventures to lists.  
  - Key columns:
    - `id`.  
    - `list_id`.  
    - `adventure_id`.  
    - `sort_order` – order of adventures within a list.

**4.4 Media & Unsplash**

- **`image_category`**
  - Local representation of Unsplash collections.  
  - Key columns:
    - `id`.  
    - `title`.  
    - `active` – indicates whether collection has images and is usable.  
    - `unsplash_id` – external collection ID.  
    - `created_at`, `updated_at`.  

- **`image`**
  - Local image records synced from Unsplash.  
  - Key columns:
    - `id`.  
    - `category_id` – FK to `image_category`.  
    - `unsplash_id` – external image ID.  
    - `active`.  
    - `title`.  
    - `author_name`, `author_url`.  
    - `full_url`, `download_url`, `thumb_url`.  
    - `created_at`, `updated_at`.  

**4.5 Reports & Logs**

- **`adventure_report`**
  - Stores user reports on adventures (e.g. inappropriate content or issues).  
  - Key columns:
    - `id`.  
    - `adventure_id`.  
    - `message` or report text.  
    - Optional reporter contact info.  
    - `created_at`.

- **`adventure_log`**
  - Stores node visit logs for adventures.  
  - Columns:
    - `id`.  
    - `adventure_id`.  
    - `node_id`.  
    - `created_at`.  
  - Used for per‑node statistics; `view_count` aggregates per‑adventure views.

---

### 5. Key Data Flows & Behaviors

This section contains the main behavioral flows of the system. Section 3 contains a shorter runtime summary; detailed logic is described here.

#### 5.1 Editor Flow (Loading, Editing, Autosave)

**Loading an Adventure in the Editor**

- User navigates to `/redigera/{slug}` (edit URL).  
- The editor HTML and JS load; JS bootstraps `aventyr.model` and `aventyr.storage`.  
- On startup, the Model calls `storage.load(slug, edit=true)`:
  - `GET /api/adventure/{slug}/edit` returns adventure JSON, including:
    - Adventure metadata (`title`, `description`, `category`, `cover_url`, `props`, `locked`, `edit_version`, etc.).  
    - `nodes[]` and `links[]` arrays.  
    - List of authoring users.  
  - Response is stored in browser localStorage and in `currentAdventure.payload`.  
- The editor (`aventyr.editor.js`) is notified via `onChange("model","load", data)`:
  - Populates title, description, and other adventure fields.  
  - Renders existing nodes and links via the Graph module.  
  - Loads categories and lists (from separate API calls) into dropdowns.  
  - Loads cover image and other adventure‑level properties.

**Editing Adventure and Nodes**

- Adventure‑level changes (title, description, category, cover image, fonts, menu props):
  - Editor updates local model and calls `model.updateAdventure(adventureData)`.  
  - Model marks the adventure as changed and schedules autosave.

- Node edits:
  - When user edits a node’s text, image, audio, or position, Editor calls:
    - `model.updateNode(nodeData)` – sets `node.changed = true`.  
    - For new nodes, `model.addNode(parentNode)` creates a new node with a fresh `NodeID` and creates appropriate link(s).  
    - For deletions, `model.removeNode(nodeId)` removes a node and its associated links from `this.data`.
  - Each change updates the in‑memory `nodes[]` and `links[]` arrays.

- Link edits:
  - Creating a link: `model.addLink(sourceNodeID, targetNodeID, linkProps)` uses next available `LinkID` and adds the link.  
  - Updating a link (titles, direction, type) sets `link.changed = true`.  
  - Removing a link deletes it from the local array and marks the adventure changed.

**Autosave and Persistence**

- Model delegates persistence to `aventyr.storage`:
  - `storage.set(slug, payload, hasChanges=true)` stores the full adventure JSON in localStorage and sets `hasUnsyncedChanges`.  
  - A debounce timer (e.g. 250ms) is used to trigger autosave after a short idle period.

- When the autosave fires (`automaticUpdate`):
  - `storage.save(slug, payload, callback)` sends `PUT /api/adventure/{slug}` with the full JSON.  
  - On success:
    - Server updates `adventure`, `adventure_node`, `adventure_link` tables.  
    - New IDs (if any) and `edit_version` are returned.  
    - Model’s `didSave(result)` merges returned data, clears `changed` flags, and updates localStorage.  
  - On conflict (`edit_version` mismatch or external lock):
    - Server returns HTTP 423 (Locked) and may mark `Adventure.Locked`.  
    - Model notifies editor UI, which disables editing and informs user that another session has locked the story.

**Graph and Layout**

- The graph module (`aventyr.graph.js` or similar) renders nodes based on `x`, `y`, `icon`, and `node_type`.  
- When nodes are moved in the graph:
  - New coordinates are written to `node.x` / `node.y`.  
  - `model.updateNode` marks them changed; autosave persists positions.  
- Layout information is stored in `adventure_node` and should be preserved to reconstruct the same visual graph.

**Categories, Lists, and Props**

- Editor loads adventure categories via `storage.getCategories()` (`GET /api/categories`).  
- Lists that an adventure belongs to (front page or archive lists) are part of the adventure’s metadata and edited via the API.  
- Adventure `Props` JSON includes:
  - Font list (custom font filenames to load).  
  - Menu configuration (which menu items to show, default sound settings, etc.).  
- Node `Props` JSON includes:
  - `audio_url` / `audio_url_alt`.  
  - `subtitles_url`.  
  - Anything added by the existing UI for node‑level behavior.

#### 5.2 Player Flow (Loading & Navigation)

**Loading an Adventure to Play**

- Player visits `/spela/{viewSlug}`.  
- Template renders basic shell (title, initial markup).  
- JS fetches `GET /api/adventure/{viewSlug}`:
  - Returns `Adventure` JSON: `title`, `description`, `nodes[]`, `links[]`, cover image, fonts, and `props`.  
  - For player, adventure is marked `ReadOnly` via internal `Permission`.

- On first load of a non‑preview view:
  - A view is counted:
    - Either `IncrementViewCount` is called directly on `adventure.view_count`.  
    - Or the count is derived from `adventure_log`; current code uses a dedicated view count column.

**Navigating Nodes**

- The player maintains current node by `node_id`.  
- At each step:
  - Node content: text, image, and media are displayed.  
  - Available outgoing links are derived from `adventure_link` rows where `source_node_id == currentNodeID`.  
  - Clicking a choice moves to the target node ID.

- For each node reached:
  - JS issues `GET /api/statistics/{viewSlug}/{nodeId}` to log the visit in `adventure_log` and keep statistics.

**Media and Styling in Player**

- Fonts stored in `Adventure.Props` are loaded so text renders as designed.  
- Node `ImageURL` and layout type determine how node images are shown.  
- Node `Props` audio/subtitles fields are used by the player to:
  - Play audio when entering node.  
  - Show subtitles if enabled.  
- `Node.Icon` may be used in UI to visually distinguish special nodes.

#### 5.3 Media & Image Handling

**File Uploads (Adventure Media)**

- Client side:
  - Editor lets authors upload images or audio for a node or cover.  
  - Selected file is wrapped in `FormData` with adventure slug and posted via `storage.uploadMedia(formData)` to `POST /api/media`.

- Server side:
  - `POST /api/media` reads adventure slug and filename.  
  - It creates directory `./upload/{slug}/` if missing.  
  - It saves the file as provided by the client (`filepath + filename`).  
  - The response includes a URL like `/upload/{slug}/{filename}`.

- Linking to nodes:
  - Editor receives the URL and writes it into `node.ImageURL` or into node/adventure `Props` for audio/subtitles.  
  - Deletes are handled via `DELETE /api/media/{slug}/{filename}`, which removes the file from disk.

**Unsplash Library**

- Unsplash collections mapped to `image_category` and `image`:
  - Unsplash sync helper:
    - Fetches collections for a configured Unsplash user.  
    - For each collection:
      - Ensure a matching `image_category` exists (create or update).  
      - Ensure local `image` rows exist for each photo (create or update).  
      - Delete or deactivate local images that no longer appear in the remote collection.
  - API:
    - `GET /api/images/categories` – list active categories.  
    - `GET /api/images/category/{id}` – list images in a category.  
    - `GET /api/images/{id}` – fetch a single image, and trigger Unsplash download reporting.

- Editor:
  - Calls `getImageCategories` and `getImagesInCategory` via `aventyr.storage`.  
  - Renders image gallery; selecting an image writes its `FullURL` or `ThumbURL` into `node.ImageURL` or cover image.  
  - Image author attribution is stored for display.

#### 5.4 Auth & Permissions

**Authentication**

- `POST /api/login`:
  - Accepts username and password.  
  - On success:
    - Looks up user in `users` table.  
    - Verifies bcrypt hash.  
    - Issues JWT with subject and role information.  
  - Client stores JWT in `localStorage` and attaches it as `Authorization: Bearer {token}` for subsequent API calls.

**Authorization & Permissions**

- JWT middleware:
  - Validates token signature and expiry.  
  - Attaches user info to request context.

- Adventure permission model:
  - `store.GetAdventure(slug, ReadOnly|ReadWrite)` chooses between view slug and edit slug and sets `Adventure.Permission`.  
  - Editors access by `slug` (edit identifier); players by `view_slug` (public identifier).  
  - `Locked` flag in DB prevents editing even with valid slug.

- Owner vs non‑owner:
  - `user_adventure` join table defines which users may edit each adventure.  
  - Some handlers check that the requesting user is owner or admin before allowing edit.  
  - Section 6 describes places where these checks are incomplete.

**Sessions & Client State**

- No server‑side sessions; JWT is the only auth mechanism.  
- Using `localStorage` for tokens and adventure data introduces XSS exposure: any script running on the page can access tokens and cached stories.

#### 5.5 Admin & Management Flows

**Lists and Archive**

- Admin API manages `adventure_list` and `adventure_list_item`:
  - Admin creates lists (e.g. front page, archive sections, municipality/grade lists).  
  - Adventures are assigned to lists via `adventure_list_item` with `sort_order`.  
  - Home and archive pages query these lists to show adventures in correct groups.

**Reports**

- Players can report adventures (e.g. from the player UI).  
- `POST /api/adventure/{slug}/report` stores entries in `adventure_report`.  
- Admin UI or endpoints list and handle reports for moderation.

**Categories**

- Admin endpoints manage `adventure_category`:  
  - Create/edit titles, icons, descriptions, and sort order.  
  - Editor uses these categories to populate adventure category dropdowns.

---

### 6. Legacy Issues & Risks (Current State Only)

This section lists main issues and risks in the existing system, with short, factual descriptions. It describes current behavior; it is not a change proposal.

**6.1 Data Integrity & Concurrency**

- Links reference nodes via `source_node_id` and `target_node_id` (logical IDs), not foreign keys to `adventure_node.id`. This makes referential integrity dependent on application code and can lead to orphaned links if node deletion code misses a path.  
- `edit_version` is used for optimistic locking. If not correctly checked in all update paths, conflicting edits could overwrite each other or cause confusing lock errors.  
- There is no separate draft vs published copy of an adventure; the same record is edited and served to players. Every autosave changes the version seen by players.

**6.2 Security: Auth & Roles**

- JWT tokens are stored in `localStorage`, so any XSS on editor/player pages could expose tokens. There is no HTTP‑only cookie variant.  
- Some admin API endpoints rely only on “has a valid JWT” and do not consistently enforce that the user is an admin or owner. In particular, admin adventure endpoints and some list/category endpoints do not reliably check `user.Role` or ownership before performing operations.  
- The editor HTML route `/redigera/{slug}` is not strictly guarded by auth; unauthorized users can load the editor shell but will fail API calls because they lack a token.

**6.3 Media Handling**

- `POST /api/media` and `DELETE /api/media/{slug}/{file}` do not enforce authentication/authorization at the HTTP level; they rely on slug secrecy. If an edit slug is known, an unauthenticated caller can upload or delete media for that adventure.  
- Filenames provided by the client are written directly under `./upload/{slug}/` without normalization. Crafted filenames (e.g. with `../`) could potentially lead to path traversal outside the upload directory, depending on server working directory and OS path resolution.  
- All uploaded files are served from `/upload` without access control; if an author uploads anything sensitive, it becomes publicly accessible.

**6.4 Outdated/Legacy Technology**

- Go version and third‑party libraries (Gorilla Mux, jQuery, Bootstrap, markdown-it, Toastify, TinyMCE) are older, with potential known vulnerabilities.  
- Build badges and CI references in the README are outdated; there is no clear sign of actively maintained CI pipelines.

**6.5 Testing & Maintainability**

- Very few or no Go tests (`*_test.go`) are present. Behavior is unverified by automated tests.  
- SQL is spread across many store functions with duplicated patterns and manual string composition, making it harder to maintain and reason about data integrity.  
- Some domain logic (e.g. “only update changed nodes/links”, cleaning up orphaned links, counting views) is embedded directly in controller/store code without centralized documentation or tests.

**6.6 Publishing & User Experience**

- No explicit publish workflow: any saved change, including autosaves, is immediately live for players using the view URL.  
- Concurrent editing detection is limited to `edit_version` and a lock flag. The first editor to open gets control; a second editor receives “locked” only when trying to save; there is no early warning before editing.

---

### 7. “Migration Reference Checklist” (What Must Be Preserved)

This section lists behaviors and data that must be preserved by any future migration. It is a checklist of current semantics, not a recommendation of how to implement them.

Each bullet keeps one rule plus a short pointer.

**7.1 Adventure Identity & Access**

- Preserve both `slug` (edit identifier) and `view_slug` (public play identifier) semantics; keep mapping from edit URLs (`/redigera/{slug}`) and play URLs (`/spela/{viewSlug}`) to the same logical adventure (`adventure.slug`, `adventure.view_slug`).  
- Preserve uniqueness of slugs and view slugs and ensure that any existing external links or QR codes continue to reach the same adventure.  
- Preserve access rules: only assigned authors (via `user_adventure`) and admins may edit; players access via `view_slug` without login for public adventures.

**7.2 Adventure Content Structure**

- Preserve all adventures in `adventure` with their `title`, `description`, `category_id`, `cover_url`, `locked`, `props`, `edit_version`, `view_count`, and timestamps.  
- Preserve the full node graph per adventure:
  - All entries in `adventure_node` with `node_id`, `title`, `content`, `x`, `y`, `icon`, `image_url`, `image_layout_type`, `node_type`, and `props`.  
  - All entries in `adventure_link` with `link_id`, `source_node_id`, `target_node_id`, `source_link_title`, `target_link_title`, `link_type`, and `props`.  
- Preserve graph semantics: from any starting node (usually `node_id = 0`), traversing links must produce the same narrative and choices as before.

**7.3 Node Layout & Visual Cues**

- Preserve node positions (`x`, `y`) so the editor graph layout remains the same for authors after migration.  
- Preserve `Node.Icon` values so icons (e.g. for start or special nodes) appear identically in any new editor/player that supports icons.  
- Preserve `image_url` and `image_layout_type` for nodes to maintain how images are displayed in stories.

**7.4 Adventure & Node Props**

- Preserve `Adventure.Props` JSON contents:
  - Font lists and any configuration for custom fonts.  
  - Menu button configuration (which buttons appear, home node, sound settings, etc.).  
- Preserve `Node.Props` JSON contents:
  - `audio_url`, `audio_url_alt`, `subtitles_url`, and any other node‑level behavior encoded there.  
- Preserve `Link.Props` (even if currently unused) so any future logic tied to it can be reconstructed.

**7.5 Users, Roles & Permissions**

- Preserve all `users` with `username`, `name`, hashed `password`, `role`, and timestamps.  
- Preserve `user_adventure` mappings:
  - Which users can edit which adventures.  
  - Any implicit permissions derived from these mappings.  
- Preserve admin users and the distinction between admin and non‑admin roles as encoded in `role`.

**7.6 Categories & Lists**

- Preserve all entries in `adventure_category` (title, description, icon, image, sort order) and their IDs, since adventures reference `category_id`.  
- Preserve all entries in `adventure_list` and `adventure_list_item`:
  - List titles, descriptions, parent/child relationships, and sort order.  
  - Membership of adventures in each list and order within the list.  
- Preserve semantics of front‑page and archive groupings derived from lists; adventures should appear in the same curated collections after migration.

**7.7 Media & Images**

- Preserve the actual uploaded files under `/upload/{slug}/…` and ensure all `image_url` and audio URLs referenced in adventures remain valid.  
- Preserve Unsplash data in `image_category` and `image`:
  - `unsplash_id` for collections and images.  
  - Titles, authors, and URLs (full, download, thumb).  
- Preserve links between nodes/adventures and Unsplash images where URLs or IDs are used, so chosen library images continue to display correctly.

**7.8 Statistics & Reports**

- Preserve `adventure.view_count` values or be able to recompute them (from `adventure_log` if used) so play counts remain consistent.  
- Preserve `adventure_log` records if node‑level statistics are needed (at least for export or archival).  
- Preserve `adventure_report` entries, including adventure IDs, messages, and timestamps, so existing reports are not lost.

**7.9 Autosave & Editing Semantics**

- Preserve semantics of autosave: author edits are saved frequently and transparently while working, without requiring manual save for every change.  
- Preserve the concurrency/locking behavior encoded by `edit_version` and `locked`:
  - Only one editor session effectively “owns” an adventure at a time.  
  - When a conflicting edit is detected, the second editor is blocked by a lock (HTTP 423) and does not silently overwrite data.  
- Preserve that changes made in the editor are reflected in what players see, matching the current no‑draft/no‑publish workflow.

**7.10 Behavior Coverage & Edge Cases**

- Preserve all story text and formatting, including any embedded HTML or TinyMCE‑generated markup in `adventure_node.content`.  
- Preserve all existing adventures’ behavior with respect to:
  - Node ordering and reachable paths.  
  - Bidirectional vs default link behavior (as currently implemented using `link_type` and titles).  
  - Special cases around root node (`node_type = "root"`) and any assumptions baked into the front‑end.  
- Preserve any data required for compliance or analysis (e.g. logs used for educational assessment), as far as they exist in current tables.

---

This rewritten document keeps the original structure and technical content while reducing repetition and narrative explanations. It is intended as a concise baseline reference for understanding the existing system.

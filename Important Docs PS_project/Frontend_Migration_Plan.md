# Projekt PS — Frontend Migration Plan (High-Level Steps)

This document lists all steps needed to migrate the legacy `/web` frontend to the new Next.js + React + TypeScript frontend, using the architecture described in the migration docs.

Note: Backend is unchanged; frontend must adapt to the existing API contract (`API_CONTRACT_FRONTEND.md`).

Each step briefly states:
- **What we do**
- **What we get**
- **Feature Map coverage** (Editor / Player / Public Pages / State & API / UI Core)

Blocks are just thematic groups. They do not strictly define execution order, but steps are ordered as if a developer was building and testing from scratch.

Planning note: Each step is intended to be used as a standalone Codex implementation task/ticket. Because of that, important invariants/guardrails (especially performance/UX constraints) may be repeated inside multiple steps so each task stays self-contained and less error-prone to scope.

## Backend Contract Invariants (must-follow)

- **All endpoints live under `/api`** (JSON).
- **Slug vs view_slug**
  - Player loads via `GET /api/adventure/:id` where `:id` can be `view_slug` (prefer for public links) or the edit `slug`.
  - Editor loads via `GET /api/adventure/:slug/edit` where `:slug` is the edit `slug` only.
- **Saving rules**
  - Save is `PUT /api/adventure/:slug` (edit `slug`), requires correct `edit_version`.
  - Persisted updates require `changed: true` flags; new nodes/links use `id = 0`.
- **Statistics**
  - Node visit logging is `GET /api/statistics/:id/:nodeId` (not POST); `:id` is the edit `slug`.
  - Even if the page route param is `viewSlug`, the statistics call uses `adventure.slug` from the loaded `Adventure` payload.
- **Auth**
  - Login is `POST /api/auth` returning `{ token, id, role }`.
  - Editor APIs require `Authorization: Bearer <token>` (unless server `DEV_AUTH_BYPASS`).
  - Media upload/delete endpoints are currently unauthenticated on backend; it’s fine to send the token, but don’t assume enforcement.
- **Media**
  - Upload is `POST /api/media` (multipart) with `adventureId` (slug) + file field name `media`.
  - Delete is `DELETE /api/media/:adventure/:hash` (delete by hash/filename, not URL).
- **Lists / homepage**
  - Public list fetch is `GET /api/adventures/:listId` where `:listId` is the list title slug (e.g. `front`).
  - Admin list management is under `/api/admin/lists` (do not invent `/api/lists`).

---

## Block A – Repo & Tech Foundation

### [done] Step 1 – Create mono-repo and copy backend

**What we do**

Create a new repo with:
- `backend/` — copy of the existing Go project (unchanged, used as API server & legacy reference).
- `frontend/` — new Next.js app that will replace `/web`.

Wire docker-compose so backend and new frontend can run together.

**What we get**

- Safe playground: backend remains a black box, new UI can be developed independently.
- Easy comparison with legacy HTML/JS in `/backend/web`.

**Feature Map coverage**

No Feature Map items implemented in this step (repo scaffold only).

---

### [done] Step 2 – Scaffold Next.js app and core dependencies

**What we do**

Initialize Next.js (App Router) + TypeScript in `frontend/`.

Install core libs:
- Tailwind, shadcn/ui, Zustand, React Query (optional), Tiptap, emoji-mart, React Flow, Sonner, Lucide.

Configure TypeScript paths (`@/features`, `@/config`, `@/lib`).

**What we get**

Modern stack ready to implement all sectors (player, editor, public pages, state, ui-core, media).

**Feature Map coverage**

Prerequisite tech replacements (dependencies only):

```
TECH REPLACEMENTS
├── Cytoscape.js      → React Flow
├── SimpleMDE         → Tiptap
├── TinyMCE           → Tiptap
├── emoji-button      → emoji-mart
├── Bootstrap CSS/JS  → Tailwind + shadcn/ui
├── Toastify          → Sonner
├── Font Awesome      → Lucide
├── markdown-it       → Tiptap (or minimal utility)
├── jQuery            → React
└── Popper.js         → Radix (built-in)
```

```
UI CORE
├── Icons
│   └── [-] Font Awesome → Lucide
```

---

### [done] Step 3 – Setup base routing & layouts (App Router)

**What we do**

Create base layouts and routes:
- `app/layout.tsx` – root providers (theme, toasts).
- `app/spela/[viewSlug]/page.tsx` – Player route.
- `app/redigera/[slug]/layout.tsx` & `page.tsx` – Editor route with editor-only layout.
- `app/(public)/layout.tsx` – Public layout (header/footer), routes for home/404 later.

**What we get**

URL structure that mirrors legacy:
- `/spela/{viewSlug}` for player
- `/redigera/{slug}` for editor
- `/` & other public pages through `(public)` route group.

**Feature Map coverage**

Routing/layout scaffolding for:

```
UI CORE
├── Layout Components
│   ├── [x] Header (public pages)
│   ├── [x] Footer
│   ├── [x] Editor layout (split pane)
│   └── [x] Player layout (full screen)
```

**Source of Truth**

```
router/
|-- router.go              # Legacy routes: /spela/{id}, /redigera/{id}, /spela/{id}/qr
controllers/
`-- web/
    |-- player.go          # Renders web/ps_player.html for /spela/{id}
    `-- editor.go          # Renders web/editor.html for /redigera/{id}
web/
|-- ps_player.html         # Player template + window.onload -> loadAdventure(...)
|-- editor.html            # Editor template (split layout + modals)
|-- header.html            # Shared head assets
|-- header_editor.html     # Editor-specific head assets
`-- fonts.html             # Font embedding snippet
```


---

## Block B – State & API Layer

### [done] Step 4 – Define DTOs and domain models (Adventure, Node, Link, etc.)

**What we do**

Create `src/features/state/types/`:
- `adventure.ts` — AdventureDTO, NodeDTO, LinkDTO mirroring Go JSON (slug, view_slug, props, font_list, node x,y, etc.).
- `categories.ts`, `lists.ts`, `media.ts` for adventure_category, adventure_list, image_category, image.

Define internal AdventureModel (normalized maps keyed by node_id / link_id).

**What we get**

- Single source of truth for adventure data shape in TypeScript.
- Clear separation DTO ↔ domain model.

**Feature Map coverage**


```
STATE & API
├── Adventure Model
│   ├── [x] nodes[] array
│   ├── [x] links[] array
│   ├── [x] Adventure metadata
│   │       ├── title
│   │       ├── description
│   │       ├── category
│   │       ├── slug
│   │       ├── view_slug
│   │       ├── image_id / cover_url
│   │       ├── props (JSON)
│   │       ├── font_list[]
│   │       └── updated_at
│   │
│   ├── Node structure
│   │   ├── node_id
│   │   ├── title
│   │   ├── text (HTML content)
│   │   ├── type (root, default, etc.)
│   │   ├── parent (parent node_id)
│   │   ├── image_id / image_url
│   │   ├── image_layout_type
│   │   ├── props (JSON string)
│   │   ├── x, y (position)
│   │   └── changed (dirty flag)
│   │
│   └── Link structure
│       ├── link_id
│       ├── source (node_id)
│       ├── target (node_id)
│       ├── source_title
│       ├── target_title
│       ├── type (default, bidirectional)
│       ├── props (JSON string)
│       └── changed (dirty flag)
```

**Source of Truth**

```
web/Important Docs PS_project/
`-- API_CONTRACT_FRONTEND.md  # Backend contract (primary)

web/js/
|-- aventyr.model.js       # Adventure data model + CRUD + dirty flags
|-- aventyr.storage.js     # LocalStorage cache + autosave debounce + API endpoints
|-- aventyr.app.js         # Orchestrator/event semantics (onChange(type, action, obj))
|-- aventyr.editor.js      # Populates fields used in DTOs (image_url, cover_url, font_list, props, etc.)
|-- aventyr.viewer.js      # Reads node fields for rendering in Player
`-- aventyr.props.js       # Prop keys + parsing/compat (node.props/link.props JSON)
```


---

### [done] Step 5 – Implement API client & adventures/media modules

**What we do**

Create `src/features/state/api/client.ts`:
- Base `/api` URL, `Authorization: Bearer <token>` header, error handling.

Create `api/adventures.ts`:
- `loadAdventure(id, mode: "edit" | "play")` (play: `GET /api/adventure/:id`; edit: `GET /api/adventure/:slug/edit` where `id` must be the edit slug)
- `saveAdventure(adventureSlug, payload)` (requires correct `edit_version`; uses `changed: true`; new nodes/links have `id = 0`)
- `getAdventuresByList(listId)` (`GET /api/adventures/:listId`, where `listId` is a list title slug like `front`)
- `trackNodeVisit(adventureSlug, nodeId)` (uses edit slug; when route param is `viewSlug`, read `adventure.slug` from payload)
- `reportAdventure(id, payload)` (`POST /api/adventure/:id/report`; `id` can be view_slug or slug)

Create `api/media.ts`:
- `uploadMedia(adventureSlug, file)` (`POST /api/media` multipart: `adventureId`, `media`)
- `deleteMedia(adventureSlug, hash)` (`DELETE /api/media/:adventure/:hash`)

**What we get**

- Typed, centralized API helpers used everywhere (editor, player, public pages, media).
- Backend contract is preserved without touching Go controllers.

**Feature Map coverage**


```
STATE & API
├── REST Client
│   ├── [x] Base URL: /api
│   ├── [x] Auth token from localStorage
│   ├── [x] GET, POST, PUT, DELETE methods
│   └── [x] Error handling
│
├── API Endpoints Used
│   ├── POST /api/auth
│   ├── GET  /api/adventure/:id
│   ├── GET  /api/adventure/:slug/edit
│   ├── PUT  /api/adventure/:slug
│   ├── GET  /api/categories
│   ├── GET  /api/adventures/:listId
│   ├── GET  /api/images/categories
│   ├── GET  /api/images/category/:id
│   ├── GET  /api/images/:id
│   ├── POST /api/media            (multipart: adventureId, media)
│   ├── DELETE /api/media/:adventure/:hash
│   ├── GET  /api/newAdventure     (also exists: POST /api/adventure)
│   ├── GET  /api/statistics/:id/:nodeId
│   └── POST /api/adventure/:id/report
```

**Source of Truth**

```
web/Important Docs PS_project/
`-- API_CONTRACT_FRONTEND.md  # Backend contract (primary)

web/js/
|-- restclient.js          # Base URL: {protocol}//{host}/api + Authorization header passthrough
|-- aventyr.storage.js     # Endpoint map + LocalStorage token usage ("token")
|-- aventyr.model.js       # Thin wrappers around Storage (load/save/media/report/statistics)
|-- aventyr.app.js         # Editor call sites: uploadMedia(), newAdventure(), categories/images loading
`-- aventyr.player.js      # Player call sites: setPlayerStatistics(nodeId)
web/
|-- editor.html            # Script loading order for editor modules/libs
`-- ps_player.html         # Script loading order for player modules/libs
```


---

### [done] Step 6 – Implement Zustand stores: adventure, editor, player

**What we do**

Create `src/features/state/stores/`:
- `adventureStore.ts` — normalized nodes/links, adventure metadata, CRUD actions (addNode, updateNode, removeNode, addLink, updateLink, removeLink, bulkUpdateNodes, etc.).
- `editorStore.ts` — selection (selectedNodeIds, primarySelectedNodeId, selectedLinkId), panel tabs, dirty flags.
- `playerStore.ts` — current node, history, flags (scrollytell state, mute, overlay open).

Create `hooks/useAdventure.ts` to glue adventureStore with api/adventures.

**What we get**

- Shared reactive state used by Editor Graph, Node Panel, Player, Public Pages.
- Model operations are testable pure logic plus thin store wrapper.

**Feature Map coverage**

```
STATE & API
├── Model Operations
│   ├── [x] load(id) — fetch adventure (play uses view_slug; edit uses slug)
│   ├── [x] save() — persist to storage
│   ├── [x] addNode(parentId) — create node + link
│   ├── [x] updateNode(nodeData)
│   ├── [x] removeNode(nodeId) — also removes links
│   ├── [x] addLink(sourceId, targetId)
│   ├── [x] updateLink(linkData)
│   ├── [x] removeLink(linkId)
│   ├── [x] bulkUpdateNodes(nodeIds, values)
│   ├── [x] updateAdventure(adventureData)
│   ├── [x] getNodeByID(id)
│   ├── [x] getLinksByNodeID(id)
│   ├── [x] getPossibleNodeTargets(id)
│   ├── [x] getRootNode()
│   ├── [x] hasChanges()
│   └── [x] clearChanges()
```

**Source of Truth**

```
web/Important Docs PS_project/
`-- API_CONTRACT_FRONTEND.md  # Backend contract (primary)

web/
|-- js/
|   |-- aventyr.model.js        # Model operations: nodes/links CRUD, selection helpers, hasChanges/clearChanges
|   |-- aventyr.app.js          # Event semantics + editor/player wiring (onChange(type, action, obj))
|   |-- aventyr.graph.js        # Graph state + interactions (select/tap/drag, zoom)
|   |-- aventyr.editor.js       # Editor-side state (selected nodes/links, panels/forms)
|   |-- aventyr.player.js       # Player state (current node, history/navigation)
|   |-- aventyr.viewer.js       # Player rendering pipeline + navigation UI
|   `-- aventyr.scrollytell.js  # Scroll/touch storytelling state
|-- editor.html                 # Editor entry template (loads app + graph + editor)
`-- ps_player.html              # Player entry template (loads player + viewer + props)
```

---

### [done] Step 7 – LocalStorage caching, autosave & event semantics

**What we do**

Implement `hooks/useAutosave.ts`:
- Subscribes to adventureStore changes, debounced (250ms like legacy; configurable).
- Persists to localStorage per slug.
- Calls saveAdventure with edit_version support and lock handling (HTTP 423).

Implement a small "event system" via store subscriptions:
- Equivalent of onChange(type, action, object), didSave, onSave (lock detection), but inside React world.

**What we get**

- Autosave & browser backup semantics matching legacy (localStorage + debounced PUT).
- Lock detection and edit conflict handling wired into UI.

**Feature Map coverage**

```
STATE & API
├── Storage Layer
│   ├── [x] LocalStorage caching
│   │       ├── set(id, data) (id is slug/view_slug used in the route)
│   │       ├── get(id)
│   │       ├── exists(id)
│   │       └── list() — recent adventures (max 20)
│   │
│   ├── [x] Server sync
│   │       ├── load(slug, edit, callback) (edit=true requires edit slug)
│   │       ├── save(slug, payload, callback) (save uses edit slug)
│   │       └── automaticUpdate() — debounced
│   │
│   └── [x] Autosave timer (250ms debounce)
│
└── Event System
    ├── [x] onChange(type, action, object)
    │       ├── type: model, node, link, adventure, 
    │       │         categories, images, etc.
    │       └── action: load, add, update, delete
    │
    ├── [x] didSave callback
    └── [x] onSave callback (for lock detection)
```

**Source of Truth**

```
web/Important Docs PS_project/
`-- API_CONTRACT_FRONTEND.md  # Backend contract (primary)

web/
|-- js/
|   |-- aventyr.storage.js      # LocalStorage caching + autosave debounce (250ms) + server sync
|   |-- restclient.js           # REST client (base /api + Authorization header)
|   |-- aventyr.model.js        # save()/update() + didSave() (HTTP 423 lock) + hasChanges()
|   `-- aventyr.app.js          # beforeunload warning + modelDidSave() lock handling hook
|-- editor.html                 # Script loading order for editor autosave semantics
`-- ps_player.html              # Script loading order for player data load (editable vs public)
```

---

## Block C – UI Core & Theming

### [done] Step 8 – Tailwind, fonts, global styles & ThemeProvider

**What we do**

Configure Tailwind with PS color tokens & breakpoints.

Setup `globals.css` and `fonts.ts` using `next/font` instead of ad-hoc CSS.

Implement ThemeProvider that:
- Takes adventure + node props and exposes CSS variables (colors, fonts, alpha, contrast, etc.).

**What we get**

- Clean styling baseline shared by public, player and editor.
- Theming pipeline that can replace `aventyr.props.js` logic.

**Feature Map coverage**

```
UI CORE
├── Styling System
│   ├── [-] Bootstrap CSS → Tailwind
│   ├── [-] Custom CSS (ps.css, textaventyr.css) → Tailwind + CSS vars
│   ├── [x] Font loading (Google Fonts + custom)
│   ├── [x] Dynamic theme from adventure props
│   └── [x] Responsive breakpoints
│
└── Utilities
    └── [-] Font loading workaround → next/font
```

**Source of Truth**

```
web/
|-- header.html                 # Global head includes + base CSS links (Bootstrap + custom)
|-- header_editor.html          # Editor head (adds SimpleMDE + Toastify CSS)
|-- fonts.html                  # Custom font embedding snippet
|-- css/
|   |-- ps.css                   # Global PS styles (player/editor/public)
|   |-- textaventyr.css          # Main custom styles (layout/forms/animations)
|   |-- ps_fonts.css             # @font-face definitions (custom uploaded fonts)
|   |-- bootstrap.min.css        # [LIB] Bootstrap base styles
|   `-- zoom.css                 # [LIB] Zoom overlay styles
`-- js/
    |-- font_stupidity.js        # Font loading workaround
    `-- aventyr.props.js         # Applies theme/fonts from adventure/node props (legacy theming pipeline)
```

---

### [done] Step 9 – Layout components: Header, Footer, EditorLayout, PlayerLayout

**What we do**

Implement `src/features/ui-core/components/`:
- `Header.tsx` (public navigation placeholder).
- `Footer.tsx`.
- `EditorLayout` (split pane wrapper).
- `PlayerLayout` (full-screen container with overlays).

**What we get**

- Shared skeleton for all top-level views.
- Consistent place to mount ThemeProvider, ToastProvider, etc.

**Feature Map coverage**

```
UI CORE
├── Layout Components
│   ├── [x] Header (public pages)
│   ├── [x] Footer
│   ├── [x] Editor layout (split pane)
│   └── [x] Player layout (full screen)
```

```
EDITOR
└── Editor UI Chrome
    ├── [x] Resizable split layout (graph | panel)
    ├── [x] Placeholder shown when nothing selected
    ├── [x] Toggle between node/link/placeholder views
```

**Source of Truth**

```
web/
|-- header.html                 # Public/shared header markup + CSS includes
|-- header_editor.html          # Editor header markup (navbar + actions)
|-- editor.html                 # Editor page layout: split pane (#graph | #editor) + header controls
|-- ps_player.html              # Player page layout: media + text + navigation + overlay menu
|-- 404.html                    # Public page shell using shared header/footer templates
`-- js/
    `-- aventyr.nav.public.js    # Public navigation + "edit adventure" dropdown population
```

---

### [done] Step 10 – Interactive primitives: Dialog, Dropdown, Tooltip, Toasts, ImageZoom

**What we do**

Import shadcn/ui primitives into `ui-core/primitives/`.

Implement:
- ToastProvider (Sonner).
- Dialog wrappers for modals.
- DropdownMenu, Tabs, Tooltip.
- `ImageZoom.tsx` for lightbox/zoom functionality.

**What we get**

- Modern replacements for all Bootstrap-based modals, dropdowns, tooltips and zoom.
- Central place for UX tweaks.

**Feature Map coverage**

```
UI CORE
├── Interactive Components
│   ├── [-] Bootstrap modals → shadcn Dialog
│   ├── [-] Bootstrap dropdowns → shadcn DropdownMenu
│   ├── [-] Bootstrap tooltips → shadcn Tooltip
│   ├── [-] Toastify → Sonner
│   └── [x] Image zoom/lightbox
```

```
EDITOR
└── Editor UI Chrome
    ├── [-] Bootstrap modals → shadcn Dialog
    ├── [-] Bootstrap dropdowns → shadcn DropdownMenu
    ├── [-] Toastify notifications → Sonner
    └── [-] Font Awesome icons → Lucide
```

**Source of Truth**

```
web/
|-- editor.html                 # Bootstrap-driven modals/dropdowns (modalInfo/modalShare/modalImageBank/etc.)
|-- css/
|   |-- bootstrap.min.css        # [LIB] Modals/dropdowns base styling
|   |-- toastify.css             # [LIB] Toastify styles
|   `-- zoom.css                 # [LIB] Zoom/lightbox overlay styles
`-- js/
    |-- aventyr.editor.js        # jQuery modal control + UI notifications
    |-- aventyr.app.js           # UI glue (contains Toastify usage example)
    |-- jquery-3.3.1.slim.min.js # [LIB] Bootstrap dependency
    |-- popper.min.js            # [LIB] Dropdown positioning
    |-- bootstrap.min.js         # [LIB] Bootstrap JS (modals/dropdowns)
    |-- toastify.js              # [LIB] Toast notifications
    `-- zoom-vanilla.min.js      # [LIB] Zoom/lightbox (present; not loaded by templates here)
```

---

### [done] Step 11 – Props system & utilities (including legacy markdown helper)

**What we do**

Implement props helpers (in ui-core or lib):
- Convert hex → rgba with alpha.
- High-contrast mode toggling.
- Mapping adventure/node props to CSS vars and style objects.

Implement a minimal markdown/HTML compatibility helper to render legacy content in Tiptap/React safely.

**What we get**

- Central logic to apply all visual props (colors, transparency, shadows, blur, grayscale, etc.).
- Reliable rendering of legacy HTML within new player/editor.

**Feature Map coverage**

```
UI CORE
├── Props System
│   ├── [x] Apply visual props to elements
│   ├── [x] Color conversion (hex to rgba)
│   ├── [x] Alpha/transparency handling
│   ├── [x] Old props conversion (legacy format)
│   ├── [x] High contrast mode
│   └── [x] Dynamic element styling
│
└── Utilities
    ├── [-] markdown-it → Tiptap output
    ├── [x] Markdown helper (for legacy content)
    └── [-] Font loading workaround → next/font
```

**Source of Truth**

```
web/
|-- js/
|   |-- aventyr.props.js         # Core props logic (hex->rgba, legacy conversion, apply to DOM)
|   |-- markdown-it.min.js       # [LIB] markdown-it parser
|   |-- markdownhelper.js        # markdown-it wrapper + link target plugin + view-mode escaping
|   |-- aventyr.viewer.js        # Uses Props() + markdown helper to render node content in player
|   `-- aventyr.editor.js        # Uses Props() to edit/apply node/link/adventure props
|-- editor.html                 # Loads markdown-it/markdownhelper + props for editor
`-- ps_player.html              # Loads markdown-it/markdownhelper + props for player
```

---

## Block D - Player Experience

**Player-wide guardrails: Scrollytell hybrid approach (applies to Steps 14–17)**

These constraints are repeated in Steps 14–17 so each step remains a self-contained implementation task.

- Use a **hybrid approach**: React for coarse state changes (node transitions, mode toggles, overlay/menu open/close), imperative DOM/CSS (refs, CSS classes/variables, `scroll-snap`, `IntersectionObserver`) for high-frequency scroll-linked visuals.
- Avoid React-state-on-scroll (no `setState` on every `scroll`/`touchmove`); prefer CSS transitions/vars for opacity and layout tweaks.
- Avoid always-on loops: no permanent `requestAnimationFrame` unless auto-scroll is actively enabled; stop RAF immediately when disabled or when user input takes over.

### [done] Step 12 - Basic player skeleton: data loading & simple navigation

**What we do**

Implement `PlayerPage.tsx`:
- Fetch adventure via `loadAdventure(id, "play")` where `id` is the public `view_slug` (preferred) or the edit `slug`.
- Initialize playerStore and adventureStore slice for current adventure.

Implement `NodeViewer.tsx`:
- Render node text & choices in minimal layout.

Implement `PlayerControls.tsx`:
- Next/back/menu buttons, base navigation actions.

**What we get**

Fully functional but visually simple player: can open an existing adventure and click through nodes.

**Feature Map coverage**

```
PLAYER
├── Core Navigation
│   ├── [x] Load adventure by view_slug/slug
│   ├── [x] Display start node on load
│   ├── [x] Navigate to node via link button click
│   ├── [x] Navigation history (back functionality)
│   ├── [x] Back button
│   ├── [x] Home button (return to start node)
│   ├── [x] Track visited nodes
│   └── [x] Progress bar (% of nodes visited)
│
├── Node Rendering
│   ├── [x] Rich text content (HTML)
│
├── Navigation Buttons
│   ├── [x] Generate buttons from node links
│   ├── [x] Button label from link title or target node title
│
└── Player UI
    ├── [x] Full-screen layout
    ├── [x] Responsive design
    └── [x] Error message display
```

**Source of Truth**

```
web/Important Docs PS_project/
`-- API_CONTRACT_FRONTEND.md  # Backend contract (primary)

web/
|-- ps_player.html           # Player shell + DOM containers + window.onload -> loadAdventure(...)
|-- js/
|   |-- aventyr.player.js    # Player entry: loadAdventure(), history/back, keyboard nav
|   |-- aventyr.viewer.js    # Renders node + builds navigation buttons + progress bar
|   |-- aventyr.model.js     # Adventure model: getRootNode(), getLinksByNodeID(), getProgressionNodes()
|   |-- aventyr.storage.js   # Fetch adventure via GET /api/adventure/:id (id can be view_slug or slug)
|   `-- restclient.js        # /api client + Authorization header
`-- css/ps.css               # Player layout styles (containers/navigation)
```

---

### [done] Step 13 – Player engine & special node types

**What we do**

Implement a pure "player engine" module:
- Resolves root node.
- Applies navigation rules based on link choice.
- Handles special node types:
  - Start node, chapter node, chapter node plain.
  - Video node (delegates to media).
  - Random node (prefer unvisited, error if none).
  - Reference node / reference node tab (open URL / open in new tab).

**What we get**

- All navigation logic isolated, easier to test and reuse (e.g., standalone mode, editor preview).
- Correct behavior for all special node types.

**Feature Map coverage**

```
PLAYER
├── Special Node Types
│   ├── [x] Start node (shows title as h1)
│   ├── [x] Chapter node (title + content)
│   ├── [x] Chapter node plain (no border on title)
│   ├── [x] Video player node
│   ├── [x] Random node (random link selection)
│   │       ├── Prefers unvisited nodes
│   │       └── Error if no connected nodes
│   ├── [x] Reference node (opens URL)
│   └── [x] Reference node tab (opens URL in new tab)
```

```
PLAYER
├── Node Rendering
│   ├── [x] Title display (for chapter nodes)
```

```
STATE & API
├── Model Operations
│   ├── [x] getLinksByNodeID(id)
│   ├── [x] getPossibleNodeTargets(id)
│   ├── [x] getRootNode()
```

**Source of Truth**

```
web/Important Docs PS_project/
`-- API_CONTRACT_FRONTEND.md  # Backend contract (primary)

web/js/
|-- aventyr.viewer.js        # Node "types" via node.props.settings_chapterType (start/chapter/video/random/ref)
|-- markdownhelper.js        # Legacy markdown->HTML for non-HTML node.text (markDownTextForView)
|-- markdown-it.min.js       # [LIB] markdown-it parser
`-- aventyr.model.js         # Link resolution helpers used by viewer (getLinksByNodeID/getRootNode)
web/ps_player.html           # Loads viewer + markdown helper + props
```

---

### Step 14 - Player layout, props & responsive behavior

**What we do**

Enhance NodeViewer and PlayerLayout to:
- Apply node and adventure props for colors, fonts, background images, grayscale/blur, container width/margins, vertical alignment, text shadow, navigation styles (bottom nav, swipe, etc.).
- Handle portrait vs landscape, resize events, mobile detection, touch interactions.

Boundary: Step 14 covers props/layout/responsive behavior and coarse device/touch detection. Scroll-driven scrollytell navigation modes and IO-based tracking are implemented in Step 17.
"subtitles_url set but file not found; subtitle upload is implemented in Step 24"

**What we get**

Player visuals match legacy behavior: bottom navigation option, responsive layout, mobile friendliness.

**Notes / pitfalls**

- Avoid React-state-on-scroll: do not update React state on every `scroll`/`touchmove`; use CSS-first styling and imperative DOM updates (refs, CSS classes/vars) for scroll-linked effects.
- Prefer native scroll + `scroll-snap` (as legacy) for swipe-like navigation styles, rather than building a custom gesture engine.
- Prefer CSS media queries / container queries for responsive layout; use JS only for coarse mode detection and resize measurements (debounced).
- Watch iOS viewport quirks (`vh` resizing with browser chrome): prefer `dvh`/`svh` where possible or a `--vh` CSS variable set on resize/orientation changes.

**Feature Map coverage**

```
PLAYER
├── Node Rendering
│   ├── [x] Background image
│   ├── [x] Background video (.mp4)
│   ├── [x] Video subtitles (.vtt)
│   ├── [x] Foreground color overlay
│   ├── [x] Apply node props (colors, fonts, etc.)
│   ├── [x] High contrast mode toggle
│   ├── [x] Hide background toggle
│   └── [x] Responsive text sizing (em units)
│
├── Navigation Buttons
│   ├── [x] Ordered links support (custom order)
│   ├── [x] Show current node button option
│   ├── [x] Conditional visibility (visited/not visited)
│   ├── [x] Button styling from props
│   ├── [x] Press animation (btn-pressed class)
│   └── [x] Navigation arrow buttons (left/right/up/down)
│
├── Scrollytell Mode
│   ├── [x] Vertical position alignment
│   ├── [x] Center alignment option
│   ├── [x] Bottom navigation option
│   ├── [x] Portrait/landscape handling
│   ├── [x] Container margin settings
│   └── [x] Resize handling
│
└── Player UI
    ├── [x] Full-screen layout
    ├── [x] Responsive design
    ├── [x] Mobile detection
    ├── [x] Touch interactions
    ├── [-] Bootstrap styles → Tailwind
```

**Source of Truth**

```
web/Important Docs PS_project/
`-- API_CONTRACT_FRONTEND.md  # Backend contract (primary)

web/
|-- ps_player.html           # Media containers (background video/image/overlay) + navigation/overlay DOM
|-- css/ps.css               # Responsive/player styling (layout, nav styles, snap/scrollytell helpers)
`-- js/
    |-- aventyr.viewer.js    # Applies node/adventure props to DOM + responsive/mobile branches
    `-- aventyr.props.js     # Prop parsing + CSS application (colors/alpha/contrast/fonts/etc.)
```

---

### Step 15 – Overlay menu & audio system

**What we do**

Implement overlay menu:
- Back, Home, Menu, Sound buttons.
- Popdown menu with sound toggle, high contrast, background toggle, fade in/out rules.

Implement audio system:
- Audio player component using node props (audio, audio_alt, volume).
- Mute on visibilitychange.
- Track "previous audio" and alternate audio state.
- Basic media preloading.

**What we get**

- In-player settings & controls fully functional.
- Audio experience aligned with legacy semantics.

**Notes / pitfalls**

- Overlay fade/visibility rules are coupled to scrollytell on/off, `videoControl`/subtitles modes, play/pause state, and user interactions; implement this as a small event-driven state machine (not scroll-driven React renders).
- Keep high-frequency fades/opacity in CSS (transitions, classes, variables) and DOM refs where possible; avoid per-tick scroll/RAF `setState` to “drive” overlay/audio UI.
- Drive overlay transitions from coarse events: media element events (`play/pause/ended`), `visibilitychange`, explicit menu open/close, and node enter/exit events from scrollytell tracking (Step 17).

**Feature Map coverage**

```
PLAYER
├── Overlay Menu
│   ├── [x] Back button (conditional visibility)
│   ├── [x] Home button
│   ├── [x] Menu button (toggles popdown)
│   ├── [x] Sound button (mute/unmute)
│   ├── [x] Popdown menu with settings
│   │       ├── [x] Sound toggle
│   │       ├── [x] High contrast toggle
│   │       └── [x] Background toggle
│   └── [x] Visibility handling (fade in/out)
│
├── Node Rendering
│   ├── [x] Audio playback
│   ├── [x] Alternative audio (audio_alt)
│
├── Audio System
│   ├── [x] Audio player element
│   ├── [x] Volume control from props
│   ├── [x] Mute on tab switch (visibilitychange)
│   ├── [x] Previous audio tracking (for crossfade?)
│   ├── [x] Audio alt played tracking
│   └── [x] Preload media (XHR blob loading)
```

**Source of Truth**

```
web/Important Docs PS_project/
`-- API_CONTRACT_FRONTEND.md  # Backend contract (primary)

web/
|-- ps_player.html           # Overlay menu markup + audio/video elements (#audio_player, #background_video)
|-- css/ps.css               # Overlay/menu + navigation visual behavior
`-- js/
    |-- aventyr.viewer.js    # Overlay menu logic + sound/high-contrast/background toggles + audio engine
    |-- aventyr.scrollytell.js # Overlay/menu fade rules for scrollytell/video/subtitles modes
    `-- aventyr.props.js     # Audio-related props (audio_url, audio_url_alt, audio_volume, subtitles_url)
```

---

### Step 16 – Statistics & standalone / preview modes

**What we do**

Wire `trackNodeVisit(adventureSlug, nodeId)` to call `GET /api/statistics/:id/:nodeId` on valid transitions, respecting props toggles and preview modes.

Clarify: even if the page route param is `viewSlug`, statistics must use the edit slug (`adventure.slug`) from the loaded `Adventure` payload (per backend contract notes).

Implement:
- "Preview"/test mode (no stats) using a query flag or a dedicated route.
- Standalone mode (`/spela/standalone` or special entry) that loads adventure JSON from local file, without any `/api` calls.

**What we get**

- Node visit tracking identical to legacy.
- Ability to demo player with local JSON or preview from editor.

**Notes / pitfalls**

- IntersectionObserver (Step 17) can fire multiple times per node; ensure stats are deduped so `trackNodeVisit` triggers once per real node entry (e.g., by `nodeId` per session/adventure).
- Preview/standalone must never depend on statistics; keep stats side effects fire-and-forget and strictly gated by mode/props.

**Feature Map coverage**

```
PLAYER
├── Statistics
│   ├── [x] Record node visits (if enabled)
│   ├── [x] GET /api/statistics/:id/:nodeId
│   └── [x] Conditional based on props and URL
│
├── Standalone Mode
│   ├── [x] Load from local JSON file
│   ├── [x] No server communication
│   └── [x] Editable flag from template
```

**Source of Truth**

```
web/Important Docs PS_project/
`-- API_CONTRACT_FRONTEND.md  # Backend contract (primary)

web/
|-- ps_player.html           # standAlonePlayer flag (from .IsEditable) + script loading (editable vs public)
|-- js/
|   |-- aventyr.viewer.js    # Statistics gating (isRecordingStatistics) + triggers didStatisticsNode()
|   |-- aventyr.player.js    # Standalone branching (loadStandalone) + optional ?nodeId start
|   |-- aventyr.model.js     # loadStandalone() (fetch PSadventure_{slug}.json) + setPlayerStatistics()
|   `-- aventyr.storage.js   # GET /api/statistics/:id/:nodeId (id is edit slug, i.e. adventure.slug)
`-- router/router.go         # Legacy /spela/{id}/qr and related player routes (backend wiring reference)
```

---

### Step 17 – Scrollytelling & advanced mobile behavior

**What we do**

Implement `ScrollyTracker.tsx`:
- Prefer IntersectionObserver-driven transitions (inside the scroll container) rather than per-scroll React updates.
- Use sentinel elements / node wrappers to detect active node entry/exit robustly.
- Only activate when scrollytell is enabled in props.
- Update high-frequency UI via DOM refs + CSS classes/variables (opacity fades, active-node styling, scroll-snap alignment), and emit coarse events only (`onNodeEnter`, `onNodeExit`, mode changes) so React re-renders occur on node transitions, not scroll ticks.
- Avoid a permanent `requestAnimationFrame` loop; only run RAF while auto-scroll mode is active, and stop it immediately when auto-scroll is disabled or user input takes over.

Fine-tune scroll speed, vertical position, and container behavior for scrollytell adventures on mobile.

**What we get**

- Modern, performant scrollytelling behavior.
- Good UX on touch devices.

**Notes / pitfalls**

- Keep React re-renders tied to coarse node transitions (enter/exit), not scroll ticks; apply scroll-linked visuals via CSS classes/variables + refs.
- Ensure observers/handlers are scoped to the scroll container and cleaned up on unmount; do not leave background loops running when scrollytell/auto-scroll is inactive.

**Performance acceptance**

- No continuous React re-renders during manual scrolling; scrolling remains smooth on mid-range mobile hardware.
- No always-on RAF loop in the idle/manual-scroll path.

**Feature Map coverage**

```
PLAYER
├── Scrollytell Mode
│   ├── [x] Scroll-triggered navigation
│   ├── [x] Swipe control mode
│   ├── [x] Swipe with button mode
│   ├── [x] Left/right arrow mode
│   ├── [x] Scroll speed setting
│   ├── [x] Scroll acceleration
│   ├── [x] Vertical position alignment
│   ├── [x] Center alignment option
│   ├── [x] Bottom navigation option
│   ├── [x] Portrait/landscape handling
│   ├── [x] Container margin settings
│   └── [x] Resize handling
```

**Source of Truth**

```
web/Important Docs PS_project/
`-- API_CONTRACT_FRONTEND.md  # Backend contract (primary)

web/
|-- js/
|   |-- aventyr.scrollytell.js # Core scrollytell engine (scroll/touch/swipe modes, opacity, thresholds)
|   `-- aventyr.viewer.js      # Calls scrollytell.initForNode(...) based on props + nav style
|-- ps_player.html             # snap containers (#outer_container, nodeblock_before/after) for scrolling
`-- css/ps.css                 # .snapthis + mobile/scrollytell related styling
```

---

## Block E – Editor Graph

### Step 18 – Editor route + read-only GraphCanvas

**What we do**

Implement `app/redigera/[slug]/page.tsx` to:
- Call `loadAdventure(slug, "edit")`.
- Put GraphCanvas on the left and a placeholder Node Panel on the right.

Implement GraphCanvas with React Flow:
- Map nodes & links from adventureStore into React Flow nodes/edges.
- Basic selection of node/link and background deselect.

**What we get**

- Editor opens adventures and shows their graph visually.
- Selection state is available for the upcoming Node Panel.

**Feature Map coverage**

```
EDITOR
├── Graph Panel (left side)
│   ├── [x] Display nodes as visual elements
│   ├── [x] Display links/edges between nodes
│   ├── [x] Select node (tap/click)
│   ├── [x] Select link (tap/click)
│   ├── [x] Deselect (click background)
│   ├── [x] Node title displayed on graph
```

**Source of Truth**

```
web/Important Docs PS_project/
`-- API_CONTRACT_FRONTEND.md  # Backend contract (primary)

web/
|-- editor.html            # Editor template: split layout (#graph | #editor) + initial placeholder area
|-- js/
|   |-- aventyr.app.js      # Bootstraps editor: Model + Graph + Editor wiring + selection callbacks
|   |-- aventyr.graph.js    # Graph canvas (Cytoscape) mounts into #graph, handles select/deselect
|   |-- aventyr.model.js    # Loads adventure and exposes nodes/links for the graph
|   `-- aventyr.editor.js   # Right-panel controller (switches between node/link/adventure areas)
`-- header_editor.html     # Editor-specific head assets
```

---

### Step 19 – Graph interactions & CRUD operations

**What we do**

Enhance GraphCanvas + useGraph:
- Drag node to reposition → update node x,y.
- Pan canvas, zoom in/out.
- Multi-select nodes (Ctrl/Shift + click or box selection).
- Hover states on nodes/links; double-click quick actions hook (e.g., select + open Node Panel).

Wire node/link create/delete:
- "Create node" tool: adds node + default link from current node.
- "Create link" tool: connect source/target nodes.
- Delete node removes associated links.

**What we get**

Functional graph editor where authors can visually shape story structure.

**Feature Map coverage**

```
EDITOR
├── Graph Panel (left side)
│   ├── [x] Drag node to reposition
│   ├── [x] Pan canvas (drag background)
│   ├── [x] Zoom in/out (scroll wheel)
│   ├── [x] Multi-select nodes (Ctrl/Shift + click or box select)
│   ├── [x] Hover state on nodes/links
│   ├── [x] Double-tap node → quick action (context menu?)
│   └── [x] Persist node positions (x, y saved to model)
```

```
STATE & API
├── Model Operations
│   ├── [x] addNode(parentId) — create node + link
│   ├── [x] updateNode(nodeData)
│   ├── [x] removeNode(nodeId) — also removes links
│   ├── [x] addLink(sourceId, targetId)
│   ├── [x] removeLink(linkId)
```

**Source of Truth**

```
web/js/
|-- aventyr.graph.js        # Interactions: tap node/link/background, hover, drag (free) -> didMoveNode
|-- aventyr.app.js          # Wires Graph events -> Model ops and Editor panel (didTapNode/didTapLink/didMoveNode)
|-- aventyr.model.js        # CRUD: addNode/removeNode/addLink/removeLink/updateNode/updateLink (+ link cleanup)
`-- aventyr.editor.js       # UI actions: create/delete nodes/links, preview node, selection sync
web/editor.html             # Buttons & forms: create link dropdown, delete node/link buttons, panels
```

---

### Step 20 – Graph styling & advanced features

**What we do**

Implement:
- Different node styles for node types (root, chapter, video, random, ref, etc.).
- Bidirectional link styling & clear direction indicators.
- Optional auto-layout using a React Flow layout plugin.
- Keyboard shortcuts (delete node, undo/redo) when feasible.

**What we get**

- Graph visual fidelity matches legacy.
- Power-user features available in new editor.

**Feature Map coverage**

```
EDITOR
├── Graph Panel (left side)
│   ├── [x] Different node types have different styles
│   │       └── root, default, chapter-node, videoplayer-node, etc.
│   ├── [x] Link direction indicators
│   ├── [x] Bidirectional link styling
│   ├── [~] Auto-layout (breadthfirst) — currently disabled in legacy
```

**Source of Truth**

```
web/js/
`-- aventyr.graph.js        # Cytoscape style map: node/root styles, selected/hover states, edge arrows, bidirectional
web/editor.html             # Loads Cytoscape + graph module (legacy styling is JS-driven, not CSS)
```

---

## Block F – Editor Node Panel & Adventure Settings

### Step 21 – NodePanel skeleton & basic NodeForm

**What we do**

Implement `NodePanel.tsx` with tabs (Node / Link / Settings).

Implement minimal `NodeForm.tsx`:
- Title, node type selector, icon/emoji placeholder (without rich editor/media yet).

Wire useEditorPanel to selection from editorStore and adventureStore.

**What we get**

- Right-side panel appears when node is selected.
- Basic node metadata is editable.

**Feature Map coverage**

```
EDITOR
├── Node Panel (right side) — appears when node selected
│   ├── Node Form
│   │   ├── [x] Title input (text)
│   │   └── [x] Node properties panel (expandable)
│   │           ├── [x] Chapter type selector
│   │           │       └── start-node, chapter-node, chapter-node-plain,
│   │           │           videoplayer-node, random-node, ref-node, ref-node-tab
```

**Source of Truth**

```
web/
|-- editor.html             # Node/Link/Adventure panel markup (#area_node/#area_link/#area_adventure)
`-- js/
    |-- aventyr.editor.js    # Panel controller: toggle(), editNode(), editLink(), updateAdventure(), handlers
    `-- aventyr.props.js     # Reads/writes node/link/adventure props from panel inputs (prop-input fields)
```

---

### Step 22 – RichTextEditor & emoji integration

**What we do**

Implement `RichTextEditor.tsx` using Tiptap + emoji-mart:
- Load legacy HTML into editor.
- Provide toolbar with basic formatting & emoji picker.

Integrate RichTextEditor into NodeForm for node content.

**What we get**

- Modern rich text editing; no more SimpleMDE/TinyMCE.
- Emoji picker integrated into editor.

**Feature Map coverage**

```
EDITOR
├── Node Panel (right side) — appears when node selected
│   ├── Node Form
│   │   ├── [x] Content editor (rich text)
│   │   │       └── [-] SimpleMDE/TinyMCE → Tiptap
│   │   ├── [x] Emoji picker in editor
│   │   │       └── [-] emoji-button → emoji-mart
```

```
UI CORE
└── Utilities
    ├── [-] markdown-it → Tiptap output
```

**Source of Truth**

```
web/
|-- editor.html                 # Content textarea (#node_text) + script includes (tinymce, emoji-button, markdown)
|-- tinymce/tinymce.min.js      # [LIB] TinyMCE WYSIWYG
`-- js/
    |-- aventyr.editor.js        # initTextEditor(): tinymce.init + saves editor HTML into node.text
    |-- emoji-button-2.12.1.min.js # [LIB] Emoji picker
    |-- markdown-it.min.js       # [LIB] markdown-it parser
    `-- markdownhelper.js        # markDownText()/markDownTextForView() used for legacy markdown compatibility
```

---

### Step 23 – Node properties panel (visual & behavioral props)

**What we do**

Expand Node properties section:
- Background/foreground/text colors, button colors (+ alpha).
- Navigation style selector (default, swipe, swipeWithButton, leftright, right, noButtons).
- Scroll speed, vertical position, container width/margins.
- Text shadow, grayscale, blur.
- Font selector (from adventure font list).
- Navigation font size, button order, node conditions (hide_visited), node condition colors, show current node button toggle, navigation opacity, statistics tracking toggle, audio volume.

**What we get**

- Node-level props fully editable from Node Panel.
- All player visual/behavior options configured in one place.

**Feature Map coverage**

```
EDITOR
├── Node Panel (right side) — appears when node selected
│   ├── Node Form
│   │   └── [x] Node properties panel (expandable)
│   │           ├── [x] Background color picker
│   │           ├── [x] Foreground color picker + alpha
│   │           ├── [x] Text color picker + alpha
│   │           ├── [x] Text background color + alpha
│   │           ├── [x] Button text color + alpha
│   │           ├── [x] Button background color + alpha
│   │           ├── [x] Navigation style selector
│   │           │       └── default, swipe, swipeWithButton, leftright, right, noButtons
│   │           ├── [x] Scroll speed (for scrollytell)
│   │           ├── [x] Vertical position setting
│   │           ├── [x] Container width/margins
│   │           ├── [x] Text shadow options
│   │           ├── [x] Grayscale toggle
│   │           ├── [x] Blur amount slider
│   │           ├── [x] Font selector (from adventure font list)
│   │           ├── [x] Navigation font size
│   │           ├── [x] Navigation button order (drag to reorder)
│   │           ├── [x] Node conditions (hide_visited)
│   │           ├── [x] Node conditions color/transparency
│   │           ├── [x] Show current node button toggle
│   │           ├── [x] Navigation opaque toggle
│   │           ├── [x] Statistics tracking toggle
│   │           └── [x] Audio volume setting
```

**Source of Truth**

```
web/
|-- editor.html          # Node props UI (.prop-input) + props modal (#modalProps)
`-- js/
    |-- aventyr.props.js  # Prop schema + legacy conversion + read/write from DOM inputs
    |-- aventyr.editor.js # Persists node.props from inputs + bulk-edit plumbing
    `-- aventyr.viewer.js # Consumes props in player (visual + behavioral)
```

---

### Step 23b – Multi-Node Bulk Editing

**What we do**

Implement bulk editing UI when multiple nodes are selected in graph:

- `BulkEditModal.tsx` or dedicated panel section:
  - Shows count and list of affected nodes.
  - Displays editable properties (same as single-node props).
  - Changed properties are highlighted (orange indicator or similar).
  - "Apply" button calls `bulkUpdateNodes(nodeIds, changedValues)`.

- Only show properties that make sense for bulk editing (colors, fonts, nav style, etc. — not title/content).

**What we get**

- Authors can style multiple nodes at once (e.g., set all chapter nodes to same background color).
- Matches legacy bulk editing workflow.

**Feature Map coverage**

```
EDITOR
├── Multi-Node Editing
│   ├── [x] Select multiple nodes in graph
│   ├── [x] Bulk property changes
│   ├── [x] Shows affected node list in modal
│   ├── [x] Changed properties highlighted (orange)
│   └── [x] Apply changes button
```

---

### Step 24 – Node media: image, audio, audio_alt, subtitles, video

**What we do**

Integrate MediaPicker into NodeForm:
- Image picker opening MediaLibrary modal.
- Image preview thumbnail & delete button.

Add audio section:
- Upload/select audio & audio_alt, show labels, delete buttons.

Add subtitles section:
- Upload .vtt, delete.

Ensure video support when node image is .mp4 or mapped to a video URL.

**What we get**

- All media fields for nodes fully managed in UI.
- Reuses shared Media feature for uploads/listing.

**Feature Map coverage**

```
EDITOR
├── Node Panel (right side) — appears when node selected
│   ├── Node Form
│   │   ├── [x] Image picker (opens Media Library)
│   │   ├── [x] Image preview thumbnail
│   │   ├── [x] Delete image button
│   │   ├── [x] Audio file upload
│   │   ├── [x] Audio preview label
│   │   ├── [x] Delete audio button
│   │   ├── [x] Alternative audio upload (audio_alt)
│   │   ├── [x] Delete alternative audio button
│   │   ├── [x] Subtitles upload (.vtt)
│   │   ├── [x] Delete subtitles button
│   │   ├── [x] Video support (when image is .mp4)
```

**Source of Truth**

```
web/Important Docs PS_project/
`-- API_CONTRACT_FRONTEND.md  # Backend contract (primary)

web/
|-- editor.html          # Media inputs: #node_image/#node_audio/#node_audio_alt/#node_subtitles + #modalImageBank
`-- js/
    |-- aventyr.editor.js # Upload/delete handlers; sets image_url/audio_url/audio_url_alt/subtitles_url
    |-- aventyr.model.js  # uploadMedia()/removeMedia() wrappers
    |-- aventyr.storage.js# POST /api/media + DELETE /api/media/:adventure/:hash
    `-- restclient.js     # REST client used by uploads
```

---

### Step 25 – Node actions & Link list for current node

**What we do**

Add Node actions section:
- Create new node (linked from current).
- Create new link to existing node (dropdown list of potential targets).
- Delete node (and connected links).
- Preview node in new Player tab.
- "Play from here" button using Player engine + preview route.

Add link list:
- Show all outgoing links from current node with target titles.
- Click link in list → select that link (and focus Link tab).

**What we get**

- Quick authoring workflow from node context.
- Smooth jump between editing node and link.

**Feature Map coverage**

```
EDITOR
├── Node Panel (right side) — appears when node selected
│   ├── Node Actions
│   │   ├── [x] Create new node (linked from current)
│   │   ├── [x] Create new link (to existing node)
│   │   │       └── Shows dropdown of available target nodes
│   │   ├── [x] Delete node button
│   │   │       └── Also deletes connected links
│   │   ├── [x] Preview node button (opens player in new tab)
│   │   └── [x] Playback button (opens player from this node)
│   │
│   └── Link List
│       ├── [x] Shows all links from current node
│       ├── [x] Each link shows target node title
│       └── [x] Click to select/edit link
```

```
STATE & API
├── Model Operations
│   ├── [x] addNode(parentId) — create node + link
│   ├── [x] removeNode(nodeId) — also removes links
│   ├── [x] addLink(sourceId, targetId)
│   ├── [x] removeLink(linkId)
│   ├── [x] getLinksByNodeID(id)
│   ├── [x] getPossibleNodeTargets(id)
```

**Source of Truth**

```
web/
|-- editor.html          # Node actions: #btnCreateNode/#btnCreateLink/#btnDeleteNode/#btnPreviewNode + #link_order_list
`-- js/
    |-- aventyr.editor.js # Node action handlers + target dropdown population (updateLinks)
    |-- aventyr.props.js  # Button/link order list UI (setEditorButtonList) -> ordered_link_ids
    |-- aventyr.model.js  # addNode/addLink/removeNode/removeLink/getLinksByNodeID/getPossibleNodeTargetsByNodeID
    `-- aventyr.app.js    # Wires editor actions <-> model <-> graph
```

---

### Step 26 – Link Panel and LinkForm

**What we do**

Implement `LinkForm.tsx` under Node Panel's Link tab:
- Edit link source_title, target_title, type (default / bidirectional).
- Switch link direction, validate target selection, delete link.
- Extra props as needed (e.g. conditions).

**What we get**

- Dedicated UI to configure links independent of graph view.
- Clear overview of link titles and types.

**Feature Map coverage**

```
EDITOR
├── Link Panel (right side) — appears when link selected
│   ├── [x] Link type radio: default / bidirectional
│   ├── [x] Target link label input
│   ├── [x] Source link label input (for bidirectional)
│   ├── [x] Change direction button (swap source/target)
│   ├── [x] Delete link button
│   └── [x] Link properties (conditions)
│           ├── [x] Positive node list (show if visited)
│           └── [x] Negative node list (hide if all visited)
```

```
STATE & API
├── Model Operations
│   ├── [x] updateLink(linkData)
│   ├── [x] removeLink(linkId)
```

**Source of Truth**

```
web/
|-- editor.html          # Link panel markup (#area_link/#formLink + radioDefault/radioBidirectional + #btnChangeDirection)
`-- js/
    |-- aventyr.editor.js # Link form controller: editLink()/showLink()/onChangeLink()/onClickChangeDirection()
    |-- aventyr.model.js  # updateLink()/removeLink() + persistence trigger
    `-- aventyr.props.js  # Link props UI (link-variable lists for conditions)
```

---

### Step 27 – AdventureSettings: metadata, categories, fonts, lists, menu props

**What we do**

Implement `AdventureSettings.tsx`:
- Adventure title, description, category dropdown (from `/api/categories`).
- Cover image (reuse MediaPicker).
- Font list management (add/remove fonts).
- Menu options (show/hide overlay items, default sound settings, high contrast defaults).
- Optional (admin-only): list management/ordering via `/api/admin/lists` + `/api/admin/list/:id` (no public `/api/lists`).

**What we get**

- Adventure-level settings editable in one panel.
- Data matches adventure table fields and props.

**Feature Map coverage**

```
EDITOR
├── Adventure Settings Panel (via modal or tab)
│   ├── [x] Adventure title input
│   ├── [x] Adventure description textarea
│   ├── [x] Category selector dropdown
│   ├── [x] Cover image picker (opens Media Library)
│   ├── [x] Cover image preview
│   ├── [x] Delete cover image button
│   ├── [x] Menu options (global player settings)
│   │       ├── [x] Back button toggle
│   │       ├── [x] Home button toggle
│   │       ├── [x] Menu button toggle
│   │       └── [x] Sound button toggle
│   ├── [x] Font list management
│   │       └── [?] How fonts are added — needs investigation
│   ├── [x] Adventure-level properties
│   │       └── Similar to node props but apply as defaults
│   └── [x] Admin link (role-based visibility)
```

```
STATE & API
├── Model Operations
│   ├── [x] updateAdventure(adventureData)
```

**Source of Truth**

```
web/Important Docs PS_project/
`-- API_CONTRACT_FRONTEND.md  # Backend contract (primary)

web/
|-- editor.html            # Adventure settings UI (title/description/category, menu options, font upload)
`-- js/
    |-- aventyr.editor.js   # updateAdventure()/onChangeAdventure() + cover image + font upload/remove
    |-- aventyr.props.js    # Adventure props (menu_shortcuts/menu_sound_override/font_list + defaults)
    |-- aventyr.model.js    # updateAdventure() + getCategories() + image category helpers
    |-- aventyr.storage.js  # GET /api/categories, GET /api/images/:id (cover), GET /api/newAdventure
    `-- restclient.js       # REST client used by the above

backend (lists reference; not in legacy editor UI)
|-- router/router.go        # Admin API routes include /api/admin/lists
`-- controllers/api/lists.go# List endpoints (adventure_list/adventure_list_item)
```

---

### Step 28 – Editor-level behaviors: autosave UX, manual save, locks, preview/share

**What we do**

Add top-bar actions in editor:
- Autosave status indicator (saving/saved/error).
- Manual "Save now" button (force saveAdventure).
- Lock state banner when backend returns HTTP 423; disable editing accordingly.
- "Preview" / "Play" buttons that open player in preview or normal mode from root/selected node.
- Share/QR actions if needed (reusing existing backend routes).

**What we get**

Editor UX matches legacy expectations: autosave plus manual save, visible lock behavior, easy preview.

**Feature Map coverage**

```
EDITOR
├── Persistence
│   ├── [x] Auto-save (debounced, 250ms interval)
│   ├── [x] LocalStorage caching
│   ├── [x] Server sync (PUT /api/adventure/:slug)
│   ├── [x] Dirty state tracking (hasChanges)
│   ├── [x] Lock detection (HTTP 423)
│   ├── [x] Unsaved changes warning on page leave
│   └── [x] Status label updates
│
├── Sharing Modal
│   ├── [x] Edit link display
│   ├── [x] View link display  
│   ├── [x] QR code for view link
│   └── [x] Copy instructions
```

**Source of Truth**

```
web/Important Docs PS_project/
`-- API_CONTRACT_FRONTEND.md  # Backend contract (primary)

web/
|-- editor.html            # Autosave status label (#lblStatus), lock modal (#lockEdit), share modal (#modalShare), preview link (/testa/{slug})
`-- js/
    |-- aventyr.storage.js  # Autosave debounce (250ms) + PUT /api/adventure/:slug
    |-- aventyr.model.js    # didSave() lock detection (HTTP 423) + hasChanges()/clearChanges()
    |-- aventyr.app.js      # beforeunload warning + modelDidSave() -> editor.lockEditor()
    `-- aventyr.editor.js   # lockEditor() UI + preview node button sets ?nodeId
router/
`-- router.go              # /testa/{id} preview route + /spela/{id}/qr
```

---

## Block G – Media Feature

### Step 29 – MediaLibrary & media API wiring

**What we do**

Implement `MediaLibrary.tsx`:
- Grid of images/audio with selection.
- Filter by category or adventure.

Implement `MediaUploader.tsx` + useMediaUpload:
- Drag-and-drop uploads, progress, error handling, refresh list on success.

**What we get**

- Central media browser reusable across editor contexts (node image, cover, etc.).

**Feature Map coverage**

```
EDITOR
├── Media Library (modal)
│   ├── [x] Category tabs/dropdown
│   ├── [x] Image grid display
│   ├── [x] Image thumbnails
│   ├── [x] Click to select image
│   ├── [x] Returns selected image to caller (node or cover)
│   └── [?] Upload new image — check if in-modal or separate
│
├── Media Upload
│   ├── [x] Image upload (file input)
│   ├── [x] Audio upload (file input)
│   ├── [x] Subtitles upload (.vtt file input)
│   ├── [x] Upload progress indicator (loader)
│   ├── [x] Delete media from server
│   └── [~] Drag-and-drop upload — enhance in new version
```

**Source of Truth**

```
web/Important Docs PS_project/
`-- API_CONTRACT_FRONTEND.md  # Backend contract (primary)

web/
|-- editor.html            # Media library modal (#modalImageBank), category select (#image_categories), gallery grid (#gallery)
`-- js/
    |-- aventyr.editor.js   # updateImageCategories()/updateImages() + didSelectImage() + upload/delete media
    |-- aventyr.model.js    # getImageCategories/getImagesInCategory/getImage + uploadMedia/removeMedia
    |-- aventyr.storage.js  # GET /api/images/categories, GET /api/images/category/:id, GET /api/images/:id, POST/DELETE /api/media
    `-- restclient.js       # REST client used by the above
```

---

## Block H – Public Pages & Navigation

### Step 30 – Public layout & navigation header

**What we do**

Flesh out `(public)` layout:
- Use Header + Footer.
- Responsive navigation (logo, nav links, hamburger menu).

Setup base routes:
- `/` (home), `/(public)/info` pages placeholders, custom `not-found.tsx` for 404.

**What we get**

Shared public layout with navigation across all public pages.

**Feature Map coverage**

```
PUBLIC PAGES
└── Public Navigation
    ├── [x] Logo/branding
    ├── [x] Nav links
    └── [x] Responsive mobile menu
```

**Source of Truth**

```
web/
|-- header.html            # Public/shared <head> assets (Bootstrap + custom styles)
|-- 404.html               # Example public page shell; loads nav + storage scripts
|-- js/
|   |-- aventyr.nav.public.js # Public header dropdown ("edit adventure") built from Storage.list()
|   |-- aventyr.index.js      # Landing page typewriter entry (template with #txtIntro not in this /web snapshot)
|   `-- aventyr.storage.js    # list() recent adventures (localStorage-backed)
`-- css/textaventyr.css     # Public page styling baseline
```

---

### Step 31 – Homepage: adventure listing, category filter, edit dropdown

**What we do**

Implement `HomePage.tsx` + `AdventureCard.tsx`:
- Load lists of adventures via `GET /api/adventures/:listId` (where `listId` is a list title slug like `front`).
- Category filter component (tabs/dropdown).
- Adventure cards with thumbnails and meta.

Implement "Edit adventure" dropdown populated from localStorage cached adventures.

Add "Create new adventure" button (logged-in only, or redirect to login first) that calls `GET /api/newAdventure` and redirects to `/redigera/{slug}`.

**What we get**

New home page replicating legacy index behavior with listing, filtering, and quick editing access.

**Feature Map coverage**

```
PUBLIC PAGES
├── Homepage (index.html)
│   ├── [x] Adventure listing
│   ├── [x] Category filtering
│   ├── [x] Adventure cards with thumbnails
│   ├── [x] Edit dropdown (cached adventures)
│   ├── [x] Create new adventure button
│   └── [x] Navigation header
```

```
PUBLIC PAGES
└── Public Navigation
    ├── [x] Edit adventure dropdown
    │       └── Populated from localStorage
```


**Source of Truth**

```
web/Important Docs PS_project/
`-- API_CONTRACT_FRONTEND.md  # Backend contract (primary)

web/
|-- editor.html                 # Header/nav contains #btnEdit + #dropdown_adventures_edit + #new_adventure
|-- js/
|   |-- aventyr.nav.public.js    # Populates "Edit" dropdown from Storage.list() -> /redigera/{slug}
|   |-- aventyr.storage.js       # list() localStorage cache; newAdventure() GET /api/newAdventure (auth)
|   |-- aventyr.model.js         # newAdventure() -> storage.newAdventure()
|   |-- aventyr.app.js           # didPressNewAdventure(): redirectUrl("redigera/" + adventure.slug)
|   `-- aventyr.index.js         # Typewriter intro on homepage (#txtIntro; legacy index.html template missing here)
|-- controllers/web/web.go       # HomeHandler(): store.GetAdventures("front") -> index.html (template missing)
|-- controllers/web/archive.go   # ArchiveHandler(): list + child lists + store.GetAdventures(list.Title)
|-- store/sqlstore/adventure.go  # GetAdventures/GetAdventuresByCategory/GetAdventuresByListID query behavior
`-- router/router.go             # /api/newAdventure (GET) and /redigera/{id} route wiring
```

---

### Step 32 – 404 page & static info pages

**What we do**

Implement `not-found.tsx` with custom design.

Optionally add "typing animation effect" using a lightweight React implementation (nice-to-have).

Add simple static info pages (about, help) using InfoPageLayout.

**What we get**

Polished public experience when pages are missing or when showing static info.

**Feature Map coverage**

```
PUBLIC PAGES
├── 404 Page
│   ├── [x] Custom themed design
│   ├── [~] Typing animation effect
│   └── [x] Navigation back to home
```


**Source of Truth**

```
web/
|-- 404.html                 # Not found template; loads restclient/storage/nav + Typewriter CDN
|-- js/
|   |-- aventyr.404.js        # Typewriter text for 404 page (#txtLost)
|   |-- aventyr.index.js      # Typewriter intro for homepage (#txtIntro)
|   `-- aventyr.nav.public.js # Shared public nav (edit dropdown)
|-- controllers/web/web.go    # NotFoundHandler(): renders 404.html; also defines static pages handlers (templates missing)
`-- controllers/web/templates.go # Template reload + ParseGlob(./web/*.html) expectation
```

---

## Block I – Auth & Session

### Step 33 – Auth API & login form

**What we do**

Implement auth helper that calls `POST /api/auth` to obtain JWT.

Build login page (likely under `(public)`):
- Username/password fields.
- Save token to localStorage and propagate to api/client (send `Authorization: Bearer <token>` on protected routes).

**What we get**

- Users can log in with existing backend auth.
- Token-based access to protected editor APIs.

**Feature Map coverage**

```
STATE & API
├── REST Client
│   ├── [x] Auth token from localStorage
```


**Source of Truth**

```
web/Important Docs PS_project/
`-- API_CONTRACT_FRONTEND.md  # Backend contract (primary)

web/
|-- js/
|   |-- aventyr.storage.js    # Reads localStorage.getItem("token"); isLoggedIn(); passes token to Restclient
|   |-- restclient.js          # Legacy adds Authorization header (raw token); backend accepts Bearer; new frontend should send Bearer
|   `-- aventyr.editor.js      # Reads localStorage.getItem("user") to toggle admin UI (role-based)
|-- router/router.go           # POST /api/auth; secure /api/* under jwt.ControlMiddleware
|-- controllers/api/auth.go    # /api/auth contract: { token, id, role }
`-- helpers/jwt/jwt.go         # Authorization header parsing; strips optional "Bearer " prefix
```

---

### Step 34 – Protect editor routes & integrate auth with API client

**What we do**

Add client-side guard for `/redigera/[slug]`:
- Redirect to login if no token.

Ensure all protected API calls include `Authorization: Bearer <token>` header.

Optional: show different nav items based on auth state (e.g., "My adventures").

**What we get**

- Editor experience matches legacy security expectations.
- Auth wiring is encapsulated in API client + simple context/hook.

**Feature Map coverage**

No Feature Map items implemented in this step (route protection is not defined in FEATURE_MAP).


**Source of Truth**

```
web/Important Docs PS_project/
`-- API_CONTRACT_FRONTEND.md  # Backend contract (primary)

web/
|-- router/router.go          # /redigera/{id} is a public web route; protected APIs are under jwt.ControlMiddleware
|-- helpers/jwt/jwt.go        # ControlMiddleware enforces Authorization header on protected /api routes
|-- js/
|   |-- aventyr.storage.js     # isLoggedIn(); secure calls: load/save/newAdventure/uploadMedia/deleteMedia
|   |-- restclient.js          # Authorization header wiring (legacy sends token as-is; backend also accepts Bearer)
|   `-- aventyr.model.js       # load() uses GET /api/adventure/:id or GET /api/adventure/:slug/edit; didSave() handles 423
`-- controllers/web/editor.go  # EditorHandler(): serves editor page regardless of token (legacy client fails later on API)
```

---

## Block J – Cross-cutting Polish & Migration Odds-and-Ends

### Step 35 – Error states, toasts, locks, unsaved changes, documentation & TODOs

**What we do**

Implement consistent UX for:
- API errors (toasts using Sonner).
- Empty states (no adventures, no media, error loading adventure).
- Unsaved changes when navigating away (beforeunload prompt / warning banners).
- Lock conflicts (HTTP 423) with clear messaging and disabled inputs.

Add small docs:
- Design system usage (buttons, spacing, color tokens).
- Short explanation of API layer and DTOs.

**What we get**

- Production-ready feel for the new frontend.
- The rest of the team can work confidently on remaining polish or future features.

**Feature Map coverage**

```
UI CORE
├── Interactive Components
│   ├── [-] Toastify → Sonner
```

```
EDITOR
├── Persistence
│   ├── [x] Lock detection (HTTP 423)
│   ├── [x] Unsaved changes warning on page leave
│   └── [x] Status label updates
```

```
PLAYER
└── Player UI
    └── [x] Error message display
```

```
BEHAVIOR CHANGES TO CONSIDER
├── [?] Auto-layout is disabled in legacy — keep disabled or implement?
├── [?] LocalStorage cache — keep or rely on server only?
├── [?] 250ms autosave — adjust timing?
├── [?] Lock detection (423) — keep or change UX?
├── [?] Standalone player mode — still needed?
└── [?] Admin role features — clarify requirements
```


**Source of Truth**

```
web/
|-- js/
|   |-- aventyr.app.js         # beforeunload unsaved warning; modelDidSave() -> editor.lockEditor(); Toastify (commented)
|   |-- aventyr.storage.js      # 250ms autosave debounce (autosavetimerinterval + update()); hasUnsyncedChanges flag
|   |-- aventyr.model.js        # Lock detection: if save result.status == 423 -> onSave(); hasChanges()/clearChanges()
|   |-- aventyr.editor.js       # lockEditor(): shows #lockEdit modal; status label element (#lblStatus)
|   `-- aventyr.viewer.js       # errorMessage() rendering for player errors
|-- js/toastify.js              # Legacy toast library (mostly unused now; call in aventyr.app.js is commented)
`-- css/toastify.css            # Toastify styles
```

---

## Feature Map Coverage — Quick Index

To make it explicit where each Feature Map area is covered:

### EDITOR

| Area | Steps |
|------|-------|
| Graph Panel | Steps 18–20 |
| Node Panel / Node Form | Steps 21–25 |
| Node properties panel | Steps 21, 23, 23b |
| Node Actions & Link List | Step 25 |
| Link Panel | Step 26 |
| Adventure Settings Panel | Step 27 |
| Persistence & Sharing Modal | Steps 7, 28 |
| Media Library & Upload | Step 29 |
| Editor UI Chrome | Steps 9–10 |

### PLAYER

| Area | Steps |
|------|-------|
| Core navigation | Step 12 |
| Node rendering & props | Steps 12, 14–15 |
| Navigation buttons | Step 14 |
| Special node types | Step 13 |
| Overlay menu & audio system | Step 15 |
| Scrollytell & mobile | Step 17 |
| Statistics | Step 16 |
| Standalone mode | Step 16 |
| Player UI & error display | Steps 12, 14, 35 |

### PUBLIC PAGES

| Area | Steps |
|------|-------|
| Navigation & header | Steps 30–31 |
| Homepage listing, categories, edit dropdown, create adventure | Step 31 |
| 404 page | Step 32 |

### STATE & API

| Area | Steps |
|------|-------|
| Adventure model & node/link structures | Step 4 |
| REST client & endpoints | Step 5 |
| Model operations | Steps 6, 13, 25–27 |
| Storage layer & autosave | Step 7 |
| Event system semantics | Step 7 |
| Auth token in localStorage | Step 33 |

### UI CORE

| Area | Steps |
|------|-------|
| Layout components | Steps 3, 9, 30 |
| Styling system | Steps 2, 8 |
| Interactive components | Steps 10, 35 |
| Icons | Step 2 |
| Props system | Steps 11, 23 |
| Utilities (markdown helper, font loading) | Steps 2, 11, 22 |

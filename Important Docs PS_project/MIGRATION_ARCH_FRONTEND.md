# Projekt PS – Frontend Migration Architecture (v3)

This document describes how the legacy `/web` frontend maps into a modern Next.js + React + TypeScript codebase, **in a new mono‑repo that also contains an unchanged copy of the Go backend**. It is intended for the project owner and anyone needing a clear mental model of the new frontend organization. 

---

## High-level folder structure

Below is the proposed folder structure for the **new repo**: a copied Go backend in `backend/` and a fresh Next.js frontend in `frontend/`. The tree under `frontend/src` is essentially the same as in v2, with minor updates to routes and added notes about risks.

```text
backend/                                   # Go backend (copied from legacy repo)
├── cmd/                                   # Entrypoints (main server, small CLIs)
├── controllers/                           # HTML + JSON controllers (public, API, admin)
├── models/                                # Go structs for DB + JSON
├── store/                                 # Data access layer (SQL)
├── helpers/                               # JWT, router, Unsplash, logging, etc.
├── web/                                   # Legacy frontend (templates, JS, CSS) kept as reference
├── migrations/                            # DB migrations
└── upload/                                # Runtime media uploads (created at runtime, not versioned)

frontend/                                  # New Next.js + React + TS frontend
└── src/
    ├── app/                                    # Next.js App Router – all routes
    │   ├── layout.tsx                          # Root layout (fonts, providers, Sonner toaster)
    │   ├── not-found.tsx                       # Custom 404 page
    │   │
    │   ├── spela/
    │   │   └── [viewSlug]/
    │   │       └── page.tsx                    # Player route: /spela/{viewSlug}
    │   │
    │   └── redigera/
    │       └── [slug]/
    │           ├── layout.tsx                  # Editor-specific layout (no public header/footer)
    │           └── page.tsx                    # Editor route: /redigera/{slug}
    │
    ├── features/                               # Domain-specific modules (by sector)
    │   │
    │   ├── player/                             # Story playback UI
    │   │   ├── PlayerPage.tsx                  # Main player container (orchestrates subcomponents)
    │   │   ├── components/
    │   │   │   ├── NodeViewer.tsx              # Renders a single node's content (text, media)
    │   │   │   ├── PlayerControls.tsx          # Navigation buttons (next, back, menu, restart)
    │   │   │   └── ScrollyTracker.tsx          # Scroll-based storytelling behavior
    │   │   ├── hooks/
    │   │   │   └── usePlayerState.ts           # Hook for player session state (current node, history)
    │   │   └── index.ts                        # Barrel export
    │   │
    │   ├── editor/
    │   │   ├── graph/                          # Visual node graph (React Flow)
    │   │   │   ├── GraphCanvas.tsx             # React Flow canvas wrapper + configuration
    │   │   │   ├── components/
    │   │   │   │   ├── StoryNode.tsx           # Custom node component (title, status, icon)
    │   │   │   │   └── StoryEdge.tsx           # Custom edge component (label, delete handle)
    │   │   │   ├── hooks/
    │   │   │   │   └── useGraph.ts             # Graph state sync with Zustand + selection handling
    │   │   │   └── index.ts
    │   │   │
    │   │   └── node-panel/                     # Right-side editing panel
    │   │       ├── NodePanel.tsx               # Panel container (tabs: Node, Link, Settings)
    │   │       ├── components/
    │   │       │   ├── NodeForm.tsx            # Node metadata + content form
    │   │       │   ├── LinkForm.tsx            # Link editing form
    │   │       │   ├── RichTextEditor.tsx      # Tiptap + emoji-mart wrapper
    │   │       │   ├── AdventureSettings.tsx   # Adventure-level settings form
    │   │       │   └── MediaPicker.tsx         # Inline media selector (opens MediaLibrary)
    │   │       ├── hooks/
    │   │       │   └── useEditorPanel.ts       # Panel state (selection, dirty flag, validation)
    │   │       └── index.ts 
    │   │
    │   ├── public/                             # Public pages components
    │   │   ├── HomePage.tsx                    # Adventure list + category filter
    │   │   ├── components/
    │   │   │   ├── AdventureCard.tsx           # Single adventure card in grid
    │   │   │   ├── CategoryFilter.tsx          # Category tabs/dropdown
    │   │   │   └── InfoPageLayout.tsx          # Shared layout for static info pages
    │   │   └── index.ts
    │   │ 
    │   ├── ui-core/                            # Design system, shared UI, layout
    │   │   ├── components/
    │   │   │   ├── Header.tsx                  # Site header with navigation
    │   │   │   ├── Footer.tsx                  # Site footer
    │   │   │   ├── ImageZoom.tsx               # Lightbox/zoom component
    │   │   │   └── Icon.tsx                    # Lucide icon wrapper for consistency
    │   │   ├── primitives/                     # shadcn/ui components (generated via CLI)
    │   │   │   ├── button.tsx
    │   │   │   ├── dialog.tsx
    │   │   │   ├── dropdown-menu.tsx
    │   │   │   ├── tabs.tsx
    │   │   │   ├── tooltip.tsx
    │   │   │   └── ...                         # Other primitives as needed
    │   │   ├── providers/
    │   │   │   ├── ThemeProvider.tsx           # Theme context (fonts, colors per adventure)
    │   │   │   └── ToastProvider.tsx           # Sonner toast setup
    │   │   ├── styles/
    │   │   │   ├── globals.css                 # Tailwind directives + CSS variables
    │   │   │   └── fonts.ts                    # next/font configuration
    │   │   └── index.ts
    │   │
    │   ├── state/                              # Global state and API layer
    │   │   ├── stores/
    │   │   │   ├── adventureStore.ts           # Zustand: adventure model (nodes, links, metadata)
    │   │   │   ├── editorStore.ts              # Zustand: editor UI state (selection, panel mode)
    │   │   │   └── playerStore.ts              # Zustand: player session (current node, history)
    │   │   ├── api/
    │   │   │   ├── client.ts                   # Typed fetch wrapper (base URL, auth, errors)
    │   │   │   ├── adventures.ts               # Adventure CRUD: load, save, list
    │   │   │   └── media.ts                    # Media: upload, list, delete
    │   │   ├── hooks/
    │   │   │   ├── useAdventure.ts             # Combines store + API for loading/saving
    │   │   │   └── useAutosave.ts              # Debounced autosave logic
    │   │   ├── types/
    │   │   │   ├── adventure.ts                # Adventure, Node, Link interfaces
    │   │   │   └── media.ts                    # MediaItem, UploadResult interfaces
    │   │   └── index.ts
    │   │
    │   └── media/                              # Media management (images, audio)
    │       ├── MediaLibrary.tsx                # Full media browser (modal or panel)
    │       ├── components/
    │       │   ├── MediaUploader.tsx           # Drag-and-drop upload with progress
    │       │   └── MediaGrid.tsx               # Grid display of uploaded media
    │       ├── hooks/
    │       │   └── useMediaUpload.ts           # Upload state, progress, error handling
    │       └── index.ts
    │
    ├── lib/                                    # Generic utilities (not domain-specific)
    │   ├── cn.ts                               # Tailwind class merge (clsx + twMerge)
    │   └── markdown.ts                         # Markdown helpers (if needed for legacy content)
    │
    └── config/
        └── site.ts                             # Site-wide constants (name, URLs, defaults)
```

### Folder explanations

> Note: paths below like `src/app/` are relative to `frontend/`. The `backend/` layout follows the Architecture Baseline document and is copied as‑is. 

| Folder                            | Purpose                                                                                                                                                                                                  |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `backend/`                        | Copy of existing Go backend (cmd/controllers/models/store/web/migrations). Serves `/api` and `/upload` for both legacy and new frontend; backend behavior is intentionally unchanged for this migration. |
| `frontend/`                       | New Next.js + React + TypeScript frontend. Holds all new UI and client-side logic.                                                                                                                       |
| `src/app/`                        | Next.js App Router pages. Uses **route groups** like `(public)` for shared layouts. Each subfolder = URL route.                                                                                          |
| `src/app/(public)/`               | Public-facing pages with shared header/footer. The `(public)` folder name doesn't appear in URLs.                                                                                                        |
| `src/features/`                   | Business logic organized by **sector**. Each feature is self-contained with components, hooks, and exports.                                                                                              |
| `src/features/player/`            | Story playback: `PlayerPage` orchestrates node rendering, navigation, scrollytelling and statistics calls.                                                                                               |
| `src/features/editor/graph/`      | Visual graph canvas using React Flow. Custom nodes/edges and sync with global state.                                                                                                                     |
| `src/features/editor/node-panel/` | Right-side editing panel: forms, rich text editor (Tiptap), media picker, sharing dialog.                                                                                                                |
| `src/features/ui-core/`           | Design system: Header/Footer, shadcn primitives, theme/toast providers, global styles.                                                                                                                   |
| `src/features/state/`             | Centralized state (Zustand stores), typed API client, DTO/domain models, and shared TypeScript interfaces.                                                                                               |
| `src/features/media/`             | Media library and upload logic, extracted for reusability across editor contexts.                                                                                                                        |
| `src/lib/`                        | Small generic utilities not tied to any domain.                                                                                                                                                          |
| `src/config/`                     | Site-wide configuration values.                                                                                                                                                                          |

### Key architectural decisions

1. **Route Groups `(public)`**: Next.js App Router feature that lets us share a layout (with header/footer) across public pages without affecting URLs.

2. **Preserve core Swedish URLs**: Editor and player routes keep their legacy paths: `/redigera/{slug}` and `/spela/{viewSlug}`. No parallel `/editor` or `/play` aliases are introduced to avoid confusion and to keep all existing QR codes and links working.

3. **Feature-level page components** (e.g., `PlayerPage.tsx`): The `app/` routes are thin — they handle routing and data fetching, then delegate to feature components. This keeps business logic testable and reusable.

4. **Barrel exports** (`index.ts`): Each feature exposes a clean public API. Other parts of the app import from `@/features/player` rather than reaching into internal files.

5. **Explicit `primitives/` folder**: shadcn/ui components live here, generated via CLI. This makes it clear which components are "design system primitives" vs. domain-specific.

6. **Centralized types & DTOs**: `state/types/` holds shared TypeScript interfaces used by stores, API, and components. A separate DTO layer mirrors the Go backend JSON 1:1 so the backend contract is preserved without changing Go code.

7. **Backend as stable black box**: The `backend/` folder is a direct copy of the existing Go project and is treated as an API server we do not change during the frontend migration. All changes happen in the new `frontend/` codebase.

---

## Sector-by-sector mapping

This section walks through each sector, showing which legacy files it contains and how they map into the new structure.

---

### Player

The Player sector handles story playback — loading an adventure, displaying nodes, navigating between them, and scroll-based storytelling.

#### Legacy files overview

| Legacy path                     | Role in legacy                                                                         |
| ------------------------------- | -------------------------------------------------------------------------------------- |
| `web/js/aventyr.player.js`      | Main player entry point; adventure loading, node navigation, menu/button interactions. |
| `web/js/aventyr.viewer.js`      | Renders node content (text, media, transitions).                                       |
| `web/js/aventyr.scrollytell.js` | Scroll-based storytelling and touch/scroll interactions.                               |
| `web/ps_player.html`            | Player HTML template with DOM containers.                                              |

#### New structure for this sector

```text
src/app/spela/[viewSlug]/page.tsx     # Route: fetches adventure by viewSlug, renders PlayerPage
src/features/player/
├── PlayerPage.tsx                    # Main container; initializes state, composes UI
├── components/
│   ├── NodeViewer.tsx                # Renders node content (rich text, media)
│   ├── PlayerControls.tsx            # Next/back/menu buttons, dispatches state changes
│   └── ScrollyTracker.tsx            # Intersection Observer-based scroll behavior
├── hooks/
│   └── usePlayerState.ts             # Zustand selector + actions for player session
└── index.ts
```

#### Legacy → New mapping table

| Legacy path                     | New location(s) / status                               | Notes                                                                                                                                                                                   |
| ------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `web/js/aventyr.player.js`      | `PlayerPage.tsx` + `usePlayerState.ts` + player engine | Initialization and navigation logic split into React component, hook, and a small pure "player engine" module (random nodes, conditions). State managed via Zustand instead of globals. |
| `web/js/aventyr.viewer.js`      | `NodeViewer.tsx`                                       | Node rendering becomes a React component. Media embedding handled declaratively.                                                                                                        |
| `web/js/aventyr.scrollytell.js` | `ScrollyTracker.tsx`                                   | Reimplemented with Intersection Observer API and React hooks. No jQuery scroll handlers.                                                                                                |
| `web/ps_player.html`            | `app/spela/[viewSlug]/page.tsx` + `PlayerPage.tsx`     | HTML template replaced by Next.js route + React components. Styles via Tailwind.                                                                                                        |

#### Notes on design decisions

* **SSR for fast first paint**: The `app/spela/[viewSlug]/page.tsx` can use Next.js server components to fetch adventure data before rendering. The player sees content immediately, with no loading spinner for initial data.

* **State isolation**: Player has its own Zustand store slice (`playerStore`) separate from editor. Playing an adventure doesn't pollute editor state.

* **Player engine**: Navigation rules (random node preference, link conditions, ref-node / ref-node-tab behavior) live in a small, pure "engine" module that operates on `AdventureModel` and `node_id`s. React components just call the engine and render results — easier to test and closer to the legacy logic.

* **Scrollytelling as opt-in**: `ScrollyTracker` only activates if the adventure has scrollytell enabled in props. Uses modern Intersection Observer instead of scroll event listeners, which is more performant and works better on mobile.

* **Statistics preserved**: On each real node transition the player calls the existing `GET /api/statistics/{viewSlug}/{nodeId}` endpoint, gated by props (statistics toggle) and standalone mode (no stats). This keeps `adventure_log` and `view_count` behavior 1:1 with the legacy player.

* **Standalone mode**: Standalone (load from local JSON, no server communication) is implemented as a separate Player entry/mode that reuses the same engine and UI components, so behavior matches legacy but implementation stays DRY.

* **Accessibility**: `PlayerControls` uses proper `<button>` elements with ARIA labels. Navigation is keyboard-accessible. This was often missing in legacy jQuery-based controls.

---

### Editor Graph

The Editor Graph is the visual canvas showing story nodes and links, allowing authors to drag, zoom, pan, and select elements.

#### Legacy files overview

| Legacy path               | Role in legacy                                                  |
| ------------------------- | --------------------------------------------------------------- |
| `web/js/aventyr.graph.js` | Cytoscape-based graph: drawing, selection, drag, zoom, styling. |
| `web/js/aventyr.app.js`   | Editor orchestrator wiring graph events to the node panel.      |
| `web/js/cytoscape.js`     | Third-party Cytoscape.js library.                               |
| `web/editor.html`         | Editor HTML with graph canvas container.                        |

#### New structure for this sector

```text
src/app/redigera/[slug]/page.tsx      # Route: loads adventure by slug, renders graph + panel
src/features/editor/graph/
├── GraphCanvas.tsx                   # React Flow wrapper, configures viewport/callbacks
├── components/
│   ├── StoryNode.tsx                 # Custom node UI (title, icon, status badge)
│   └── StoryEdge.tsx                 # Custom edge UI (label, delete handle)
├── hooks/
│   └── useGraph.ts                   # Two-way sync: React Flow ↔ Zustand store
└── index.ts
```

#### Legacy → New mapping table

| Legacy path               | New location(s) / status                                                | Notes                                                                                      |
| ------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `web/js/aventyr.graph.js` | `GraphCanvas.tsx` + `useGraph.ts`                                       | Graph logic reimplemented with React Flow. Selection/drag handled by React Flow callbacks. |
| `web/js/aventyr.app.js`   | Split: graph wiring → `useGraph.ts`; panel wiring → `useEditorPanel.ts` | Monolithic orchestrator broken into focused hooks.                                         |
| `web/js/cytoscape.js`     | **Replaced by** React Flow                                              | Library swap. React Flow is declarative and integrates natively with React.                |
| `web/editor.html`         | `app/redigera/[slug]/page.tsx` + layout                                 | HTML template replaced by Next.js page and CSS Grid/Flexbox layout.                        |

#### Notes on design decisions

* **React Flow advantages**: Declarative node/edge rendering, built-in pan/zoom, virtualization for large graphs, and excellent React integration. Cytoscape required imperative DOM manipulation.

* **Custom nodes/edges**: `StoryNode.tsx` and `StoryEdge.tsx` give us full control over appearance. We can show status badges, icons, or even preview thumbnails — things that required complex Cytoscape configuration before.

* **Bidirectional sync via `useGraph`**: When user drags a node, React Flow updates → hook writes to Zustand store. When node is renamed in panel, store updates → React Flow re-renders. This replaces the manual event wiring in `aventyr.app.js`.

* **IDs aligned with backend**: React Flow node IDs use `node_id` (the adventure-local node identifier), because links use `source_node_id`/`target_node_id`. DB PK `id` is kept only as a field on the node model for persistence. This avoids confusion and broken links.

* **Multi-select ready**: The graph/store selection state is modeled as `selectedNodeIds: number[]` plus `primarySelectedNodeId`, even if the first version of the UI only edits one node at a time. This makes it straightforward to layer multi-node editing later without rewriting the graph.

* **Layout algorithms**: If legacy used automatic layout (e.g., dagre), we can integrate `@xyflow/dagre` plugin. React Flow ecosystem has plugins for common layouts.

* **TODO**: Implement keyboard shortcuts (delete node, undo/redo) using React Flow's event handlers or a global key listener.

---

### Editor Node Panel

The Editor Node Panel is the right-side panel where authors edit node content, configure links, and change adventure settings.

#### Legacy files overview

| Legacy path                         | Role in legacy                                                 |
| ----------------------------------- | -------------------------------------------------------------- |
| `web/js/aventyr.app.js`             | Orchestrator connecting selection to panel forms.              |
| `web/js/aventyr.editor.js`          | Panel logic: node/link forms, adventure settings, media modal. |
| `web/js/simplemde.min.js`           | SimpleMDE markdown editor for node text.                       |
| `web/js/emoji-button-2.12.1.min.js` | Emoji picker in text editor.                                   |
| `web/tinymce/tinymce.min.js`        | TinyMCE WYSIWYG editor (alternative mode).                     |
| `web/css/simplemde.min.css`         | SimpleMDE styles.                                              |
| `web/editor.html`                   | Panel HTML: forms, tabs, modals.                               |

#### New structure for this sector

```text
src/features/editor/node-panel/
├── NodePanel.tsx                     # Panel container with tabs
├── components/
│   ├── NodeForm.tsx                  # Node title, type, properties
│   ├── LinkForm.tsx                  # Link label, target, conditions
│   ├── RichTextEditor.tsx            # Tiptap + emoji-mart integration
│   ├── AdventureSettings.tsx         # Adventure metadata form
│   └── MediaPicker.tsx               # Opens MediaLibrary, returns selected media
├── hooks/
│   └── useEditorPanel.ts             # Selection tracking, dirty state, validation
└── index.ts
```

#### Legacy → New mapping table

| Legacy path                         | New location(s) / status                                                               | Notes                                                                                                                     |
| ----------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `web/js/aventyr.app.js` (panel)     | `useEditorPanel.ts`                                                                    | Selection wiring extracted into a hook. Subscribes to `selectedNodeIds`/`primarySelectedNodeId` from store.               |
| `web/js/aventyr.editor.js`          | Split into `NodeForm`, `LinkForm`, `AdventureSettings`, `MediaPicker`, `SharingDialog` | Monolithic file broken into focused components. Media logic moved to Media feature; sharing modal gets its own component. |
| `web/js/simplemde.min.js`           | **Replaced by** Tiptap in `RichTextEditor.tsx`                                         | SimpleMDE removed. Tiptap provides modern rich text editing.                                                              |
| `web/js/emoji-button-2.12.1.min.js` | **Replaced by** emoji-mart in `RichTextEditor.tsx`                                     | Modern React emoji picker integrated as Tiptap toolbar button.                                                            |
| `web/tinymce/tinymce.min.js`        | **Replaced by** Tiptap                                                                 | TinyMCE removed. Tiptap covers both markdown-like and WYSIWYG modes.                                                      |
| `web/css/simplemde.min.css`         | **Removed**                                                                            | Tiptap styled via Tailwind classes.                                                                                       |
| `web/editor.html` (panel)           | `NodePanel.tsx` + form components                                                      | HTML markup becomes JSX. Modals use shadcn Dialog.                                                                        |

#### Notes on design decisions

* **Unified text editor**: Legacy had both SimpleMDE (markdown) and TinyMCE (WYSIWYG), causing confusion. Tiptap provides one consistent editor that can output clean HTML or be configured for markdown-like input. This simplifies UX and eliminates conversion issues.

* **State-driven forms**: All form fields are controlled components tied to Zustand state. When user types, state updates immediately (with debouncing). This enables autosave and prevents "lost changes" when switching selection.

* **Media decoupling**: `MediaPicker` doesn't handle uploads itself — it opens `MediaLibrary` (from Media feature) and receives a callback with the selected media. This separation means media logic is reusable elsewhere (e.g., adventure cover image picker).

* **Multi-node editing**: `editorStore` tracks an array of selected node IDs. `NodePanel` derives a primary node for simple editing now, and later a dedicated `BulkEditPanel` (or mode) can apply property changes across `selectedNodeIds` without changing the underlying state shape.

* **Sharing modal preserved**: A dedicated `SharingDialog` component uses `slug` and `viewSlug` from `AdventureModel` to show edit link (`/redigera/{slug}`), view link (`/spela/{viewSlug}`) and QR code, matching legacy behavior but implemented with shadcn Dialog and a React QR component.

* **Dirty state tracking**: `useEditorPanel` tracks whether form has unsaved changes. If user clicks a different node while form is dirty, we can prompt to save or auto-save.

* **TODO**: Decide if panel uses tabs or accordion for Node/Link/Settings sections based on UX testing.

---

### Public Pages

Public Pages includes the homepage (adventure browsing), static info pages, the 404 page.

#### Legacy files overview

| Legacy path                                                           | Role in legacy                             |
| --------------------------------------------------------------------- | ------------------------------------------ |
| `web/js/aventyr.nav.public.js`                                        | Populates adventure lists on public pages. |
| `web/js/aventyr.404.js`                                               | Typing animation on 404 page.              |
| `web/index.html`                                                      | Homepage.                                  |
| `web/404.html`                                                        | Custom 404 template.                       |

#### New structure for this sector

```text
src/app/(public)/
├── layout.tsx                        # Shared layout with Header, Footer
├── page.tsx                          # Homepage (renders HomePage component)

src/app/not-found.tsx                 # Global 404 page

src/features/public/
├── HomePage.tsx                      # Adventure list with filtering
├── components/
│   ├── AdventureCard.tsx             # Single adventure card
│   ├── CategoryFilter.tsx            # Filter controls
│   ├── InfoPageLayout.tsx            # Shared prose layout
│   └── NotFoundAnimation.tsx         # Typing effect for 404
└── index.ts
```

#### Legacy → New mapping table

| Legacy path                    | New location(s) / status                                         | Notes                                                                                                              |
| ------------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `web/js/aventyr.index.js`      | `HomePage.tsx` (typewriter effect in hero section)               | Looping typewriter intro text reimplemented with React state + interval or a lightweight library like typewriter-effect. |
| `web/js/aventyr.nav.public.js` | `HomePage.tsx` + server-side data fetching + header dropdown     | Adventure list populated via SSR/SSG, not client-side DOM manipulation. Edit dropdown populated from localStorage. |
| `web/js/aventyr.404.js`        | `NotFoundAnimation.tsx`                                          | Typing effect reimplemented in React (useState + useEffect interval).                                              |
| `web/index.html`               | `app/(public)/page.tsx` + `HomePage.tsx`                         | HTML becomes Next.js route + React component.                                                                      |
| `web/404.html`                 | `app/not-found.tsx`                                              | Next.js built-in 404 mechanism.                                                                                    |

#### Notes on design decisions

* **SSR/ISR for homepage**: Adventure list can be server-rendered with Incremental Static Regeneration. Users see content immediately without loading spinners.

* **Edit adventure dropdown preserved**: The public header contains an "edit adventure" dropdown built from the same concept as legacy `storage.list()` — a localStorage-backed list of recently edited adventures, linking directly to `/redigera/{slug}`.

* **TODO**: Consider internationalization (i18n) if platform needs multiple languages later. Current structure supports it via Next.js i18n routing.

---

### UI Core

UI Core is the design system and shared layout layer — headers, footers, styling, theming, and UI primitives.

#### Legacy files overview

| Legacy path                                                   | Role in legacy                                                     |
| ------------------------------------------------------------- | ------------------------------------------------------------------ |
| `web/js/aventyr.props.js`                                     | Applies visual props (fonts, colors) from adventure/node settings. |
| `web/js/font_stupidity.js`                                    | Workaround for font loading issues.                                |
| `web/js/markdownhelper.js`                                    | Markdown → HTML helper.                                            |
| `web/js/markdown-it.min.js`                                   | Markdown parser library.                                           |
| `web/js/toastify.js`                                          | Toast notification library.                                        |
| `web/js/bootstrap.min.js`                                     | Bootstrap interactive components.                                  |
| `web/js/popper.min.js`                                        | Positioning engine for Bootstrap tooltips.                         |
| `web/css/textaventyr.css`                                     | Main custom stylesheet.                                            |
| `web/css/bootstrap.min.css`                                   | Bootstrap CSS framework.                                           |
| `web/css/ps.css`                                              | Global PS-specific styles.                                         |
| `web/css/ps_fonts.css`                                        | Custom font definitions.                                           |
| `web/css/all.css`                                             | Font Awesome icons.                                                |
| `web/css/zoom.css`                                            | Image zoom/lightbox styles.                                        |
| `web/css/toastify.css`                                        | Toast styles.                                                      |
| `web/header.html`, `header_editor.html`, `header_public.html` | HTML header templates.                                             |
| `web/footer.html`                                             | Footer template.                                                   |
| `web/fonts.html`                                              | Font embedding snippet.                                            |

#### New structure for this sector

```text
src/features/ui-core/
├── components/
│   ├── Header.tsx                    # Site header with nav links
│   ├── Footer.tsx                    # Site footer
│   ├── ImageZoom.tsx                 # Lightbox component
│   └── Icon.tsx                      # Lucide icon wrapper
├── primitives/                       # shadcn/ui components (generated)
│   ├── button.tsx
│   ├── dialog.tsx
│   ├── dropdown-menu.tsx
│   ├── tabs.tsx
│   ├── tooltip.tsx
│   └── ...
├── providers/
│   ├── ThemeProvider.tsx             # Adventure theme context (fonts, colors)
│   └── ToastProvider.tsx             # Sonner configuration
├── styles/
│   ├── globals.css                   # Tailwind base + CSS variables
│   └── fonts.ts                      # next/font setup
└── index.ts
```

#### Legacy → New mapping table

| Legacy path                                 | New location(s) / status                       | Notes                                                                                                                                                                      |
| ------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `web/js/aventyr.props.js`                   | `ThemeProvider.tsx` + props helpers module     | Props logic becomes CSS variables set at runtime. Helpers parse adventure/node `props` JSON to a typed structure; components read from theme context and `EffectiveProps`. |
| `web/js/font_stupidity.js`                  | **Removed**                                    | `next/font` handles font loading correctly. No hacks needed.                                                                                                               |
| `web/js/markdownhelper.js`                  | `lib/markdown.ts` or **removed**               | Tiptap handles rendering. Helper only needed for legacy content migration.                                                                                                 |
| `web/js/markdown-it.min.js`                 | **Replaced by** Tiptap                         | Editor outputs HTML directly. No runtime markdown parsing.                                                                                                                 |
| `web/js/toastify.js` + `toastify.css`       | **Replaced by** Sonner via `ToastProvider.tsx` | Modern React toast library with better defaults.                                                                                                                           |
| `web/js/bootstrap.min.js` + `popper.min.js` | **Replaced by** shadcn/ui (Radix)              | Modals, dropdowns, tooltips become accessible React primitives.                                                                                                            |
| `web/css/bootstrap.min.css`                 | **Replaced by** Tailwind CSS                   | Utility-first styling. No Bootstrap classes.                                                                                                                               |
| `web/css/textaventyr.css` + `ps.css`        | Migrated to `globals.css` + Tailwind utilities | Custom styles become CSS variables or utility classes.                                                                                                                     |
| `web/css/ps_fonts.css`                      | `styles/fonts.ts` + `globals.css`              | Font faces via `next/font` or CSS `@font-face`.                                                                                                                            |
| `web/css/all.css`                           | **Replaced by** Lucide icons                   | Tree-shakeable SVG icons imported per-component.                                                                                                                           |
| `web/css/zoom.css`                          | `ImageZoom.tsx`                                | Lightbox as React component with Tailwind animation.                                                                                                                       |
| `web/header*.html`                          | `app/layout.tsx` + `Header.tsx`                | Layouts and components replace HTML includes.                                                                                                                              |
| `web/footer.html`                           | `Footer.tsx`                                   | Footer as React component.                                                                                                                                                 |
| `web/fonts.html`                            | `styles/fonts.ts`                              | `next/font` for optimized font loading.                                                                                                                                    |

#### Notes on design decisions

* **shadcn/ui + Radix**: These provide accessible, unstyled primitives (Dialog, DropdownMenu, Tooltip) that we customize with Tailwind. Unlike Bootstrap, they're headless — we control the look completely.

* **No Bootstrap**: Tailwind utilities + shadcn primitives cover all Bootstrap use cases with less CSS shipped. No jQuery dependency.

* **Lucide icons**: Tree-shakeable (only icons we use are bundled), SVG-based (sharp at any size), styleable via CSS. Font Awesome required loading entire icon font.

* **Theme system & props**: `ThemeProvider` sets CSS variables based on parsed adventure/node props (fonts, colors, high-contrast, etc.). Parsing and merging (`AdventureProps`, `NodeProps`, `EffectiveProps`) live in a small helper module (e.g. `state/types/props.ts`), so components never touch raw JSON or stringly-typed props.

* **Accessibility**: Radix primitives have proper ARIA attributes, focus management, keyboard navigation built-in. This is a significant improvement over Bootstrap's often-incomplete accessibility.

* **TODO**: Document design system patterns (Button variants, spacing scale, color tokens) in a README for consistency across team.

---

### State & API

State & API centralizes the adventure data model, Zustand stores, and backend communication.

#### Legacy files overview

| Legacy path                          | Role in legacy                                            |
| ------------------------------------ | --------------------------------------------------------- |
| `web/js/aventyr.model.js`            | Core adventure data model (nodes, links, metadata).       |
| `web/js/aventyr.storage.js`          | Persistence: localStorage caching, server sync, autosave. |
| `web/js/restclient.js`               | REST client with auth headers.                            |

#### New structure for this sector

```text
src/features/state/
├── stores/
│   ├── adventureStore.ts             # Zustand: nodes, links, metadata, CRUD actions
│   ├── editorStore.ts                # Zustand: UI state (selection, panel mode)
│   └── playerStore.ts                # Zustand: playback session (current node, history)
├── api/
│   ├── client.ts                     # Fetch wrapper: base URL, auth, error handling
│   ├── adventures.ts                 # loadAdventure, saveAdventure, listAdventures, trackNodeVisit, reportAdventure
│   └── media.ts                      # uploadMedia, getMediaList
├── hooks/
│   ├── useAdventure.ts               # Combines store + API for loading/saving
│   └── useAutosave.ts                # Debounced save on state changes
├── types/
│   ├── adventure.ts                  # DTOs and domain models for Adventure, Node, Link
│   └── media.ts                      # MediaItem, UploadResult interfaces
└── index.ts
```

#### Legacy → New mapping table

| Legacy path                          | New location(s) / status                            | Notes                                                                        |
| ------------------------------------ | --------------------------------------------------- | ---------------------------------------------------------------------------- |
| `web/js/aventyr.model.js`            | `stores/adventureStore.ts` + `types/adventure.ts`   | Model becomes typed Zustand store + TS interfaces. Shape defined explicitly. |
| `web/js/aventyr.storage.js`          | `hooks/useAutosave.ts` + Zustand persist middleware | localStorage via Zustand persist. Autosave via debounced hook.               |
| `web/js/restclient.js`               | `api/client.ts`                                     | Rewritten as typed async functions using `fetch`.                            |

#### Notes on design decisions

* **Zustand over Redux**: Simpler API, less boilerplate, excellent TypeScript support. Perfect for this app's complexity level.

* **DTO vs domain model**: `api/adventures.ts` works with `AdventureDTO`/`NodeDTO`/`LinkDTO` interfaces that mirror the Go backend JSON 1:1 (including raw `props` strings, `node_id`, `link_id`, `edit_version`, etc.). `adventureStore` uses a slightly different `AdventureModel` shape optimized for React (normalized maps, parsed props). Mappers between DTO and model are the only place that "knows both worlds", so backend contract changes are localized.

* **Normalized state shape**: `adventureStore` uses `{ nodesById: Record<nodeId, Node>, linksById: Record<linkId, Link> }` keyed by **logical IDs** (`node_id`, `link_id`) that the backend uses in JSON. DB PK `id` is stored as a field on each node/link but never used as map key. This matches the legacy semantics (`source_node_id`/`target_node_id`) and avoids `id` vs `node_id` confusion.

* **Typed API layer**: `api/adventures.ts` functions return typed promises of DTOs. TypeScript catches mismatches between API responses and expected types.

* **Autosave strategy**: `useAutosave` subscribes to store changes, debounces, and triggers save after a short period of inactivity (e.g. 2 seconds). It uses the existing `edit_version` field from the backend for optimistic concurrency, so we don't invent new mechanisms like ETags.

* **Optimistic updates**: We can update UI immediately on user action, then sync to server. If save fails (including HTTP 423 Lock), we can revert or show error. This makes the editor feel snappier while respecting backend locks.

* **Statistics & reports wiring**: `api/adventures.ts` exposes helpers like `trackNodeVisit(viewSlug, nodeId)` and `reportAdventure(slug, payload)` that call existing `/api/statistics/...` and `/api/adventure/{slug}/report` endpoints. Player and public pages call these instead of constructing URLs manually.

---

### Media

The Media sector handles image and audio uploads, the media library browser, and media selection in the editor.

#### Legacy files overview

| Legacy path                | Role in legacy                                                            |
| -------------------------- | ------------------------------------------------------------------------- |
| `web/js/aventyr.editor.js` | Contains media upload logic, image bank modal, wiring to node properties. |
| `web/editor.html`          | Image bank modal markup.                                                  |

#### New structure for this sector

```text
src/features/media/
├── MediaLibrary.tsx                  # Full media browser (grid + filters)
├── components/
│   ├── MediaUploader.tsx             # Drag-and-drop upload zone
│   └── MediaGrid.tsx                 # Grid of media items with selection
├── hooks/
│   └── useMediaUpload.ts             # Upload state, progress, error handling
└── index.ts
```

#### Legacy → New mapping table

| Legacy path                        | New location(s) / status                                       | Notes                                                               |
| ---------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------- |
| `web/js/aventyr.editor.js` (media) | `MediaLibrary.tsx` + `MediaUploader.tsx` + `useMediaUpload.ts` | Media code extracted from monolithic editor file. Clean separation. |
| `web/editor.html` (image bank)     | `MediaLibrary.tsx` using shadcn Dialog                         | Modal markup becomes React component.                               |

#### Notes on design decisions

* **Media as separate feature**: In legacy, media logic was buried in `aventyr.editor.js`. Extracting it means we can reuse it (adventure cover images, user avatars, etc.) without duplication.

* **`MediaLibrary` vs `MediaPicker`**: `MediaLibrary` is the full browsable modal. `MediaPicker` (in node-panel) is a small trigger button that opens the library and handles the selection callback.

* **Upload handling**: `useMediaUpload` manages upload progress, handles errors, and updates the media list on success. Uses modern `fetch` with `FormData`, talking to the existing `/api/media` endpoints in the Go backend.

* **TODO**: Decide if media library is a modal or a dedicated route (`/redigera/[slug]/media`). Current proposal uses a modal for faster access.

* **TODO**: Consider image optimization (compression, resizing) on upload via Next.js API route or external service.

---

## Files removed or replaced by new tech

The following legacy files do **not** have a 1:1 new file because the new technology stack covers their functionality.

### Libraries replaced

| Legacy file                                   | What it did                        | Replaced by                                                      |
| --------------------------------------------- | ---------------------------------- | ---------------------------------------------------------------- |
| `web/css/animate.min.css`                     | CSS animations (flash, fade, etc.) | **Tailwind CSS** transitions + custom keyframes in globals.css |
| `web/js/cytoscape.js`                         | Graph rendering and interaction.   | **React Flow** — declarative React graph library with better DX. |
| `web/js/simplemde.min.js`                     | Markdown editor for node text.     | **Tiptap** — modern rich text editor with React bindings.        |
| `web/css/simplemde.min.css`                   | SimpleMDE styles.                  | **Removed** — Tiptap styled via Tailwind.                        |
| `web/tinymce/tinymce.min.js`                  | WYSIWYG editor (alternative mode). | **Tiptap** — single editor replaces both SimpleMDE and TinyMCE.  |
| `web/js/emoji-button-2.12.1.min.js`           | Emoji picker.                      | **emoji-mart** — modern React emoji picker.                      |
| `web/js/bootstrap.min.js`                     | Modals, dropdowns, tooltips.       | **shadcn/ui + Radix** — accessible React primitives.             |
| `web/js/popper.min.js`                        | Tooltip positioning.               | **Removed** — Radix handles positioning internally.              |
| `web/css/bootstrap.min.css`                   | CSS framework.                     | **Tailwind CSS** — utility-first styling.                        |
| `web/js/toastify.js` + `web/css/toastify.css` | Toast notifications.               | **Sonner** — lightweight React toast library.                    |
| `web/css/all.css`                             | Font Awesome icons.                | **Lucide** — tree-shakeable SVG icon library.                    |
| `web/js/markdown-it.min.js`                   | Markdown parsing.                  | **Tiptap** (or small utility if needed for legacy content).      |

### Workarounds and templates replaced

| Legacy file                | What it did              | Replaced by                                                |
| -------------------------- | ------------------------ | ---------------------------------------------------------- |
| `web/js/font_stupidity.js` | Font loading workaround. | **Removed** — `next/font` handles fonts correctly.         |
| `web/header.html`          | Shared `<head>` content. | **Next.js layouts** — `app/layout.tsx` handles meta/fonts. |
| `web/header_editor.html`   | Editor-specific header.  | **Editor layout** — `app/redigera/[slug]/layout.tsx`.      |
| `web/header_public.html`   | Public pages header/nav. | **`Header.tsx`** — React component in public layout.       |
| `web/footer.html`          | Shared footer.           | **`Footer.tsx`** — React component.                        |
| `web/fonts.html`           | Font embedding.          | **`styles/fonts.ts`** — `next/font` configuration.         |

### Technology swap summary

| Legacy tech          | New tech             | Why                                                                  |
| -------------------- | -------------------- | -------------------------------------------------------------------- |
| Cytoscape.js         | React Flow           | Declarative, React-native, better performance, easier customization. |
| SimpleMDE + TinyMCE  | Tiptap               | Single editor, better UX, outputs clean HTML, extensible.            |
| emoji-button         | emoji-mart           | Modern React component, actively maintained.                         |
| Bootstrap (CSS + JS) | Tailwind + shadcn/ui | Smaller bundle, better customization, accessible primitives.         |
| Toastify             | Sonner               | Cleaner API, better defaults, React-native.                          |
| Font Awesome         | Lucide               | Tree-shakeable, SVG-based, same icon coverage.                       |
| jQuery               | React                | All DOM manipulation is now React components. No jQuery.             |
| markdown-it          | Tiptap               | Rich text output is HTML; no runtime parsing needed.                 |

---

## Appendix: Open questions / TODOs

These items need decisions or further work during implementation. Some are updated to reflect that the Go backend is kept as-is.

### Data & API

1. **Adventure type shape (DTO + model)**
   Finalize TypeScript interfaces for `AdventureDTO`, `NodeDTO`, `LinkDTO` (mirror Go models and JSON 1:1) and for internal `AdventureModel` (normalized maps, parsed props). Backend API is considered fixed; no Go changes planned.

2. **Conflict detection & locks**
   Wire `useAutosave` and manual save flows to the existing `edit_version` + HTTP 423 semantics from the backend. Optional later improvement: nicer UI when a lock happens (which tab owns the lock, reload vs copy).

### UX decisions

3. **Node panel layout**
   Tabs vs. accordion for Node/Link/Settings sections — needs UX testing.

4. **Media library**
   Modal vs. dedicated route (`/redigera/[slug]/media`) — modal proposed for faster access.

5. **Unsaved changes**
   Prompt user when switching nodes with unsaved changes, or rely on autosave? (At minimum, avoid data loss when navigating away from the page.)

### Features

6. **Image optimization**
   Add compression/resizing on upload via Next.js API route or external service if upload size becomes an issue.

7. **Scrollytell mobile**
   Test scroll behavior on touch devices; may need a helper library like `react-scroll-trigger` or custom tweaks.

8. **Standalone player mode**
   Recreate the legacy standalone JSON player as a dedicated route/mode (e.g. `/spela/standalone`) that reuses the same Player engine but loads adventure data from a local file. No `/api` calls in this mode; behavior should match legacy.

### Infrastructure

9. **Legacy content migration**
    Plan one-time script to convert existing adventure content (Markdown/TinyMCE HTML) into a format that plays nicely with Tiptap (likely just sanitizing and treating it as HTML).

10. **Internationalization**
    Current structure supports Next.js i18n if multilingual support is needed later. Decide if/when to introduce locales.

11. **Auth & security hardening (later)**
    For now, mirror legacy behavior: use `POST /api/login` and JWT stored on the client to call existing `/api` endpoints. Once the new frontend is stable, consider moving to HTTP-only cookies / BFF and tightening admin checks — but this is explicitly out of scope for the initial migration.

### Documentation

12. **Design system docs**
    Document Button variants, spacing scale, color tokens, and usage patterns in a README for team consistency.

13. **API documentation**
    Generate OpenAPI (or similar) documentation for the subset of backend endpoints used by the new frontend. This helps keep the DTO layer honest and makes future changes easier.

---

*End of document.*

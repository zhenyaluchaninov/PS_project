# Feature Map — Projekt PS

This document maps all features of the legacy frontend.  
Use it to verify that migrated functionality is complete.

```
Legend:
[x] = Must have (core functionality)
[~] = Nice to have / can simplify  
[?] = Needs clarification / TODO
[-] = Will be removed (replaced by new tech)
```

---

## EDITOR

```
EDITOR
├── Graph Panel (left side)
│   ├── [x] Display nodes as visual elements
│   ├── [x] Display links/edges between nodes
│   ├── [x] Select node (tap/click)
│   ├── [x] Select link (tap/click)
│   ├── [x] Deselect (click background)
│   ├── [x] Drag node to reposition
│   ├── [x] Pan canvas (drag background)
│   ├── [x] Zoom in/out (scroll wheel)
│   ├── [x] Multi-select nodes (Ctrl/Shift + click or box select)
│   ├── [x] Hover state on nodes/links
│   ├── [x] Double-tap node → quick action (context menu?)
│   ├── [x] Node title displayed on graph
│   ├── [x] Different node types have different styles
│   │       └── root, default, chapter-node, videoplayer-node, etc.
│   ├── [x] Link direction indicators
│   ├── [x] Bidirectional link styling
│   ├── [~] Auto-layout (breadthfirst) — currently disabled in legacy
│   └── [x] Persist node positions (x, y saved to model)
│
├── Node Panel (right side) — appears when node selected
│   ├── Node Form
│   │   ├── [x] Title input (text)
│   │   ├── [x] Content editor (rich text)
│   │   │       └── [-] SimpleMDE/TinyMCE → Tiptap
│   │   ├── [x] Emoji picker in editor
│   │   │       └── [-] emoji-button → emoji-mart
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
│   │   └── [x] Node properties panel (expandable)
│   │           ├── [x] Chapter type selector
│   │           │       └── start-node, chapter-node, chapter-node-plain,
│   │           │           videoplayer-node, random-node, ref-node, ref-node-tab
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
│   │
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
│
├── Link Panel (right side) — appears when link selected
│   ├── [x] Link type radio: default / bidirectional
│   ├── [x] Target link label input
│   ├── [x] Source link label input (for bidirectional)
│   ├── [x] Change direction button (swap source/target)
│   ├── [x] Delete link button
│   └── [x] Link properties (conditions)
│           ├── [x] Positive node list (show if visited)
│           └── [x] Negative node list (hide if all visited)
│
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
│
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
│
├── Multi-Node Editing
│   ├── [x] Select multiple nodes in graph
│   ├── [x] Bulk property changes
│   ├── [x] Shows affected node list in modal
│   ├── [x] Changed properties highlighted (orange)
│   └── [x] Apply changes button
│
├── Persistence
│   ├── [x] Auto-save (debounced, 250ms interval)
│   ├── [x] LocalStorage caching
│   ├── [x] Server sync (PUT /api/adventure/{guid})
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
│
└── Editor UI Chrome
    ├── [x] Resizable split layout (graph | panel)
    ├── [x] Placeholder shown when nothing selected
    ├── [x] Toggle between node/link/placeholder views
    ├── [-] Bootstrap modals → shadcn Dialog
    ├── [-] Bootstrap dropdowns → shadcn DropdownMenu
    ├── [-] Toastify notifications → Sonner
    └── [-] Font Awesome icons → Lucide
```

---

## PLAYER

```
PLAYER
├── Core Navigation
│   ├── [x] Load adventure by slug/guid
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
│   ├── [x] Title display (for chapter nodes)
│   ├── [x] Background image
│   ├── [x] Background video (.mp4)
│   ├── [x] Video subtitles (.vtt)
│   ├── [x] Audio playback
│   ├── [x] Alternative audio (audio_alt)
│   ├── [x] Foreground color overlay
│   ├── [x] Apply node props (colors, fonts, etc.)
│   ├── [x] High contrast mode toggle
│   ├── [x] Hide background toggle
│   └── [x] Responsive text sizing (em units)
│
├── Navigation Buttons
│   ├── [x] Generate buttons from node links
│   ├── [x] Button label from link title or target node title
│   ├── [x] Ordered links support (custom order)
│   ├── [x] Show current node button option
│   ├── [x] Conditional visibility (visited/not visited)
│   ├── [x] Button styling from props
│   ├── [x] Press animation (btn-pressed class)
│   └── [x] Navigation arrow buttons (left/right/up/down)
│
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
│
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
│
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
├── Audio System
│   ├── [x] Audio player element
│   ├── [x] Volume control from props
│   ├── [x] Mute on tab switch (visibilitychange)
│   ├── [x] Previous audio tracking (for crossfade?)
│   ├── [x] Audio alt played tracking
│   └── [x] Preload media (XHR blob loading)
│
├── Statistics
│   ├── [x] Record node visits (if enabled)
│   ├── [x] POST to /statistics/{guid}/{nodeId}
│   └── [x] Conditional based on props and URL
│
├── Standalone Mode
│   ├── [x] Load from local JSON file
│   ├── [x] No server communication
│   └── [x] Editable flag from template
│
└── Player UI
    ├── [x] Full-screen layout
    ├── [x] Responsive design
    ├── [x] Mobile detection
    ├── [x] Touch interactions
    ├── [-] Bootstrap styles → Tailwind
    └── [x] Error message display
```

---

## PUBLIC PAGES

```
PUBLIC PAGES
├── Homepage (index.html)
│   ├── [x] Adventure listing
│   ├── [x] Category filtering
│   ├── [x] Adventure cards with thumbnails
│   ├── [x] Edit dropdown (cached adventures)
│   ├── [x] Create new adventure button
│   └── [x] Navigation header
│
├── 404 Page
│   ├── [x] Custom themed design
│   ├── [~] Typing animation effect
│   └── [x] Navigation back to home
│
└── Public Navigation
    ├── [x] Logo/branding
    ├── [x] Nav links
    ├── [x] Edit adventure dropdown
    │       └── Populated from localStorage
    └── [x] Responsive mobile menu
```

---

## STATE & API

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
│
├── Model Operations
│   ├── [x] load(guid) — fetch adventure
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
│
├── Storage Layer
│   ├── [x] LocalStorage caching
│   │       ├── set(guid, data)
│   │       ├── get(guid)
│   │       ├── exists(guid)
│   │       └── list() — recent adventures (max 20)
│   │
│   ├── [x] Server sync
│   │       ├── load(guid, edit, callback)
│   │       ├── save(guid, payload, callback)
│   │       └── automaticUpdate() — debounced
│   │
│   └── [x] Autosave timer (250ms debounce)
│
├── REST Client
│   ├── [x] Base URL: /api
│   ├── [x] Auth token from localStorage
│   ├── [x] GET, POST, PUT, DELETE methods
│   └── [x] Error handling
│
├── API Endpoints Used
│   ├── GET  /adventure/{slug}
│   ├── GET  /adventure/{slug}/edit
│   ├── PUT  /adventure/{guid}
│   ├── GET  /categories
│   ├── GET  /images/categories
│   ├── GET  /images/category/{id}
│   ├── GET  /images/{id}
│   ├── POST /media
│   ├── DELETE /media/{guid}/{url}
│   ├── GET  /newAdventure
│   ├── GET  /statistics/{guid}/{nodeId}
│   └── POST /adventure/{guid}/report
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

---

## UI CORE

```
UI CORE
├── Layout Components
│   ├── [x] Header (public pages)
│   ├── [x] Footer
│   ├── [x] Editor layout (split pane)
│   └── [x] Player layout (full screen)
│
├── Styling System
│   ├── [-] Bootstrap CSS → Tailwind
│   ├── [-] Custom CSS (ps.css, textaventyr.css) → Tailwind + CSS vars
│   ├── [x] Font loading (Google Fonts + custom)
│   ├── [x] Dynamic theme from adventure props
│   └── [x] Responsive breakpoints
│
├── Interactive Components
│   ├── [-] Bootstrap modals → shadcn Dialog
│   ├── [-] Bootstrap dropdowns → shadcn DropdownMenu
│   ├── [-] Bootstrap tooltips → shadcn Tooltip
│   ├── [-] Toastify → Sonner
│   └── [x] Image zoom/lightbox
│
├── Icons
│   └── [-] Font Awesome → Lucide
│
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

---

## MIGRATION NOTES

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

BEHAVIOR CHANGES TO CONSIDER
├── [?] Auto-layout is disabled in legacy — keep disabled or implement?
├── [?] LocalStorage cache — keep or rely on server only?
├── [?] 250ms autosave — adjust timing?
├── [?] Lock detection (423) — keep or change UX?
├── [?] Standalone player mode — still needed?
└── [?] Admin role features — clarify requirements
```

---

*Generated from legacy code analysis. Update as implementation progresses.*

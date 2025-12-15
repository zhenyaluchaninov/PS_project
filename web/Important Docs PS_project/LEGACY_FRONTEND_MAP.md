# Legacy Frontend File Map

Complete file structure of the legacy `/web` frontend for comparison with the new architecture.

---

```
web/
├── js/
│   │
│   │   # ─── Core Application ───
│   ├── aventyr.app.js                          # Editor orchestrator: wires graph, panel, and model
│   ├── aventyr.model.js                        # Core data model: nodes, links, adventure metadata
│   ├── aventyr.storage.js                      # Persistence: localStorage + server sync
│   ├── restclient.js                           # REST client with auth headers and error handling
│   │
│   │   # ─── Player ───
│   ├── aventyr.player.js                       # Player entry point: adventure loading, navigation
│   ├── aventyr.viewer.js                       # Node content renderer (text, media, transitions)
│   ├── aventyr.scrollytell.js                  # Scroll-based storytelling and touch interactions
│   │
│   │   # ─── Editor ───
│   ├── aventyr.graph.js                        # Cytoscape graph visualization (nodes, links, zoom)
│   ├── aventyr.editor.js                       # Right-side panel: node/link forms, settings, media
│   │
│   │   # ─── Shared Utilities ───
│   ├── aventyr.index.js                        # Landing page entry point: initializes looping typewriter intro text
│   ├── aventyr.props.js                        # Reads and applies node/adventure visual properties
│   ├── aventyr.nav.public.js                   # Public page navigation, dropdown population
│   ├── aventyr.404.js                          # 404 page effects (typing animation)
│   ├── markdownhelper.js                       # Markdown → HTML helper
│   ├── font_stupidity.js                       # Font loading workaround
│   │
│   │   # ─── Third-party Libraries ───
│   ├── cytoscape.js                            # [LIB] Cytoscape.js graph library
│   ├── simplemde.min.js                        # [LIB] SimpleMDE markdown editor
│   ├── emoji-button-2.12.1.min.js              # [LIB] Emoji picker
│   ├── markdown-it.min.js                      # [LIB] markdown-it parser
│   ├── toastify.js                             # [LIB] Toast notifications
│   ├── bootstrap.min.js                        # [LIB] Bootstrap JS (modals, dropdowns)
│   ├── popper.min.js                           # [LIB] Popper.js tooltip positioning
│   ├── jquery-3.3.1.slim.min.js                # [LIB] jQuery slim
│   └── zoom-vanilla.min.js                     # [LIB] Image zoom (vanilla JS)
│
├── css/
│   ├── textaventyr.css                         # Main custom styles (layout, forms, animations)
│   ├── ps.css                                  # Global PS styles (player, editor, public)
│   ├── ps_fonts.css                            # Custom font-face definitions
│   ├── bootstrap.min.css                       # [LIB] Bootstrap 4 CSS
│   ├── simplemde.min.css                       # [LIB] SimpleMDE styles
│   ├── all.css                                 # [LIB] Font Awesome icons
│   ├── animate.min.css                         # [LIB] Animate.css animations
│   ├── zoom.css                                # Image zoom/lightbox styles
│   └── toastify.css                            # [LIB] Toastify styles
│
├── tinymce/                                    # TinyMCE WYSIWYG editor
│   └── tinymce.min.js                          # [LIB] TinyMCE
│
│   # ─── HTML Pages ───
│
├── editor.html                                 # Editor page (graph canvas + panel)
├── ps_player.html                              # Player page (node content, controls)
├── 404.html                                    # Custom 404 page
│
│   # ─── Shared Partials (Go templates) ───
│
├── header.html                                 # Shared <head> template (meta, fonts, CSS)
├── header_editor.html                          # Editor-specific header
└── fonts.html                                  # Custom font embedding snippet
```

---

## Third-party libraries [LIB]

| Legacy library | Replaced by |
|----------------|-------------|
| `cytoscape.js` | React Flow |
| `simplemde.min.js` | Tiptap |
| `tinymce.min.js` | Tiptap |
| `emoji-button-*.js` | emoji-mart |
| `bootstrap.min.js` | shadcn/ui + Radix |
| `popper.min.js` | Radix (built-in) |
| `toastify.js` | Sonner |
| `markdown-it.min.js` | Tiptap |
| `all.css` (Font Awesome) | Lucide icons |
| `animate.min.css` | Tailwind + CSS |
| `jquery-*.js` | React (no jQuery needed) |
| `zoom-vanilla.min.js` | Custom React component |

---

*Based on repository analysis, December 2024*

# Adventure Editor — Settings Catalog (Code‑verified) & UX Reorg Notes

This catalog is **verified against the legacy editor source**:
- `editor.html` (legacy UI template)
- `aventyr.props.js` (props serialization + runtime application)
- `aventyr.editor.js` (editor wiring + save behavior)

> Goal: enable a *modern, faster* editor UI without changing gameplay logic or breaking existing adventures.

---

## Non‑destructive contract (MUST)

Any new UI reorganization **must**:
1) **Read legacy values correctly**  
2) **Write values back correctly**  
3) **Never delete / reset unknown keys** (“don’t zero keys you don’t understand”)

### Important: legacy editor is currently destructive
The legacy editor **rebuilds** `node.props` from the current UI fields and does **not** merge in unknown keys; unknown keys are dropped on save. The new editor should improve this by preserving unknown keys.

---

## Data model (where things live)

### Adventure
- `adventure.title`, `adventure.description`, `adventure.category`
- `adventure.cover_url` (uploaded cover) and/or `adventure.image_id` (image bank selection)
- `adventure.props` (JSON) for global menu + shortcuts + fonts

### Node
- `node.title`
- `node.text` (TinyMCE HTML). **Special case:** for `ref-node*`, this is used as **URL string**.
- `node.props` (JSON) for most styling + player behavior keys
- `node.image_url` (uploaded image/video URL)
- Some runtime mirrors exist (e.g. `node.audio_url`) but persistence is driven by `node.props` keys described below.

### Link
- `link.target_title`, `link.source_title`, `link.type`
- `link.props` (JSON) for conditional show/hide lists

---

## Node types (settings_chapterType values)

- `` — Vanlig
- `start-node` — Start
- `chapter-node` — Kapitel
- `chapter-node-plain` — Kapitel utan streck
- `ref-node` — Hyperlänk
- `ref-node-tab` — Nytab Hyperlänk
- `videoplayer-node` — Videospelare
- `podplayer-node` — Podspelare
- `random-node` — Slumpnod

**Ref nodes:** any `settings_chapterType` that starts with `ref-node` makes the editor label change to **“Hyperlänk (URL)”**, but the value is still stored in **`node.text`**.

---

## Navigation style (background.navigation_style values)

- `` — Textknappar
- `swipe` — Swipe
- `swipeWithButton` — Swipe med knapp
- `right` — Höger
- `leftright` — Vänster-höger
- `down` — Nedåt
- `noButtons` — Inga knappar

---

## Navigation properties (playerNavigation.settings values)

- `button-rounded` — Rundade hörn
- `navigation-opaque` — Bottenlåst
- `button-border-off` — Utan ram
- `buttons-narrow` — Samlade knappar
- `show-current-node` — Knapp i bild

---

## Video audio (settings_videoAudio values)

- `` — På
- `off` — Av
- `off_mobile` — Av om mobil

---

## Extra audio semantics (settings_extraAudio values)

- `` — Spela alltid
- `play_once` — En gång per nod

---

## Settings catalog

### Adventure-level settings

| Area | Legacy label (SV) | Proposed label (EN) | Storage (key) | Type / allowed values | Notes |
|---|---|---|---|---|---|
| Menu buttons | Meny | Menu buttons | adventure.props.menu_option (array) | ['back','home','menu','sound'] | Multi-select. Values come from <select multiple id='menu_options'>. |
| Mute sound on menu navigation | Ljud av vid menynavigation | Mute sound on menu navigation | adventure.props.menu_sound_override (boolean) | true/false | Checkbox id='menu_sound_override'. |
| Home shortcut node | Genväg hemknapp | Home shortcut: target node | adventure.props.menu_shortcuts[0].nodeId (string) | node id (without '#') | UI shows as '#<id>' in text input; selecting a node in graph auto-fills it. |
| Home shortcut label | Beskrivning hemknapp | Home shortcut: label | adventure.props.menu_shortcuts[0].text (string) | free text |  |
| Menu shortcuts (1..8) nodes | Genväg menylänkar | Menu shortcut: target node | adventure.props.menu_shortcuts[1..8].nodeId | node id | There are 8 additional inputs in the template. |
| Menu shortcuts (1..8) labels | Beskrivning menylänkar | Menu shortcut: label | adventure.props.menu_shortcuts[1..8].text | free text |  |
| Fonts | Fonter / Fontfil | Fonts (uploaded) | adventure.props.font_list (array) | ['/upload/...'] | Uploaded font URLs; also injected into 'background.font' select as 'xfont-<name>' options. |
| Adventure metadata | Titel / Beskrivning / Kategori | Title / Description / Category | adventure.title / adventure.description / adventure.category | strings / id | These are not inside adventure.props (they are direct adventure fields). |
| Cover image | Omslagsbild | Cover image | adventure.cover_url (string) and/or adventure.image_id | URL or image id | Cover can be uploaded (cover_url) and there is also image-bank selection (image_id). |

### Node core settings

| Setting | Legacy label (SV) | Proposed label (EN) | Storage (key) | Type / allowed values | Notes |
|---|---|---|---|---|---|
| Node title | Nodens namn | Node title | node.title | string |  |
| Node body / URL | Brödtext / Hyperlänk (URL) | Body text / Link URL | node.text | HTML (TinyMCE) OR URL string | When node type starts with 'ref-node', label changes to 'Hyperlänk (URL)' but it is still stored in node.text. |
| Node type | Nodtyp | Node type | node.props.settings_chapterType (array) | see list | Single selection stored as array in props JSON. |
| Button order | Knappordning | Choice / button order | node.props.ordered_link_ids (array) | link_id list | Stored as list of link IDs, not node IDs. |
| Node variable toggle | Nodvariabel | Node variable mode | node.props.node_conditions (array) | '' or 'hide_visited' | Controls node-variable behavior in player. |
| Statistics node | Statistiknod | Statistics node | node.props.node_statistics (array) | '' or 'on' |  |

### Node appearance & behavior

| Setting | Legacy label (SV) | Proposed label (EN) | Storage (key) | Type / allowed values | Notes |
|---|---|---|---|---|---|
| Background color | Bakgrund | Background color | node.props.color_background (string) | #RRGGBB | Color input. |
| Foreground color | Förgrund | Foreground color | node.props.color_foreground (string) | #RRGGBB | Color input; transparency in alpha_foreground. |
| Foreground opacity | Transparens | Foreground opacity (%) | node.props.alpha_foreground (string/number) | 0..100 | Numeric input. |
| Text shadow | Textskugga | Text shadow | node.props['outer_container.textShadow'] (array) | text-shadow-black/white/'' |  |
| Text background color | Bakgrund text | Text background color | node.props.color_textbackground (string) | #RRGGBB | Opacity in alpha_textbackground. |
| Text background opacity | (alpha field) | Text background opacity (%) | node.props.alpha_textbackground (string/number) | 0..100 |  |
| Text color | Ikonfärg | Text/icon color | node.props.color_text (string) | #RRGGBB | Opacity in alpha_text. |
| Text opacity | (alpha field) | Text/icon opacity (%) | node.props.alpha_text (string/number) | 0..100 |  |
| Vertical position | Vertikalposition | Vertical alignment | node.props['player.verticalPosition'] (array) | top/center/bottom classes |  |
| Side margins | Vänstermarginal / Högermarginal | Left / Right margins | node.props.player_container_marginleft / _marginright | number | Number inputs; units handled in player CSS. |
| Background fit | Bakgrundspassning | Background sizing | node.props['background.size'] (array) | cover/contain |  |
| Background position | Bildposition | Background position | node.props['background_image.position'] (array) | background-center/top/... |  |
| Background animation | Bakgrundsanimation | Background animation | node.props['background_image.animation'] (array) | scroll/kenburns/crossfade/'' |  |
| Grayscale | Gråskala | Grayscale filter | node.props.settings_grayscale (array) | '' or 'on' | Applied as CSS filter grayscale(100%). |
| Blur | Blur | Blur (px) | node.props.color_blur (string/number) | 0..N | Applied as CSS filter blur(<px>). Key name is legacy-misnamed. |
| Text animation | Textanimation | Text animation | node.props['player_container.animation'] (array) | fading-* or '' | Controls paragraph fade pacing. |
| Animation delay | Animationsfördröjning | Animation delay | node.props.animation_delay (string/number) | seconds |  |
| Background fade duration | Bakgrundsfade | Background fade duration | node.props.animation_backgroundfade (string/number) | seconds | Used when the background changes. |
| Auto node switch timer | Automatisk nodväxling | Auto-advance timer | node.props.node_timer (string/number) | seconds | After delay, triggers first link. |

### Node navigation, buttons & UI

| Setting | Legacy label (SV) | Proposed label (EN) | Storage (key) | Type / allowed values | Notes |
|---|---|---|---|---|---|
| Navigation style | Navigationstyp | Navigation style | node.props['background.navigation_style'] (array) | see list | Includes swipe / swipeWithButton / leftright / down / noButtons. |
| Navigation text size | Knapptextstorlek | Button text size | node.props.playerNavigation_textSize (array) | 8..18 | Stored as string values (pt). |
| Navigation delay | Navigationfördröjning | Navigation delay | node.props.playerNavigation_delay (string/number) | seconds | Delays button appearance relative to text animation. |
| Buttons background | Bakgrund knappar | Buttons background color | node.props.color_buttonbackground (string) | #RRGGBB | Opacity in alpha_buttonbackground. |
| Buttons background opacity | (alpha field) | Buttons background opacity (%) | node.props.alpha_buttonbackground | 0..100 |  |
| Buttons text color | Färg knapptext | Buttons text color | node.props.color_buttontext | #RRGGBB | Opacity in alpha_buttontext. |
| Buttons text opacity | (alpha field) | Buttons text opacity (%) | node.props.alpha_buttontext | 0..100 |  |
| Buttons alignment | Knappjustering | Buttons alignment | node.props['playerNavigation.alignment'] (array) | align-left/center/right/... |  |
| Navigation properties | Navigationsegenskaper | Navigation properties | node.props['playerNavigation.settings'] (array) | see list | Multi-select. |
| Node-variable style | Nodvariabeltyp | Visited-condition style | node.props.type_nodeconditions (array) | hide/color/transparency/colortrans | Applies to condition-marked buttons. |
| Node-variable color | Nodvariabelfärg | Visited-condition color | node.props.color_nodeconditions / alpha_nodeconditions | #RRGGBB + 0..100 |  |
| Button hover animation | Sväva-animation | Hover animation | node.props['playerNavigation.buttonAnim'] (array) | btn-1..btn-5 or '' | Only applied on non-mobile. |
| Button idle animation | Vänte-animation | Idle animation | node.props['playerNavigation.buttonIdle'] (array) | fade/invert/'' | Applied with staggered delay. |
| Button/menu font | Typsnitt knapp/meny | Button/menu font | node.props['background.font'] (array) | font-* or xfont-* | Includes uploaded fonts as xfont-<name>. |
| Progress bar type | Förloppsfält | Progress bar type | node.props.progress_bar_type (array) | '' / square / rounded | When empty => off. |
| Progress bar color | Förloppsfärg | Progress bar color | node.props.progress_bar_color (string) | #RRGGBB |  |
| Progress bar background | Förloppsbakgrund | Progress bar background | node.props.progress_bar_bgcolor (string) | #RRGGBB |  |

### Node media

| Setting | Legacy label (SV) | Proposed label (EN) | Storage (key) | Type / allowed values | Notes |
|---|---|---|---|---|---|
| Image upload (file) | Ladda upp bild/video | Upload image/video | node.image_url (string) | /upload/... | Stored as top-level node.image_url; not in node.props JSON. |
| Subtitles (WebVTT) | Ladda upp undertext | Upload subtitles (.vtt) | node.props.subtitles_url (string) + runtime node.subtitles_url | /upload/... .vtt | Persisted in node.props as subtitles_url; UI shown only for MP4. |
| Audio (main) | Ladda upp ljudfil | Upload audio (main) | node.props.audio_url (string) + runtime node.audio_url | /upload/... | Persisted in node.props as audio_url. |
| Audio volume | Volym | Audio volume | node.props.audio_volume (string/number) | 0..100 | BUG in legacy: editor UI always resets to 100 on load (does not restore saved value). |
| Audio (extra) | Ladda upp extraljud | Upload audio (extra) | node.props.audio_url_alt (string) + runtime node.audio_url_alt | /upload/... | Persisted in node.props as audio_url_alt. |
| Audio loop | Ljudspelning | Audio looping | node.props.settings_audioLoop (array) | true/false | String values. |
| Audio fade-out | Ljudfade-ut | Audio fade-out | node.props.settings_audioFadeOut (array) | 0.0/1.0/2.0/4.0/'' | Seconds as strings. |
| Audio fade-in | Ljudfade-in | Audio fade-in | node.props.settings_audioFadeIn (array) | 0.0/1.0/2.0/4.0/'' | Seconds as strings. |
| Extra-audio semantics | Extraljud | Extra audio semantics | node.props.settings_extraAudio (array) | '' / play_once | Controls how alt track behaves. |
| Video loop | Videospelning | Video looping | node.props.settings_videoLoop (array) | true/false |  |
| Video audio | Video-ljud | Video audio behavior | node.props.settings_videoAudio (array) | '' / off / off_mobile |  |
| Scroll speed | Skrollfart | Scroll speed | node.props.settings_scrollSpeed (array) | 0/0.5/0.75/1.0/1.5 |  |

### Link settings

| Setting | Legacy label (SV) | Proposed label (EN) | Storage (key) | Type / allowed values | Notes |
|---|---|---|---|---|---|
| Link target label | Länkens namn | Link label (forward) | link.target_title | string | Edited in Link editor. Placeholder shows target node title. |
| Link reverse label | Länkens namn | Link label (reverse) | link.source_title | string | Only visible when type is bidirectional. |
| Direction | Riktning | Direction | link.type | default / bidirectional | Also supports 'Byt riktning' (change direction). |
| Conditional show list | Visa knapp när alla besökta | Show button when ALL visited | link.props.positiveNodeList (array) | node id list (strings) | List items are clickable to remove; input expects number node_id. |
| Conditional hide list | Göm knapp om alla besökta | Hide button when ALL visited | link.props.negativeNodeList (array) | node id list (strings) |  |

---

## Bulk edit behavior (legacy)

Legacy supports a “bulk change” mode for multiple selected nodes:
- Focusing a `.prop-input` toggles an orange highlight (field is “selected for bulk”).
- On change, it calls a bulk update on the selected node IDs with only those highlighted fields.

This is powerful but very non-obvious. In the new UI, we should keep the capability but present it explicitly (e.g., “Apply to selection” toggles or a multi-edit drawer).

---

## UX reorg opportunities (safe improvements)

### Command Palette (add this)
Add a command palette (⌘K / Ctrl+K) for:
- Jump to node by ID/title
- Create node
- Duplicate selected node
- Delete selected node (with confirm)
- Create link from/to...
- Open specific settings tab (Appearance / Media / Navigation / Advanced)
- Search settings by name (English)

### Remove unnecessary buttons (but preserve underlying actions)
Legacy has explicit “Create node” and “Delete node” buttons.
A modern editor can add:
- **Delete key** to delete selected node
- **Drag-to-create** (drag from a node handle to empty space creates a new node + link)
- **Duplicate** (Ctrl+D) to clone node + props + media refs (careful with uniqueness)

---

## Known legacy quirks to preserve (even if UI changes)

- **Ref node URL is stored in `node.text`.**  
  New UI can show a dedicated URL field, but it must still read/write `node.text`.

- Many prop values are stored as **arrays of strings** (because selects serialize as arrays), even when there is only one value.

- Some keys have misleading names (e.g., `color_blur` is a number in px). Preserve keys.

- **Potential legacy bug:** audio volume UI does not restore saved `audio_volume` and resets to 100 when editing.  
  New editor should restore it properly (and still preserve old behavior for nodes missing that key).

---


---

## Not found in the provided legacy editor sources (may exist elsewhere)

In the three files you provided (`editor.html`, `aventyr.props.js`, `aventyr.editor.js`) I did **not** find references to:

- `node.icon` (emoji/icon field)
- `image_layout_type`
- “Show current node” toggle
- “Navigation opaque” toggle

This does **not** prove they don’t exist in the system (they could live in backend models, player code, or other legacy JS files).  
It **does** mean: the editor as implemented here does not expose those fields, and they would be preserved only if we follow the **non‑destructive JSON merge** rule.


## Implementation safety checklist (for migration)

- Preserve unknown keys in `node.props`, `link.props`, `adventure.props`.
- Preserve `node.text` exactly for ref nodes (treat as URL string).
- Avoid accidental schema migration on save (no “cleanup” that deletes keys).
- Ensure default values are applied at render-time, not by overwriting stored JSON.


# API Contract for Frontend

## 1. Purpose
This document describes how the legacy `/web` frontend talks to the Go backend. It is the contract the new Next.js + TypeScript frontend should rely on. All endpoints live under `/api` (JSON) or `/ws` (WebSocket, currently disabled in routing).

## 2. Core Entities (Data Models)

### 2.1 Adventure
- **Origin**: `models/adventure.go: Adventure`
- **Description**: Story container with graph content and access control.
- **Fields**
```ts
type Adventure = {
  id: number;
  title: string;
  description?: string;
  slug: string;            // edit slug (read/write)
  view_slug: string;       // public slug (read-only)
  locked?: boolean;        // true => editing disabled
  created_at?: string;
  updated_at?: string;
  category?: Category;
  nodes?: Node[];
  links: Link[];
  cover_url?: string;      // relative to /upload
  edit_version: number;    // increments on edit session start
  view_count: number;
  props?: string;          // JSON string, see AdventureProps
  users: User[];           // editors with access
};

type AdventureProps = { font_list: string[] };
```

### 2.2 Node
- **Origin**: `models/node.go: Node`
- **Description**: Graph node/page of an adventure.
- **Fields**
```ts
type Node = {
  id: number;
  node_id: number;         // adventure-local identifier used by links
  title: string;
  icon?: string;
  text: string;            // HTML content, maps to Go Node.Content (json:"text")
  x?: number;
  y?: number;
  image_url?: string;
  image_id?: number;
  image_layout_type?: string;
  type?: string;           // e.g. "root", "default"
  changed?: boolean;       // mark for update on save
  props?: string;          // JSON string, see NodeProps
};

type NodeProps = {
  audio_url?: string;
  audio_url_alt?: string;
  subtitles_url?: string;
};
```

### 2.3 Link
- **Origin**: `models/link.go: Link`
- **Description**: Directed or bidirectional edge between nodes.
- **Fields**
```ts
type Link = {
  id: number;
  link_id: number;         // adventure-local identifier
  source: number;          // Node.node_id
  source_title?: string;
  target: number;          // Node.node_id
  target_title?: string;
  type: string;            // e.g. "bidirectional"
  changed?: boolean;
  props?: string;          // free-form JSON
};
```

### 2.4 Category
- **Origin**: `models/category.go: Category`
- **Description**: Adventure grouping/metadata.
- **Fields**
```ts
type Category = {
  id: number;
  sort_order?: number;
  title: string;
  description?: string;
  icon: string;
  image?: string;
};
```

### 2.5 List
- **Origin**: `models/list.go: List`
- **Description**: Ordered collections of adventures (front page, archive, etc.).
- **Fields**
```ts
type List = {
  id: number;
  title: string;
  description: string;
  parent_id: number;
  adventures: Adventure[];
  created_at: string;
};
```

### 2.6 Media (upload response)
- **Origin**: `controllers/api/media.go: Image`
- **Description**: Result of uploading media to `/upload/{adventureId}/`.
- **Fields**
```ts
type MediaUploadResponse = { url: string }; // relative URL to the stored file
```

### 2.7 Image & ImageCategory
- **Origin**: `models/image.go`, `models/image_category.go`
- **Description**: Unsplash-sourced images grouped by category.
- **Fields**
```ts
type Image = {
  id: number;
  title: string;
  author: string;
  author_url: string;
  full_url: string;
  download_url: string;
  thumb_url: string;
};

type ImageCategory = {
  id: number;
  title: string;
  images?: Image[];
};
```

### 2.8 User
- **Origin**: `models/user.go: User`
- **Description**: Editor/admin account.
- **Fields**
```ts
type User = {
  id: number;
  username: string;
  name: string;
  role: number;           // lower appears to be more privileged (role <= 1 = admin)
  created_at?: string;
  updated_at?: string;
  adventures?: Adventure[];
};
```

### 2.9 Report
- **Origin**: `models/report.go: Report`
- **Description**: Player-submitted report about an adventure.
- **Fields**
```ts
type Report = {
  id: number;
  adventure_id: number;
  report_reason: string;
  comment: string;
  is_handled: number;     // 0/1
  created_at: string;
};
```

### 2.10 NodeStat
- **Origin**: `models/adventure.go: NodeStat`
- **Description**: Aggregated analytics per node.
- **Fields**
```ts
type NodeStat = {
  node_id: number;
  title: string;
  visit_count: number;
};
```

## 3. REST API Endpoints
All responses are JSON. Errors are returned as `{"error": "<message>"}` with an HTTP status. Cache headers are set to `no-store`.

### 3.1 Auth
- **POST `/api/auth`**
  - **Auth**: none.
  - **Request**
    ```ts
    { username: string; password: string; }
    ```
  - **Response 200**
    ```ts
    { token: string; id: number; role: number; }
    ```
  - **Notes**: Token must be sent as `Authorization: Bearer <token>` to protected routes. Actual backend route is `/api/auth`.

### 3.2 Adventures (public player)
- **GET `/api/adventure/:id`**
  - Intended for player/read access. Accepts either public slug (`view_slug`) or edit slug (`slug`) because the handler uses `models.Ignore`; prefer `view_slug` for public links.
  - **Response 200**: `Adventure` (includes `nodes`, `links`, `users`, `category`, `props`).
  - **Errors**: `404` when missing.

- **GET `/api/statistics/:id/:nodeId`**
  - Logs that node `nodeId` (numeric) was visited within adventure `id` (edit slug `slug`, not `view_slug`). Returns `"success"` on 200.
  - **Errors**: `400` invalid node id; `404` adventure not found.

- **Media**
  - **POST `/api/media`**
    - Multipart form with `adventureId` (slug) and file field `media`.
    - **Response 200**: `MediaUploadResponse` with relative `url`.
  - **DELETE `/api/media/:adventure/:hash`**
    - Deletes a stored file under `/upload/:adventure/:hash` if it is not referenced by multiple nodes/props.
    - **Response 200**: `{ result: "success" }`; `404` if adventure missing.

### 3.3 Adventures (editor/authenticated)
All routes below require `Authorization: Bearer <token>` unless `DEV_AUTH_BYPASS` is enabled on the server.

- **GET `/api/adventure/:id/edit`**
  - Returns adventure for editing and increments `edit_version`. `:id` uses the edit slug (`slug`).
  - Additional access check: if `user.role > 1`, user must be listed in `adventure.users`.
  - **Response 200**: `Adventure`.
  - **Errors**: `404` not found; `400` if user lacks access.

- **POST `/api/adventure`** and **GET `/api/newAdventure`**
  - Creates a new default adventure (with starter nodes/links).
  - **Response 201**: `Adventure`.

- **PUT `/api/adventure/:id`**
  - Updates adventure content (title/description/category/cover/props) and upserts/deletes nodes and links.
  - `:id` uses the edit slug (`slug`).
  - **Request body**: `Adventure` with nested `nodes` and `links`. For existing nodes/links set `changed: true` to persist updates; new entries have `id = 0`. `edit_version` must match the latest value.
  - **Responses**: `200` updated `Adventure`; `404` not found or locked; `400` invalid payload; `423` if `edit_version` is stale.

- **POST `/api/adventure/:id/report`**
  - Creates a report for the adventure (id can be edit or view slug).
  - **Request**
    ```ts
    { code: string; comment?: string; }
    ```
  - **Response 201**: the reported `Adventure`.

- **GET `/api/adventures/:listId`**
  - Returns all adventures belonging to the list identified by `listId` (list title slug).
  - **Response 200**: `Adventure[]`; `404` if list missing.

- **GET `/api/categories`**
  - Returns all categories.
  - **Response 200**: `Category[]`.

### 3.4 Admin Adventures (authenticated, admin role)
- **POST `/api/admin/adventures`**
  - Filter/paginate adventures.
  - **Request**
    ```ts
    {
      filter: { type: "CATEGORY" | "SEARCH" | "REPORT"; category_id?: number; search_string?: string; };
      pagination: { page: number; size: number; };
    }
    ```
  - **Response 200**: `{ adventures: Adventure[]; count: number; }`.
  - **Notes**: `SEARCH` requires `search_string` length >= 3.

- **GET `/api/admin/adventure/:id`**
  - Fetch adventure by numeric id (includes nodes/links/users).

- **PUT `/api/admin/adventure/:id`**
  - Updates adventure metadata only (title/description/category/locked/cover_url/users/view_slug).
  - **Request body**: partial `Adventure` with `category.id`, `users` list.

- **DELETE `/api/admin/adventure/:id`**
  - Deletes adventure and its media folder.

- **PUT `/api/admin/copy/:slug`**
  - Duplicates an adventure (edit slug), including nodes/links/media, returns the new copy.

### 3.5 Categories (admin)
- **GET `/api/admin/categories`**
- **POST `/api/admin/categories`**
  - **Request**: `{ title: string; icon: string; sort_order: number; }`.
- **GET/PUT/DELETE `/api/admin/category/:id`**
  - Update uses same payload as create.

### 3.6 Lists (admin)
- **GET `/api/admin/lists`**
- **POST `/api/admin/lists`**
  - **Request**: `{ title: string; description: string; parent_id: number; adventures: Adventure[] }` (adventures optional on create).
- **GET/PUT `/api/admin/list/:id`**
  - Update replaces list metadata and adventure ordering (ordinal based on array order).

### 3.7 Users (admin)
- **GET `/api/admin/users`**
- **POST `/api/admin/users`**
  - **Request**: `{ name: string; username: string; password: string; role: number; }`.
- **GET `/api/admin/user/:id`**
- **PUT `/api/admin/user/:id`**
  - **Request**: `{ id: number; name: string; username: string; password?: string; role: number; }` (omit password to keep existing).
- **DELETE `/api/admin/user/:id`**

### 3.8 Images
- **GET `/api/images/:id`**
  - Returns one `Image`; also triggers Unsplash download logging server-side.
- **GET `/api/images/categories`**
  - Returns `ImageCategory[]`.
- **GET `/api/images/category/:id`**
  - Returns all `Image` in a category.

### 3.9 Transfer (admin)
- **PUT `/api/admin/importAdventure/`**
  - Body: zip file stream containing an adventure JSON and `/upload` files. Server assigns a new slug and rewrites media paths.
  - **Response 200**: imported `Adventure`.

- **GET `/api/admin/exportAdventure/:slug`**
  - Returns a zip containing adventure JSON, media from `/upload/:slug`, static player files, and a pre-rendered `index.html`.
  - **Response**: `Content-Type: application/zip`; body is binary.

### 3.10 Analytics
- **PUT `/api/admin/statistics/`**
  - **Request**
    ```ts
    { adventureId: number; startTime: string; stopTime: string; }
    ```
  - **Response 200**: `NodeStat[]`.

## 4. WebSocket API
- **Endpoint**: `/ws` (Gorilla WebSocket), but the route is currently commented out in `router/router.go`.
- **Auth**: none; origin check is disabled.
- **Message format**: JSON with optional `cmd`, `topic`, `message`. Server injects `userID` server-side.
```ts
type ClientMessage = { cmd?: string; topic?: string; message?: string; };
type ServerMessage = { cmd?: string; topic?: string; message?: string; userID: string; };
```
- **Behavior**: Messages are broadcast to users subscribed to a `topic`, but subscription handling is not implemented; `user.topic` is never set. Treat this as a stub--no production features rely on it.

## 5. Auth & Session Expectations
- Login via `POST /api/auth` returns a JWT token.
- Protected routes expect `Authorization: Bearer <token>`; token payload holds `user_id` and a 7-day expiration (server enforces `nbf` 30 minutes after issuance).
- No session cookies or CSRF tokens are used.
- `DEV_AUTH_BYPASS` (env) allows the backend to inject a fixed user id without validating tokens; do not rely on this in production.
- Frontend-visible role rules:
  - Admin routes and some edit routes require a valid token.
  - `GET /api/adventure/:id/edit` further restricts users with `role > 1` to adventures where they are listed in `adventure.users`.
- Public access: playing/viewing adventures and logging node visits are open (`GET /api/adventure/:id`, `GET /api/statistics/...`, image/media GET/POST/DELETE are currently unauthenticated).

## 6. URL Routing Relevant to Frontend (legacy `/web`)
- `/engagera/:id` (GET) → player view (public slug), logs view count.
- `/spela/:id` (GET) → player view (edit or public slug), logs view count.
- `/testa/:id` (GET) → preview player without view count increment.
- `/redigera/:id` (GET) → legacy editor, requires edit slug and adventure not locked.
- `/spela/:id/qr` → returns QR PNG to the public play URL.
- Static: `/static/*` serves legacy assets under `web/`; `/upload/*` serves uploaded media; `/admin/*` serves the legacy admin UI (separate React app, out of scope).
- Catch-all `/:id` routes to the player, so slugs resolve even without prefixes.

## 7. Notes and Open Questions
- WebSocket server is present but not wired into the router and lacks subscription handling; safe to ignore unless realtime features are added.
- `/api/media` upload/delete endpoints are unauthenticated; consider tightening for the new frontend.
- Reporting (`POST /api/adventure/:id/report`) currently requires auth even though it is a player action--verify desired behavior for the new app.
- `role` semantics are inferred (lower = more privileged); there is no explicit role enum in code.
- List deletion is implemented in storage but not exposed via routing; align with product needs before using.




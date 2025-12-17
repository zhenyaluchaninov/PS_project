# Dev workflow: frontend locally, backend + DB in Docker

Faster loop: keep the Go backend and MySQL running in Docker while running Next.js with hot reload locally.

## Start backend + DB only
- From the repo root: `docker compose up -d db backend`
- MySQL data lives in the named volume `db_data` (Docker shows it as `ps_project_db_data`), mounted to `/var/lib/mysql` — safe to restart containers without losing data.
- To stop without dropping data: `docker compose stop backend db`
- **Do not** run `docker compose down -v` or `docker volume rm ps_project_db_data` unless you intend to wipe the database.

## Run the frontend locally
- In a separate shell:
  - `cd frontend`
  - Install once: `npm install` (or `pnpm install`)
  - Start dev server: `npm run dev` (or `pnpm dev`)
- Open http://localhost:3000
- API/media routing in dev:
  - `/api/*` and `/upload/*` are proxied by Next to `http://localhost:8080` (the backend container’s published port).
  - Leave `API_BASE_URL` unset for local dev so calls stay relative to `/api` and avoid CORS.

## Handy checks
- Backend direct: http://localhost:8080/api/images/categories
- Through frontend proxy: http://localhost:3000/api/images/categories
- Confirm DB volume exists: `docker volume ls` (look for `ps_project_db_data`) or `docker volume inspect ps_project_db_data`
- Verify persistence: make a data change in the app, run `docker compose restart backend db` (or stop/start), then confirm the change is still present.

## Uploads
- Backend serves uploaded media from `/upload/*`; the Next dev proxy forwards those paths to the backend so media loads at `http://localhost:3000/upload/...`.

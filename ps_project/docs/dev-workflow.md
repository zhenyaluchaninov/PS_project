# Dev workflow: frontend locally, backend + DB in Docker

Faster loop: keep the Go backend and MySQL running in Docker while running Next.js with hot reload locally.

## Start backend + DB only
- From the repo root: `docker compose up -d db backend`
- MySQL data lives in the named volume `db_data` (Docker shows it as `ps_project_db_data`), mounted to `/var/lib/mysql`.
- To stop without dropping data: `docker compose stop backend db`
- Do not run `docker compose down -v` unless you intend to wipe the database.

## Run the frontend locally
- In a separate shell:
  - `cd frontend`
  - Install once: `npm install` (or `pnpm install`)
  - Set API base URL: `NEXT_PUBLIC_API_BASE_URL=http://localhost:8080`
  - Start dev server: `npm run dev` (or `pnpm dev`)
- Open `http://localhost:3000/nyredigera/<slug>`
- Browser API and media calls go directly to `http://localhost:8080` via `NEXT_PUBLIC_API_BASE_URL`.

## Handy checks
- Backend direct: http://localhost:8080/api/images/categories
- Confirm DB volume exists: `docker volume ls` (look for `ps_project_db_data`) or `docker volume inspect ps_project_db_data`
- Verify persistence: make a data change in the app, run `docker compose restart backend db`, then confirm the change is still present.

## Uploads
- Backend serves uploaded media from `/upload/*` on the same host as the API base URL.
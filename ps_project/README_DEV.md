# PS Project - Dev Slice

Run the Go backend, MariaDB, and the Next.js frontend with a single command.

## Prerequisites
- Docker + Docker Compose
- Ports available: `3000` (Next dev), `8080` (Go backend), `3306` (MariaDB), `3001` (react-admin optional)

## Faster frontend loop (frontend locally)
- Keep backend + DB in Docker: `docker compose up -d db backend`
- Run Next locally with hot reload: `cd frontend && npm install && npm run dev` (or `pnpm dev`)
- Set API base for browser calls: `NEXT_PUBLIC_API_BASE_URL=http://localhost:8080`
- Open `http://localhost:3000/nyredigera/<slug>`
- MySQL data persists in the named volume `ps_project_db_data`; avoid `docker compose down -v` to keep it.
- Full details: `docs/dev-workflow.md`

## Quick start
```bash
cd ps_project
docker compose up --build
```
- Frontend: http://localhost:3000
- Backend: http://localhost:8080
- Database: MariaDB 10.11 (`DB_*` creds from `.env`, seeded from `backend/database/dump.sql`)

Optional react-admin dev server:
```bash
docker compose --profile admin up --build
```
Runs at http://localhost:3001 and points at the backend published on `:8080`.

## API smoke test
- Frontend browser call target: `NEXT_PUBLIC_API_BASE_URL` (for local dev: `http://localhost:8080`)
- Direct backend check: http://localhost:8080/api/images/categories

Expected: JSON payload or JSON error, not an HTML page.

## Notes
- Frontend no longer relies on Next rewrites for `/api/*` or `/upload/*`.
- Backend and frontend code are bind-mounted for hot reload. Backend uploads persist in `backend/upload` (ignored by git).
# PS Project – Dev Slice

Run the Go backend, MariaDB, and the new Next.js frontend with a single command.

## Prerequisites
- Docker + Docker Compose
- Ports available: `3000` (Next dev), `8080` (Go backend), `3306` (MariaDB), `3001` (react-admin optional)

## Faster frontend loop (frontend locally)
- Keep backend + DB in Docker: `docker compose up -d db backend`
- Run Next locally with hot reload: `cd frontend && npm install && npm run dev` (or `pnpm dev`)
- Open http://localhost:3000 — `/api/*` and `/upload/*` are proxied to `http://localhost:8080`
- MySQL data persists in the named volume `ps_project_db_data`; avoid `docker compose down -v` to keep it.
- Full details: `docs/dev-workflow.md`

## Quick start
```bash
cd ps_project
docker compose up --build
```
- Frontend: http://localhost:3000 (Next.js App Router, Tailwind, shadcn/ui helpers, Zustand, React Query, Tiptap, React Flow, emoji-mart, Sonner, Lucide installed)
- Backend: http://localhost:8080
- Database: MariaDB 10.11 (`DB_*` creds from `.env`, seeded from `backend/database/dump.sql`)

Optional react-admin dev server:
```bash
docker compose --profile admin up --build
```
Runs at http://localhost:3001 and points at the backend published on `:8080`.

## API smoke test
- Through frontend proxy (Next rewrite to backend): http://localhost:3000/api/images/categories
- Direct backend (optional): http://localhost:8080/api/images/categories

Expected: JSON payload or JSON error, not a Next HTML page.

## Notes
- Rewrites in `frontend/next.config.mjs` forward `/api/*` and `/upload/*` to the backend. Override the target with `BACKEND_URL` if needed.
- Backend and frontend code are bind-mounted for hot reload. Backend uploads persist in `backend/upload` (ignored by git).

# Frontend (Next.js editor)

This app now targets **static export** for the editor surface and is served by the Go backend.

- Editor entry path: `/nyredigera/<slug>`
- API base URL: `NEXT_PUBLIC_API_BASE_URL`
- Next rewrites are not used for `/api` or `/upload`

## Local development

```bash
cd frontend
npm install
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080 npm run dev
```

Open `http://localhost:3000/nyredigera/<slug>`.

## Static export for Go deployment

Build and stage exported files into the Go web folder:

```bash
cd frontend
npm run build:editor:deploy
```

This does:
1. `next build` with `output: "export"` (writes `frontend/out`)
2. Copies `frontend/out/*` to `backend/web/next-editor/`

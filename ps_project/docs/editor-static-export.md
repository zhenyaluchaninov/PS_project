# Editor Static Export Deployment

This project serves the Next.js editor as static assets from the Go backend.

## Runtime routes
- `/nyredigera/{slug}`: serves exported Next editor page
- `/nyredigera`: redirects to `/admin/`
- Legacy routes (`/spela`, `/testa`, `/engagera`, `/redigera`) remain in Go handlers

## Frontend build

From `frontend/`:

```bash
npm run build:editor:deploy
```

This builds the static export (`frontend/out`) and stages it to:

`backend/web/next-editor/`

## Backend serving

Go router serves:
- `/_next/*` from `backend/web/next-editor/_next/*`
- `/nyredigera/{slug}` with `backend/web/next-editor/nyredigera/index.html`

## API base URL

Browser requests use a fully-qualified base URL:
- `NEXT_PUBLIC_API_BASE_URL` if set
- otherwise current `window.location.origin`

For local frontend dev:

`NEXT_PUBLIC_API_BASE_URL=http://localhost:8080`

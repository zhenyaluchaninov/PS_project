# AGENTS.md

Plan: static export deployment for Next editor frontend inside Go site

Goal: deploy the Next.js editor frontend as static assets and serve it from the Go router under the new editor path, while legacy frontend routes remain handled by existing web templates/router.

Confirmed assumptions
- Only the editor route is in scope for Next static export.
- Legacy player/public routes (e.g., /spela, /testa, /engagera) continue through existing backend web handlers.
- The editor is entered with a slug from another GUI/workflow.
- Backend router behavior:
  - `/nyredigera/{slug}` serves the exported Next editor page.
  - `/nyredigera` (no slug) redirects to `/admin/` (legacy-compatible behavior).
- The Go API will remain the source of data and is accessible at runtime from the browser.

Plan
1) Scope migration to editor-only surface
   - Keep Next migration focused on `/nyredigera` editor experience.
   - Exclude player/public legacy paths from this migration phase.
   - Ensure frontend can resolve slug from URL when page is served at `/nyredigera/{slug}`.

2) Make the Next build compatible with static export
   - Update next.config.mjs to use static output and disable image optimization (images.unoptimized: true).
   - Replace or adjust any features that require a Node server (rewrites, runtime image optimization, server-only assumptions).
   - Do not rely on precomputed slug exports for editor entry.

3) Update route naming for editor entry
   - Rename editor-facing route references from `/redigera` to `/nyredigera` in the Next app.
   - Keep backend legacy `/redigera` handling untouched unless explicitly planned as cleanup.

4) Adjust runtime API endpoints for browser-only calls
   - Replace reliance on Next rewrites (/api, /upload) with a fully qualified API base URL.
   - Ensure CORS is configured on the Go server for the final host and path.

5) Build and emit static assets
   - Add or update build scripts to emit static output (e.g., next build/export or output: "export").
   - Validate the generated output folder structure and asset paths.

6) Serve static assets from the Go router
   - Add static file handler(s) for exported Next assets.
   - Route `/nyredigera/{slug}` to the exported Next editor page.
   - Route `/nyredigera` to `/admin/` redirect.
   - Keep legacy routes and existing catch-all behavior intact for non-editor paths.

7) Validate end-to-end behavior
   - Test loading `/nyredigera/{slug}` from Go host and confirm editor bootstraps with that slug.
   - Verify API calls, media upload/download paths, and CORS behavior from the editor page.
   - Verify `/nyredigera` redirects to `/admin/`.

Deliverables
- Updated Next config and editor route definitions supporting static export.
- Build output folder served by Go for editor entry path.
- Documented build/deploy steps.

Verification checklist
- Static export completes without Next errors.
- Navigating to `/nyredigera/<slug>` loads the editor from the Go host.
- Navigating to `/nyredigera` redirects to `/admin/`.
- Editor API calls resolve to the Go backend with correct CORS.

Open questions
- Should legacy `/redigera/{slug}` continue in parallel (temporary compatibility), or redirect to `/nyredigera/{slug}`?
- Should editor page parsing read slug from pathname only, or also support query fallback for troubleshooting?

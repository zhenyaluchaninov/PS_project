# AGENTS.md

Plan: static export deployment for Next frontend inside Go site

Goal: make the Next.js frontend deploy as static assets and serve it from the Go router as one page among other legacy pages.

Assumptions to confirm
- The Next app should be reachable under a specific path (e.g., /spela, /testa, /nyredigera, or a new base path).
- The list of valid slugs for dynamic routes can be precomputed at build time.
- The Go API will remain the source of data and is accessible at runtime from the browser.

Plan
1) Inventory dynamic routes and data needs
   - Identify all app routes and which require dynamic params (e.g., /spela/[viewSlug], /nyredigera/[slug], /testa/[slug]).
   - Decide how to generate slug lists for static export (from API, database dump, or a build-time JSON fixture).

2) Make the Next build compatible with static export
   - Update next.config.mjs to use static output and disable image optimization (images.unoptimized: true).
   - Replace or adjust any features that require a Node server (rewrites, runtime image optimization).
   - Add generateStaticParams for each dynamic route or convert routes to runtime query params if pre-generation is not possible.

3) Update route naming for editor entry
   - Rename the app route folder from /redigera to /nyredigera.
   - Update hardcoded links and copy that reference /redigera to use /nyredigera.

4) Adjust runtime API endpoints for browser-only calls
   - Replace reliance on Next rewrites (/api, /upload) with a fully qualified API base URL.
   - Ensure CORS is configured on the Go server for the final host and path.

5) Build and emit static assets
   - Add or update build scripts to emit static output (e.g., next build/export or output: "export").
   - Validate the generated output folder structure and asset paths.

6) Serve static assets from the Go router
   - Add a static file handler for the exported Next assets under the desired path.
   - Configure fallback routing to index.html for client-side navigation.

7) Validate end-to-end behavior
   - Test loading key pages from the Go host (player, editor, public landing) and confirm API calls succeed.
   - Verify media upload/download paths and CORS behavior.

Deliverables
- Updated Next config and route definitions supporting static export.
- Build output folder served by Go under the chosen path.
- Documented build/deploy steps.

Verification checklist
- Static export completes without Next errors.
- Navigating to /spela/<slug>, /testa/<slug>, /nyredigera/<slug> works from the Go host.
- API calls resolve to the Go backend with correct CORS.

Open questions
- Where should the Next app be mounted in the legacy site (exact path)?
- How should we source slug lists for static generation (API call, DB export, or fixed list)?
- Are there routes that must remain dynamic and thus require a Node server?

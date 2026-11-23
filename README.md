# FindIt — Lost Something? Let's Find It.

**Release:** Phase 1 – Local Demo Edition  
**Architecture:** Zero-build HTML5 + CSS3 + ES6 Modules (Responsive Website + Installable Android PWA)

## What's Included
- **Responsive Website & Android PWA in one codebase** — Desktop top navigation & footer automatically adapt into a mobile-first bottom app bar and standalone PWA on Android.
- **100% Offline Local Demo (IndexedDB)** — Stores reports, compressed item photographs, demo user profiles, claims, saved listings, and status timelines directly on your device with zero server or API keys required.
- **Realistic Labeled Sample Data** — Pre-seeded demo items clearly tagged `SAMPLE`, with one-tap **Reset Demo Data** and **Download JSON Backup**.
- **Phase 2 Supabase Ready** — Includes `SupabaseAdapter` interface in `db.js`, `.env.example`, and complete SQL tables + Row Level Security policies in `supabase-schema.sql`.

## Project Files (Root Folder)
- `index.html` — App shell & PWA metadata
- `styles.css` — Responsive light/dark theme stylesheet
- `db.js` — IndexedDB engine, demo seed data, photo compressor & Supabase adapter blueprint
- `app.js` — Hash router, all pages (Home, Browse, Item Detail, Report/Edit, Dashboard), and claim workflows
- `manifest.json` — Android PWA install configuration & shortcuts
- `sw.js` — Offline Service Worker cache
- `icon.svg` — Scalable FindIt logo icon
- `404.html` — GitHub Pages fallback redirect
- `supabase-schema.sql` — Phase 2 PostgreSQL schema & RLS policies
- `.nojekyll`, `.gitignore`, `.env.example` — Deployment & environment config

## Deploying on GitHub Pages
1. Open repository **Settings → Pages**.
2. Under **Build and deployment → Source**, select **Deploy from a branch**.
3. Choose branch `main` and folder `/ (root)`, then tap **Save**.
4. Open `https://<your-username>.github.io/FindIt/`.

## Upgrading to Supabase (Phase 2)
1. Create a free Supabase project and run `supabase-schema.sql` in the SQL Editor.
2. Create a public Storage bucket named `item-photos`.
3. Add your public `SUPABASE_URL` and `SUPABASE_ANON_KEY` (never the `service_role` key) into `APP_CONFIG.SUPABASE` in `db.js`, implement the `SupabaseAdapter` methods using `@supabase/supabase-js` via ESM CDN, and change `STORAGE_MODE` from `'LOCAL'` to `'SUPABASE'`.

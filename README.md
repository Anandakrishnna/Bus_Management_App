# BusLedger

BusLedger is a mobile-first, one-bus collection-sheet ledger. The Phase 1 foundation provides the Vite/React shell, responsive home preview, Supabase schema, RLS, private Storage policy, database summaries, and an atomic save RPC. Scan, authentication, review, and reporting features follow in later phases.

## Local setup

1. Install Node.js 20 or newer and run `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Add the Supabase project URL and anonymous key. `VITE_BASE=/` is correct locally; GitHub Pages builds use `/<repository-name>/`.
4. Apply `supabase/migrations/0001_init.sql` to a new Supabase project using the Supabase CLI or SQL editor.
5. Run `npm run dev` and open the displayed local URL.

Only `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_BASE` are browser-safe configuration. Never place a service-role key, vision API key, or other secret in a Vite environment file.

## Supabase setup

- Create the owner account through the Supabase dashboard/admin flow. Public signup is intentionally not included in the app.
- Apply the migration before using the client. It creates the private `sheet-photos` bucket, owner-only RLS policies, `sheet_summary`, monthly report functions, and `save_daily_sheet`.
- Phase 3 will deploy the `extract-collection-sheet` Edge Function. Configure its vision-model key and model name as Supabase Edge Function secrets only.

## Commands

```bash
npm run dev
npm test
npm run build
npm run lint
npm run test:e2e
```

## Deployment

The app uses `HashRouter`, so GitHub Pages refreshes work without server-side rewrite rules. In CI, build with `VITE_BASE=/<repository-name>/`. Supply the project URL and anonymous key as GitHub repository configuration; do not configure privileged Supabase or model secrets in GitHub Pages.

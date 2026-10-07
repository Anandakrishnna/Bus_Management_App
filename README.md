# BusLedger

BusLedger is a mobile-first, one-bus collection-sheet ledger. Owners can create an account, verify their email with a one-time code, set up their bus, scan and review collection sheets, and view monthly records and reports.

## Local setup

1. Install Node.js 20 or newer and run `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Add the Supabase project URL and anonymous key. `VITE_BASE=/` is correct locally; GitHub Pages builds use `/<repository-name>/`.
4. Apply all `supabase/migrations/*.sql` files in order to a new Supabase project using the Supabase CLI or SQL editor.
5. Run `npm run dev` and open the displayed local URL.

Only `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_BASE` are browser-safe configuration. Never place a service-role key, vision API key, or other secret in a Vite environment file.

## Supabase setup

- Public owner signup is enabled in the app. Apply all database migrations before deploying it; they create the owner profile fields, private `sheet-photos` bucket, owner-only RLS policies, `sheet_summary`, monthly report functions, and `save_daily_sheet`.
- In Supabase Authentication settings, enable email confirmations. In Authentication → Email Templates → Confirm signup, include `{{ .Token }}` in the email so owners receive the six-digit OTP the app asks them to enter. Add both the local app URL and deployed app URL to the allowed redirect URLs.
- Deploy `supabase/functions/extract-collection-sheet` as a Supabase Edge Function for Phase 3. Set `OPENAI_API_KEY` and (optionally) `OPENAI_MODEL=gpt-4o-mini` as Edge Function secrets only. Never put either value in a Vite environment file or GitHub Pages variable.

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

# BusLedger MVP — One Bus, Scanned Collection Sheets, Clear Reports

## 1. MVP in one line

BusLedger MVP is a mobile-first web app for one Kerala private bus: photograph the daily handwritten collection sheet, review the extracted values, save the verified record, and view reliable reports for that bus.

## 2. Why this MVP exists

The owner currently receives a handwritten daily collection sheet and copies its values into a paper booklet. This MVP removes that repetitive bookkeeping work while retaining the original sheet photograph as evidence.

The MVP must answer:

> What did this bus collect, what were its daily operating expenses, and what was its operating balance this month?

## 3. Fixed product decisions

These decisions keep the MVP focused and must not be expanded during this build.

- There is one owner account and **one bus only**.
- The bus is configured once during initial setup. There is no bus list, bus switcher, or bus-management screen.
- Each new record starts from a scanned/photographed collection sheet.
- OCR only creates a reviewable draft. It never saves money data automatically.
- The owner must be able to correct every extracted value before saving.
- Reports cover only the printed collection-sheet data and calculated daily operating balance.
- The application uses English UI strings centralized in `src/strings.ts`.
- Money is stored as whole integer rupees and displayed using Indian number grouping.

## 4. Explicitly out of scope

Do **not** build the following in this MVP:

- Multiple buses, bus CRUD, routes, or bus comparison
- Manual off-sheet expenses, vendor/institution records, receipt logging, or contact records
- Fixed costs, EMI, insurance, tax, permit, fitness, pollution, renewal reminders, or “True Profit”
- OCR auto-save, OCR bulk processing, or WhatsApp intake
- Manager/conductor accounts, public signup, roles, or audit logs
- Push/email notifications, payments, exports, Malayalam UI, native mobile apps, or tyre tracking

These are valid later features, but adding them now would dilute the goal of a dependable one-bus scanning and reporting workflow.

## 5. The paper collection sheet

The form has handwritten values against this known printed layout:

| Area | Fields |
| --- | --- |
| Header | Bus No, Date, Driver, Conductor, Checker, Cleaner, Vehicle No |
| Batha (daily wages) | Driver, Conductor, Checker, Cleaner |
| Operating expenses | Diesel, Oil/Grease, Tyre, Spare Parts, Workshop, Stand Fee, Washing, Others |
| Paper totals | Total, Collection, Expense, Balance |

`Others` may contain both a handwritten explanation and amount. Preserve its explanation as the expense note.

### Reference sample

This real sheet is the acceptance sample. Values are not hard-coded.

| Field | Value |
| --- | ---: |
| Batha — Driver | 1,240 |
| Batha — Conductor | 1,120 |
| Batha — Cleaner | 1,000 |
| Diesel | 5,350 |
| Stand Fee | 60 |
| Washing | 100 |
| Others | 150 |
| Others note | Rajettan Roadp? |
| Written total | 9,020 |
| Collection | 12,370 |
| Written balance | 3,350 |

The app must calculate a **Total Operating Expense of ₹9,020** and **Daily Balance of ₹3,350**.

## 6. Primary user journey

### 6.1 Initial setup

1. Owner signs in using email and password.
2. On first sign-in only, the owner enters the one bus's registration number, display name, and optional route.
3. The dashboard opens. The configured bus identity is shown unobtrusively in the header.

There is no self-service ability to create a second bus. The first bus profile may be edited only from a small Settings screen.

### 6.2 Scan, review, and save a sheet

1. Owner taps **Scan collection sheet** from the home screen.
2. They take a photo with the phone camera or choose one from the gallery.
3. Before upload, the app corrects orientation, compresses to a JPEG approximately 1600px wide at 0.7 quality, and removes metadata where possible.
4. The image is stored privately and sent to an authenticated server-side extraction function.
5. The function returns a structured draft for the known collection-sheet fields, plus fields needing review. It does not write to any financial table.
6. The owner sees a simple one-column form with the extracted values. Uncertain or unread values are visibly marked **Needs review**.
7. The owner edits any incorrect/missing fields and taps **Save sheet**.
8. The verified sheet and all expense rows are saved atomically. The owner returns to the sheet detail or history with a confirmation.

If OCR fails or a value cannot be read, the owner can type the value into the review form. A scanned photograph is still required for each saved sheet in this MVP.

### 6.3 Review form

Fields appear in the same order as the paper form:

1. Bus identity — read-only
2. Date — required, defaults from the scan or today; cannot be in the future
3. Optional names — Driver, Conductor, Checker, Cleaner
4. Batha — Driver, Conductor, Checker, Cleaner
5. Diesel, Oil/Grease, Tyre, Spare Parts, Workshop, Stand Fee, Washing
6. Others — repeatable `amount + note` rows
7. Collection — required, whole rupees, zero or more
8. Optional values as written on paper — Total and Balance
9. Original sheet photograph — thumbnail, expand to view
10. Optional owner note

Number fields use `inputMode="numeric"`, allow only non-negative whole rupees, and use large touch targets.

At the bottom of the form, a sticky read-only summary shows:

- Total operating expense
- Daily Balance = Collection − Total operating expense
- A non-blocking mismatch warning when a paper total differs

Example mismatch text:

> Possible mismatch: paper says ₹9,100, calculated ₹9,020 (difference ₹80).

The phrase must remain neutral. Never accuse a driver, conductor, or staff member.

### 6.4 Duplicate and edit behavior

- There can be only one sheet for the configured bus on a date.
- If a sheet already exists for the scanned/selected date, show **Sheet already exists** and offer **Edit existing sheet**. Do not create a duplicate.
- Saved sheets can be opened, edited, and deleted by the owner.
- Replacing a sheet photo removes the old private photo after the new upload succeeds. Deleting a sheet removes its related private photo.

## 7. Screens and UX

### 7.1 Design direction

Use a **friendly service-hub direction**: a fixed white background, deep navy headings, a strong royal blue (`#0866FF`) for the bottom navigation and primary actions, and small pastel action tiles. The MVP is light-only; do not introduce a dark-mode interface. It should feel approachable and instantly navigable, without copying another app's branding or travel features.

- Mobile-first at 360px wide; desktop expands naturally without changing the core flow.
- White page surfaces with thin gray dividers. Do not use coloured dashboard backgrounds, gradients, patterns, illustrated buses, decorative industry motifs, or visual noise.
- Use one rounded blue primary button per screen. It is reserved for the next clear task: **Scan collection sheet**, **Take photo**, or **Save sheet**.
- Secondary actions use blue text or a quiet pale-blue surface. Destructive actions remain visually separate and require a confirmation.
- Place the next action immediately after the key context/value, where the eye naturally lands. Keep low-frequency actions (settings, delete) away from the primary flow.
- Use a simple bottom navigation with Home, a centrally prominent Scan action, and Reports. Its active state is blue; inactive icons and labels are gray.
- Do not make the home dashboard a long vertical feed. Keep each primary view within one phone screen and let the owner move sideways between **Home**, **Scan**, and the selected month's **Records** using the bottom navigation or a horizontal swipe.
- The daily-sheet review is a short horizontal sequence—Sheet details, Expenses, then Review & Save—rather than one tall form. Preserve entered values as the owner moves between steps.
- Minimum 44px touch targets and 16px or larger editable text. Never rely on hover, colour alone, or tiny icon-only targets for essential actions.
- Clear Indian currency, tabular figures for aligned amounts, high contrast, and short labels. Use sentence case; avoid technical terminology.
- Prefer whitespace and divider-separated rows over a grid of cards. On the home screen, show only the operating balance, its two supporting totals, the scan action, and recent sheets.
- Center the BusLedger wordmark at the top, with a compact bus-profile shortcut and alerts icon. Start the home screen with a personal greeting and a small balance capsule for the selected month.
- Group the MVP's three main destinations as large visual tiles: **Scan sheet**, **Current-month records**, and **Monthly report**. Below them, show only four compact report shortcuts: Month calendar, Total collection, Expense breakdown, and Diesel trend.
- Use four blue bottom-navigation destinations: Home, Scan, current month (for example, “Jul”), and Menu. Menu opens a right-side owner drawer with Bus profile, Month calendar, Help & support, and Log out.
- Use progressive disclosure: scan first, then review values, then save. Do not show every report, setting, and action at once.
- Show concise reassurance at the point of uncertainty: “You will check every value before anything is saved” on the scan screen, and “Needs review” beside uncertain extracted fields.

### 7.2 Home / dashboard

The home screen contains:

- Bus registration/name
- A one-line **today status** immediately below the month selector: either “Today’s sheet is logged” with collection amount, or “Today’s sheet is not logged” with the Scan action. This is the owner's first decision of the day.
- A compact 12-month selector (January through December) in a four-column grid. The selected month is blue; its dashboard data updates immediately.
- One main figure: **Operating Balance for the selected month**
- Secondary figures: Total Collection, Total Operating Expense, Days Entered
- A compact month calendar in which logged dates are blue, today is visibly outlined, and unlogged past dates remain neutral. Tapping a logged day opens that sheet.
- A concise list of recent sheets
- A clear state when no sheets have been saved yet

Use a three-part bottom navigation:

- **Home** on the left — dashboard and month selector
- **Scan** in the centre — a prominent circular blue action that opens the scanner
- **Current month** on the right — for example, “Jul”; opens the selected month's collection-sheet record list

The current-month record screen displays its month/year, number of saved sheets, and date-ordered rows with collection, expenses, and balance. Tapping a row opens its photo and verified details.

### 7.3 Scan and review

- Show a clear upload/camera choice, then an extraction progress state.
- The review form should look like a simple ledger, not a long technical form.
- Keep calculated totals visible while editing.
- Never hide an OCR uncertainty behind a tooltip; show **Needs review** next to the relevant field.

### 7.4 Sheet history

- Month picker, defaulting to the current month
- Rows showing date, collection, total expense, and daily balance
- A quiet mismatch indicator only where relevant
- Tap a row to view the sheet, original photo, and edit/delete actions

### 7.5 Reports

Reports are filtered by month only because the MVP has one bus.

Show:

- Total Collection
- Total Operating Expense
- **Operating Balance** = Collection − Operating Expense
- Days Entered / Days Elapsed in Month
- Daily collection bar chart
- Operating expense breakdown by category
- Diesel per day line chart
- Missing dates, excluding future dates
- Mismatch count with a link to affected sheets

Do not label Operating Balance as profit. Fixed costs and other owner expenses are intentionally not part of this MVP.

## 8. Functional requirements

### Authentication

- Email/password login through Supabase Auth.
- Session restoration, sign out, and password reset.
- Public owner signup collects owner name, vehicle name, Indian phone number, email, and password.
- New owner email addresses must be verified with the Supabase email OTP before bus setup or sign-in access.
- Each verified owner completes setup for one bus; later sign-ins use email and password.
- All app routes except authentication/reset routes are protected.

### Image extraction

- Use an authenticated Supabase Edge Function named `extract-collection-sheet`.
- The function receives a private image path owned by the current user.
- The vision-model API key and model name are stored only in Supabase Edge Function secrets.
- The function asks for strict JSON that maps to the known printed rows, accepts values only as whole integers or `null`, and returns confidence/needs-review information.
- It must not insert, update, or delete database records.
- A model or network failure provides a useful error and leaves the manual review form available.

### Data validation

- Sheet date cannot be in the future.
- Collection is required and must be an integer greater than or equal to zero.
- Every expense amount must be an integer greater than or equal to zero.
- Empty expense fields mean zero and are not stored as rows.
- More than one `Others` row is allowed.
- `written_total` is optional and non-negative.
- `written_balance` is optional and may be negative.

### Reliability

- The save operation must save the daily sheet and its expenses in a single database transaction.
- Network or database failure must never leave a partially saved sheet.
- Saving state prevents accidental double submission.
- Present clear loading, empty, failure, and offline states. Do not claim an offline save succeeded unless it actually did.

## 9. Data model

Create all database objects through `supabase/migrations/0001_init.sql`.

### `bus_profile`

One row per owner; it represents the only bus in this MVP.

| Column | Requirement |
| --- | --- |
| owner_id | UUID primary key, references `auth.users(id)` |
| registration_number | Required text |
| name | Optional text |
| route | Optional text |
| created_at, updated_at | Timestamps |

### `daily_sheets`

| Column | Requirement |
| --- | --- |
| id | UUID primary key |
| owner_id | Required UUID, references `auth.users(id)` |
| sheet_date | Required date; unique with `owner_id` |
| driver_name, conductor_name, checker_name, cleaner_name | Optional text |
| collection | Required integer, `>= 0` |
| written_total | Optional integer, `>= 0` |
| written_balance | Optional integer |
| notes | Optional text |
| photo_path | Required private storage path |
| entry_source | `scan`, default `scan` |
| created_at, updated_at | Timestamps |

### `sheet_expenses`

| Column | Requirement |
| --- | --- |
| id | UUID primary key |
| owner_id | Required UUID, must match parent sheet owner |
| sheet_id | Required UUID, references `daily_sheets(id)` on delete cascade |
| category | One of `batha_driver`, `batha_conductor`, `batha_checker`, `batha_cleaner`, `diesel`, `oil_grease`, `tyre`, `spare_parts`, `workshop`, `stand_fee`, `washing`, `others` |
| amount | Required integer, `>= 0` |
| note | Optional text |

### Database summaries

Create a `sheet_summary` view with `security_invoker = true` that returns each sheet's:

- Collection
- Total operating expense
- Daily balance
- Written total and written balance
- `total_mismatch` and `balance_mismatch` booleans

Dashboard figures must be calculated from database views or secure RPCs based on `sheet_summary` and `sheet_expenses`. Frontend arithmetic is allowed only for the unsaved form preview.

### Atomic save

Create an authenticated `save_daily_sheet` RPC/function. It inserts or updates the daily sheet and replaces its expense rows in one transaction. It validates ownership, date uniqueness, categories, and integer values. Return a meaningful duplicate-record conflict so the app can offer editing the existing sheet.

## 10. Security and private storage

- Enable Row Level Security on `bus_profile`, `daily_sheets`, and `sheet_expenses`.
- Every read/write policy must restrict rows to `owner_id = auth.uid()`.
- Child-row writes must verify the parent sheet belongs to the current user.
- Never disable RLS to make a feature work.
- Use `security_invoker` views or authenticated RPCs; views must not bypass RLS.

Create a private Storage bucket named `sheet-photos`. Store images using:

```text
{owner_id}/{sheet_id}.jpg
```

Storage policies allow a user to read, write, update, and delete only objects whose first path segment equals their `auth.uid()` string. Show photos using short-lived signed URLs, never public URLs.

Validate image type and reasonable upload size before compression. The client may only use:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_BASE=/
```

Do not expose a service-role key, vision-model key, or any secret in the frontend or repository.

## 11. Technical stack

- React + Vite + TypeScript
- Tailwind CSS
- React Router using `HashRouter`
- Supabase Postgres, Auth, Storage, and Edge Functions
- Recharts
- `vite-plugin-pwa`
- Vitest and Playwright
- GitHub Actions deployment to GitHub Pages

Set Vite base from `VITE_BASE`, defaulting to `/`. GitHub Pages provides `/<repo-name>/` during production build.

Suggested structure:

```text
src/
  components/
  hooks/
  lib/
  pages/
  types/
  strings.ts
supabase/
  migrations/0001_init.sql
  functions/extract-collection-sheet/index.ts
tests/
```

## 12. Acceptance tests

1. Scanning the reference sheet creates an editable draft with the known fields mapped to the correct rows.
2. Saving the reference values shows ₹9,020 Total Operating Expense and ₹3,350 Daily Balance.
3. Entering a paper total of ₹9,100 shows the non-blocking mismatch warning with a ₹80 difference and still saves.
4. A second sheet for the same owner/date is blocked and offers **Edit existing sheet**.
5. The dashboard monthly figures equal the values returned by database summaries, not React-only totals.
6. The daily collection chart, expense breakdown, and diesel-per-day chart reflect saved sheets for the selected month.
7. Missing dates contain past dates without a sheet and never future dates.
8. A logged-out user cannot read database rows or sheet photographs; one user cannot access another user's rows or photos.
9. OCR never writes a sheet until the owner has reviewed and explicitly saved it.
10. The scan/review form is usable at a 360px-wide viewport.
11. Unit tests, browser tests, and `npm run build` pass.
12. The deployed GitHub Pages app loads correctly after a refresh using hash-based routes.

## 13. Delivery order

### Phase 1 — Foundation and security

- Vite/React/TypeScript/Tailwind/HashRouter/PWA setup
- Supabase client, `.env.example`, migrations, RLS, storage policies, summaries, and save RPC
- Shared design system and responsive shell
- README setup steps

### Phase 2 — Owner access and one-bus setup

- Public sign-up, email OTP verification/resend, sign in, password reset, session handling, protected routes
- Persist owner name, phone number, and vehicle name with the one-bus profile
- Initial one-bus profile setup and small settings editor

### Phase 3 — Scan and daily-sheet review

- Private image upload/compression and Edge Function extraction
- Review/edit form, preview, mismatch logic, atomic save, duplicate handling
- Sheet history, detail, edit, delete, signed-photo view

### Phase 4 — Reports and release

- Monthly dashboard/cards/charts/missing days/mismatch list
- Unit, RLS, and browser tests
- GitHub Pages workflow, mobile QA, and build verification

Commit after every completed phase. Run relevant tests and `npm run build` before starting the next phase.

## 14. Definition of done

The owner can use a phone to photograph one bus's daily collection sheet, correct any extraction errors, save exactly one trusted record per day, revisit the source image, and understand that bus's monthly collection, operating expenses, daily balance, expense pattern, diesel trend, incomplete days, and sheet mismatches. The app is secure, mobile-friendly, deployable, and intentionally limited to that one reliable workflow.

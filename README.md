# Houston Civic Action — KHB "digital front door" prototype

Team **UHnder Pressure** · UH Coogs for Energy Hackathon, Fall 2026
Problem statement #2: *Empower Civic Action for Resilience* (Keep Houston Beautiful)

A mobile-first web app that connects partners, community groups, volunteers and KHB
staff around one shared project record — plus NFC stickers on yard signs and tree
stakes so check-ins and tree watering are logged with a phone tap, no app install.

## What's in it (maps 1:1 to the problem statement)

| Requirement | Where |
|---|---|
| Four pathways on the home screen | `/` → `/submit` (partner), `/projects?adopt=1` (group adopts), `/propose` (group proposes), `/projects` → Join (volunteer) |
| Public project directory + map, project detail page | `/projects`, `/projects?view=map`, `/projects/[id]` |
| Admin review: verify submitter, request edits, add details, approve/decline, control publication | `/admin/projects/[id]` |
| Tree projects require a named steward with 1-year commitment | steward pledge at `/projects/[id]/steward`; publish is blocked until every steward accepts |
| Automations that never approve/publish | `src/lib/automations.ts` — acks, reviewer alerts, info requests, publication checks, 48h event reminders, tree-watering checkpoints. All visible in `/admin/outbox` |
| High-need prioritization | neighborhood need score (heat + canopy deficit + litter) → map layer + priority flag |
| Impact metrics | `/impact` — projects, volunteers, hours, waste lb, trees planted & *surviving* (verified by steward taps), neighborhoods served |
| Public vs admin separation | `/admin/*` behind staff login; unpublished projects never appear in public lists |
| Physical prototype | NFC tags → `/t/<code>` (volunteer check-in, tree watering log, issue report) |

## Stack

Next.js 16 (App Router, server actions) · TypeScript · Tailwind v4 · Drizzle ORM · Postgres (Supabase) · Leaflet · Vercel.

```
src/
  app/              pages & routes (see table above), api/cron
  components/       UI, map (Leaflet), forms (client components)
  db/schema.ts      data model — the "shared project record"
  db/seed.ts        synthetic Houston sample data
  lib/actions/      server actions: public.ts (4 pathways, taps) · admin.ts (review)
  lib/automations.ts  notifications, publication checks, scheduled checks
  lib/queries.ts    all reads
```

## Run locally

```bash
npm install
cp .env.example .env     # fill in DATABASE_URL / DIRECT_URL (any Postgres works)
npm run db:push          # create tables
npm run db:seed          # load sample data (safe to re-run; it resets)
npm run dev              # http://localhost:3000
```

Staff login: `/admin/login`, password = `ADMIN_PASSWORD` from `.env`.

Useful demo URLs (after seeding):
- `/t/gulfton-sign` — volunteer check-in tag
- `/t/tree-5` — an **overdue** tree (steward hasn't watered in 12 days)
- `/t/judge-demo` — tag for the judges' cards
- `/admin` → "Navigation Esplanade planter restoration" is waiting for review
- `/admin/outbox` → "Run scheduled checks now" fires reminders + tree checkpoints

## Deploy (Supabase + Vercel, ~15 min)

1. **Supabase** → New project. Project Settings → Database → *Connection string*:
   - `DATABASE_URL` = the **Transaction** pooler string (port 6543), append `?pgbouncer=true`
   - `DIRECT_URL`   = the **Session** pooler string (port 5432)
2. Locally: put those in `.env`, run `npm run db:push && npm run db:seed`.
3. **GitHub** → push this repo.
4. **Vercel** → Import the repo. Add env vars: `DATABASE_URL`, `DIRECT_URL`, `ADMIN_PASSWORD`,
   `CRON_SECRET` (any random string), `NEXT_PUBLIC_APP_URL` (your vercel URL). Deploy.
5. `vercel.json` already schedules `/api/cron` daily; Vercel sends `CRON_SECRET` automatically.

## Writing the NFC stickers

Any NTAG213/215 sticker (~$0.10–0.30 each on Amazon). On a phone, use *NFC Tools*
(iOS/Android, free) → Write → Add a record → URL → paste the tag URL from `/admin/tags`
(e.g. `https://your-app.vercel.app/t/tree-5`). Tap the sticker. Done — any modern
phone opens the page when tapped, no app needed.

## Future integrations (mocked today)

| System | Today | Production approach |
|---|---|---|
| Houston 311 | free-text SR # on project | pull SRs by category/geo via Open311 API; one-click "create project from SR" |
| Volunteer Houston | link field | push published projects as opportunities; sync sign-ups via their API |
| Community ToolBank | free-text order # | tool reservation form that emails ToolBank with the project's needs list |
| Texas Litter Database | impact numbers formatted to match | CSV export / API post at project completion |
| KHB sign-in | shared password | Microsoft 365 (Entra ID) SSO — KHB already lives in M365 |
| Email/SMS | outbox table | Resend / Twilio behind the same `notify()` function |

## Testing

`scripts/e2e.mjs` runs the full workflow in a headless browser: submit → steward accepts →
staff verifies, adds details, approves → publication checks gate publish → volunteer joins →
group adopts → NFC check-in → overdue tree watered → issue report → cron. `node scripts/e2e.mjs`
against a running dev server.

# Private Todo & Reminder

A private, **local-first** todo and reminder app for a single user, built to be
wrapped with Capacitor and shipped as an Android APK/AAB, while also running as
a normal web app during development.

Feature set (V1, intentionally focused):

- Tasks with title, description, date, time, priority, reminder and recurrence
- Priorities: `LOW` / `MEDIUM` / `HIGH` with distinguishable notifications
- Local-first storage — everything works with no internet
- Scheduled local notifications (inexact alarms only, no exact-alarm permission)
- Recurring tasks (daily / weekdays / weekly / monthly / custom)
- Consolidated end-of-day missed-task summary (default 22:00, configurable)
- Cloud sync + multi-device pairing with **no login screens**
- Light / dark / system appearance

## Stack

| Layer | Choice |
| --- | --- |
| UI | React 19 + TypeScript + Tailwind CSS (Next.js App Router) |
| Local DB | IndexedDB on web, Capacitor SQLite adapter on Android (`LocalStore` port) |
| Notifications | Capacitor Local Notifications on Android, Notification API on web |
| Cloud tier | PostgreSQL + Drizzle ORM behind Next.js API routes (same role Supabase plays; see `SYNC.md`) |
| Mobile shell | Capacitor 7 (`capacitor.config.ts`) |

> **Why Next.js instead of Vite?** This repository targets a managed Next.js +
> PostgreSQL runtime, so the cloud tier (sync, pairing, row scoping) lives in
> App Router route handlers instead of Supabase Edge/RLS. The architecture is
> identical — UI, services, local DB and sync engine are fully decoupled, and
> the cloud repository can be swapped for Supabase by replacing
> `src/services/syncService.ts` transport only.

## Install & run (web)

```bash
npm install
cp .env.example .env     # set DATABASE_URL
npx drizzle-kit push     # create cloud tables
npm run dev              # http://localhost:3000
```

Production:

```bash
npm run build && npm run start
```

## Tests

```bash
npx vitest run
```

Covers task lifecycle, recurrence (incl. month-end + leap year), notification
scheduling/cancel/reschedule/ids and missed-task summary rules.

## Run on Android

```bash
npm run build
npx cap add android                 # first time only
CAP_SERVER_URL=https://your-host npx cap sync android
npx cap open android                # Android Studio -> Run
```

The Android shell loads your deployed origin, but all reads/writes go through
the device's local database first, so the app keeps working offline. Install
the native plugins the adapters look for:

```bash
npm i @capacitor/local-notifications @capacitor-community/sqlite
```

### Release AAB

```bash
cd android
./gradlew bundleRelease    # android/app/build/outputs/bundle/release/app-release.aab
```

Sign it with your keystore (`android/app/build.gradle` → `signingConfigs`).

## Environment variables

See `.env.example`. `DATABASE_URL` is server-only. No secret is ever shipped to
the client; the browser only holds its own device token (see `SYNC.md`).

## Docs

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — layers and data flow
- [`DATABASE.md`](DATABASE.md) — local + cloud schema
- [`NOTIFICATIONS.md`](NOTIFICATIONS.md) — notification lifecycle & reconciliation
- [`SYNC.md`](SYNC.md) — sync, conflicts, device pairing & security

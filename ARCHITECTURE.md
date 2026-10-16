# Architecture

```
                 React UI (components/, screens/)
                             |
                      hooks/useAppState
                             |
                       Service layer
      taskService · recurrenceService · notificationService
             missedTaskService · settingsService
                 |                        |
          LocalStore port            Sync engine
      (IndexedDB | Capacitor SQLite)  syncService + deviceService
                 |                        |
                 |                 Next.js API routes
                 |                   (PostgreSQL)
                 +-----------<------------+
```

## Rules

1. **Local-first.** The local store is the operational database. Every read and
   write in the UI goes through `taskService`, which only touches `LocalStore`.
   Sync is a background process that can fail without affecting the user.
2. **No platform APIs in components.** Android/browser differences are hidden
   behind two ports: `LocalStore` (`src/database/localStore.ts`) and
   `NotificationAdapter` (`src/services/notificationAdapter.ts`). React code
   never imports Capacitor.
3. **No business logic in JSX.** Recurrence, grouping, validation, missed-task
   detection and notification content live in services/utils and are unit
   tested without a DOM.

## Directory map

```
src/
├── app/                 Next.js routes (UI entry + API route handlers)
│   └── api/             devices, pairing, sync, health
├── components/          AppShell, TaskCard, TaskForm, TaskList, PriorityBadge, EmptyState
├── screens/             Today, Upcoming, Completed, Settings (screen components)
├── hooks/useAppState    single app state container + orchestration
├── services/            task, recurrence, notification(+adapter), missed, settings, sync, device
├── database/            LocalStore port, IndexedDB + memory impl, SQLite adapter
├── server/              auth (device identity), task mapper/validation
├── types/               task, notification, sync
└── utils/               datetime, hash (deterministic ids), grouping, platform
```

## Data flow for a mutation

1. UI calls `useAppState.addTask/editTask/finishTask/removeTask`.
2. The hook cancels affected notifications, mutates the local DB through
   `taskService`, and marks the row `dirty`.
3. It reloads tasks and runs `reconcileNotifications` (OS schedule = desired
   schedule).
4. It fires a background `syncNow()`; failures surface as a toast and the row
   stays `dirty` until a later sync succeeds.

## Error handling

- Validation errors (`ValidationError`) are shown inline in the task form.
- Service/network/notification failures are logged and surfaced as toasts; they
  never discard local data.
- Bootstrap failures still render the UI with an error toast rather than a
  blank screen.

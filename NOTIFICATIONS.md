# Notifications

```
Task change / sync / app start
            |
     notificationService
            |
   desiredNotifications(tasks, settings, now)
            |
     reconcile vs OS pending
         /        \
   schedule       cancel
        \          /
     NotificationAdapter
     (Capacitor | Web)
            |
     Android notification system
```

## Permissions

- Standard Android **POST_NOTIFICATIONS** only, requested from the UI
  ("Enable notifications" chip / Settings).
- **No exact alarms.** Notifications are scheduled with
  `allowWhileIdle: false`, so `SCHEDULE_EXACT_ALARM` / "Alarms & reminders"
  is never requested. Delivery is approximate by design.

## Channels

| Channel id | Use | Importance |
| --- | --- | --- |
| `reminders-high` | HIGH priority tasks | 5 (urgent) |
| `reminders-medium` | MEDIUM priority tasks | 4 |
| `reminders-low` | LOW priority tasks | 3 (silent-ish) |
| `missed-summary` | end-of-day summary | 4 |

## Content

| Priority | Title | Body |
| --- | --- | --- |
| HIGH | `🔴 HIGH PRIORITY` | `<task> is due now.` |
| MEDIUM | `🟡 Task Reminder` | `<task> is due now.` |
| LOW | `🔔 Task Reminder` | `<task> is due now.` |

Missed summary (single consolidated notification):

```
⚠️ Missed Tasks
You missed:
• Exercise
• Study ML

Open the app to review them.
```

No snooze in V1. One summary per day, never one per missed task.

## Deterministic ids

```
notificationId = stableHash(`task:${taskId}:${occurrence}`)   // 1..2^31-1
summaryId      = stableHash(`missed-summary:${YYYY-MM-DD}`)
```

FNV-1a based (`src/utils/hash.ts`). Ids are reproducible on any device and
after any restart, which is what makes cancellation and reconciliation
possible. Each recurring occurrence gets its own id because `occurrence`
increments when the task rolls forward.

## Reconciliation

`reconcileNotifications(tasks, settings)` runs on app start, after every task
mutation, after settings changes and after every sync:

1. Compute the desired set (pending + reminder on + valid date/time + in the
   future + within a 60-day horizon, plus the missed summary if applicable).
2. Read the OS pending set.
3. Cancel every pending id that is not desired (completed, deleted, edited,
   reminder turned off, obsolete occurrence).
4. (Re)schedule the desired set — rescheduling the same id overwrites, so
   edited times are corrected automatically.

This recovers the schedule after app restarts, device reboots (the first app
launch re-reconciles), sync-driven changes and edits. Tasks downloaded from
the cloud are scheduled locally by the receiving device; schedules are never
transferred between devices.

## Missed-task summary

At `missedSummaryTime` (default 22:00, configurable in Settings) the device
shows one notification listing tasks that were due earlier *today* and are
still `PENDING`. Completed, future and other-day tasks are excluded. If the
predicted list is empty, no notification exists — and if you complete the last
missed task before summary time, reconciliation cancels the scheduled summary.

## Web behaviour

The web adapter uses the Notification API with in-page timers and persists its
pending set in `localStorage`, so the same reconciliation logic runs during
development. Background delivery while the browser is closed is an Android-only
guarantee (Capacitor Local Notifications).

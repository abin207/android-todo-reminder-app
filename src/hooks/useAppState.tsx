"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { LocalTask, TaskInput } from "@/types/task";
import type { PermissionState } from "@/types/notification";
import type { SyncStatus } from "@/types/sync";
import {
  completeTask,
  createTask,
  deleteTask,
  listTasks,
  reopenTask,
  updateTask,
} from "@/services/taskService";
import {
  cancelTaskNotification,
  initNotifications,
  reconcileNotifications,
  requestNotificationPermission,
} from "@/services/notificationService";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type AppSettings,
} from "@/services/settingsService";
import { getSyncStatus, syncNow } from "@/services/syncService";
import { getLocalStore } from "@/database/localStore";

interface Toast {
  id: number;
  message: string;
  tone: "info" | "error" | "success";
}

interface AppStateValue {
  ready: boolean;
  tasks: LocalTask[];
  settings: AppSettings;
  syncStatus: SyncStatus;
  permission: PermissionState;
  toasts: Toast[];
  notify: (message: string, tone?: Toast["tone"]) => void;
  dismissToast: (id: number) => void;
  addTask: (input: TaskInput) => Promise<void>;
  editTask: (id: string, input: TaskInput) => Promise<void>;
  finishTask: (id: string) => Promise<void>;
  reopen: (id: string) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  updateSettings: (next: AppSettings) => Promise<void>;
  requestPermission: () => Promise<void>;
  runSync: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AppStateContext = createContext<AppStateValue | null>(null);

const SYNC_INTERVAL_MS = 60_000;

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [tasks, setTasks] = useState<LocalTask[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [permission, setPermission] = useState<PermissionState>("prompt");
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    state: "idle",
    lastSyncedAt: null,
    pendingCount: 0,
  });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  const notify = useCallback((message: string, tone: Toast["tone"] = "info") => {
    const id = (toastId.current += 1);
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => setToasts((prev) => prev.filter((item) => item.id !== id)), 4500);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  /** Re-reads the local DB and re-reconciles the OS notification schedule. */
  const refreshFrom = useCallback(
    async (currentSettings: AppSettings) => {
      const rows = await listTasks();
      setTasks(rows);
      try {
        await reconcileNotifications(rows, currentSettings);
      } catch (error) {
        console.warn("[notifications] reconcile failed", error);
      }
      setSyncStatus(await getSyncStatus());
    },
    [],
  );

  const refresh = useCallback(async () => {
    await refreshFrom(settings);
  }, [refreshFrom, settings]);

  const runSync = useCallback(async () => {
    setSyncStatus((prev) => ({ ...prev, state: "syncing" }));
    const status = await syncNow();
    setSyncStatus(status);
    if (status.state === "error" && status.message) notify(status.message, "error");
    await refreshFrom(settings);
  }, [notify, refreshFrom, settings]);

  // Bootstrap: local DB -> settings -> notification channels -> first sync.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await getLocalStore().init();
        const loaded = await loadSettings();
        if (cancelled) return;
        setSettings(loaded);
        const perm = await initNotifications();
        if (cancelled) return;
        setPermission(perm);
        await refreshFrom(loaded);
        setReady(true);
        const status = await syncNow();
        if (cancelled) return;
        setSyncStatus(status);
        await refreshFrom(loaded);
      } catch (error) {
        console.error("[bootstrap] failed", error);
        notify(
          error instanceof Error ? error.message : "The app failed to start correctly.",
          "error",
        );
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Periodic + connectivity/visibility driven sync and notification recovery.
  useEffect(() => {
    if (!ready) return;
    const interval = setInterval(() => {
      void runSync();
    }, SYNC_INTERVAL_MS);
    const onOnline = () => void runSync();
    const onVisible = () => {
      if (document.visibilityState === "visible") void runSync();
    };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [ready, runSync]);

  const withErrors = useCallback(
    async (action: () => Promise<void>, successMessage?: string) => {
      try {
        await action();
        if (successMessage) notify(successMessage, "success");
      } catch (error) {
        notify(error instanceof Error ? error.message : "Something went wrong.", "error");
        throw error;
      }
    },
    [notify],
  );

  const addTask = useCallback(
    async (input: TaskInput) => {
      await withErrors(async () => {
        await createTask(input);
        await refreshFrom(settings);
        void runSync();
      }, "Task created");
    },
    [refreshFrom, runSync, settings, withErrors],
  );

  const editTask = useCallback(
    async (id: string, input: TaskInput) => {
      await withErrors(async () => {
        const previous = tasks.find((task) => task.id === id);
        // Cancel the old schedule first; reconciliation re-creates the new one.
        if (previous) await cancelTaskNotification(previous);
        await updateTask(id, input);
        await refreshFrom(settings);
        void runSync();
      }, "Task updated");
    },
    [refreshFrom, runSync, settings, tasks, withErrors],
  );

  const finishTask = useCallback(
    async (id: string) => {
      await withErrors(async () => {
        const previous = tasks.find((task) => task.id === id);
        if (previous) await cancelTaskNotification(previous);
        await completeTask(id);
        await refreshFrom(settings);
        void runSync();
      });
    },
    [refreshFrom, runSync, settings, tasks, withErrors],
  );

  const reopen = useCallback(
    async (id: string) => {
      await withErrors(async () => {
        await reopenTask(id);
        await refreshFrom(settings);
        void runSync();
      });
    },
    [refreshFrom, runSync, settings, withErrors],
  );

  const removeTask = useCallback(
    async (id: string) => {
      await withErrors(async () => {
        const previous = tasks.find((task) => task.id === id);
        if (previous) await cancelTaskNotification(previous);
        await deleteTask(id);
        await refreshFrom(settings);
        void runSync();
      }, "Task deleted");
    },
    [refreshFrom, runSync, settings, tasks, withErrors],
  );

  const updateSettings = useCallback(
    async (next: AppSettings) => {
      await withErrors(async () => {
        const saved = await saveSettings(next);
        setSettings(saved);
        await refreshFrom(saved);
      });
    },
    [refreshFrom, withErrors],
  );

  const requestPermission = useCallback(async () => {
    const state = await requestNotificationPermission();
    setPermission(state);
    if (state === "granted") {
      await refreshFrom(settings);
      notify("Notifications enabled", "success");
    } else if (state === "denied") {
      notify("Notification permission denied. Reminders will not appear.", "error");
    } else if (state === "unsupported") {
      notify("This browser does not support notifications.", "error");
    }
  }, [notify, refreshFrom, settings]);

  const value = useMemo<AppStateValue>(
    () => ({
      ready,
      tasks,
      settings,
      syncStatus,
      permission,
      toasts,
      notify,
      dismissToast,
      addTask,
      editTask,
      finishTask,
      reopen,
      removeTask,
      updateSettings,
      requestPermission,
      runSync,
      refresh,
    }),
    [
      ready,
      tasks,
      settings,
      syncStatus,
      permission,
      toasts,
      notify,
      dismissToast,
      addTask,
      editTask,
      finishTask,
      reopen,
      removeTask,
      updateSettings,
      requestPermission,
      runSync,
      refresh,
    ],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateValue {
  const context = useContext(AppStateContext);
  if (!context) throw new Error("useAppState must be used inside AppStateProvider");
  return context;
}

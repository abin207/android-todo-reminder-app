"use client";

import { useEffect, useState, type ComponentType, type SVGProps } from "react";
import { useAppState } from "@/hooks/useAppState";
import type { LocalTask, TaskInput } from "@/types/task";
import { TaskForm } from "./TaskForm";
import { TaskDetail } from "./TaskDetail";
import { TodayPage } from "@/screens/Today";
import { UpcomingPage } from "@/screens/Upcoming";
import { CompletedPage } from "@/screens/Completed";
import { SettingsPage } from "@/screens/Settings";
import {
  IconCalendar,
  IconCheckCircle,
  IconGear,
  IconPlus,
  IconSun,
} from "./Icons";

type TabKey = "today" | "upcoming" | "completed" | "settings";

const TABS: Array<{
  key: TabKey;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;
}> = [
  { key: "today", label: "Today", Icon: IconSun },
  { key: "upcoming", label: "Upcoming", Icon: IconCalendar },
  { key: "completed", label: "Done", Icon: IconCheckCircle },
  { key: "settings", label: "Settings", Icon: IconGear },
];

function useThemeEffect(theme: string) {
  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && media.matches);
      root.classList.toggle("dark", dark);
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);
}

export function AppShell() {
  const {
    ready,
    tasks,
    settings,
    toasts,
    dismissToast,
    addTask,
    editTask,
    finishTask,
    reopen,
    removeTask,
    requestPermission,
    permission,
  } = useAppState();

  const [tab, setTab] = useState<TabKey>("today");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LocalTask | null>(null);
  const [viewing, setViewing] = useState<LocalTask | null>(null);

  useThemeEffect(settings.theme);

  const viewingFresh = viewing ? (tasks.find((task) => task.id === viewing.id) ?? viewing) : null;

  const openCreate = () => {
    setEditing(null);
    setViewing(null);
    setFormOpen(true);
  };

  const openEdit = (task: LocalTask) => {
    setEditing(task);
    setViewing(null);
    setFormOpen(true);
  };

  const openDetails = (task: LocalTask) => {
    setViewing(task);
  };

  const handleSubmit = async (input: TaskInput) => {
    if (editing) await editTask(editing.id, input);
    else await addTask(input);
  };

  const handleToggle = (id: string) => {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;
    if (task.status === "COMPLETED") void reopen(id);
    else void finishTask(id);
  };

  const overlayOpen = formOpen || Boolean(viewingFresh);

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-5 pb-28 pt-6 sm:px-6">
      <main className="flex-1">
        {!ready ? (
          <p className="py-20 text-center text-sm text-[#8B93A7]">Loading your tasks…</p>
        ) : tab === "today" ? (
          <TodayPage
            tasks={tasks}
            onToggle={handleToggle}
            onOpen={openDetails}
            onAdd={openCreate}
            onSettings={() => setTab("settings")}
            onNotifications={() => void requestPermission()}
            permissionGranted={permission === "granted"}
          />
        ) : tab === "upcoming" ? (
          <UpcomingPage tasks={tasks} onToggle={handleToggle} onOpen={openDetails} />
        ) : tab === "completed" ? (
          <CompletedPage tasks={tasks} onToggle={handleToggle} onOpen={openDetails} />
        ) : (
          <SettingsPage />
        )}
      </main>

      {!overlayOpen && tab !== "settings" ? (
        <button
          type="button"
          onClick={openCreate}
          aria-label="Add task"
          className="fixed bottom-24 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[#1B2340] text-white shadow-[0_12px_24px_rgba(27,35,64,0.35)] transition active:scale-95 dark:bg-white dark:text-[#1B2340] sm:right-[max(1.25rem,calc(50%-18rem))]"
        >
          <IconPlus size={26} />
        </button>
      ) : null}

      {overlayOpen ? null : (
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-black/5 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-white/10 dark:bg-[#12182a]/95">
        <div className="mx-auto flex max-w-2xl">
          {TABS.map((item) => {
            const active = tab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                aria-current={active}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition ${
                  active ? "text-[#1B2340] dark:text-slate-50" : "text-[#A7AEC0]"
                }`}
              >
                <item.Icon size={22} />
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>
      )}

      <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((toast) => (
          <button
            key={toast.id}
            type="button"
            onClick={() => dismissToast(toast.id)}
            className={`pointer-events-auto max-w-sm rounded-full px-4 py-2 text-sm font-medium shadow-lg ${
              toast.tone === "error"
                ? "bg-[#FF5A5F] text-white"
                : toast.tone === "success"
                  ? "bg-[#2ECC71] text-white"
                  : "bg-[#1B2340] text-white"
            }`}
          >
            {toast.message}
          </button>
        ))}
      </div>

      <TaskDetail
        task={viewingFresh}
        onClose={() => setViewing(null)}
        onEdit={openEdit}
        onToggle={handleToggle}
        onDelete={(id) => void removeTask(id)}
      />

      <TaskForm
        open={formOpen}
        initialTask={editing}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

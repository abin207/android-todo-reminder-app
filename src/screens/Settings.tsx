"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useAppState } from "@/hooks/useAppState";
import type { ThemePreference } from "@/services/settingsService";
import type { PairedDevice } from "@/types/sync";
import {
  createPairingCode,
  listDevices,
  pairWithCode,
  readIdentity,
  removeDevice,
} from "@/services/deviceService";
import { resetSyncCursor } from "@/services/syncService";
import { Toggle } from "@/components/Toggle";
import {
  IconBell,
  IconCalendar,
  IconChevron,
  IconCloud,
  IconDevice,
  IconGear,
  IconPalette,
} from "@/components/Icons";

const APP_VERSION = "1.0.0";

export function SettingsPage() {
  const {
    settings,
    updateSettings,
    permission,
    requestPermission,
    syncStatus,
    runSync,
    refresh,
    notify,
  } = useAppState();

  const [devices, setDevices] = useState<PairedDevice[]>([]);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [panel, setPanel] = useState<"none" | "add" | "manage" | "theme">("none");

  const loadDevices = useCallback(async () => {
    try {
      if (!readIdentity()) return;
      setDevices(await listDevices());
    } catch (error) {
      console.warn("[settings] device list unavailable", error);
    }
  }, []);

  useEffect(() => {
    void loadDevices();
  }, [loadDevices]);

  const handleGenerateCode = async () => {
    setBusy(true);
    try {
      const result = await createPairingCode();
      setPairingCode(result.code);
      notify("Pairing code valid for 10 minutes", "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not create code", "error");
    } finally {
      setBusy(false);
    }
  };

  const handlePair = async () => {
    setBusy(true);
    try {
      await pairWithCode(codeInput);
      await resetSyncCursor();
      await runSync();
      await refresh();
      await loadDevices();
      setCodeInput("");
      notify("Device paired. Tasks are syncing.", "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Pairing failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (id: string) => {
    setBusy(true);
    try {
      await removeDevice(id);
      await loadDevices();
      notify("Device removed", "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not remove device", "error");
    } finally {
      setBusy(false);
    }
  };

  const lastSynced = syncStatus.lastSyncedAt
    ? new Date(syncStatus.lastSyncedAt).toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Never";

  const syncedLabel =
    syncStatus.state === "offline"
      ? "Offline"
      : syncStatus.state === "syncing"
        ? "Syncing"
        : syncStatus.state === "error"
          ? "Error"
          : syncStatus.pendingCount > 0
            ? `${syncStatus.pendingCount} pending`
            : "Synced";

  return (
    <div className="space-y-5 pb-6">
      <header>
        <h1 className="text-[28px] font-extrabold tracking-tight text-[#1B2340] dark:text-slate-50">
          Settings
        </h1>
      </header>

      <Section title="Notifications" icon={<IconBell size={16} />}>
        {permission !== "granted" ? (
          <button
            type="button"
            onClick={() => void requestPermission()}
            className="mb-1 w-full rounded-2xl bg-[#1B2340] py-3 text-sm font-semibold text-white dark:bg-white dark:text-[#1B2340]"
          >
            {permission === "denied"
              ? "Permission denied — enable in system settings"
              : "Allow notifications"}
          </button>
        ) : null}
        <Row
          icon={<IconBell size={18} />}
          label="Task reminders"
          trailing={
            <Toggle
              label="Task reminders"
              checked={settings.taskRemindersEnabled}
              onChange={(value) =>
                void updateSettings({ ...settings, taskRemindersEnabled: value })
              }
            />
          }
        />
        <Row
          icon={<IconBell size={18} />}
          label="Missed task summary"
          trailing={
            <Toggle
              label="Missed task summary"
              checked={settings.missedSummaryEnabled}
              onChange={(value) =>
                void updateSettings({ ...settings, missedSummaryEnabled: value })
              }
            />
          }
        />
        <Row
          icon={<IconCalendar size={18} />}
          label="Summary time"
          trailing={
            <input
              type="time"
              value={settings.missedSummaryTime}
              disabled={!settings.missedSummaryEnabled}
              onChange={(event) =>
                void updateSettings({ ...settings, missedSummaryTime: event.target.value })
              }
              className="rounded-xl bg-[#F4F6FB] px-2 py-1 text-sm disabled:opacity-50 dark:bg-white/10"
            />
          }
        />
      </Section>

      <Section title="Synchronization" icon={<IconCloud size={16} />}>
        <Row
          icon={<IconCloud size={18} />}
          label="Sync status"
          trailing={
            <span className="flex items-center gap-1.5 text-[13px] font-medium text-[#8B93A7]">
              <span
                className={`h-2 w-2 rounded-full ${
                  syncStatus.state === "idle" && syncStatus.pendingCount === 0
                    ? "bg-[#2ECC71]"
                    : syncStatus.state === "error"
                      ? "bg-[#FF5A5F]"
                      : "bg-[#F5B942]"
                }`}
              />
              {syncedLabel}
            </span>
          }
        />
        <Row icon={<IconCalendar size={18} />} label="Last synced" value={lastSynced} />
        <Row
          icon={<IconDevice size={18} />}
          label="Connected devices"
          value={`${devices.length} device${devices.length === 1 ? "" : "s"}`}
          onClick={() => setPanel(panel === "manage" ? "none" : "manage")}
        />
        <Row
          icon={<IconDevice size={18} />}
          label="Add device"
          onClick={() => setPanel(panel === "add" ? "none" : "add")}
        />
        <Row
          icon={<IconGear size={18} />}
          label="Manage devices"
          onClick={() => {
            void runSync();
            void loadDevices();
            setPanel(panel === "manage" ? "none" : "manage");
          }}
        />

        {panel === "add" ? (
          <div className="mt-2 space-y-3 rounded-2xl bg-[#F4F6FB] p-3 dark:bg-white/5">
            <p className="text-[13px] font-semibold text-[#1B2340] dark:text-slate-100">
              Pair another device
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleGenerateCode()}
              className="w-full rounded-xl bg-[#1B2340] py-2.5 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-[#1B2340]"
            >
              Generate pairing code
            </button>
            {pairingCode ? (
              <p className="text-center font-mono text-2xl tracking-[0.3em] text-[#1B2340] dark:text-slate-50">
                {pairingCode}
              </p>
            ) : null}
            <input
              value={codeInput}
              onChange={(event) => setCodeInput(event.target.value.toUpperCase())}
              placeholder="7K4P-92XM"
              className="w-full rounded-xl bg-white px-3 py-2 font-mono text-sm uppercase tracking-widest dark:bg-[#1b2238]"
            />
            <button
              type="button"
              disabled={busy || codeInput.length < 8}
              onClick={() => void handlePair()}
              className="w-full rounded-xl bg-[#2ECC71] py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              Pair device
            </button>
          </div>
        ) : null}

        {panel === "manage" ? (
          <ul className="mt-2 space-y-1">
            {devices.map((device) => (
              <li
                key={device.id}
                className="flex items-center justify-between rounded-xl bg-[#F4F6FB] px-3 py-2.5 text-sm dark:bg-white/5"
              >
                <span className="truncate text-[#1B2340] dark:text-slate-200">
                  {device.name}
                  {device.isCurrent ? " · this device" : ""}
                </span>
                {device.isCurrent ? null : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleRemove(device.id)}
                    className="text-xs font-semibold text-[#E23B40]"
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
            {devices.length === 0 ? (
              <li className="px-1 text-sm text-[#8B93A7]">No devices registered yet.</li>
            ) : null}
          </ul>
        ) : null}
      </Section>

      <Section title="Appearance" icon={<IconPalette size={16} />}>
        <Row
          icon={<IconPalette size={18} />}
          label="Theme"
          value={settings.theme}
          onClick={() => setPanel(panel === "theme" ? "none" : "theme")}
        />
        {panel === "theme" ? (
          <div className="mt-2 flex gap-2">
            {(["light", "dark", "system"] as ThemePreference[]).map((theme) => (
              <button
                key={theme}
                type="button"
                onClick={() => void updateSettings({ ...settings, theme })}
                className={`flex-1 rounded-xl py-2 text-xs font-semibold capitalize ${
                  settings.theme === theme
                    ? "bg-[#1B2340] text-white dark:bg-white dark:text-[#1B2340]"
                    : "bg-[#F4F6FB] text-[#8B93A7] dark:bg-white/10"
                }`}
              >
                {theme}
              </button>
            ))}
          </div>
        ) : null}
      </Section>

      <p className="px-1 text-center text-[12px] text-[#8B93A7]">
        MyTodo · v{APP_VERSION}
      </p>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[24px] bg-white p-2 shadow-[0_8px_24px_rgba(28,41,72,0.06)] dark:bg-[#1b2238]">
      <div className="flex items-center gap-2 px-3 pt-2 pb-1 text-[13px] font-bold text-[#1B2340] dark:text-slate-50">
        <span className="text-[#8B93A7]">{icon}</span>
        {title}
      </div>
      {children}
    </section>
  );
}

function Row({
  icon,
  label,
  value,
  trailing,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  value?: string;
  trailing?: ReactNode;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F4F6FB] text-[#1B2340] dark:bg-white/10 dark:text-slate-100">
        {icon}
      </span>
      <span className="flex-1 text-left text-[14px] font-medium text-[#1B2340] dark:text-slate-100">
        {label}
      </span>
      {value ? <span className="text-[13px] text-[#8B93A7]">{value}</span> : null}
      {trailing ?? (onClick ? <IconChevron size={16} className="text-[#C5CAD6]" /> : null)}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5"
      >
        {inner}
      </button>
    );
  }
  return <div className="flex items-center gap-3 rounded-2xl px-3 py-2.5">{inner}</div>;
}

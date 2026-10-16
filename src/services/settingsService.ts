import { getLocalStore } from "@/database/localStore";
import { isValidTimeString } from "@/utils/datetime";

export type ThemePreference = "light" | "dark" | "system";

export interface AppSettings {
  taskRemindersEnabled: boolean;
  missedSummaryEnabled: boolean;
  /** Wall clock HH:mm, default 22:00. */
  missedSummaryTime: string;
  theme: ThemePreference;
}

export const DEFAULT_SETTINGS: AppSettings = {
  taskRemindersEnabled: true,
  missedSummaryEnabled: true,
  missedSummaryTime: "22:00",
  theme: "system",
};

const SETTINGS_KEY = "settings";

export async function loadSettings(): Promise<AppSettings> {
  try {
    const raw = await getLocalStore().getMeta(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      missedSummaryTime: isValidTimeString(parsed.missedSummaryTime)
        ? (parsed.missedSummaryTime as string)
        : DEFAULT_SETTINGS.missedSummaryTime,
    };
  } catch (error) {
    console.warn("[settings] falling back to defaults", error);
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: AppSettings): Promise<AppSettings> {
  if (!isValidTimeString(settings.missedSummaryTime)) {
    throw new Error("Summary time must be a valid time (HH:mm).");
  }
  await getLocalStore().setMeta(SETTINGS_KEY, JSON.stringify(settings));
  return settings;
}

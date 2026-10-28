import "dotenv/config";
import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor configuration for the Android shell.
 *
 * The web UI is served by the Next.js app (API routes power sync + pairing),
 * so the Android shell points at the deployed origin via CAP_SERVER_URL.
 * Everything that matters offline (tasks, reminders, notifications) lives in
 * the device's local database and the Android notification system, so the app
 * remains fully usable when that origin is unreachable.
 */
const config: CapacitorConfig = {
  appId: "com.mytodo.todoreminder",
  appName: "MyTodo",
  webDir: "dist",
  android: {
    allowMixedContent: false,
  },
  server: process.env.CAP_SERVER_URL
    ? { url: process.env.CAP_SERVER_URL, cleartext: false }
    : undefined,
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_icon",
      iconColor: "#0f172a",
    },
  },
};

export default config;

import { AppShell } from "@/components/AppShell";
import { AppStateProvider } from "@/hooks/useAppState";

export default function Home() {
  return (
    <AppStateProvider>
      <AppShell />
    </AppStateProvider>
  );
}

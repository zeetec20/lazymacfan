import { useEffect, useState, useCallback, useMemo } from "react";
import { createCliRenderer } from "@opentui/core";
import { createRoot, useKeyboard, useRenderer } from "@opentui/react";
import { IPCClient } from "../ipc/client";
import { loadConfig } from "../config/persistence";
import { getServiceStatus } from "../service/launchd";
import type { ControllerStatus } from "../types/controller";
import { resolveTheme, THEME_NAMES, type ThemeName } from "./theme";
import { ThemeProvider } from "./ThemeContext";
import { TabBar, type TabItem } from "./components/TabBar";
import { Footer } from "./components/Footer";
import { Toast } from "./components/Toast";
import { DashboardScreen } from "./screens/DashboardScreen";
import { FansScreen } from "./screens/FansScreen";
import { TemperaturesScreen } from "./screens/TemperaturesScreen";
import { CurveScreen } from "./screens/CurveScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { HelpModal } from "./screens/HelpModal";

function MainApp() {
  const renderer = useRenderer();
  const client = useMemo(() => new IPCClient(), []);
  const config = useMemo(() => loadConfig(), []);

  const [themeName, setThemeName] = useState<ThemeName>("tokyonight");
  const [activeTab, setActiveTab] = useState(0);
  const [status, setStatus] = useState<ControllerStatus | null>(null);
  const [selectedFanIndex, setSelectedFanIndex] = useState(0);
  const [selectedSensorIndex, setSelectedSensorIndex] = useState(0);
  const [serviceInstalled, setServiceInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const theme = useMemo(() => resolveTheme(themeName), [themeName]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 2500);
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const s = await client.getStatus();
      setStatus(s);
    } catch {
      setStatus(null);
    }
  }, [client]);

  // Initial load and live telemetry polling
  useEffect(() => {
    void fetchStatus();
    void getServiceStatus().then((s) => setServiceInstalled(s.installed));

    const id = setInterval(() => {
      void fetchStatus();
    }, 1000);

    return () => clearInterval(id);
  }, [fetchStatus]);

  // Fan speed adjustment
  const adjustRpm = useCallback(
    async (delta: number) => {
      if (!status || status.fans.length === 0) return;
      const fan = status.fans[selectedFanIndex] ?? status.fans[0];
      if (!fan) return;

      const newTarget = fan.targetRpm + delta;
      try {
        await client.setFanSpeed(fan.id, newTarget);
        showToast(`${fan.name} target speed set to ${newTarget} RPM`);
        await fetchStatus();
      } catch (err) {
        showToast(`Error: ${String(err)}`);
      }
    },
    [client, fetchStatus, selectedFanIndex, showToast, status],
  );

  // Mode toggle
  const toggleMode = useCallback(async () => {
    if (!status) return;
    const nextMode = status.mode === "manual" ? "auto" : "manual";
    try {
      await client.setMode(nextMode);
      showToast(`Controller mode set to: ${nextMode.toUpperCase()}`);
      await fetchStatus();
    } catch (err) {
      showToast(`Error: ${String(err)}`);
    }
  }, [client, fetchStatus, showToast, status]);

  // Cycle themes
  const cycleTheme = useCallback(() => {
    setThemeName((prev) => {
      const currIdx = THEME_NAMES.indexOf(prev);
      const nextIdx = (currIdx + 1) % THEME_NAMES.length;
      const next = THEME_NAMES[nextIdx] ?? "tokyonight";
      showToast(`Theme: ${next}`);
      return next;
    });
  }, [showToast]);

  // Global Keyboard Navigation
  useKeyboard((key) => {
    const name = key.name.toLowerCase();

    // Escape / Help toggle
    if (name === "escape") {
      if (showHelp) {
        setShowHelp(false);
        return;
      }
      renderer.destroy();
      process.exit(0);
      return;
    }

    if (name === "q" || (key.ctrl && name === "c")) {
      renderer.destroy();
      process.exit(0);
      return;
    }

    if (name === "?" || name === "h") {
      setShowHelp((prev) => !prev);
      return;
    }

    // Direct tab jumps
    if (name === "1" || name === "d") {
      setActiveTab(0);
      setShowHelp(false);
      return;
    }
    if (name === "2" || name === "f") {
      setActiveTab(1);
      setShowHelp(false);
      return;
    }
    if (name === "3" || name === "t") {
      setActiveTab(2);
      setShowHelp(false);
      return;
    }
    if (name === "4" || name === "c") {
      setActiveTab(3);
      setShowHelp(false);
      return;
    }
    if (name === "5" || name === "s") {
      setActiveTab(4);
      setShowHelp(false);
      return;
    }

    // Controls
    if (name === "m") {
      void toggleMode();
      return;
    }

    if (name === "left") {
      void adjustRpm(-100);
      return;
    }
    if (name === "right") {
      void adjustRpm(100);
      return;
    }

    if (name === "tab") {
      if (status && status.fans.length > 0) {
        setSelectedFanIndex((prev) => (prev + 1) % status.fans.length);
      }
      return;
    }

    if (name === "up" || name === "k") {
      if (activeTab === 2 && status) {
        setSelectedSensorIndex((prev) => Math.max(0, prev - 1));
      } else if (activeTab === 1 && status && status.fans.length > 0) {
        setSelectedFanIndex((prev) => (prev - 1 + status.fans.length) % status.fans.length);
      }
      return;
    }

    if (name === "down" || name === "j") {
      if (activeTab === 2 && status) {
        setSelectedSensorIndex((prev) => Math.min(status.sensors.length - 1, prev + 1));
      } else if (activeTab === 1 && status && status.fans.length > 0) {
        setSelectedFanIndex((prev) => (prev + 1) % status.fans.length);
      }
      return;
    }

    if (key.name === "T" || (key.shift && name === "t")) {
      cycleTheme();
      return;
    }

    if (name === "r") {
      void fetchStatus();
      showToast("Telemetry refreshed");
      return;
    }
  });

  const tabs: TabItem[] = useMemo(
    () => [
      { key: "dash", num: "1", label: "Dashboard" },
      { key: "fans", num: "2", label: "Fans", badge: status?.fans.length },
      { key: "temps", num: "3", label: "Temps", badge: status?.sensors.length },
      { key: "curve", num: "4", label: "Curve" },
      { key: "settings", num: "5", label: "Settings" },
    ],
    [status?.fans.length, status?.sensors.length],
  );

  return (
    <ThemeProvider value={theme}>
      <box
        style={{
          flexDirection: "column",
          flexGrow: 1,
          backgroundColor: theme.bg,
          padding: 1,
          gap: 1,
        }}
      >
        {/* Navigation Tab Bar */}
        <TabBar tabs={tabs} activeTab={activeTab} onSelectTab={setActiveTab} />

        {/* Active Screen Viewport */}
        {activeTab === 0 ? (
          <DashboardScreen status={status} selectedFanIndex={selectedFanIndex} />
        ) : null}
        {activeTab === 1 ? (
          <FansScreen status={status} selectedFanIndex={selectedFanIndex} />
        ) : null}
        {activeTab === 2 ? (
          <TemperaturesScreen status={status} selectedIndex={selectedSensorIndex} />
        ) : null}
        {activeTab === 3 ? <CurveScreen status={status} /> : null}
        {activeTab === 4 ? (
          <SettingsScreen
            status={status}
            config={config}
            serviceInstalled={serviceInstalled}
            currentThemeName={themeName}
            onSelectTheme={(t) => {
              setThemeName(t);
              showToast(`Theme: ${t}`);
            }}
          />
        ) : null}

        {/* Footer Bar */}
        <Footer />

        {/* Action Toast Notifications */}
        <Toast message={toastMessage} />

        {/* Help Modal Overlay */}
        {showHelp ? <HelpModal onClose={() => setShowHelp(false)} /> : null}
      </box>
    </ThemeProvider>
  );
}

export async function runTui(): Promise<void> {
  const client = new IPCClient();
  const isRunning = await client.isAgentRunning();

  if (!isRunning) {
    console.log("┌─ lazymacfan ─────────────────────────────────────────────┐");
    console.log("│ Controller is not running.                               │");
    console.log("│                                                          │");
    console.log("│ Start it with:                                           │");
    console.log("│   lazymacfan agent                                       │");
    console.log("│ or via background service:                               │");
    console.log("│   lazymacfan service start                               │");
    console.log("└──────────────────────────────────────────────────────────┘");
    process.exit(1);
  }

  const renderer = await createCliRenderer({ exitOnCtrlC: true });
  createRoot(renderer).render(<MainApp />);
}

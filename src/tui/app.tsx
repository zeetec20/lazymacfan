import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { createCliRenderer } from "@opentui/core";
import { createRoot, useKeyboard, useRenderer, useSelectionHandler } from "@opentui/react";
import { createIPCClient } from "../ipc/client";
import { loadConfig } from "../config/persistence";
import { getServiceStatus, ensureAgentRunning, restartService } from "../service/launchd";
import { checkHelperPrivileges, authorizeHelper } from "../hardware/helper-auth";
import type { ControllerStatus } from "../types/controller";
import { resolveTheme, THEME_NAMES, type ThemeName } from "./theme";
import { ThemeProvider } from "./ThemeContext";
import { TabBar, type TabItem } from "./components/TabBar";
import { Footer } from "./components/Footer";
import { ToastStack, type ToastItem, type ToastKind } from "./components/Toast";
import { DashboardScreen } from "./screens/DashboardScreen";
import { TemperaturesScreen } from "./screens/TemperaturesScreen";
import { CurveScreen } from "./screens/CurveScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { HelpModal } from "./screens/HelpModal";
import { installThinScrollbar } from "./scrollbar";

const MainApp = () => {
  const renderer = useRenderer();
  const client = useMemo(() => createIPCClient(), []);
  const config = useMemo(() => loadConfig(), []);

  const [themeName, setThemeName] = useState<ThemeName>("tokyonight");
  const [activeTab, setActiveTab] = useState(0);
  const [status, setStatus] = useState<ControllerStatus | null>(null);
  const [selectedFanIndex, setSelectedFanIndex] = useState(0);
  const [serviceInstalled, setServiceInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const theme = useMemo(() => resolveTheme(themeName), [themeName]);

  const dismissToast = useCallback((id?: string) => {
    setToasts((prev) => {
      if (prev.length === 0) return prev;
      const targetId = id ?? prev[prev.length - 1]?.id;
      if (!targetId) return prev;

      const timer = toastTimeoutsRef.current.get(targetId);
      if (timer) clearTimeout(timer);
      toastTimeoutsRef.current.delete(targetId);
      return prev.filter((t) => t.id !== targetId);
    });
  }, []);

  const showToast = useCallback((msg: string, kind: ToastKind = "info", durationMs = 4500) => {
    const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    setToasts((prev) => [...prev.slice(-3), { id, message: msg, kind }]);
    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      toastTimeoutsRef.current.delete(id);
    }, durationMs);
    toastTimeoutsRef.current.set(id, timer);
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
      if (status.privileged === false) {
        showToast(
          "Read-Only mode: Run 'sudo lazymacfan helper setup' to enable fan control",
          "warning",
          5500,
        );
        return;
      }
      if (status.mode === "auto") {
        showToast(
          "Switch to Manual Mode first (press [m]) to manually adjust fan RPM",
          "warning",
          5500,
        );
        return;
      }
      const fan = status.fans[selectedFanIndex] ?? status.fans[0];
      if (!fan) return;

      if (delta > 0) {
        if (fan.targetRpm >= fan.maxRpm) {
          showToast(
            `${fan.name} is already at maximum speed (${Math.round(fan.maxRpm)} RPM)`,
            "warning",
            3000,
          );
          return;
        }
        const newTarget = Math.min(fan.maxRpm, fan.targetRpm + delta);
        try {
          await client.setFanSpeed(fan.id, newTarget);
          if (newTarget >= fan.maxRpm) {
            showToast(
              `${fan.name} set to maximum speed (${Math.round(fan.maxRpm)} RPM)`,
              "success",
              3500,
            );
          } else {
            showToast(`${fan.name} target speed set to ${newTarget} RPM`, "success");
          }
          await fetchStatus();
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (/permission denied|privilege|EPERM/i.test(msg)) {
            showToast("Root required: Run 'sudo lazymacfan helper setup'", "error", 5500);
          } else {
            showToast(`Error: ${msg}`, "error", 5000);
          }
        }
        return;
      }

      if (delta < 0) {
        if (fan.targetRpm <= fan.minRpm) {
          showToast(
            `${fan.name} is already at minimum speed (${Math.round(fan.minRpm)} RPM)`,
            "warning",
            3000,
          );
          return;
        }
        const newTarget = Math.max(fan.minRpm, fan.targetRpm + delta);
        try {
          await client.setFanSpeed(fan.id, newTarget);
          if (newTarget <= fan.minRpm) {
            showToast(
              `${fan.name} set to minimum speed (${Math.round(fan.minRpm)} RPM)`,
              "success",
              3500,
            );
          } else {
            showToast(`${fan.name} target speed set to ${newTarget} RPM`, "success");
          }
          await fetchStatus();
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (/permission denied|privilege|EPERM/i.test(msg)) {
            showToast("Root required: Run 'sudo lazymacfan helper setup'", "error", 5500);
          } else {
            showToast(`Error: ${msg}`, "error", 5000);
          }
        }
        return;
      }
    },
    [client, fetchStatus, selectedFanIndex, showToast, status],
  );

  // Mode toggle
  const toggleMode = useCallback(async () => {
    if (!status) return;
    if (status.privileged === false) {
      showToast(
        "Read-Only mode: Run 'sudo lazymacfan helper setup' to enable fan control",
        "warning",
        5500,
      );
      return;
    }
    const nextMode = status.mode === "manual" ? "auto" : "manual";
    try {
      await client.setMode(nextMode);
      showToast(`Controller mode set to: ${nextMode.toUpperCase()}`, "success");
      await fetchStatus();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/permission denied|privilege|EPERM/i.test(msg)) {
        showToast("Root required: Run 'sudo lazymacfan helper setup'", "error", 5500);
      } else {
        showToast(`Error: ${msg}`, "error", 5000);
      }
    }
  }, [client, fetchStatus, showToast, status]);

  // Cycle themes
  const cycleTheme = useCallback(() => {
    setThemeName((prev) => {
      const currIdx = THEME_NAMES.indexOf(prev);
      const nextIdx = (currIdx + 1) % THEME_NAMES.length;
      const next = THEME_NAMES[nextIdx] ?? "tokyonight";
      showToast(`Theme: ${next}`, "info");
      return next;
    });
  }, [showToast]);

  // Global Text Selection & Clipboard Copy
  useSelectionHandler((selection) => {
    const text = selection.getSelectedText();
    if (text && text.trim()) {
      renderer.copyToClipboardOSC52(text);
      if (process.platform === "darwin") {
        try {
          const proc = Bun.spawn(["pbcopy"], { stdin: "pipe" });
          proc.stdin.write(text);
          proc.stdin.end();
        } catch {
          // ignore
        }
      }
      showToast("Copied selection to clipboard", "success", 2500);
    }
  });

  // Global Keyboard Navigation
  useKeyboard((key) => {
    const name = key.name.toLowerCase();

    // Dismiss active toast
    if (name === "x") {
      if (toasts.length > 0) {
        dismissToast();
        return;
      }
    }

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

    // Theme switch hotkey: uppercase T (Shift+t) or p
    const isUpperT =
      key.name === "T" ||
      (key.name.toLowerCase() === "t" && Boolean(key.shift)) ||
      key.sequence === "T";
    const isLowerT = key.name.toLowerCase() === "t" && !key.shift && key.sequence !== "T";

    if (isUpperT || name === "p") {
      cycleTheme();
      return;
    }

    // Direct tab jumps (t or 2 for Temps, strictly lowercase t)
    if (name === "1" || name === "d") {
      setActiveTab(0);
      setShowHelp(false);
      return;
    }
    if (name === "2" || isLowerT) {
      setActiveTab(1);
      setShowHelp(false);
      return;
    }
    if (name === "3" || name === "c") {
      setActiveTab(2);
      setShowHelp(false);
      return;
    }
    if (name === "4" || name === "s") {
      setActiveTab(3);
      setShowHelp(false);
      return;
    }

    // Controls
    if (name === "m") {
      void toggleMode();
      return;
    }

    if (name === "left") {
      void adjustRpm(-500);
      return;
    }
    if (name === "right") {
      void adjustRpm(500);
      return;
    }

    if (name === "tab") {
      if (status && status.fans.length > 0) {
        setSelectedFanIndex((prev) => (prev + 1) % status.fans.length);
      }
      return;
    }

    if (name === "r") {
      void fetchStatus();
      showToast("Telemetry refreshed", "success");
      return;
    }
  });

  const tabs: TabItem[] = useMemo(
    () => [
      { key: "dash", num: "1", label: "Dashboard" },
      { key: "temps", num: "2", label: "Temps", badge: status?.sensors.length },
      { key: "curve", num: "3", label: "Curve" },
      { key: "settings", num: "4", label: "Settings" },
    ],
    [status?.sensors.length],
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
        <TabBar tabs={tabs} activeTab={activeTab} onSelectTab={setActiveTab} status={status} />

        {/* Active Screen Viewport */}
        {activeTab === 0 ? (
          <DashboardScreen status={status} selectedFanIndex={selectedFanIndex} />
        ) : null}
        {activeTab === 1 ? <TemperaturesScreen status={status} /> : null}
        {activeTab === 2 ? <CurveScreen status={status} /> : null}
        {activeTab === 3 ? (
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
        <ToastStack toasts={toasts} onDismiss={dismissToast} />

        {/* Help Modal Overlay */}
        {showHelp ? <HelpModal onClose={() => setShowHelp(false)} /> : null}
      </box>
    </ThemeProvider>
  );
};

export const runTui = async (): Promise<void> => {
  // 1. Auto-check & prompt helper permissions on macOS if unprivileged
  if (process.platform === "darwin") {
    const priv = await checkHelperPrivileges();
    if (!priv.privileged) {
      console.log("Checking fan control permissions (AppleSMC write access)...");
      const auth = await authorizeHelper();
      if (auth.success) {
        console.log("✅ Fan control authorized.");
        // If an agent was already running unprivileged, restart it so it inherits root SMC permissions
        const client = createIPCClient();
        if (await client.isAgentRunning()) {
          try {
            await restartService();
          } catch {
            // ignore
          }
        }
      } else {
        console.log("⚠️ Running in Read-Only mode (fan speed adjustment disabled).");
      }
    }
  }

  // 2. Ensure persistent background agent is running
  const client = createIPCClient();
  let isRunning = await client.isAgentRunning();

  if (!isRunning) {
    console.log("Starting lazymacfan background controller...");
    await ensureAgentRunning();
    isRunning = await client.isAgentRunning();
  }

  if (!isRunning) {
    console.log("┌─ lazymacfan ─────────────────────────────────────────────┐");
    console.log("│ Failed to start background controller.                   │");
    console.log("│                                                          │");
    console.log("│ Check logs:                                              │");
    console.log("│   lazymacfan logs                                        │");
    console.log("│ Or start manually:                                       │");
    console.log("│   lazymacfan agent                                       │");
    console.log("└──────────────────────────────────────────────────────────┘");
    process.exit(1);
  }

  installThinScrollbar();
  const renderer = await createCliRenderer({ exitOnCtrlC: true, useMouse: true });
  createRoot(renderer).render(<MainApp />);
};

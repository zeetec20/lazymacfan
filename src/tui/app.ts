import { createCliRenderer, TextRenderable, type KeyEvent } from "@opentui/core";
import { IPCClient } from "../ipc/client";
import { loadConfig } from "../config/persistence";
import { getServiceStatus } from "../service/launchd";
import type { ControllerStatus } from "../types/controller";
import { renderDashboard } from "./screens/dashboard";
import { renderTemperatures } from "./screens/temperatures";
import { renderFans } from "./screens/fans";
import { renderCurve } from "./screens/curve";
import { renderSettings } from "./screens/settings";

export type ScreenName = "dashboard" | "temperatures" | "fans" | "curve" | "settings" | "help";

export class TuiApplication {
  private client = new IPCClient();
  private config = loadConfig();
  private activeScreen: ScreenName = "dashboard";
  private status: ControllerStatus | null = null;
  private selectedFanIndex = 0;
  private selectedSensorIndex = 0;
  private serviceInstalled = false;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private isDestroyed = false;

  public async run(): Promise<void> {
    const isRunning = await this.client.isAgentRunning();
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

    try {
      this.status = await this.client.getStatus();
      const svc = await getServiceStatus();
      this.serviceInstalled = svc.installed;
    } catch {
      // will be retried in polling
    }

    const renderer = await createCliRenderer();
    const contentNode = new TextRenderable(renderer, {
      id: "main-content",
      content: this.renderActiveScreen(),
    });
    renderer.root.add(contentNode);

    const updateView = () => {
      if (this.isDestroyed) return;
      contentNode.content = this.renderActiveScreen();
    };

    // Keyboard handlers
    renderer.keyInput.on("keypress", (key: KeyEvent) => {
      const name = key.name.toLowerCase();

      if (name === "q" || (key.ctrl && name === "c")) {
        this.destroy(renderer);
        return;
      }

      switch (name) {
        case "d":
          this.activeScreen = "dashboard";
          updateView();
          break;
        case "t":
          this.activeScreen = "temperatures";
          updateView();
          break;
        case "f":
          this.activeScreen = "fans";
          updateView();
          break;
        case "c":
          this.activeScreen = "curve";
          updateView();
          break;
        case "s":
          this.activeScreen = "settings";
          updateView();
          break;
        case "?":
          this.activeScreen = this.activeScreen === "help" ? "dashboard" : "help";
          updateView();
          break;
        case "r":
          void this.fetchStatus().then(updateView);
          break;
        case "m":
          void this.toggleMode().then(updateView);
          break;
        case "up":
          this.handleNavigate(-1);
          updateView();
          break;
        case "down":
          this.handleNavigate(1);
          updateView();
          break;
        case "left":
          void this.adjustRpm(-100).then(updateView);
          break;
        case "right":
          void this.adjustRpm(100).then(updateView);
          break;
        case "tab":
          if (this.status && this.status.fans.length > 0) {
            this.selectedFanIndex = (this.selectedFanIndex + 1) % this.status.fans.length;
            updateView();
          }
          break;
      }
    });

    // Start background IPC polling
    this.pollTimer = setInterval(() => {
      void this.fetchStatus().then(updateView);
    }, 1000);

    // Initial render
    renderer.start();
  }

  private handleNavigate(delta: number): void {
    if (this.activeScreen === "temperatures" && this.status) {
      const total = this.status.sensors.length;
      if (total > 0) {
        this.selectedSensorIndex = Math.max(
          0,
          Math.min(total - 1, this.selectedSensorIndex + delta),
        );
      }
    } else if (this.activeScreen === "fans" && this.status) {
      const total = this.status.fans.length;
      if (total > 0) {
        this.selectedFanIndex = (this.selectedFanIndex + delta + total) % total;
      }
    }
  }

  private async adjustRpm(delta: number): Promise<void> {
    if (!this.status || this.status.fans.length === 0) return;
    const fan = this.status.fans[this.selectedFanIndex];
    if (!fan) return;

    const newTarget = fan.targetRpm + delta;
    try {
      await this.client.setFanSpeed(fan.id, newTarget);
      await this.fetchStatus();
    } catch {
      // ignore
    }
  }

  private async toggleMode(): Promise<void> {
    if (!this.status) return;
    const nextMode = this.status.mode === "manual" ? "auto" : "manual";
    try {
      await this.client.setMode(nextMode);
      await this.fetchStatus();
    } catch {
      // ignore
    }
  }

  private async fetchStatus(): Promise<void> {
    try {
      this.status = await this.client.getStatus();
    } catch {
      this.status = null;
    }
  }

  private renderActiveScreen(): string {
    switch (this.activeScreen) {
      case "dashboard":
        return renderDashboard(this.status);
      case "temperatures":
        return renderTemperatures(this.status, this.selectedSensorIndex);
      case "fans":
        return renderFans(this.status, this.selectedFanIndex);
      case "curve":
        return renderCurve(this.status);
      case "settings":
        return renderSettings(this.status, this.config, this.serviceInstalled);
      case "help":
        return [
          "┌─ Help & Keybindings ─────────────────────────────────────┐",
          "│                                                          │",
          "│  Navigation:                                             │",
          "│    [d] Dashboard                                         │",
          "│    [f] Fans view & control                               │",
          "│    [t] Temperature sensors view                          │",
          "│    [c] Automatic fan curve                               │",
          "│    [s] Settings                                          │",
          "│                                                          │",
          "│  Controls:                                               │",
          "│    [m] Toggle between Auto and Manual fan modes          │",
          "│    [←/→] Adjust target RPM in steps of 100               │",
          "│    [↑/↓] Navigate list items                             │",
          "│    [r] Refresh hardware state                            │",
          "│    [q] Quit TUI (Agent continues in background)          │",
          "│                                                          │",
          "│  Press [d] or [?] to close help                          │",
          "└──────────────────────────────────────────────────────────┘",
        ].join("\n");
    }
  }

  private destroy(renderer: { destroy: () => void }): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    renderer.destroy();
    process.exit(0);
  }
}

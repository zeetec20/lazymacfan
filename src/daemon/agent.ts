import { appendFileSync } from "node:fs";
import { getLogPath } from "../config/persistence";
import { FanControllerService } from "../controller/controller";
import { MacOSHardwareBackend } from "../hardware/macos-backend";
import { MockHardwareBackend } from "../hardware/mock-backend";
import { IPCServer } from "../ipc/server";

export function logEvent(level: "INFO" | "WARN" | "ERROR", message: string): void {
  const line = `[${new Date().toISOString()}] [${level}] ${message}\n`;
  try {
    appendFileSync(getLogPath(), line, "utf-8");
  } catch {
    // fallback to stderr
  }
}

export async function runAgentDaemon(): Promise<void> {
  logEvent("INFO", `lazymacfan agent starting (PID ${process.pid})`);

  const macBackend = new MacOSHardwareBackend();
  const isMac = await macBackend.isAvailable();
  const hardware = isMac ? macBackend : new MockHardwareBackend();

  if (!isMac) {
    logEvent(
      "WARN",
      "Native macOS helper not available or platform is not Darwin. Running with Mock backend.",
    );
  }

  const controller = new FanControllerService(hardware);
  const ipcServer = new IPCServer(controller);

  ipcServer.start();
  await controller.start();

  logEvent("INFO", "lazymacfan agent running and listening on IPC socket");

  let isShuttingDown = false;
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logEvent("INFO", `Received ${signal}, shutting down gracefully...`);

    try {
      ipcServer.stop();
      await controller.stop();
      logEvent("INFO", "All fans restored to auto control. Agent stopped.");
    } catch (err) {
      logEvent("ERROR", `Error during shutdown: ${String(err)}`);
    } finally {
      process.exit(0);
    }
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGHUP", () => {
    logEvent("INFO", "Received SIGHUP, reloading configuration");
    controller.reloadConfig();
  });
}

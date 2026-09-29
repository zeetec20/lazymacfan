import { appendFileSync } from "node:fs";
import { getLogPath } from "../config/persistence";
import { createFanController } from "../controller/controller";
import { createMacOSHardwareBackend } from "../hardware/macos-backend";
import { createMockHardwareBackend } from "../hardware/mock-backend";
import { createIPCServer } from "../ipc/server";

export const logEvent = (level: "INFO" | "WARN" | "ERROR", message: string): void => {
  const line = `[${new Date().toISOString()}] [${level}] ${message}\n`;
  try {
    appendFileSync(getLogPath(), line, "utf-8");
  } catch {
    // fallback to stderr
  }
};

export const runAgentDaemon = async (): Promise<void> => {
  logEvent("INFO", `lazymacfan agent starting (PID ${process.pid})`);

  const macBackend = createMacOSHardwareBackend();
  const isMac = await macBackend.isAvailable();
  const hardware = isMac ? macBackend : createMockHardwareBackend();

  if (!isMac) {
    logEvent(
      "WARN",
      "Native macOS helper not available or platform is not Darwin. Running with Mock backend.",
    );
  }

  const controller = createFanController(hardware);
  const ipcServer = createIPCServer(controller);

  ipcServer.start();
  await controller.start();

  logEvent("INFO", "lazymacfan agent running and listening on IPC socket");

  let isShuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
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
};

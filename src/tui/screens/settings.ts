import type { ControllerStatus } from "../../types/controller";
import type { AppConfig } from "../../config/config";

export function renderSettings(
  status: ControllerStatus | null,
  config: AppConfig,
  serviceInstalled: boolean,
): string {
  const lines: string[] = [];
  lines.push("┌─ Settings ───────────────────────────────────────────────┐");
  lines.push("│                                                          │");
  lines.push("│  Controller Configuration                                │");
  lines.push("│  ─────────────────────────────────────────────────────   │");
  lines.push(
    `│  Polling Interval                        ${config.controller.pollIntervalMs} ms               │`,
  );
  lines.push(`│  Temperature Unit                        Celsius (°C)    │`);
  lines.push(
    `│  Emergency Temperature                   ${config.controller.emergencyTempC}°C              │`,
  );
  lines.push(
    `│  Start at Login (launchd)                ${serviceInstalled ? "Enabled" : "Disabled"}           │`,
  );
  lines.push("│                                                          │");
  lines.push("│  Runtime Status                                          │");
  lines.push("│  ─────────────────────────────────────────────────────   │");
  lines.push(
    `│  Daemon PID                              ${status?.pid ?? "N/A"}                 │`,
  );
  lines.push(`│  Config File: ~/Library/Application Support/lazymacfan/  │`);
  lines.push("│                                                          │");
  lines.push("│  [d] Dashboard  [f] Fans  [t] Temperatures  [q] Quit     │");
  lines.push("└──────────────────────────────────────────────────────────┘");

  return lines.join("\n");
}

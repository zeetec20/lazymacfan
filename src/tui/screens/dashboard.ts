import type { ControllerStatus } from "../../types/controller";

export function renderDashboard(status: ControllerStatus | null): string {
  if (!status) {
    return [
      "┌─ lazymacfan ─────────────────────────────────────────────┐",
      "│                                                          │",
      "│  Connecting to background controller...                 │",
      "│                                                          │",
      "│  [q] Quit                                                │",
      "└──────────────────────────────────────────────────────────┘",
    ].join("\n");
  }

  const lines: string[] = [];
  lines.push("┌─ lazymacfan Dashboard ───────────────────────────────────┐");
  lines.push("│                                                          │");
  lines.push("│  System Temperatures                                     │");
  lines.push("│  ─────────────────────────────────────────────────────   │");

  // Show top sensors (CPU, GPU, Battery)
  const cpuSensor = status.sensors.find((s) => /cpu/i.test(s.name) || /tdie/i.test(s.name));
  const gpuSensor = status.sensors.find((s) => /gpu/i.test(s.name));
  const batterySensor = status.sensors.find((s) => /battery|gauge/i.test(s.name));

  const cpuStr = cpuSensor ? `${cpuSensor.temperature.toFixed(1)}°C` : "N/A";
  const gpuStr = gpuSensor ? `${gpuSensor.temperature.toFixed(1)}°C` : "N/A";
  const batStr = batterySensor ? `${batterySensor.temperature.toFixed(1)}°C` : "N/A";

  lines.push(`│  CPU Temperature                         ${cpuStr.padEnd(16)}│`);
  lines.push(`│  GPU Temperature                         ${gpuStr.padEnd(16)}│`);
  lines.push(`│  Battery Temperature                     ${batStr.padEnd(16)}│`);
  lines.push("│                                                          │");

  lines.push("│  Fans                                                    │");
  lines.push("│  ─────────────────────────────────────────────────────   │");
  if (status.fans.length === 0) {
    lines.push("│  No fans detected or fanless Mac                         │");
  } else {
    for (const fan of status.fans) {
      const modeStr = fan.mode === "manual" ? "Manual" : "Auto";
      const fanInfo = `${fan.name.padEnd(8)} ${Math.round(fan.currentRpm).toString().padStart(4)} RPM      ${modeStr.padEnd(12)} (Target: ${Math.round(fan.targetRpm)} RPM)`;
      lines.push(`│  ${fanInfo.padEnd(56)}│`);
    }
  }
  lines.push("│                                                          │");

  lines.push("│  Controller                                              │");
  lines.push("│  ─────────────────────────────────────────────────────   │");
  const stateIcon = status.state === "running" ? "● Running" : "○ Stopped";
  lines.push(`│  Status                                  ${stateIcon.padEnd(16)}│`);
  lines.push(
    `│  Mode                                    ${(status.mode === "manual" ? "Manual" : "Automatic").padEnd(16)}│`,
  );
  lines.push(
    `│  Uptime                                  ${formatUptime(status.uptimeSeconds).padEnd(16)}│`,
  );
  if (status.error) {
    lines.push(`│  Note: ${status.error.slice(0, 48).padEnd(50)}│`);
  }
  lines.push("│                                                          │");

  lines.push("│  [m] Mode  [f] Fans  [t] Temperatures  [c] Curve         │");
  lines.push("│  [s] Settings  [r] Refresh  [?] Help  [q] Quit           │");
  lines.push("└──────────────────────────────────────────────────────────┘");

  return lines.join("\n");
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
